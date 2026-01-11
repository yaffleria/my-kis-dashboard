"use client";

import { useEffect, useState, useMemo } from "react";

import { useDashboardStore, useAccountStore } from "@/store";
import { useBalanceQuery, useFormatters } from "@/hooks";
import {
  Button,
  TerminalHeader,
  TerminalPanel,
  SystemStatusPanel,
  ActivePortfolios,
  HoldingsTable,
} from "@/components";
import type { DashboardBalance, PortfolioSummary } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Wallet } from "lucide-react";

/**
 * 대시보드 메인 페이지
 * 포트폴리오 요약, 계좌 목록, 보유 종목, 차트 등 표시
 */
export default function DashboardPage() {
  const { balances, isLoading, error } = useDashboardStore();
  const { hiddenAccountKeys, toggleAccountVisibility } = useAccountStore();
  const { refetch, isFetching } = useBalanceQuery({ pollingInterval: 60000 });
  const { formatCurrency, formatPercent } = useFormatters();

  // 선택된 계좌 상태 (null = 전체, 'accountNo-productCode' 형식)
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(
    null
  );

  // 초기 데이터 로드 및 IP 조회
  useEffect(() => {
    refetch();
  }, [refetch]);

  // 커스텀 포트폴리오 요약 (숨겨진 계좌 제외)
  const visiblePortfolioSummary = useMemo((): PortfolioSummary | null => {
    if (balances.length === 0) return null;

    let totalEvaluation = 0;
    let totalBuy = 0;
    let totalProfitLoss = 0;
    let totalAsset = 0;
    let accountCount = 0;
    let stockCount = 0;

    balances.forEach((balance) => {
      const key = `${balance.account.accountNo}-${balance.account.productCode}`;
      if (hiddenAccountKeys.includes(key)) return;

      totalEvaluation += balance.summary.totalEvaluationAmount;
      totalBuy += balance.summary.totalBuyAmount;
      totalProfitLoss += balance.summary.totalProfitLossAmount;
      totalAsset += balance.summary.totalAsset;
      accountCount++;
      stockCount += balance.holdings.length;
    });

    const totalProfitLossRate =
      totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0;

    return {
      totalEvaluation, // totalEvaluationAmount map to totalEvaluation
      totalBuyAmount: totalBuy,
      totalProfitLossAmount: totalProfitLoss,
      totalAsset,
      totalProfitLossRate,
      accountCount,
      stockCount,
    };
  }, [balances, hiddenAccountKeys]);

  // 필터링된 잔고 데이터
  const filteredBalances = useMemo((): DashboardBalance[] => {
    if (selectedAccountKey === null) {
      // Portfolio View: Show all visible accounts
      return (balances as DashboardBalance[]).filter(
        (b) =>
          !hiddenAccountKeys.includes(
            `${b.account.accountNo}-${b.account.productCode}`
          )
      );
    }
    return (balances as DashboardBalance[]).filter(
      (b) =>
        `${b.account.accountNo}-${b.account.productCode}` === selectedAccountKey
    );
  }, [balances, selectedAccountKey, hiddenAccountKeys]);

  // 에러 상태
  if (error && !isLoading && balances.length === 0) {
    return (
      <div className="min-h-screen p-8 font-mono text-brew-red border border-brew-red m-4">
        <h1 className="text-2xl font-bold mb-4">CRITICAL SYSTEM ERROR</h1>
        <p>{error}</p>
        <Button
          onClick={() => refetch()}
          className="mt-4 border-brew-red text-brew-red hover:bg-brew-red/20"
        >
          RETRY CONNECTION
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen bg-terminal-bg text-terminal-text font-mono flex flex-col items-center py-2 md:py-4 overflow-y-auto md:overflow-hidden">
      <div className="w-full px-2 md:w-[95%] lg:w-[80%] max-w-400 flex flex-col gap-2 md:gap-4 min-h-0 md:h-full">
        <TerminalHeader
          title="Blanc"
          ip="127.0.0.1"
          status={isFetching ? "SYNCING..." : "ONLINE"}
        />

        <div className="flex flex-col gap-4 md:gap-6 min-h-0 md:flex-1">
          <SystemStatusPanel
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            portfolioSummary={visiblePortfolioSummary}
            isLoading={isLoading || isFetching}
          />

          {/* Mobile Active Accounts Toggle */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-brew-green text-brew-green hover:bg-brew-green/20 rounded-none h-12"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  VIEW ACTIVE ACCOUNTS ({balances.length})
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="bg-terminal-bg border-r-brew-green w-[85vw] sm:w-[400px] p-0"
              >
                <SheetHeader className="border-b border-brew-green p-4 bg-brew-green/10">
                  <SheetTitle className="text-brew-green font-mono text-left">
                    ACTIVE ACCOUNTS
                  </SheetTitle>
                </SheetHeader>
                <div className="h-full overflow-y-auto p-4 pb-20 custom-scrollbar">
                  <ActivePortfolios
                    balances={balances as DashboardBalance[]}
                    formatCurrency={formatCurrency}
                    formatPercent={formatPercent}
                    selectedAccountKey={selectedAccountKey}
                    onSelectAccount={setSelectedAccountKey}
                    hiddenAccountKeys={hiddenAccountKeys}
                    onToggleAccount={toggleAccountVisibility}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex flex-col md:flex-row gap-4 min-h-0 md:flex-1">
            {/* Active Accounts Column - Desktop Only */}
            <div className="hidden md:flex flex-col gap-4 w-full md:w-80 lg:w-96 shrink-0 min-h-0 md:h-full">
              <TerminalPanel
                title="Active Accounts"
                className="flex-1 min-h-0"
                scrollable
                isLoading={isLoading || isFetching}
              >
                <ActivePortfolios
                  balances={balances as DashboardBalance[]}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                  selectedAccountKey={selectedAccountKey}
                  onSelectAccount={setSelectedAccountKey}
                  hiddenAccountKeys={hiddenAccountKeys}
                  onToggleAccount={toggleAccountVisibility}
                />
              </TerminalPanel>
            </div>

            {/* Holdings Matrix Column */}
            <div className="flex flex-col gap-4 w-full md:flex-1 min-h-100 md:min-h-0 md:h-full">
              <TerminalPanel
                title={
                  selectedAccountKey
                    ? `Holdings: ${
                        filteredBalances[0]?.account.accountName || "Selected"
                      }`
                    : "Holdings Matrix (Portfolio)"
                }
                className="flex-1 min-h-0"
                scrollable
                isLoading={isLoading || isFetching}
              >
                <HoldingsTable
                  balances={filteredBalances}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                  portfolioTotalAsset={filteredBalances.reduce(
                    (sum, b) => sum + b.summary.totalAsset,
                    0
                  )}
                />
              </TerminalPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
