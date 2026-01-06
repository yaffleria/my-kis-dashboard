import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/ip
 * 클라이언트 IP 주소 조회
 */
export async function GET(request: NextRequest) {
  // Next.js에서 제공하는 헤더에서 IP 추출
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  // x-forwarded-for는 쉼표로 구분된 IP 목록일 수 있음 (첫 번째가 실제 클라이언트)
  let clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1'

  // 로컬 개발 환경에서는 ::1 또는 127.0.0.1이 반환됨
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1'
  }

  return NextResponse.json({
    success: true,
    ip: clientIp,
  })
}
