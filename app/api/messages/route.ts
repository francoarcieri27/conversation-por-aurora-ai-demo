import { cleanAnswer } from '@/lib/stream'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { dify, errorResponse, getInfo, setSession, validId } from '@/app/api/utils/common'
export async function GET(request: NextRequest) {
  try {
    const { sessionId, user } = getInfo(request)
    const id = new URL(request.url).searchParams.get('conversation_id')
    validId(id)
    const res = await dify(`messages?conversation_id=${id}&limit=100`, user)
    const data = await res.json()
    data.data = (data.data || []).map((item: any) => ({ ...item, answer: cleanAnswer(item.answer || ''), agent_thoughts: [] }))
    return NextResponse.json(data, { headers: setSession(sessionId) })
  } catch (error) { return errorResponse(error) }
}
