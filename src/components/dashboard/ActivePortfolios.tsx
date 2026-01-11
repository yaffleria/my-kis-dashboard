"use client";

import { useMemo } from "react";
import type { DashboardBalance } from "@/types";
import { maskAccountNo, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

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
  hiddenAccountKeys: string[];
  onToggleAccount: (accountKey: string) => void;
}

export function ActivePortfolios({
  balances,
  formatCurrency,
  formatPercent,
  selectedAccountKey,
  onSelectAccount,
  hiddenAccountKeys,
  onToggleAccount,
}: ActivePortfoliosProps) {
  // 전체 계좌 요약 계산 (숨겨진 계좌 제외)
  const portfolioSummary = useMemo(() => {
    let totalEvaluation = 0;
    let totalBuy = 0;
    let totalProfitLoss = 0;

    balances.forEach((balance) => {
      const key = `${balance.account.accountNo}-${balance.account.productCode}`;
      if (hiddenAccountKeys.includes(key)) return;

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
  }, [balances, hiddenAccountKeys]);

  const isAllSelected = selectedAccountKey === null;

  return (
    <div className="flex flex-col gap-3">
      {/* 포트폴리오 요약 카드 */}
      <Card
        onClick={() => onSelectAccount(null)}
        className={cn(
          "cursor-pointer transition-all border shadow-none",
          isAllSelected
            ? "border-brew-green bg-brew-green/10 shadow-[0_0_8px_rgba(51,255,0,0.3)]"
            : "border-terminal-border bg-transparent hover:border-brew-green/50"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
          <CardTitle
            className={cn(
              "text-base font-bold",
              isAllSelected ? "text-brew-green" : "text-terminal-text"
            )}
          >
            PORTFOLIO
          </CardTitle>
          <div className="text-xs text-terminal-muted">
            {
              balances.filter(
                (b) =>
                  !hiddenAccountKeys.includes(
                    `${b.account.accountNo}-${b.account.productCode}`
                  )
              ).length
            }{" "}
            active
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-3 pt-0">
          <div>
            <div className="text-xs text-terminal-muted uppercase">
              Total Value
            </div>
            <div
              className={cn(
                "text-lg font-bold",
                isAllSelected ? "text-brew-green" : "text-terminal-text"
              )}
            >
              {formatCurrency(portfolioSummary.totalEvaluationAmount)}
            </div>
          </div>
          <div>
            <div className="text-xs text-terminal-muted uppercase">
              Total P/L
            </div>
            <div
              className={cn(
                "text-lg font-bold",
                portfolioSummary.profitRate >= 0
                  ? "text-brew-green"
                  : "text-brew-red"
              )}
            >
              {formatCurrency(portfolioSummary.totalProfitLossAmount)}
              <span className="text-xs ml-1">
                ({formatPercent(portfolioSummary.profitRate)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 구분선 */}
      <div className="border-t border-terminal-border/50" />

      {/* 개별 계좌 목록 */}
      {balances.map((balance) => {
        const key = `${balance.account.accountNo}-${balance.account.productCode}`;
        const profitRate =
          balance.summary.totalBuyAmount > 0
            ? (balance.summary.totalProfitLossAmount /
                balance.summary.totalBuyAmount) *
              100
            : 0;
        const isPositive = profitRate >= 0;
        const isSelected = selectedAccountKey === key;
        const isHidden = hiddenAccountKeys.includes(key);

        return (
          <Card
            key={key}
            className={cn(
              "group transition-all relative border shadow-none cursor-pointer",
              isSelected
                ? "border-brew-green bg-brew-green/10 shadow-[0_0_8px_rgba(51,255,0,0.3)]"
                : isHidden
                ? "border-terminal-border bg-terminal-bg opacity-50 hover:opacity-80"
                : "border-terminal-border bg-transparent hover:border-brew-green/50"
            )}
            onClick={() => onSelectAccount(key)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
              <CardTitle
                className={cn(
                  "text-sm font-bold",
                  isSelected
                    ? "text-brew-green"
                    : balance.account.isManual
                    ? "text-yellow-400"
                    : "text-terminal-text"
                )}
              >
                {balance.account.accountName}
              </CardTitle>
              {/* Toggle Switch & Account No */}
              <div
                className="flex items-center gap-2 shrink-0 pr-1"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <div className="text-xs text-terminal-muted whitespace-nowrap">
                  {maskAccountNo(balance.account.accountNo)}-
                  {balance.account.productCode}
                </div>
                <Switch
                  checked={!isHidden}
                  onCheckedChange={() => onToggleAccount(key)}
                  className="data-[state=checked]:bg-brew-green data-[state=unchecked]:bg-terminal-border scale-75 origin-right"
                />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 p-3 pt-4">
              <div>
                <div className="text-xs text-terminal-muted uppercase">
                  Value
                </div>
                <div className="text-terminal-text font-bold">
                  {formatCurrency(balance.summary.totalEvaluationAmount)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-terminal-muted uppercase">P/L</div>
                <div
                  className={cn(
                    "font-bold",
                    isPositive ? "text-brew-green" : "text-brew-red"
                  )}
                >
                  {formatCurrency(balance.summary.totalProfitLossAmount)}
                  <span className="text-xs ml-1 block sm:inline">
                    ({formatPercent(profitRate)})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
