"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { StockChartDataPoint, StockChartResponse } from "@/types";
import { API_ENDPOINTS } from "@/lib/constants";

/**
 * 주가 차트 컴포넌트
 * Area Chart (종가) + Bar Chart (거래량) 조합
 */

export interface StockPriceChartProps {
  stockCode: string;
  stockName: string;
  onClose?: () => void;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: {
    value: number;
    dataKey: string;
    payload: StockChartDataPoint;
  }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-terminal-bg border border-brew-green p-2 text-xs shadow-lg z-50 font-mono">
      <div className="text-brew-green font-bold mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-terminal-muted">시가:</span>
        <span className="text-terminal-text text-right">
          {data.open.toLocaleString()}
        </span>
        <span className="text-terminal-muted">고가:</span>
        <span className="text-brew-red text-right">
          {data.high.toLocaleString()}
        </span>
        <span className="text-terminal-muted">저가:</span>
        <span className="text-brew-blue text-right">
          {data.low.toLocaleString()}
        </span>
        <span className="text-terminal-muted">종가:</span>
        <span className="text-brew-green font-bold text-right">
          {data.close.toLocaleString()}
        </span>
        <span className="text-terminal-muted">거래량:</span>
        <span className="text-terminal-text text-right">
          {data.volume.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function VolumeTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const volume = payload[0]?.value;
  if (typeof volume !== "number") return null;

  return (
    <div className="bg-terminal-bg border border-terminal-border p-1.5 text-xs shadow-lg z-50 font-mono">
      <div className="text-terminal-muted">{label}</div>
      <div className="text-brew-green">{volume.toLocaleString()}</div>
    </div>
  );
}

export function StockPriceChart({
  stockCode,
  stockName,
  onClose,
}: StockPriceChartProps) {
  const [data, setData] = useState<StockChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_ENDPOINTS.STOCK_CHART}?code=${encodeURIComponent(
            stockCode
          )}&days=180`
        );
        const result: StockChartResponse = await response.json();

        if (!result.success) {
          setError(result.error || "데이터를 불러올 수 없습니다.");
          setData([]);
        } else if (result.data.length === 0) {
          setError("차트 데이터가 없습니다.");
          setData([]);
        } else {
          setData(result.data);
        }
      } catch (err) {
        setError("네트워크 오류가 발생했습니다.");
        console.error("Chart fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (stockCode) {
      fetchChartData();
    }
  }, [stockCode]);

  // 차트 Y축 범위 계산 (최저가 ~ 최고가 with padding)
  const priceRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const prices = data.flatMap((d) => [d.high, d.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return {
      min: Math.floor(min - padding),
      max: Math.ceil(max + padding),
    };
  }, [data]);

  // 가격 변동률 계산
  const priceChange = useMemo(() => {
    if (data.length < 2) return { amount: 0, percent: 0 };
    const firstClose = data[0].close;
    const lastClose = data[data.length - 1].close;
    const amount = lastClose - firstClose;
    const percent = firstClose > 0 ? (amount / firstClose) * 100 : 0;
    return { amount, percent };
  }, [data]);

  const isPositive = priceChange.amount >= 0;

  return (
    <div className="h-full flex flex-col p-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-brew-green font-bold font-mono text-sm">
            {stockName} ({stockCode})
          </h3>
          {!loading && !error && data.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-terminal-muted">180D:</span>
              <span
                className={isPositive ? "text-brew-green" : "text-brew-red"}
              >
                {isPositive ? "+" : ""}
                {priceChange.amount.toLocaleString()}({isPositive ? "+" : ""}
                {priceChange.percent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-terminal-muted hover:text-brew-red transition-colors text-xs font-mono cursor-pointer"
          >
            [✕]
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-sm font-mono">
          <span className="animate-pulse">Loading chart data...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center text-terminal-muted text-sm font-mono border border-terminal-border/30 rounded">
          <div className="text-brew-yellow mb-1">⚠ NO DATA</div>
          <div className="text-xs">{error}</div>
          <div className="text-xs text-terminal-muted/60 mt-0.5">
            (매뉴얼 포트폴리오 또는 미지원 종목)
          </div>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && data.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 gap-1">
          {/* Price Area Chart */}
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="priceGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={isPositive ? "#33ff00" : "#f85149"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? "#33ff00" : "#f85149"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#888", fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#333" }}
                  tickFormatter={(value) => value.slice(5)} // MM-DD
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  domain={[priceRange.min, priceRange.max]}
                  tick={{ fill: "#888", fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#333" }}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value
                  }
                  width={45}
                />
                <RechartsTooltip
                  content={<ChartTooltip />}
                  cursor={{
                    stroke: "#33ff00",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? "#33ff00" : "#f85149"}
                  strokeWidth={1.5}
                  fill="url(#priceGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Bar Chart */}
          <div className="h-12 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 0, right: 5, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tick={false}
                  tickLine={false}
                  axisLine={{ stroke: "#333" }}
                />
                <YAxis
                  tick={{ fill: "#666", fontSize: 8 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000)
                      return `${(value / 1000000).toFixed(0)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value;
                  }}
                  width={45}
                />
                <RechartsTooltip content={<VolumeTooltip />} />
                <Bar
                  dataKey="volume"
                  fill="#3fb950"
                  opacity={0.6}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-terminal-muted font-mono px-1 shrink-0">
            <span>
              {data[0]?.date} ~ {data[data.length - 1]?.date}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 ${
                    isPositive ? "bg-brew-green" : "bg-brew-red"
                  }`}
                ></span>
                CLOSE
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-brew-green/60"></span>
                VOL
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
