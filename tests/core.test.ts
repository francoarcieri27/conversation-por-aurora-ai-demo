import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSession, signSession } from '../lib/session.ts'
import { consumeSSE, visibleAnswer, cleanAnswer, publicStream } from '../lib/stream.ts'
const secret = 'test-secret-at-least-32-characters'
test('session cannot be forged, changed or reused with another key', () => {
  const id = '12345678-1234-1234-1234-123456789abc'
  const token = signSession(id, secret)
  assert.equal(resolveSession(token, secret), id)
  for (const invalid of [id, token.replace('1234', '9999'), undefined, token + 'a']) assert.notEqual(resolveSession(invalid, secret), id)
  assert.notEqual(resolveSession(token, 'different-secret'), id)
})
const stream = (chunks: Uint8Array[]) => new Response(new ReadableStream({ start(c) { chunks.forEach(x => c.enqueue(x)); c.close() } }))
test('SSE survives splits at every UTF-8 byte and CRLF delimiter', async () => {
  const bytes = new TextEncoder().encode(': ping\r\n\r\ndata: {"event":"message","answer":"¡México! 🥰"}\r\n\r\ndata: {"event":"message_end"}\n\n')
  const events: any[] = []
  await consumeSSE(stream(Array.from(bytes, x => new Uint8Array([x]))), event => events.push(event))
  assert.equal(events.length, 2)
  assert.equal(events[0].answer, '¡México! 🥰')
})
test('SSE errors and malformed payloads reject', async () => {
  for (const data of ['data: {"event":"error","status":500}\n\n', 'data: invalid\n\n']) await assert.rejects(consumeSSE(stream([new TextEncoder().encode(data)]), () => {}))
})
test('split reasoning is suppressed and short visible answers survive', () => {
  const f = visibleAnswer()
  assert.equal(['<th','ink>private', ' reasoning</thi', 'nk>Hola'].map(x => f.push(x)).join(''), 'Hola')
  const short = visibleAnswer()
  assert.equal(short.push('Sí'), 'Sí')
  const unfinished = visibleAnswer()
  assert.equal(unfinished.push('<think>secret'), '')
  assert.equal(unfinished.finish(), '')
})

test('history and replacement answers suppress complete and unfinished reasoning', () => {
  assert.equal(cleanAnswer('<think>private</think>Hola'), 'Hola')
  assert.equal(cleanAnswer('untagged private</think>Hola'), 'Hola')
  assert.equal(cleanAnswer('<think>unfinished'), '')
  assert.equal(cleanAnswer('Normal reply'), 'Normal reply')
})

test('public stream removes reasoning and workflow internals before reaching the browser', async () => {
  const events = [
    { event: 'node_started', data: { inputs: { prompt: 'private prompt' } } },
    { event: 'message', message_id: 'm1', answer: '<think>secret' },
    { event: 'message', message_id: 'm1', answer: '</think>Hola' },
    { event: 'message_replace', message_id: 'm1', answer: '<think>secret</think>Hola final' },
    { event: 'message_end', message_id: 'm1', metadata: { reasoning: 'secret' } },
  ]
  const upstream = stream([new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join(''))])
  const data = await new Response(publicStream(upstream)).text()
  assert.ok(data.includes('Hola final'))
  for (const hidden of ['secret', 'private prompt', 'node_started', 'reasoning']) assert.ok(!data.includes(hidden))
  assert.ok(data.includes('"id":"m1"'))
})
