import { NextResponse } from 'next/server'
import { getServerLogs } from '@/lib/server-logger'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since') || undefined

  const logs = getServerLogs(since)

  return NextResponse.json({
    success: true,
    logs: logs.map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString('ko-KR'),
      msg: `[${log.source || 'SYS'}] ${log.message}`,
      type: log.level === 'error' ? 'error' : log.level === 'success' ? 'success' : 'info',
      timestamp: log.timestamp,
    })),
  })
}
