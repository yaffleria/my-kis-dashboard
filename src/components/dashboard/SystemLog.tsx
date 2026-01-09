/**
 * 시스템 로그 컴포넌트
 * 실시간 시스템 로그 목록 표시
 */

import type { LogEntry } from '@/types'

export interface SystemLogProps {
  logs: LogEntry[]
}

export function SystemLog({ logs }: SystemLogProps) {
  if (logs.length === 0) {
    return <div className="text-terminal-muted p-2">No logs yet...</div>
  }

  return (
    <div className="h-full min-h-25 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-1">
      {logs.map((log, index) => {
        const color =
          log.type === 'success'
            ? 'text-brew-green'
            : log.type === 'error'
              ? 'text-brew-red'
              : log.type === 'network'
                ? 'text-yellow-400'
                : 'text-brew-blue'

        return (
          <div
            key={index}
            className="font-mono text-xs tracking-tight break-all leading-tight border-b border-terminal-border/10 pb-0.5 last:border-0"
          >
            <span className="text-brew-green/60 text-xs mr-2">[{log.time}]</span>
            <span className={color}>{log.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
