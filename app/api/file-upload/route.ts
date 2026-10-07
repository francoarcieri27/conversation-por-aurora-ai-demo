import type { NextRequest } from 'next/server'
import { ApiError, dify, errorResponse, getInfo, rateLimit, requireSameOrigin, setSession } from '@/app/api/utils/common'
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request)
    if (Number(request.headers.get('content-length')) > 4194304) throw new ApiError(413, 'too_large', 'Máximo 4 MB. / Maximum 4 MB.')
    const { user, sessionId } = getInfo(request)
    rateLimit(user)
    const incoming = await request.formData()
    const file = incoming.get('file')
    if (!(file instanceof File) || !file.size || file.size > 4000000 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'].includes(file.type)) throw new ApiError(400, 'invalid_file', 'Archivo no admitido (JPG, PNG, WEBP, PDF, TXT; máximo 4 MB). / Unsupported file (maximum 4 MB).')
    const form = new FormData()
    form.set('file', file)
    form.set('user', user)
    const res = await dify('files/upload', user, { method: 'POST', body: form })
    const data = await res.json()
    return new Response(data.id, { headers: setSession(sessionId) })
  } catch (error) { return errorResponse(error) }
}
