import type { Metadata } from 'next'
import './globals.css'
import { Providers, EnvInitializer } from '@/components'

export const metadata: Metadata = {
  title: 'Blanc',
  description: '한국투자증권 Open API를 활용한 실시간 계좌 모니터링 대시보드',
  keywords: ['한국투자증권', 'Open API', '주식', '투자', '포트폴리오', '대시보드'],
  authors: [{ name: 'yaffleria' }],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className="dark"
      suppressHydrationWarning
    >
      <head>
        {/* D2Coding 폰트 */}
        <link
          href="https://cdn.jsdelivr.net/gh/joungkyun/font-d2coding@1.3.2/d2coding.css"
          rel="stylesheet"
          type="text/css"
        />
        {/* JetBrains Mono 폰트 (폴백) */}
        <link
          href="https://cdn.jsdelivr.net/npm/jetbrains-mono@1.0.6/css/jetbrains-mono.min.css"
          rel="stylesheet"
          type="text/css"
        />
      </head>
      <body
        className="antialiased bg-terminal-bg text-terminal-text"
        suppressHydrationWarning
      >
        <Providers>
          {/* 민감정보(appKey, appSecret) 제거 후 전달 */}
          <EnvInitializer
            envAccountsJson={(() => {
              try {
                const raw = process.env.KIS_ACCOUNTS
                if (!raw) return undefined
                const parsed = JSON.parse(raw)
                if (!Array.isArray(parsed)) return undefined
                // appKey, appSecret 제거
                const sanitized = parsed.map(({ appKey: _, appSecret: __, ...rest }: Record<string, unknown>) => rest)
                return JSON.stringify(sanitized)
              } catch {
                return undefined
              }
            })()}
          />
          <main className="h-screen w-full p-12 overflow-hidden flex flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
