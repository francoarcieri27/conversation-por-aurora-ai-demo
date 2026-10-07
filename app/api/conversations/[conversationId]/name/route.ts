import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ApiError, dify, errorResponse, getInfo, rateLimit, requireSameOrigin, setSession, validId } from '@/app/api/utils/common'
export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    requireSameOrigin(request)
    const { conversationId: id } = await params
    validId(id)
    const body = await request.json().catch(() => { throw new ApiError(400, 'invalid_json', 'Invalid JSON') })
    if (body.name && (typeof body.name !== 'string' || body.name.length > 100)) throw new ApiError(400, 'invalid_name', 'Invalid name')
    const { user, sessionId } = getInfo(request)
    rateLimit(user)
    const res = await dify(`conversations/${id}/name`, user, { method: 'POST', body: { name: body.name, auto_generate: body.auto_generate === true } })
    return NextResponse.json(await res.json(), { headers: setSession(sessionId) })
  } catch (error) { return errorResponse(error) }
}
