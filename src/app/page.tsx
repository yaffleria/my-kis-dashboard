"use client";

import { useEffect, useState, useMemo } from "react";

import { useDashboardStore } from "@/store";
import { useBalanceQuery, useFormatters } from "@/hooks";
import {
  Button,
  LoadingSpinner,
  TerminalHeader,
  TerminalPanel,
  SystemStatusPanel,
  ActivePortfolios,
  HoldingsTable,
} from "@/components";
import type { DashboardBalance } from "@/types";

/**
 * 대시보드 메인 페이지
 * 포트폴리오 요약, 계좌 목록, 보유 종목, 차트 등 표시
 */
export default function DashboardPage() {
  const { balances, portfolioSummary, isLoading, error } = useDashboardStore();
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

  // 필터링된 잔고 데이터
  const filteredBalances = useMemo((): DashboardBalance[] => {
    if (selectedAccountKey === null) {
      return balances as DashboardBalance[];
    }
    return (balances as DashboardBalance[]).filter(
      (b) =>
        `${b.account.accountNo}-${b.account.productCode}` === selectedAccountKey
    );
  }, [balances, selectedAccountKey]);

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

  // 로딩 상태
  if (isLoading && balances.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center text-brew-green font-mono bg-terminal-bg">
        <LoadingSpinner />
        <div className="mt-4 animate-pulse">
          ESTABLISHING SECURE CONNECTION...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-terminal-bg text-terminal-text font-mono flex flex-col items-center py-4 overflow-hidden">
      <div className="w-[80%] max-w-400 flex flex-col gap-4 h-full">
        <TerminalHeader
          title="Blanc"
          ip="127.0.0.1" // IP 조회 제거 또는 유지? 일단 심플하게
          status={isFetching ? "SYNCING..." : "ONLINE"}
        />

        <div className="flex flex-col gap-6 flex-1 min-h-0">
          <SystemStatusPanel
            formatCurrency={formatCurrency}
            formatPercent={formatPercent}
            portfolioSummary={portfolioSummary}
          />

          <div className="flex flex-1 gap-4 min-h-0">
            {/* Active Accounts Column (Width reduced) */}
            <div className="flex flex-col gap-4 w-96 shrink-0 h-full">
              <TerminalPanel
                title="Active Accounts"
                className="flex-1 min-h-0"
                scrollable
              >
                <ActivePortfolios
                  balances={balances as DashboardBalance[]}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                  selectedAccountKey={selectedAccountKey}
                  onSelectAccount={setSelectedAccountKey}
                />
              </TerminalPanel>
            </div>

            {/* Holdings Matrix Column */}
            <div className="flex flex-col gap-4 flex-1 min-w-0 h-full">
              <TerminalPanel
                title={
                  selectedAccountKey
                    ? `Holdings: ${
                        filteredBalances[0]?.account.accountName || "Selected"
                      }`
                    : "Holdings Matrix (All)"
                }
                className="flex-1 min-h-0"
                scrollable
              >
                <HoldingsTable
                  balances={filteredBalances}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                  portfolioTotalAsset={portfolioSummary?.totalAsset ?? 0}
                />
              </TerminalPanel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
