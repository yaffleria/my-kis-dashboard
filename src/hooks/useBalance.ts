"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDashboardStore, useAccountStore } from "@/store";
import type { SafeBalanceResponse } from "@/types";

/**
 * 계좌 잔고 조회 API 호출
 */
import { getBalanceAction } from "@/app/actions/balance";

/**
 * 잔고 데이터로부터 포트폴리오 요약 계산
 */
// 옵션 타입 정의
interface UseBalanceOptions {
  pollingInterval?: number; // ms 단위, 0이면 비활성화
  initialData?: SafeBalanceResponse;
}

/**
 * 잔고 조회 및 대시보드 데이터 관리 훅
 */
export function useBalanceQuery(options?: UseBalanceOptions) {
  const { accounts } = useAccountStore();
  const { setSafeBalance, setLoading, setError, safeBalance } =
    useDashboardStore();

  // 기본적으로 폴링은 비활성화 (0 또는 undefined일 경우 비활성)
  const refetchInterval = options?.pollingInterval || 0;

  return useQuery({
    queryKey: ["balances", accounts.map((a) => a.accountNo).join(",")],
    queryFn: async () => {
      if (!safeBalance && !options?.initialData) setLoading(true);
      setError(null);

      try {
        const result = await getBalanceAction();

        if (!result.success) {
          throw new Error(result.error);
        }

        const data = result.data;
        if (!data) throw new Error("No data received");

        // 스토어 업데이트
        setSafeBalance(data);

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
      return result.data;
    },
    onSuccess: (safeBalance) => {
      queryClient.setQueryData(
        ["balances", accounts.map((a) => a.accountNo).join(",")],
        safeBalance,
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
    value: number,
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
