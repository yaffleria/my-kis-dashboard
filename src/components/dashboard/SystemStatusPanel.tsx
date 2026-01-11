"use client";

import type { PortfolioSummary } from "@/types";
import { TerminalPanel, DataField } from "@/components/terminal";

/**
 * 시스템 상태 패널 컴포넌트
 * 총 투자금액, 손익, ROI 바 차트 표시
 */

import { LoadingSpinner } from "@/components"; // Add this import

export interface SystemStatusPanelProps {
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  portfolioSummary: PortfolioSummary | null;
  className?: string;
  isLoading?: boolean;
}

export function SystemStatusPanel({
  formatCurrency,
  formatPercent,
  portfolioSummary,
  className = "",
  isLoading = false,
}: SystemStatusPanelProps) {
  return (
    <TerminalPanel
      title="System Status"
      className={`h-auto shrink-0 ${className}`}
    >
      {/* Metrics & Animated Art */}
      <div className="relative">
        {isLoading && (
          <div className="absolute top-0 right-0 flex items-center gap-2 text-brew-green animate-pulse">
            <span className="text-xs">SYNCING...</span>
            <LoadingSpinner size="sm" />
          </div>
        )}
        <div className="flex justify-between items-center mt-2">
          <div className="flex flex-col md:flex-row gap-4 md:gap-16 justify-between md:justify-start w-full">
            <DataField
              label="Invested Total Value"
              value={
                portfolioSummary
                  ? formatCurrency(portfolioSummary.totalAsset)
                  : "0"
              }
              unit="KRW"
            />
            <DataField
              label="Net Profit/Loss"
              value={
                portfolioSummary
                  ? formatCurrency(portfolioSummary.totalProfitLossAmount)
                  : "0"
              }
              unit="KRW"
              className={
                (portfolioSummary?.totalProfitLossAmount || 0) < 0
                  ? "text-brew-red"
                  : ""
              }
            />
            <DataField
              label="Total Return"
              value={
                portfolioSummary
                  ? formatPercent(portfolioSummary.totalProfitLossRate)
                  : "0.00%"
              }
              className={
                (portfolioSummary?.totalProfitLossRate || 0) < 0
                  ? "text-brew-red"
                  : ""
              }
            />
          </div>
        </div>
      </div>
    </TerminalPanel>
  );
}
