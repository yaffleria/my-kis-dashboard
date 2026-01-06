'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { FixedSizeList as VirtualList } from 'react-window'
import { useDashboardStore } from '@/store'
import { useBalanceQuery, useFormatters } from '@/hooks'
import { Button, LoadingSpinner } from '@/components'
import type { PortfolioSummary, StockWeight } from '@/types'

// --- Terminal Components ---

// --- Terminal Components ---
const maskAccountNo = (accNo: string) => {
  if (!accNo) return ''
  const clean = accNo.replace(/[^0-9]/g, '')
  if (clean.length <= 5) return clean
  return `${clean.substring(0, 3)}****${clean.substring(clean.length - 2)}`
}

const TerminalHeader = ({ title, ip, status }: { title: string; ip: string; status: string }) => (
  <div className="border border-brew-green bg-terminal-bg p-1 px-3 mb-6 flex justify-between items-center text-brew-green font-mono select-none text-sm shrink-0">
    <div className="font-bold tracking-wider uppercase px-2 bg-brew-green text-terminal-bg">{title}</div>
    <div className="flex gap-4 text-xs opacity-80">
      <span>STATUS: {status}</span>
      <span>IP: {ip}</span>
    </div>
  </div>
)

const TerminalPanel = ({
  title,
  children,
  className = '',
  scrollable = false,
}: {
  title: string
  children: React.ReactNode
  className?: string
  scrollable?: boolean
}) => (
  <div className={`border border-brew-green bg-terminal-bg flex flex-col ${className}`}>
    <div className="border-b border-brew-green bg-brew-green/10 p-1 px-3 shrink-0">
      <h3 className="text-brew-green font-bold text-sm tracking-wide uppercase">{title}</h3>
    </div>
    <div className={`p-3 flex-1 ${scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}>
      {children}
    </div>
  </div>
)

const DataField = ({
  label,
  value,
  unit = '',
  className = '',
}: {
  label: string
  value: string
  unit?: string
  className?: string
}) => (
  <div className="mb-0">
    <div className="text-brew-green/70 text-[10px] uppercase mb-0.5">{label}</div>
    <div className={`text-xl font-bold tracking-wider truncate ${className || 'text-brew-neon-green'}`}>
      {value} <span className="text-xs font-normal text-brew-green">{unit}</span>
    </div>
  </div>
)

// Canvas-based Matrix Rain Animation
const MatrixRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth
        canvas.height = canvas.parentElement.clientHeight
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Matrix characters (Katakana + Numbers + Roman)
    const chars =
      'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const charArray = chars.split('')

    const fontSize = 12
    const columns = Math.ceil(canvas.width / fontSize)
    const drops: number[] = []

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -canvas.height) // Start from random positions above
    }

    const draw = () => {
      // Semi-transparent black to create trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#33ff00' // Terminal Green
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize

        ctx.fillText(text, x, y)

        // Reset drop if it hits bottom (randomly)
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }

        drops[i]++
      }
    }

    const interval = setInterval(draw, 33) // ~30fps

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className="w-full h-20 relative overflow-hidden bg-black border-y border-brew-green/20 my-2">
      <canvas
        ref={canvasRef}
        className="block w-full h-full opacity-80"
      />
      <div className="absolute top-1 right-2 text-[8px] text-brew-green opacity-70 animate-pulse bg-black px-1">
        SYS.MATRIX // ACTIVE
      </div>
    </div>
  )
}

// Right Column Content
const SystemStatusPanel = ({
  formatCurrency,
  formatPercent,
  portfolioSummary,
  className = '',
}: {
  formatCurrency: (val: number) => string
  formatPercent: (val: number) => string
  portfolioSummary: PortfolioSummary | null
  className?: string
}) => {
  return (
    <TerminalPanel
      title="System Status"
      className={`h-auto shrink-0 ${className}`}
    >
      {/* Metrics & Animated Art */}
      <div className="flex flex-col min-h-35">
        <div className="flex gap-16 mb-2">
          <DataField
            label="Invested Total Value"
            value={portfolioSummary ? formatCurrency(portfolioSummary.totalAsset) : '0'}
            unit="KRW"
          />
          <DataField
            label="Net Profit/Loss"
            value={portfolioSummary ? formatCurrency(portfolioSummary.totalProfitLossAmount) : '0'}
            unit="KRW"
            className={(portfolioSummary?.totalProfitLossAmount || 0) < 0 ? 'text-brew-red' : ''}
          />
        </div>

        {/* Dynamic Space Filler: Matrix Rain */}
        <div className="flex-1 relative flex flex-col justify-end">
          <MatrixRain />
        </div>
      </div>

      {/* Compact ROI Bar */}
      <div className="mt-3 border-t border-terminal-border pt-2 bg-terminal-bg px-2 pb-2">
        <div className="flex justify-between items-end mb-1">
          <span className="text-brew-green uppercase text-xs">Return on Investment</span>
          <span
            className={`text-lg font-bold ${portfolioSummary && portfolioSummary.totalProfitLossRate >= 0 ? 'text-brew-green' : 'text-brew-red'}`}
          >
            {portfolioSummary ? formatPercent(portfolioSummary.totalProfitLossRate) : '0.00%'}
          </span>
        </div>
        <div className="relative h-4 bg-terminal-border w-full overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-terminal-muted z-10" />
          {portfolioSummary && (
            <div
              className={`absolute top-0 bottom-0 transition-all duration-500 ${portfolioSummary.totalProfitLossRate >= 0 ? 'bg-brew-green left-1/2' : 'bg-brew-red right-1/2'}`}
              style={{
                width: `${Math.min(50, Math.abs(portfolioSummary.totalProfitLossRate))}%`,
                left: portfolioSummary.totalProfitLossRate >= 0 ? '50%' : undefined,
                right: portfolioSummary.totalProfitLossRate < 0 ? '50%' : undefined,
              }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-terminal-muted mt-0.5 font-mono">
          <span>-50%</span>
          <span>0%</span>
          <span>+50%</span>
        </div>
      </div>
    </TerminalPanel>
  )
}

// --- Types ---
interface Holding {
  stockCode: string
  stockName: string
  quantity: number | string
  currentPrice: number
  evaluationAmount: number | string
  buyAmount: number | string
  profitLossRate: number
}

interface BalanceSummary {
  totalBuyAmount: number
  totalProfitLossAmount: number
  totalEvaluationAmount: number
  totalAsset: number
  totalProfitLossRate: number
}

interface Balance {
  account: {
    accountNo: string
    productCode: string
    accountName: string
  }
  summary: BalanceSummary
  holdings: Holding[]
}

interface NewsItem {
  id: number
  date: string
  time: string
  title: string
  code: string
  url?: string
}

// ... existing components with types fixed ...

// --- Active Portfolios Component ---
const ActivePortfolios = ({
  balances,
  formatCurrency,
  formatPercent,
}: {
  balances: Balance[]
  formatCurrency: (val: number) => string
  formatPercent: (val: number) => string
}) => {
  return (
    <div className="flex flex-col gap-4">
      {balances.map((balance, index) => {
        const profitRate =
          balance.summary.totalBuyAmount > 0
            ? (balance.summary.totalProfitLossAmount / balance.summary.totalBuyAmount) * 100
            : 0
        const isPositive = profitRate >= 0

        return (
          <div
            key={`${balance.account.accountNo}-${balance.account.productCode}-${index}`}
            className="border border-terminal-border p-3 hover:border-brew-green transition-colors group"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="text-brew-green font-bold">{balance.account.accountName}</div>
              <div className="text-xs text-terminal-muted">
                {maskAccountNo(balance.account.accountNo)}-{balance.account.productCode}
              </div>
            </div>
            {/* 2-Column Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-terminal-muted uppercase">Eval Value</div>
                <div className="text-terminal-text">{formatCurrency(balance.summary.totalEvaluationAmount)}</div>
              </div>
              <div>
                <div className="text-xs text-terminal-muted uppercase">P/L</div>
                <div className={`${isPositive ? 'text-brew-green' : 'text-brew-red'}`}>
                  {formatCurrency(balance.summary.totalProfitLossAmount)}
                  <span className="text-xs ml-1">({formatPercent(profitRate)})</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Holdings Table Component with Sort ---
interface HoldingsRow {
  stockCode: string
  stockName: string
  quantity: number
  currentPrice: number
  evaluationAmount: number
  profitLossRate: number
}

const HoldingsTable = ({
  balances,
  formatCurrency,
  formatPercent,
}: {
  stockWeights: StockWeight[]
  balances: Balance[]
  formatCurrency: (val: number) => string
  formatPercent: (val: number) => string
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  // 데이터 통합 및 매핑 (모든 계좌의 잔고 합산)
  const rows = useMemo(() => {
    const aggregatedInfo: Record<
      string,
      {
        stockName: string
        quantity: number
        currentPrice: number
        evaluationAmount: number
        totalBuyAmount: number
      }
    > = {}

    balances.forEach((balance) => {
      balance.holdings.forEach((holding) => {
        if (!holding.stockCode) return

        const code = holding.stockCode
        if (!aggregatedInfo[code]) {
          aggregatedInfo[code] = {
            stockName: holding.stockName,
            quantity: 0,
            currentPrice: holding.currentPrice,
            evaluationAmount: 0,
            totalBuyAmount: 0,
          }
        }

        const info = aggregatedInfo[code]
        info.quantity += Number(holding.quantity)
        info.evaluationAmount += Number(holding.evaluationAmount)
        info.totalBuyAmount += Number(holding.buyAmount)
      })
    })

    return Object.keys(aggregatedInfo).map((code) => {
      const info = aggregatedInfo[code]
      const profitLossRate =
        info.totalBuyAmount > 0 ? ((info.evaluationAmount - info.totalBuyAmount) / info.totalBuyAmount) * 100 : 0

      return {
        stockCode: code,
        stockName: info.stockName,
        quantity: info.quantity,
        currentPrice: info.currentPrice,
        evaluationAmount: info.evaluationAmount,
        profitLossRate: profitLossRate,
      }
    })
  }, [balances])

  // 정렬 로직 & Render ...
  // (Rest of the component uses 'rows' via specific types in sort)

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows

    return [...rows].sort((a, b) => {
      const fieldA = a[sortConfig.key as keyof HoldingsRow]
      const fieldB = b[sortConfig.key as keyof HoldingsRow]
      if (fieldA < fieldB) return sortConfig.direction === 'asc' ? -1 : 1
      if (fieldA > fieldB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortConfig])

  // ... (rest of render)
  // Re-implementing simplified return to fit replacement block strictness if needed,
  // but better to target the 'const ActivePortfolios ...' start to 'const NewsFeed ...' start.

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  return (
    <table className="w-full text-left text-sm relative">
      <thead className="sticky top-0 bg-terminal-bg z-10 shadow-sm shadow-terminal-border">
        <tr className="text-terminal-muted border-b border-terminal-border">
          <th
            className="py-2 cursor-pointer group hover:text-brew-green transition-colors select-none"
            onClick={() => handleSort('stockName')}
          >
            SYMBOL{' '}
            <SortIcon
              colKey="stockName"
              sortConfig={sortConfig}
            />
          </th>
          <th
            className="py-2 text-right cursor-pointer group hover:text-brew-green transition-colors select-none"
            onClick={() => handleSort('quantity')}
          >
            QTY{' '}
            <SortIcon
              colKey="quantity"
              sortConfig={sortConfig}
            />
          </th>
          <th
            className="py-2 text-right cursor-pointer group hover:text-brew-green transition-colors select-none"
            onClick={() => handleSort('currentPrice')}
          >
            PRICE{' '}
            <SortIcon
              colKey="currentPrice"
              sortConfig={sortConfig}
            />
          </th>
          <th
            className="py-2 text-right cursor-pointer group hover:text-brew-green transition-colors select-none"
            onClick={() => handleSort('evaluationAmount')}
          >
            VALUE{' '}
            <SortIcon
              colKey="evaluationAmount"
              sortConfig={sortConfig}
            />
          </th>
          <th
            className="py-2 text-right cursor-pointer group hover:text-brew-green transition-colors select-none"
            onClick={() => handleSort('profitLossRate')}
          >
            ROI{' '}
            <SortIcon
              colKey="profitLossRate"
              sortConfig={sortConfig}
            />
          </th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {sortedRows.map((row) => {
          const isPos = row.profitLossRate >= 0
          return (
            <tr
              key={row.stockCode}
              className="border-b border-terminal-border/30 hover:bg-brew-green/5 transition-colors"
            >
              <td className="py-2 text-brew-green font-bold">{row.stockName}</td>
              <td className="py-2 text-right text-terminal-text">{row.quantity}</td>
              <td className="py-2 text-right text-terminal-text">{formatCurrency(row.currentPrice)}</td>
              <td className="py-2 text-right text-terminal-text">{formatCurrency(row.evaluationAmount)}</td>
              <td className={`py-2 text-right ${isPos ? 'text-brew-green' : 'text-brew-red'}`}>
                {formatPercent(row.profitLossRate)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// --- News Feed Component (Virtualized) ---
const NewsFeed = () => {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(300)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/news')
        const data = await res.json()
        if (data.success) {
          setNews((prev) => {
            // Filter out items already in the list by ID
            const newItems = data.data.filter((item: NewsItem) => !prev.some((existing) => existing.id === item.id))
            // Combine and sort by date/time (Finnhub typically returns newest first)
            const combined = [...newItems, ...prev]
            return combined.slice(0, 50) // Keep top 50
          })
        }
      } catch (err) {
        console.error('Failed to fetch news', err)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchNews()

    // Poll news every 1 minute (matching API revalidation)
    const interval = setInterval(fetchNews, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight
        if (height > 0) {
          setContainerHeight(height)
        }
      }
    }

    // Initial calculation with delay to ensure layout is complete
    const timer = setTimeout(updateHeight, 100)

    // Use ResizeObserver for more reliable height detection
    const resizeObserver = new ResizeObserver(updateHeight)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener('resize', updateHeight)
    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [loading]) // Re-run when loading state changes

  const NewsRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = news[index]
      const handleClick = () => {
        if (item.url) {
          window.open(item.url, '_blank', 'noopener,noreferrer')
        }
      }
      return (
        <div
          style={style}
          className="border-b border-terminal-border/50 hover:bg-terminal-border/20 transition-colors p-2 cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex justify-between items-center text-[10px] text-terminal-muted mb-0.5">
            <span>
              {item.date} {item.time.substring(0, 2)}:{item.time.substring(2, 4)}
            </span>
            {item.code && <span className="text-brew-blue">[{item.code}]</span>}
          </div>
          <div className="text-sm text-terminal-text hover:text-brew-green transition-colors line-clamp-2">
            {item.title}
          </div>
        </div>
      )
    },
    [news]
  )

  if (loading) return <div className="text-terminal-muted p-4 animate-pulse">Scanning news frequencies...</div>

  if (news.length === 0) {
    return (
      <div className="text-terminal-muted p-4 text-center text-xs opacity-60">
        No active news feed available.
        <br />
        (Add FINNHUB_API_KEY to .env)
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-50"
    >
      <VirtualList
        height={containerHeight}
        width="100%"
        itemCount={news.length}
        itemSize={60}
      >
        {NewsRow}
      </VirtualList>
    </div>
  )
}

// --- Main Page ---

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'

// ... (previous imports remain, ensure CHART_COLORS is imported if not already, or define it locally if import fails. Actually, I need to add CHART_COLORS to the import from '@/store')

// Palette: Green-Teal monochromatic gradient - maintains terminal aesthetic with clear distinction
const TERMINAL_CHART_COLORS = [
  '#33ff00', // Neon Green (brightest)
  '#00ff88', // Mint Green
  '#00ddaa', // Teal
  '#00bbcc', // Cyan-Teal
  '#22cc66', // Medium Green
  '#44aa44', // Forest Green
  '#66dd88', // Light Green
  '#00ff55', // Spring Green
  '#11ee99', // Aquamarine
  '#33cc77', // Sea Green
  '#55ffaa', // Pale Green
  '#00aa66', // Dark Teal
]

const SortIcon = ({
  colKey,
  sortConfig,
}: {
  colKey: string
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null
}) => {
  if (sortConfig?.key !== colKey)
    return <span className="text-terminal-muted ml-1 opacity-0 group-hover:opacity-50">⇅</span>
  return <span className="text-brew-green ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
}

const CustomChartTooltip = ({
  active,
  payload,
  formatCurrency,
}: {
  active?: boolean
  payload?: readonly { payload: { name: string; value: number } }[]
  formatCurrency: (val: number) => string
}) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0].payload
    return (
      <div className="bg-terminal-bg border border-brew-green p-2 text-xs shadow-lg z-50">
        <div className="font-bold text-brew-green mb-1">{name}</div>
        <div className="text-terminal-text">{formatCurrency(value)}</div>
      </div>
    )
  }
  return null
}

const TerminalPieChart = ({
  data,
  formatCurrency,
}: {
  data: { name: string; value: number }[]
  title: string
  formatCurrency: (val: number) => string
}) => {
  // Filter tiny segments and group them into "Others" if needed
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const total = data.reduce((sum, d) => sum + d.value, 0)
    const threshold = total * 0.02 // Group segments smaller than 2%

    const mainSegments = []
    let othersValue = 0

    data.forEach((d) => {
      if (d.value >= threshold) {
        mainSegments.push(d)
      } else {
        othersValue += d.value
      }
    })

    if (othersValue > 0) {
      mainSegments.push({ name: 'Others', value: othersValue })
    }

    return mainSegments
      .sort((a, b) => b.value - a.value)
      .map((d, i) => ({ ...d, fill: TERMINAL_CHART_COLORS[i % TERMINAL_CHART_COLORS.length] }))
  }, [data])

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const handle = requestAnimationFrame(() => setIsMounted(true))
    return () => cancelAnimationFrame(handle)
  }, [])

  if (!isMounted) return <div className="w-full h-full min-h-50" />

  return (
    <div className="w-full h-full min-h-50 flex flex-col">
      <div className="flex-1 w-full relative">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={200}
        >
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={140}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive={false}
              labelLine={{ stroke: '#33ff00', strokeWidth: 1 }}
              label={({ cx, cy, midAngle, outerRadius, name, percent }) => {
                const RADIAN = Math.PI / 180
                // outerRadius보다 살짝 바깥에 위치하도록 조정
                const radius = outerRadius + 25
                const x = cx + radius * Math.cos(-(midAngle || 0) * RADIAN)
                const y = cy + radius * Math.sin(-(midAngle || 0) * RADIAN)

                return (
                  <text
                    x={x}
                    y={y}
                    fill="#33ff00"
                    // 각도에 따라 텍스트 정렬 방향 결정
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    className="text-[10px] font-mono font-bold"
                  >
                    {`${name} ${((percent || 0) * 100).toFixed(1)}%`}
                  </text>
                )
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill || TERMINAL_CHART_COLORS[index % TERMINAL_CHART_COLORS.length]}
                  stroke="#0a0a0a"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <RechartsTooltip
              isAnimationActive={false}
              cursor={{ fill: 'transparent' }}
              content={(props) => (
                <CustomChartTooltip
                  {...props}
                  formatCurrency={formatCurrency}
                />
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ... (DashboardPage implementation)

export default function DashboardPage() {
  const { balances, portfolioSummary, stockWeights, isLoading, error, lastUpdated } = useDashboardStore()
  const { refetch, isFetching } = useBalanceQuery()
  const { formatCurrency, formatPercent } = useFormatters()
  const [logs, setLogs] = useState<{ time: string; msg: string; type: 'info' | 'success' | 'error' }[]>([])
  const [clientIp, setClientIp] = useState<string>('...')
  const lastLogTimestamp = useRef<string>('')

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false })
    setLogs((prev) => [{ time, msg, type }, ...prev].slice(0, 100))
  }

  // Fetch server logs with polling
  useEffect(() => {
    const fetchServerLogs = async () => {
      try {
        const url = lastLogTimestamp.current
          ? `/api/logs?since=${encodeURIComponent(lastLogTimestamp.current)}`
          : '/api/logs'
        const res = await fetch(url)
        const data = await res.json()

        if (data.success && data.logs.length > 0) {
          // Update last timestamp
          lastLogTimestamp.current = data.logs[0].timestamp
          // Add new logs (they come newest first)
          setLogs((prev) => {
            const newLogs = data.logs.filter((log: { msg: string }) => !prev.some((p) => p.msg === log.msg))
            return [...newLogs, ...prev].slice(0, 100)
          })
        }
      } catch (e) {
        console.error('Failed to fetch server logs:', e)
      }
    }

    // Initial fetch
    fetchServerLogs()

    // Poll every 3 seconds
    const interval = setInterval(fetchServerLogs, 3000)
    return () => clearInterval(interval)
  }, [])

  // Initial data fetch and IP lookup
  useEffect(() => {
    refetch()
    setTimeout(() => addLog('Client initialization started...', 'info'), 0)

    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.ip) {
          setClientIp(data.ip)
          setTimeout(() => addLog(`Client IP resolved: ${data.ip}`, 'info'), 0)
        }
      })
      .catch(() => setClientIp('UNKNOWN'))
  }, [refetch])

  useEffect(() => {
    if (lastUpdated) {
      setTimeout(() => addLog(`Data synchronization complete. Timestamp: ${lastUpdated}`, 'success'), 0)
    }
  }, [lastUpdated])

  // --- Data Preparation for Charts ---
  const accountComposition = useMemo(() => {
    return balances.map((b) => ({
      name: b.account.accountName,
      value: b.summary.totalEvaluationAmount,
    }))
  }, [balances])

  const holdingsComposition = useMemo(() => {
    const map = new Map<string, number>()
    balances.forEach((b) => {
      b.holdings.forEach((h) => {
        if (!h.stockCode) return
        map.set(h.stockName, (map.get(h.stockName) || 0) + Number(h.evaluationAmount))
      })
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [balances])

  if (error && !isLoading && balances.length === 0) {
    return (
      // ... (Error View)
      <div className="min-h-screen p-8 font-mono text-brew-red border border-brew-red m-4">
        <h1 className="text-2xl font-bold mb-4">CRITICAL SYSTEM ERROR</h1>
        <p>{error}</p>
        <Button
          onClick={() => refetch()}
          className="mt-4 border-brew-red text-brew-red hover:bg-brew-red/20"
        >
          RETRY CONNECTION
        </Button>
      </div>
    )
  }

  if (isLoading && balances.length === 0) {
    return (
      // ... (Loading View)
      <div className="h-screen w-full flex flex-col items-center justify-center text-brew-green font-mono bg-terminal-bg">
        <LoadingSpinner />
        <div className="mt-4 animate-pulse">ESTABLISHING SECURE CONNECTION...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full min-w-480 bg-terminal-bg text-terminal-text font-mono flex flex-col overflow-hidden">
      <TerminalHeader
        title="Blanc"
        ip={clientIp}
        status={isFetching ? 'SYNCING...' : 'ONLINE'}
      />

      <div className="flex flex-1 gap-6 overflow-hidden relative">
        <div className="flex flex-col gap-6 flex-1 h-full overflow-hidden min-w-0">
          <SystemStatusPanel
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            portfolioSummary={portfolioSummary}
          />

          <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
            {/* Active Accounts Column (Split Top/Bottom) */}
            <div className="flex flex-col gap-6 w-112.5 shrink-0 h-full">
              <TerminalPanel
                title="Active Accounts"
                className="flex-1 min-h-0"
                scrollable
              >
                <ActivePortfolios
                  balances={balances}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                />
              </TerminalPanel>

              <TerminalPanel
                title="Account Composition"
                className="flex-1 min-h-0"
              >
                <TerminalPieChart
                  data={accountComposition}
                  title="Account Share"
                  formatCurrency={formatCurrency}
                />
              </TerminalPanel>
            </div>

            {/* Holdings Matrix Column (Split Top/Bottom) */}
            <div className="flex flex-col gap-6 flex-1 min-w-0 h-full">
              <TerminalPanel
                title="Holdings Matrix"
                className="flex-1 min-h-0"
                scrollable
              >
                <HoldingsTable
                  balances={balances}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                  stockWeights={stockWeights}
                />
              </TerminalPanel>

              <TerminalPanel
                title="Portfolio Weight"
                className="flex-1 min-h-0"
              >
                <TerminalPieChart
                  data={holdingsComposition}
                  title="Asset Allocation"
                  formatCurrency={formatCurrency}
                />
              </TerminalPanel>
            </div>
          </div>
        </div>

        {/* Right Column (News & Logs) */}
        <div className="w-150 shrink-0 hidden xl:flex flex-col gap-6 h-full">
          <TerminalPanel
            title="Market News Feed"
            className="flex-2 min-h-0"
          >
            <NewsFeed />
          </TerminalPanel>
          <TerminalPanel
            title="System Log"
            className="flex-1 min-h-0"
          >
            <SystemLog logs={logs} />
          </TerminalPanel>
        </div>
      </div>
    </div>
  )
}

// --- System Log Component (Virtualized) ---
const SystemLog = ({ logs }: { logs: { time: string; msg: string; type: 'info' | 'success' | 'error' }[] }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(200)

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight || 200)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  if (logs.length === 0) {
    return <div className="text-terminal-muted p-2">No logs yet...</div>
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-25"
    >
      <VirtualList
        height={containerHeight}
        width="100%"
        itemCount={logs.length}
        itemSize={28}
      >
        {({ index, style }) => {
          const log = logs[index]
          const color =
            log.type === 'success' ? 'text-brew-green' : log.type === 'error' ? 'text-brew-red' : 'text-brew-blue'
          return (
            <div
              style={style}
              className="font-mono text-sm overflow-hidden whitespace-nowrap text-ellipsis px-1"
            >
              <span className="text-brew-green/60">[{log.time}]</span> <span className={color}>{log.msg}</span>
            </div>
          )
        }}
      </VirtualList>
    </div>
  )
}
