"use client";

import type { PortfolioSummary } from "@/types";
import { TerminalPanel, DataField } from "@/components/terminal";

/**
 * 시스템 상태 패널 컴포넌트
 * 총 투자금액, 손익, ROI 바 차트 표시
 */

export interface SystemStatusPanelProps {
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  portfolioSummary: PortfolioSummary | null;
  className?: string;
}
export function SystemStatusPanel({
  formatCurrency,
  formatPercent,
  portfolioSummary,
  className = "",
}: SystemStatusPanelProps) {

  return (
    <TerminalPanel
      title="System Status"
      className={`h-auto shrink-0 ${className}`}
    >
      {/* Metrics & Animated Art */}
      <div className="">
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-16">
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
            {/* New UI for ROI */}
            <div className="flex flex-col justify-center">
              <div className="text-brew-green/70 text-[10px] uppercase mb-0.5">
                Total Return
              </div>
              <div
                className={`flex items-center px-3 py-1 rounded border ${
                  (portfolioSummary?.totalProfitLossRate || 0) >= 0
                    ? "border-brew-green/30 bg-brew-green/10 text-brew-green"
                    : "border-brew-red/30 bg-brew-red/10 text-brew-red"
                }`}
              >
                <span className="text-xl font-bold tracking-wider">
                  {portfolioSummary
                    ? formatPercent(portfolioSummary.totalProfitLossRate)
                    : "0.00%"}
                </span>
              </div>
            </div>
          </div>


        </div>


      </div>
    </TerminalPanel>
  );
}
