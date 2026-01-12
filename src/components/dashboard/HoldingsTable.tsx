"use client";

import { useState, useMemo } from "react";
import type { DashboardBalance, HoldingsRow } from "@/types";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HoldingsTableProps {
  balances: DashboardBalance[];
  portfolioTotalAsset?: number;
  isLoading?: boolean;
}

type SortDirection = "asc" | "desc";
interface SortConfig {
  key: keyof HoldingsRow;
  direction: SortDirection;
}

const SortIcon = ({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) => {
  if (!active) return null;
  return direction === "asc" ? (
    <ArrowUp className="w-3 h-3 ml-1" />
  ) : (
    <ArrowDown className="w-3 h-3 ml-1" />
  );
};

export function HoldingsTable({
  balances,
  portfolioTotalAsset = 0,
  isLoading = false,
}: HoldingsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "weight",
    direction: "desc",
  });

  const rows = useMemo(() => {
    const aggregatedInfo: Record<
      string,
      {
        stockName: string;
        quantity: number;
        currentPrice: number;
        evaluationAmount: number;
        totalBuyAmount: number;
        profitLossRate: number;
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
            profitLossRate: 0,
          };
        }

        const info = aggregatedInfo[code];
        info.quantity += Number(holding.quantity);
        info.evaluationAmount += Number(holding.evaluationAmount);
        info.totalBuyAmount += Number(holding.buyAmount);
        info.profitLossRate = holding.profitLossRate;
      });
    });

    return Object.keys(aggregatedInfo).map((code) => {
      const info = aggregatedInfo[code];
      const profitLossRate =
        info.totalBuyAmount > 0
          ? ((info.evaluationAmount - info.totalBuyAmount) /
              info.totalBuyAmount) *
            100
          : info.profitLossRate;

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

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;

    return [...rows].sort((a, b) => {
      const fieldA = a[sortConfig.key];
      const fieldB = b[sortConfig.key];
      if (fieldA < fieldB) return sortConfig.direction === "asc" ? -1 : 1;
      if (fieldA > fieldB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortConfig]);

  const handleSort = (key: keyof HoldingsRow) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "desc" };
    });
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="text-xs uppercase bg-white/5 text-muted-foreground sticky top-0 backdrop-blur-md z-10">
            <tr>
              <th
                className="px-2 py-3 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("stockName")}
              >
                <div className="flex items-center">
                  <span className="truncate">Name</span>
                  <SortIcon
                    active={sortConfig?.key === "stockName"}
                    direction={sortConfig?.direction || "desc"}
                  />
                </div>
              </th>
              <th
                className="px-2 py-3 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("profitLossRate")}
              >
                <div className="flex items-center justify-end">
                  ROI
                  <SortIcon
                    active={sortConfig?.key === "profitLossRate"}
                    direction={sortConfig?.direction || "desc"}
                  />
                </div>
              </th>
              <th
                className="px-2 py-3 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("weight")}
              >
                <div className="flex items-center justify-end">
                  Wgt
                  <SortIcon
                    active={sortConfig?.key === "weight"}
                    direction={sortConfig?.direction || "desc"}
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 bg-white/10 rounded w-24 mb-1" />
                      <div className="h-3 bg-white/5 rounded w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-white/10 rounded w-16 ml-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 bg-white/10 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              : sortedRows.map((row) => {
                  const isPos = row.profitLossRate >= 0;
                  const profitColor = isPos ? "text-green-400" : "text-red-500";
                  const profitIcon = isPos ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  );

                  return (
                    <tr
                      key={row.stockCode}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-1.5 py-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-white group-hover:text-primary transition-colors text-[11px] leading-tight whitespace-normal break-keep">
                            {row.stockName}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono opacity-60">
                            {row.stockCode}
                          </span>
                        </div>
                      </td>
                      <td className="px-1.5 py-3 text-right">
                        <div
                          className={cn(
                            "flex items-center justify-end gap-0.5 font-medium text-[11px]",
                            profitColor
                          )}
                        >
                          {profitIcon}
                          {Math.abs(row.profitLossRate).toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-1.5 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-white font-medium text-[11px]">
                            {row.weight.toFixed(1)}%
                          </span>
                          <div className="w-8 h-0.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(row.weight, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!isLoading && sortedRows.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            No positions found.
          </div>
        )}
      </div>
    </div>
  );
}
