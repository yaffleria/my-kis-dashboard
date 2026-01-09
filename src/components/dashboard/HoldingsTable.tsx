"use client";

import { useState, useMemo } from "react";
import type { DashboardBalance, HoldingsRow } from "@/types";
import { SortIcon, type SortConfig } from "@/components/ui";

/**
 * 보유 종목 테이블 컴포넌트
 * 모든 계좌의 종목을 합산하여 정렬 가능한 테이블로 표시
 */

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
    { key: "stockName", label: "SYMBOL", align: "left" as const },
    { key: "quantity", label: "QTY", align: "right" as const },
    { key: "currentPrice", label: "PRICE", align: "right" as const },
    { key: "evaluationAmount", label: "VALUE", align: "right" as const },
    { key: "weight", label: "WGHT", align: "right" as const },
    { key: "profitLossRate", label: "ROI", align: "right" as const },
  ];

  return (
    <table className="w-full text-left text-sm relative">
      <thead className="sticky top-0 bg-terminal-bg z-10 shadow-sm shadow-terminal-border">
        <tr className="text-terminal-muted border-b border-terminal-border">
          {columns.map((col) => (
            <th
              key={col.key}
              className={`py-2 cursor-pointer group hover:text-brew-green transition-colors select-none ${
                col.align === "right" ? "text-right" : ""
              }`}
              onClick={() => handleSort(col.key)}
            >
              {col.label} <SortIcon colKey={col.key} sortConfig={sortConfig} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="font-mono">
        {sortedRows.map((row) => {
          const isPos = row.profitLossRate >= 0;
          return (
            <tr
              key={row.stockCode}
              className="border-b border-terminal-border/30 hover:bg-brew-green/5 transition-colors"
            >
              <td className="py-2 text-brew-green font-bold">
                {row.stockName}
              </td>
              <td className="py-2 text-right text-terminal-text">
                {row.quantity}
              </td>
              <td className="py-2 text-right text-terminal-text">
                {formatCurrency(row.currentPrice)}
              </td>
              <td className="py-2 text-right text-terminal-text">
                {formatCurrency(row.evaluationAmount)}
              </td>
              <td className="py-2 text-right text-terminal-text">
                {(row.weight || 0).toFixed(2)}%
              </td>
              <td
                className={`py-2 text-right ${
                  isPos ? "text-brew-green" : "text-brew-red"
                }`}
              >
                {formatPercent(row.profitLossRate)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
