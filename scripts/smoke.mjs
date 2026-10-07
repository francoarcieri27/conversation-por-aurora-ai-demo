import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { setTimeout as pause } from 'node:timers/promises'

const apiPort = 4310
const appPort = 4311
const base = `http://127.0.0.1:${appPort}`
const timedFetch = (url, options = {}) => fetch(url, { signal: AbortSignal.timeout(10000), ...options })
let lastUser
const mock = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${apiPort}`)
  let text = ''
  for await (const chunk of req) text += chunk
  const body = text && req.headers['content-type']?.includes('application/json') ? JSON.parse(text) : {}
  lastUser = body.user || url.searchParams.get('user')
  assert.equal(req.headers.authorization, 'Bearer smoke-test-key')
  res.setHeader('Content-Type', 'application/json')
  if (url.pathname === '/v1/parameters') res.end(JSON.stringify({ user_input_form: [], opening_statement: 'Hola', suggested_questions: [], file_upload: { enabled: false } }))
  else if (url.pathname === '/v1/conversations') res.end(JSON.stringify({ data: [] }))
  else if (url.pathname === '/v1/messages') res.end(JSON.stringify({ data: [{ id: 'm1', answer: '<think>secret</think>Hola', agent_thoughts: [{ thought: 'secret' }] }] }))
  else if (url.pathname === '/v1/chat-messages') {
    res.setHeader('Content-Type', 'text/event-stream')
    for (const event of [{ event: 'message', message_id: 'm1', conversation_id: 'c1', answer: '<think>secret</think>Hola' }, { event: 'message_end', message_id: 'm1', conversation_id: 'c1' }]) res.write(`data: ${JSON.stringify(event)}\n\n`)
    res.end()
  } else { res.statusCode = 404; res.end('{}') }
})
await new Promise(resolve => mock.listen(apiPort, '127.0.0.1', resolve))
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(appPort)], {
  env: { ...process.env, DIFY_API_KEY: 'smoke-test-key', DIFY_API_URL: `http://127.0.0.1:${apiPort}/v1`, SESSION_SECRET: 'smoke-test-signing-secret-with-32-characters' }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
app.stdout.on('data', chunk => { logs += chunk; process.stdout.write(chunk) })
app.stderr.on('data', chunk => { logs += chunk; process.stderr.write(chunk) })
try {
  let ready = false
  for (let i = 0; i < 20; i++) {
    try { const r = await timedFetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) }); if (r.ok) { ready = true; break } } catch {}
    await pause(200)
  }
  assert.ok(ready, logs)
  console.log('Checking API session')
  const params = await timedFetch(`${base}/api/parameters`)
  assert.equal(params.status, 200)
  const setCookie = params.headers.get('set-cookie')
  assert.match(setCookie, /HttpOnly/)
  assert.match(setCookie, /Path=\//)
  assert.match(setCookie, /SameSite=Lax/)
  const cookie = setCookie.split(';')[0]
  const user = lastUser
  const list = await timedFetch(`${base}/api/conversations`, { headers: { cookie } })
  assert.equal(list.status, 200)
  assert.equal(lastUser, user)
  const history = await timedFetch(`${base}/api/messages?conversation_id=c1`, { headers: { cookie } })
  const rawHistory = await history.text()
  assert.ok(!rawHistory.includes('secret'))
  const send = (body, origin = base) => timedFetch(`${base}/api/chat-messages`, { method: 'POST', headers: { cookie, origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  console.log('Checking SSE')
  const chat = await send({ inputs: {}, query: 'Hola' })
  assert.equal(chat.status, 200)
  assert.match(chat.headers.get('content-type'), /text\/event-stream/)
  const answer = await chat.text()
  assert.ok(answer.includes('Hola'))
  assert.ok(!answer.includes('secret'))
  assert.equal((await send({ inputs: {}, query: '' })).status, 400)
  assert.equal((await send({ inputs: {}, query: 'Hola' }, 'https://evil.example')).status, 403)
  assert.equal((await send({ inputs: {}, query: 'Hola', files: [{ transfer_method: 'remote_url', url: 'http://localhost' }] })).status, 400)
  assert.equal((await timedFetch(`${base}/api/messages?conversation_id=../../secret`, { headers: { cookie } })).status, 400)
  await timedFetch(`${base}/api/conversations`, { headers: { cookie: cookie + 'tampered' } })
  assert.notEqual(lastUser, user)
  // Per-instance burst protection is tested; distributed protection is a separate deployment requirement.
  let limited = false
  for (let i = 0; i < 16; i++) if ((await send({ inputs: {}, query: 'Hola' })).status === 429) limited = true
  assert.ok(limited)
  console.log('Checking page and privacy')
  const home = await timedFetch(base)
  const html = await home.text()
  assert.ok(!html.includes('smoke-test-key'))
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(home.status, 200)
  assert.equal((await timedFetch(`${base}/privacy`)).status, 200)
  assert.equal((await timedFetch(base, { headers: { cookie: 'locale=invalid_locale', 'Accept-Language': '*' } })).status, 200)
  console.log('PASS: health, session continuity, tamper rejection, history sanitization, streaming, validation, CSRF, remote-file rejection, rate limit, secret isolation, security headers, privacy route.')
} finally {
  app.kill('SIGTERM')
  mock.closeAllConnections()
  await new Promise(resolve => mock.close(resolve))
}
