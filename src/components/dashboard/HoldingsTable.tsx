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
    { key: "stockName", label: "SYMBOL", align: "left" as const, width: "35%" },
    { key: "quantity", label: "QTY", align: "right" as const, width: "8%" },
    {
      key: "currentPrice",
      label: "PRICE",
      align: "right" as const,
      width: "17%",
    },
    {
      key: "evaluationAmount",
      label: "VALUE",
      align: "right" as const,
      width: "17%",
    },
    { key: "weight", label: "WGHT", align: "right" as const, width: "10%" },
    {
      key: "profitLossRate",
      label: "ROI",
      align: "right" as const,
      width: "13%",
    },
  ];

  // 리스트 영역 높이 계산
  const listHeight = useMemo(() => {
    return containerHeight - HEADER_HEIGHT;
  }, [containerHeight]);

  // 가상화 행 렌더러
  const RowRenderer = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const row = sortedRows[index];
    const isPos = row.profitLossRate >= 0;
    return (
      <div
        style={style}
        className="flex items-center border-b border-terminal-border/30 hover:bg-brew-green/10 transition-colors font-mono text-sm"
      >
        <div
          className="font-bold truncate px-1 text-brew-green"
          style={{ width: columns[0].width }}
        >
          {row.stockName}
        </div>
        <div
          className="text-right text-terminal-text px-1"
          style={{ width: columns[1].width }}
        >
          {row.quantity}
        </div>
        <div
          className="text-right text-terminal-text px-1"
          style={{ width: columns[2].width }}
        >
          {formatCurrency(row.currentPrice)}
        </div>
        <div
          className="text-right text-terminal-text px-1"
          style={{ width: columns[3].width }}
        >
          {formatCurrency(row.evaluationAmount)}
        </div>
        <div
          className="text-right text-terminal-text px-1"
          style={{ width: columns[4].width }}
        >
          {(row.weight || 0).toFixed(2)}%
        </div>
        <div
          className={`text-right px-1 ${
            isPos ? "text-brew-green" : "text-brew-red"
          }`}
          style={{ width: columns[5].width }}
        >
          {formatPercent(row.profitLossRate)}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* 테이블 헤더 (고정) */}
      <div
        className="flex items-center text-terminal-muted border-b border-terminal-border bg-terminal-bg z-10 text-sm"
        style={{ height: HEADER_HEIGHT }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={`py-2 px-1 cursor-pointer hover:text-brew-green transition-colors select-none ${
              col.align === "right" ? "text-right" : ""
            }`}
            style={{ width: col.width }}
            onClick={() => handleSort(col.key)}
          >
            {col.label} <SortIcon colKey={col.key} sortConfig={sortConfig} />
          </div>
        ))}
      </div>

      {/* 가상화된 테이블 본문 */}
      <div className="flex-1 min-h-0">
        <List
          height={listHeight}
          itemCount={sortedRows.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          className="scrollbar-thin scrollbar-thumb-terminal-border scrollbar-track-transparent"
        >
          {RowRenderer}
        </List>
      </div>

      {/* Stock Price Chart (하단 고정, 선택된 종목이 있을 때만 표시) */}

    </div>
  );
}
