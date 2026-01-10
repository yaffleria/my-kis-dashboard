"use client";

import type { PortfolioSummary } from "@/types";
import { RefreshCw } from "lucide-react";
import { TerminalPanel, DataField } from "@/components/terminal";
import { useRefreshBalance } from "@/hooks/useBalance";

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
  const { mutate: refreshBalance, isPending: isRefreshing } =
    useRefreshBalance();

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

          <div className="flex gap-3">
            <button
              onClick={() => refreshBalance()}
              disabled={isRefreshing}
              className="group relative w-12 h-12 flex items-center justify-center bg-slate-900/30 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 hover:text-cyan-400 text-slate-500 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Balance Data"
            >
              <RefreshCw
                className={`w-5 h-5 transition-transform group-hover:rotate-180 ${
                  isRefreshing ? "animate-spin text-cyan-500" : ""
                }`}
              />

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
            </button>
          </div>
        </div>


      </div>
    </TerminalPanel>
  );
}
