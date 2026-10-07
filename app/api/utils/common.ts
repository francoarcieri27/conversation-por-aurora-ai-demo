import 'server-only'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { APP_ID, APP_INFO } from '@/config'
import { resolveSession, signSession } from '@/lib/session'

const apiKey = process.env.DIFY_API_KEY?.trim() || ''
const apiUrl = process.env.DIFY_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || 'https://api.dify.ai/v1'
const secret = process.env.SESSION_SECRET || apiKey
export const configured = () => !!apiKey
export const getInfo = (request: NextRequest) => {
  const sessionId = resolveSession(request.cookies.get('session_id')?.value, secret)
  return { sessionId, user: `user_${APP_ID}:${sessionId}` }
}
export const setSession = (sessionId: string) => ({
  'Set-Cookie': `session_id=${signSession(sessionId, secret)}; Path=/; HttpOnly; SameSite=${APP_INFO.disable_session_same_site ? 'None' : 'Lax'}; Max-Age=2592000${process.env.NODE_ENV === 'production' || APP_INFO.disable_session_same_site ? '; Secure' : ''}`,
  'Cache-Control': 'no-store',
})
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message) }
}
export const errorResponse = (error: unknown) => {
  const known = error instanceof ApiError
  return NextResponse.json({ code: known ? error.code : 'service_unavailable', message: known ? error.message : 'El servicio no está disponible temporalmente. Inténtalo de nuevo. / Service temporarily unavailable. Please retry.' }, { status: known ? error.status : 502, headers: { 'Cache-Control': 'no-store' } })
}
export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if ((origin && new URL(origin).host !== (request.headers.get('host') || new URL(request.url).host)) || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new ApiError(403, 'forbidden', 'Solicitud no permitida. / Request not allowed.')
}
const requests = new Map<string, { count: number, expires: number }>()
export function rateLimit(user: string) {
  const now = Date.now()
  if (requests.size > 10000) for (const [key, item] of requests) if (item.expires < now) requests.delete(key)
  const item = requests.get(user)
  if (!item || item.expires < now) requests.set(user, { count: 1, expires: now + 60000 })
  else if (++item.count > 15) throw new ApiError(429, 'rate_limited', 'Espera un minuto antes de continuar. / Please wait a minute.')
}
export function validId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new ApiError(400, 'invalid_id', 'Identificador inválido. / Invalid identifier.')
}
export async function dify(path: string, user: string, options: { method?: string, body?: Record<string, unknown> | FormData, signal?: AbortSignal } = {}) {
  if (!configured()) throw new ApiError(503, 'not_configured', 'El asistente está en configuración. / The assistant is being configured.')
  const url = new URL(`${apiUrl.replace(/\/$/, '')}/${path}`)
  const method = options.method || 'GET'
  const form = options.body instanceof FormData
  if (method === 'GET') url.searchParams.set('user', user)
  const response = await fetch(url, {
    method, cache: 'no-store', signal: options.signal || AbortSignal.timeout(55000),
    headers: { Authorization: `Bearer ${apiKey}`, ...(!form ? { 'Content-Type': 'application/json' } : {}) },
    body: options.body ? form ? options.body as FormData : JSON.stringify({ ...options.body, user }) : undefined,
  })
  if (!response.ok) {
    console.error('Dify upstream status', response.status)
    const status = response.status === 429 ? 429 : response.status === 404 ? 404 : response.status === 400 ? 400 : 502
    throw new ApiError(status, 'upstream_error', status === 404 ? 'Conversación no encontrada. / Conversation not found.' : 'No se pudo completar la solicitud. Inténtalo de nuevo. / Unable to complete the request. Please retry.')
  }
  return response
}
