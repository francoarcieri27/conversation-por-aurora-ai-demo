import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { dify, errorResponse, getInfo, setSession } from '@/app/api/utils/common'
export async function GET(request: NextRequest) {
  try {
    const { sessionId, user } = getInfo(request)
    const res = await dify('parameters', user)
    return NextResponse.json(await res.json(), { headers: setSession(sessionId) })
  } catch (error) { return errorResponse(error) }
}
