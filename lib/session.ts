import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export function signSession(id: string, secret: string) {
  return `${id}.${createHmac('sha256', secret).update(id).digest('hex')}`
}
export function resolveSession(token: string | undefined, secret: string) {
  const [id, signature] = (token || '').split('.')
  if (id && /^[0-9a-f-]{36}$/.test(id) && signature && /^[0-9a-f]{64}$/.test(signature)) {
    const expected = signSession(id, secret).split('.')[1]
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return id
  }
  return randomUUID()
}
