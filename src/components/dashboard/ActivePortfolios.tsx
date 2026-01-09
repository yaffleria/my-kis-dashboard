"use client";

import { useMemo } from "react";
import type { DashboardBalance } from "@/types";
import { maskAccountNo } from "@/lib/utils";

/**
 * 활성 포트폴리오 목록 컴포넌트
 * 전체 계좌 요약 및 개별 계좌 카드 표시
 */

export interface ActivePortfoliosProps {
  balances: DashboardBalance[];
  formatCurrency: (val: number) => string;
  formatPercent: (val: number) => string;
  /** 선택된 계좌 키 (null = 전체 선택, 'accountNo-productCode' 형식) */
  selectedAccountKey: string | null;
  onSelectAccount: (accountKey: string | null) => void;
}

export function ActivePortfolios({
  balances,
  formatCurrency,
  formatPercent,
  selectedAccountKey,
  onSelectAccount,
}: ActivePortfoliosProps) {
  // 전체 계좌 요약 계산
  const totalSummary = useMemo(() => {
    let totalEvaluation = 0;
    let totalBuy = 0;
    let totalProfitLoss = 0;

    balances.forEach((balance) => {
      totalEvaluation += balance.summary.totalEvaluationAmount;
      totalBuy += balance.summary.totalBuyAmount;
      totalProfitLoss += balance.summary.totalProfitLossAmount;
    });

    const profitRate = totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0;

    return {
      totalEvaluationAmount: totalEvaluation,
      totalProfitLossAmount: totalProfitLoss,
      profitRate,
    };
  }, [balances]);

  const isAllSelected = selectedAccountKey === null;

  return (
    <div className="flex flex-col gap-3">
      {/* 전체 계좌 요약 카드 */}
      <div
        onClick={() => onSelectAccount(null)}
        className={`border p-3 cursor-pointer transition-all ${
          isAllSelected
            ? "border-brew-green bg-brew-green/10 shadow-[0_0_8px_rgba(51,255,0,0.3)]"
            : "border-terminal-border hover:border-brew-green/50"
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <div
            className={`font-bold ${
              isAllSelected ? "text-brew-green" : "text-terminal-text"
            }`}
          >
            ALL ACCOUNTS
          </div>
          <div className="text-xs text-terminal-muted">
            {balances.length} accounts
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-terminal-muted uppercase">
              Total Value
            </div>
            <div
              className={`text-lg font-bold ${
                isAllSelected ? "text-brew-green" : "text-terminal-text"
              }`}
            >
              {formatCurrency(totalSummary.totalEvaluationAmount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-terminal-muted uppercase">
              Total P/L
            </div>
            <div
              className={`text-lg font-bold ${
                totalSummary.profitRate >= 0
                  ? "text-brew-green"
                  : "text-brew-red"
              }`}
            >
              {formatCurrency(totalSummary.totalProfitLossAmount)}
              <span className="text-xs ml-1">
                ({formatPercent(totalSummary.profitRate)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-terminal-border/50" />

      {/* 개별 계좌 목록 */}
      {balances.map((balance, index) => {
        const profitRate =
          balance.summary.totalBuyAmount > 0
            ? (balance.summary.totalProfitLossAmount /
                balance.summary.totalBuyAmount) *
              100
            : 0;
        const isPositive = profitRate >= 0;
        const isSelected =
          selectedAccountKey ===
          `${balance.account.accountNo}-${balance.account.productCode}`;

        return (
          <div
            key={`${balance.account.accountNo}-${balance.account.productCode}-${index}`}
            onClick={() =>
              onSelectAccount(
                `${balance.account.accountNo}-${balance.account.productCode}`
              )
            }
            className={`border p-3 cursor-pointer transition-all ${
              isSelected
                ? "border-brew-green bg-brew-green/10 shadow-[0_0_8px_rgba(51,255,0,0.3)]"
                : "border-terminal-border hover:border-brew-green/50"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div
                className={`font-bold ${
                  isSelected
                    ? "text-brew-green"
                    : balance.account.isManual
                    ? "text-yellow-400"
                    : "text-terminal-text"
                }`}
              >
                {balance.account.accountName}
              </div>
              <div className="text-xs text-terminal-muted">
                {maskAccountNo(balance.account.accountNo)}-
                {balance.account.productCode}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-terminal-muted uppercase">
                  Eval Value
                </div>
                <div className="text-terminal-text">
                  {formatCurrency(balance.summary.totalEvaluationAmount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-terminal-muted uppercase">P/L</div>
                <div
                  className={`${
                    isPositive ? "text-brew-green" : "text-brew-red"
                  }`}
                >
                  {formatCurrency(balance.summary.totalProfitLossAmount)}
                  <span className="text-xs ml-1">
                    ({formatPercent(profitRate)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
