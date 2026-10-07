import { NextResponse } from 'next/server'
import { configured } from '@/app/api/utils/common'
export const dynamic = 'force-dynamic'
export function GET() {
  return NextResponse.json({ status: configured() ? 'configured' : 'not_configured', service: 'aurora-ai' }, { status: configured() ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}
