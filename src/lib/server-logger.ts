// Server-side log storage for real-time log streaming to client
type LogLevel = 'info' | 'success' | 'error' | 'warn'

interface ServerLog {
  timestamp: string
  level: LogLevel
  message: string
  source?: string
}

// In-memory log storage (circular buffer)
const MAX_LOGS = 100
const logs: ServerLog[] = []

export function addServerLog(level: LogLevel, message: string, source?: string) {
  const timestamp = new Date().toISOString()
  const log: ServerLog = { timestamp, level, message, source }

  logs.unshift(log) // Add to beginning
  if (logs.length > MAX_LOGS) {
    logs.pop() // Remove oldest
  }

  // Also log to console for debugging
  const prefix = `[${source || 'SYSTEM'}]`
  if (level === 'error') {
    console.error(prefix, message)
  } else if (level === 'warn') {
    console.warn(prefix, message)
  } else {
    console.log(prefix, message)
  }
}

export function getServerLogs(since?: string): ServerLog[] {
  if (!since) return [...logs]

  const sinceDate = new Date(since).getTime()
  return logs.filter((log) => new Date(log.timestamp).getTime() > sinceDate)
}

export function clearServerLogs() {
  logs.length = 0
}

// Convenience functions
export const serverLog = {
  info: (message: string, source?: string) => addServerLog('info', message, source),
  success: (message: string, source?: string) => addServerLog('success', message, source),
  error: (message: string, source?: string) => addServerLog('error', message, source),
  warn: (message: string, source?: string) => addServerLog('warn', message, source),
}
