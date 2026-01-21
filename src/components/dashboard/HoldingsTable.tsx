"use client";

import { useState, useMemo } from "react";
import type { SafeHolding } from "@/types";
import { ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HoldingsTableProps {
  holdings: SafeHolding[];
  isLoading?: boolean;
}

type SortDirection = "asc" | "desc";
interface SortConfig {
  key: keyof SafeHolding;
  direction: SortDirection;
}

const SortIcon = ({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) => {
  return (
    <ChevronDown
      className={cn(
        "w-3 h-3 ml-0.5 transition-transform",
        active ? "text-primary" : "text-muted-foreground/50",
        active && direction === "asc" && "rotate-180",
      )}
    />
  );
};

export function HoldingsTable({
  holdings,
  isLoading = false,
}: HoldingsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "weight",
    direction: "desc",
  });

  const sortedRows = useMemo(() => {
    if (!sortConfig) return holdings;

    return [...holdings].sort((a, b) => {
      const fieldA = a[sortConfig.key];
      const fieldB = b[sortConfig.key];

      // 문자열 비교
      if (typeof fieldA === "string" && typeof fieldB === "string") {
        return sortConfig.direction === "asc"
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      }

      // 숫자 비교
      if (fieldA < fieldB) return sortConfig.direction === "asc" ? -1 : 1;
      if (fieldA > fieldB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [holdings, sortConfig]);

  const handleSort = (key: keyof SafeHolding) => {
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
    <div className="w-full h-full flex flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs md:text-sm">
          {/* Table Header */}
          <thead className="text-[10px] md:text-xs text-muted-foreground sticky top-0 bg-background z-10 border-b border-border">
            <tr>
              <th
                className="px-4 py-3 cursor-pointer hover:text-foreground transition-colors font-medium min-w-[80px]"
                onClick={() => handleSort("stockCode")}
              >
                <div className="flex items-center">
                  티커
                  <SortIcon
                    active={sortConfig?.key === "stockCode"}
                    direction={sortConfig?.direction || "desc"}
                  />
                </div>
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-foreground transition-colors font-medium min-w-[160px]"
                onClick={() => handleSort("stockName")}
              >
                <div className="flex items-center">
                  종목명
                  <SortIcon
                    active={sortConfig?.key === "stockName"}
                    direction={sortConfig?.direction || "desc"}
                  />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors font-medium min-w-[150px]"
                onClick={() => handleSort("weight")}
              >
                <div className="flex items-center justify-end">
                  비중
                  <SortIcon
                    active={sortConfig?.key === "weight"}
                    direction={sortConfig?.direction || "desc"}
                  />
                </div>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-foreground transition-colors font-medium min-w-[120px]"
                onClick={() => handleSort("profitLossRate")}
              >
                <div className="flex items-center justify-end">
                  수익률
                  <SortIcon
                    active={sortConfig?.key === "profitLossRate"}
                    direction={sortConfig?.direction || "desc"}
                  />
                </div>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border">
            {isLoading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-16" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-32" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-16 ml-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              : sortedRows.map((row) => {
                  const isPositive = row.profitLossRate >= 0;

                  return (
                    <tr
                      key={row.stockCode}
                      className="hover:bg-surface/50 transition-colors whitespace-nowrap"
                    >
                      {/* Ticker */}
                      <td className="px-4 py-4">
                        <span className="font-semibold text-primary">
                          {row.stockCode}
                        </span>
                      </td>

                      {/* Stock Name */}
                      <td className="px-4 py-4 min-w-[160px]">
                        <span className="text-foreground">{row.stockName}</span>
                      </td>

                      {/* Weight with bar */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/60 rounded-full"
                              style={{
                                width: `${row.weight}%`,
                              }}
                            />
                          </div>
                          <span className="text-foreground font-medium w-14 text-right">
                            {row.weight.toFixed(2)}%
                          </span>
                        </div>
                      </td>

                      {/* Profit/Loss Rate */}
                      <td className="px-4 py-4 text-right">
                        <div
                          className={cn(
                            "flex items-center justify-end gap-0.5 font-medium tabular-nums",
                            isPositive ? "text-positive" : "text-negative",
                          )}
                        >
                          {isPositive ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          {isPositive ? "+" : ""}
                          {row.profitLossRate.toFixed(2)}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!isLoading && sortedRows.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            보유 종목이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
