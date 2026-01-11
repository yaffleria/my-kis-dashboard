"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import type { DashboardBalance, HoldingsRow } from "@/types";
import { SortIcon, type SortConfig } from "@/components/ui";

/**
 * 보유 종목 테이블 컴포넌트
 * - 가상화 스크롤 적용 (react-window)
 * - 종목 클릭 시 하단에 90일 차트 표시 (고정 위치)
 */

const ROW_HEIGHT = 32; // 각 행의 높이 (px)
const HEADER_HEIGHT = 36; // 헤더 높이 (px)

export interface HoldingsTableProps {
  balances: DashboardBalance[];
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  /** 전체 자산 (비중 계산용) */
  portfolioTotalAsset?: number;
}

export function HoldingsTable({
  balances,
  formatCurrency,
  formatPercent,
  portfolioTotalAsset = 0,
}: HoldingsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "evaluationAmount",
    direction: "desc",
  });

  // 컨테이너 높이 측정
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // 데이터 통합 및 매핑 (모든 계좌의 잔고 합산)
  const rows = useMemo(() => {
    const aggregatedInfo: Record<
      string,
      {
        stockName: string;
        quantity: number;
        currentPrice: number;
        evaluationAmount: number;
        totalBuyAmount: number;
      }
    > = {};

    balances.forEach((balance) => {
      balance.holdings.forEach((holding) => {
        if (!holding.stockCode) return;

        const code = holding.stockCode;
        if (!aggregatedInfo[code]) {
          aggregatedInfo[code] = {
            stockName: holding.stockName,
            quantity: 0,
            currentPrice: holding.currentPrice,
            evaluationAmount: 0,
            totalBuyAmount: 0,
          };
        }

        const info = aggregatedInfo[code];
        info.quantity += Number(holding.quantity);
        info.evaluationAmount += Number(holding.evaluationAmount);
        info.totalBuyAmount += Number(holding.buyAmount);
      });
    });

    return Object.keys(aggregatedInfo).map((code) => {
      const info = aggregatedInfo[code];
      const profitLossRate =
        info.totalBuyAmount > 0
          ? ((info.evaluationAmount - info.totalBuyAmount) /
              info.totalBuyAmount) *
            100
          : 0;

      const totalAssetNum = portfolioTotalAsset;
      const weight =
        totalAssetNum > 0 ? (info.evaluationAmount / totalAssetNum) * 100 : 0;

      return {
        stockCode: code,
        stockName: info.stockName,
        quantity: info.quantity,
        currentPrice: info.currentPrice,
        evaluationAmount: info.evaluationAmount,
        profitLossRate: profitLossRate,
        weight: weight,
      };
    });
  }, [balances, portfolioTotalAsset]);

  // 정렬된 행 데이터
  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;

    return [...rows].sort((a, b) => {
      const fieldA = a[sortConfig.key as keyof HoldingsRow];
      const fieldB = b[sortConfig.key as keyof HoldingsRow];
      if (fieldA < fieldB) return sortConfig.direction === "asc" ? -1 : 1;
      if (fieldA > fieldB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortConfig]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "desc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "desc"
    ) {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const columns = [
    {
      key: "stockName",
      label: "SYMBOL",
      align: "left" as const,
      className: "col-span-4 text-left",
    },
    {
      key: "quantity",
      label: "QTY",
      align: "right" as const,
      className: "col-span-1 text-right",
    },
    {
      key: "currentPrice",
      label: "PRICE",
      align: "right" as const,
      className: "col-span-2 text-right",
    },
    {
      key: "evaluationAmount",
      label: "VALUE",
      align: "right" as const,
      className: "col-span-2 text-right",
    },
    {
      key: "weight",
      label: "WGHT",
      align: "right" as const,
      className: "col-span-1 text-right",
    },
    {
      key: "profitLossRate",
      label: "ROI",
      align: "right" as const,
      className: "col-span-2 text-right",
    },
  ];

  // 리스트 영역 높이 계산
  const listHeight = useMemo(() => {
    return containerHeight - HEADER_HEIGHT;
  }, [containerHeight]);

  // 모바일 여부 판단 (가상화 제어용)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 가상화 행 렌더러
  const RowRenderer = ({
    index,
    style,
  }: {
    index: number;
    style?: React.CSSProperties;
  }) => {
    const row = sortedRows[index];
    if (!row) return null;
    const isPos = row.profitLossRate >= 0;
    return (
      <div
        style={style}
        className="grid grid-cols-12 items-center border-b border-terminal-border/30 hover:bg-brew-green/10 transition-colors font-mono text-sm px-1 min-h-8"
      >
        <div
          className={`font-bold truncate px-1 text-brew-green ${columns[0].className}`}
        >
          {row.stockName}
        </div>
        <div className={`text-terminal-text px-1 ${columns[1].className}`}>
          {row.quantity}
        </div>
        <div className={`text-terminal-text px-1 ${columns[2].className}`}>
          {formatCurrency(row.currentPrice)}
        </div>
        <div className={`text-terminal-text px-1 ${columns[3].className}`}>
          {formatCurrency(row.evaluationAmount)}
        </div>
        <div className={`text-terminal-text px-1 ${columns[4].className}`}>
          {(row.weight || 0).toFixed(2)}%
        </div>
        <div
          className={`px-1 ${isPos ? "text-brew-green" : "text-brew-red"} ${
            columns[5].className
          }`}
        >
          {formatPercent(row.profitLossRate)}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full w-full min-w-[700px]"
    >
      {/* 테이블 헤더 (고정) */}
      <div
        className="grid grid-cols-12 items-center text-terminal-muted border-b border-terminal-border bg-terminal-bg z-10 text-sm px-1 shrink-0"
        style={{ height: HEADER_HEIGHT }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`py-2 px-1 cursor-pointer hover:text-brew-green transition-colors select-none ${col.className}`}
            onClick={() => handleSort(col.key)}
          >
            {col.label} <SortIcon colKey={col.key} sortConfig={sortConfig} />
          </div>
        ))}
      </div>

      {/* 테이블 본문: 모바일은 일반 렌더링, 데스크탑은 가상화 */}
      <div className="flex-1 min-h-0">
        {isMobile ? (
          <div className="flex flex-col">
            {sortedRows.map((_, index) => (
              <RowRenderer key={index} index={index} />
            ))}
          </div>
        ) : (
          <List
            height={listHeight}
            itemCount={sortedRows.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-terminal-border scrollbar-track-transparent"
          >
            {RowRenderer}
          </List>
        )}
      </div>

      {/* Stock Price Chart (하단 고정, 선택된 종목이 있을 때만 표시) */}
    </div>
  );
}
