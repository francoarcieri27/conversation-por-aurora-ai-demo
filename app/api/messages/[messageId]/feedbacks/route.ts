import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ApiError, dify, errorResponse, getInfo, rateLimit, requireSameOrigin, setSession, validId } from '@/app/api/utils/common'
export async function POST(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    requireSameOrigin(request)
    const { messageId: id } = await params
    validId(id)
    const body = await request.json().catch(() => { throw new ApiError(400, 'invalid_json', 'Invalid JSON') })
    if (![null, 'like', 'dislike'].includes(body.rating)) throw new ApiError(400, 'invalid_rating', 'Invalid rating')
    const { user, sessionId } = getInfo(request)
    rateLimit(user)
    const res = await dify(`messages/${id}/feedbacks`, user, { method: 'POST', body: { rating: body.rating } })
    return NextResponse.json(await res.json(), { headers: setSession(sessionId) })
  } catch (error) { return errorResponse(error) }
}
