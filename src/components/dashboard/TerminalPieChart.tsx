'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'
import type { ChartDataItem } from '@/types'
import { TERMINAL_CHART_COLORS } from '@/lib/constants'

/**
 * 터미널 스타일 파이 차트 컴포넌트
 * 반응형 도넛 차트 with 터미널 테마
 */

export interface TerminalPieChartProps {
  data: ChartDataItem[]
  title: string
  formatCurrency: (val: number) => string
}

// 커스텀 툴팁 컴포넌트
function CustomChartTooltip({
  active,
  payload,
  formatCurrency,
}: {
  active?: boolean
  payload?: readonly { payload: ChartDataItem }[]
  formatCurrency: (val: number) => string
}) {
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

export function TerminalPieChart({ data, formatCurrency }: TerminalPieChartProps) {
  // Filter tiny segments and group them into "Others" if needed
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const total = data.reduce((sum, d) => sum + d.value, 0)
    const threshold = total * 0.02 // Group segments smaller than 2%

    const mainSegments: ChartDataItem[] = []
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

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateDimensions = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    // 초기 측정 (약간의 지연으로 레이아웃 안정화 대기)
    const timer = setTimeout(updateDimensions, 50)

    const observer = new ResizeObserver(updateDimensions)
    observer.observe(el)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  const isReady = dimensions.width > 0 && dimensions.height > 0

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-50 flex flex-col"
    >
      {!isReady ? (
        <div className="flex-1 w-full flex items-center justify-center text-terminal-muted text-xs">
          Initializing chart...
        </div>
      ) : (
        <PieChart
          width={dimensions.width}
          height={dimensions.height}
        >
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={Math.min(dimensions.width, dimensions.height) / 2 - 60}
            paddingAngle={2}
            dataKey="value"
            isAnimationActive={false}
            labelLine={{ stroke: '#33ff00', strokeWidth: 1 }}
            label={({ cx, cy, midAngle, outerRadius, name, percent }) => {
              const RADIAN = Math.PI / 180
              const radius = outerRadius + 20
              const x = cx + radius * Math.cos(-(midAngle || 0) * RADIAN)
              const y = cy + radius * Math.sin(-(midAngle || 0) * RADIAN)

              return (
                <text
                  x={x}
                  y={y}
                  fill="#33ff00"
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
      )}
    </div>
  )
}
