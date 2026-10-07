import { publicStream } from '@/lib/stream'
import type { NextRequest } from 'next/server'
import { ApiError, dify, errorResponse, getInfo, rateLimit, requireSameOrigin, setSession, validId } from '@/app/api/utils/common'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request)
    if (Number(request.headers.get('content-length')) > 65536) throw new ApiError(413, 'too_large', 'Mensaje demasiado grande. / Message too large.')
    const body = await request.json().catch(() => { throw new ApiError(400, 'invalid_json', 'JSON inválido. / Invalid JSON.') })
    if (typeof body?.query !== 'string' || !body.query.trim() || body.query.length > 8000 || !body.inputs || typeof body.inputs !== 'object' || Array.isArray(body.inputs)) throw new ApiError(400, 'invalid_message', 'Mensaje inválido. / Invalid message.')
    if (body.conversation_id) validId(body.conversation_id)
    if (body.files && (!Array.isArray(body.files) || body.files.length > 3 || body.files.some((file: any) => file.transfer_method !== 'local_file' || typeof file.upload_file_id !== 'string'))) throw new ApiError(400, 'invalid_files', 'Solo archivos cargados, máximo 3. / Uploaded files only, maximum 3.')
    const { user, sessionId } = getInfo(request)
    rateLimit(user)
    const res = await dify('chat-messages', user, { method: 'POST', body: { inputs: body.inputs, query: body.query, conversation_id: body.conversation_id || '', files: body.files || [], response_mode: 'streaming' }, signal: AbortSignal.any([request.signal, AbortSignal.timeout(55000)]) })
    return new Response(publicStream(res), { headers: { ...setSession(sessionId), 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Accel-Buffering': 'no' } })
  } catch (error) { return errorResponse(error) }
}
