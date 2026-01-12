"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDashboardStore, useAccountStore } from "@/store";
import type { AccountBalance, PortfolioSummary } from "@/types";

/**
 * 계좌 잔고 조회 API 호출
 */
import { getBalanceAction } from "@/app/actions/balance";

/**
 * 잔고 데이터로부터 포트폴리오 요약 계산
 */
export function calculatePortfolioSummary(
  balances: AccountBalance[]
): PortfolioSummary {
  let totalAsset = 0;
  let totalEvaluation = 0;
  let totalBuy = 0;
  let stockCount = 0;

  let totalProfitLossSum = 0;

  for (const balance of balances) {
    // 사용자의 요청: "현재 투자중인 자산에 대해서만 보여주자"
    // 따라서 예수금(deposit)은 제외하고, 평가금액을 자산총액으로 간주
    totalEvaluation += balance.summary.totalEvaluationAmount;
    totalBuy += balance.summary.totalBuyAmount;
    totalProfitLossSum += balance.summary.totalProfitLossAmount;
    stockCount += balance.holdings.length;
  }

  totalAsset = totalEvaluation; // 투자 자산만 합산

  // API에서 제공하는 손익금을 합산하여 사용 (자체 계산보다 정확함)
  const totalProfitLossAmount = totalProfitLossSum;
  const totalProfitLossRate =
    totalBuy > 0 ? (totalProfitLossAmount / totalBuy) * 100 : 0;

  return {
    totalAsset,
    totalEvaluation,
    totalBuyAmount: totalBuy,
    totalProfitLossAmount,
    totalProfitLossRate,
    accountCount: balances.length,
    stockCount,
  };
}

// 옵션 타입 정의
interface UseBalanceOptions {
  pollingInterval?: number; // ms 단위, 0이면 비활성화
  initialData?: AccountBalance[];
}

/**
 * 잔고 조회 및 대시보드 데이터 관리 훅
 */
export function useBalanceQuery(options?: UseBalanceOptions) {
  const { accounts } = useAccountStore();
  const {
    setBalances,
    setPortfolioSummary,
    setLoading,
    setError,
    setLastUpdated,
    balances,
  } = useDashboardStore();

  // 기본적으로 폴링은 비활성화 (0 또는 undefined일 경우 비활성)
  const refetchInterval = options?.pollingInterval || 0;

  return useQuery({
    queryKey: ["balances", accounts.map((a) => a.accountNo).join(",")],
    queryFn: async () => {
      if (balances.length === 0 && !options?.initialData) setLoading(true);
      setError(null);

      try {
        const result = await getBalanceAction();

        if (!result.success) {
          throw new Error(result.error);
        }

        const data = result.data || [];

        // 스토어 업데이트
        setBalances(data);
        setPortfolioSummary(calculatePortfolioSummary(data));
        setLastUpdated(new Date().toISOString());

        setLoading(false);
        return data;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "잔고 조회 중 오류 발생";
        setError(message);
        setLoading(false);
        throw error;
      }
    },
    initialData: options?.initialData,
    staleTime: 1000 * 60 * 5, // 5분 동안은 데이터를 신선한 것으로 간주
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
    refetchOnWindowFocus: false, // 윈도우 포커스 시 즉시 갱신 방지 (서버 사이드 위주)
    retry: 1,
    refetchOnMount: options?.initialData ? false : "always",
  });
}

/**
 * 잔고 수동 새로고침 훅
 */
export function useRefreshBalance() {
  const queryClient = useQueryClient();
  const { accounts } = useAccountStore();

  return useMutation({
    mutationFn: async () => {
      const result = await getBalanceAction();
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    onSuccess: (balances) => {
      queryClient.setQueryData(
        ["balances", accounts.map((a) => a.accountNo).join(",")],
        balances
      );
    },
  });
}

/**
 * 숫자 포맷팅 유틸리티 훅
 */
export function useFormatters() {
  // 통화 포맷 (어카운팅 통화 심볼 ₩ 사용)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyFull = (value: number): string => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number, decimals = 2): string => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(decimals)}%`;
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("ko-KR").format(value);
  };

  const getChangeType = (
    value: number
  ): "positive" | "negative" | "neutral" => {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
  };

  return {
    formatCurrency,
    formatCurrencyFull,
    formatPercent,
    formatNumber,
    getChangeType,
  };
}
