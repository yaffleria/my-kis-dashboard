'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useDashboardStore, useAccountStore, CHART_COLORS } from '@/store'
import type {
  Account,
  AccountBalance,
  ApiResponse,
  PortfolioSummary,
  AssetAllocation,
  StockWeight,
  AccountWeight,
} from '@/types'

/**
 * 계좌 잔고 조회 API 호출
 */
async function fetchBalances(accounts: Account[]): Promise<AccountBalance[]> {
  // 먼저 GET 호출하여 데모 모드 여부 확인
  const getResponse = await axios.get<ApiResponse<AccountBalance[]> & { source?: string }>('/api/balance')

  // 데모 모드면 GET 결과 바로 반환 (POST 호출 건너뜀)
  if (getResponse.data.source === 'demo-mode') {
    console.log('[Demo Mode] Using simulated data')
    return getResponse.data.data || []
  }

  // 계좌가 없으면 GET 결과 사용 (fallback demo)
  if (accounts.length === 0) {
    if (!getResponse.data.success) {
      throw new Error(getResponse.data.error || '잔고 조회 실패')
    }
    return getResponse.data.data || []
  }

  // 실제 계좌가 있고 데모 모드가 아니면 POST로 실시간 조회
  const response = await axios.post<ApiResponse<AccountBalance[]>>('/api/balance', {
    accounts,
  })

  if (!response.data.success) {
    throw new Error(response.data.error || '잔고 조회 실패')
  }

  return response.data.data || []
}

/**
 * 잔고 데이터로부터 포트폴리오 요약 계산
 */
function calculatePortfolioSummary(balances: AccountBalance[]): PortfolioSummary {
  let totalAsset = 0
  let totalEvaluation = 0
  let totalBuy = 0
  let stockCount = 0

  let totalProfitLossSum = 0

  for (const balance of balances) {
    // 사용자의 요청: "현재 투자중인 자산에 대해서만 보여주자"
    // 따라서 예수금(deposit)은 제외하고, 평가금액을 자산총액으로 간주
    totalEvaluation += balance.summary.totalEvaluationAmount
    totalBuy += balance.summary.totalBuyAmount
    totalProfitLossSum += balance.summary.totalProfitLossAmount
    stockCount += balance.holdings.length
  }

  totalAsset = totalEvaluation // 투자 자산만 합산

  // API에서 제공하는 손익금을 합산하여 사용 (자체 계산보다 정확함)
  const totalProfitLossAmount = totalProfitLossSum
  const totalProfitLossRate = totalBuy > 0 ? (totalProfitLossAmount / totalBuy) * 100 : 0

  return {
    totalAsset,
    totalEvaluation,
    totalBuyAmount: totalBuy,
    totalProfitLossAmount,
    totalProfitLossRate,
    accountCount: balances.length,
    stockCount,
  }
}

/**
 * 자산 배분 데이터 계산 (예수금 vs 주식)
 */
function calculateAssetAllocation(balances: AccountBalance[]): AssetAllocation[] {
  let totalDeposit = 0
  let totalEvaluation = 0

  for (const balance of balances) {
    totalDeposit += balance.summary.depositAmount
    totalEvaluation += balance.summary.totalEvaluationAmount
  }

  const total = totalDeposit + totalEvaluation

  if (total === 0) return []

  return [
    {
      name: '주식',
      value: totalEvaluation,
      percentage: (totalEvaluation / total) * 100,
      color: CHART_COLORS[0],
    },
    {
      name: '현금',
      value: totalDeposit,
      percentage: (totalDeposit / total) * 100,
      color: CHART_COLORS[1],
    },
  ]
}

/**
 * 종목별 비중 데이터 계산
 */
function calculateStockWeights(balances: AccountBalance[]): StockWeight[] {
  // 모든 보유 종목을 하나의 맵으로 통합
  const stockMap = new Map<string, { name: string; value: number }>()

  for (const balance of balances) {
    for (const holding of balance.holdings) {
      const existing = stockMap.get(holding.stockCode)
      if (existing) {
        existing.value += holding.evaluationAmount
      } else {
        stockMap.set(holding.stockCode, {
          name: holding.stockName,
          value: holding.evaluationAmount,
        })
      }
    }
  }

  // 총 평가금액 계산
  let totalValue = 0
  stockMap.forEach(({ value }) => {
    totalValue += value
  })

  // 비중 계산 및 정렬
  const weights: StockWeight[] = []
  let colorIndex = 0

  stockMap.forEach(({ name, value }, code) => {
    weights.push({
      stockCode: code,
      stockName: name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      color: CHART_COLORS[colorIndex % CHART_COLORS.length],
    })
    colorIndex++
  })

  // 비중 내림차순 정렬
  return weights.sort((a, b) => b.value - a.value)
}

/**
 * 계좌별 비중 데이터 계산
 */
function calculateAccountWeights(balances: AccountBalance[]): AccountWeight[] {
  const totalAsset = balances.reduce((sum, b) => sum + b.summary.totalAsset, 0)

  return balances.map((balance, index) => ({
    accountNo: balance.account.accountNo,
    accountName: balance.account.accountName,
    value: balance.summary.totalAsset,
    percentage: totalAsset > 0 ? (balance.summary.totalAsset / totalAsset) * 100 : 0,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))
}

// 옵션 타입 정의
interface UseBalanceOptions {
  pollingInterval?: number // ms 단위, 0이면 비활성화
}

/**
 * 잔고 조회 및 대시보드 데이터 관리 훅
 */
export function useBalanceQuery(options?: UseBalanceOptions) {
  const { accounts } = useAccountStore()
  const {
    setBalances,
    setPortfolioSummary,
    setAssetAllocation,
    setStockWeights,
    setAccountWeights,
    setLoading,
    setError,
    setLastUpdated,
    balances,
  } = useDashboardStore()

  // 기본값 10초 (10000ms) - 실시간에 가까운 경험 제공
  const refetchInterval = options?.pollingInterval !== undefined ? options.pollingInterval : 10000

  return useQuery({
    queryKey: ['balances', accounts.map((a) => a.accountNo).join(',')],
    queryFn: async () => {
      // isFetching 상태는 useQuery가 관리하므로 setLoading을 여기서 호출하지 않아도 됨
      // 하지만 전역 스토어 동기화를 위해 유지
      if (balances.length === 0) setLoading(true)
      setError(null)

      try {
        const data = await fetchBalances(accounts)

        // 스토어 업데이트
        setBalances(data)
        setPortfolioSummary(calculatePortfolioSummary(data))
        setAssetAllocation(calculateAssetAllocation(data))
        setStockWeights(calculateStockWeights(data))
        setAccountWeights(calculateAccountWeights(data))
        setLastUpdated(new Date().toISOString())

        setLoading(false)
        return data
      } catch (error) {
        const message = error instanceof Error ? error.message : '잔고 조회 중 오류 발생'
        setError(message)
        setLoading(false)
        throw error
      }
    },
    staleTime: 5000, // 5초 동안은 데이터를 신선한 것으로 간주
    refetchInterval: refetchInterval, // 설정된 간격마다 자동 갱신
    refetchOnWindowFocus: true, // 윈도우 포커스 시 즉시 갱신
    retry: 1,
  })
}

/**
 * 잔고 수동 새로고침 훅
 */
export function useRefreshBalance() {
  const queryClient = useQueryClient()
  const { accounts } = useAccountStore()

  return useMutation({
    mutationFn: () => fetchBalances(accounts),
    onSuccess: (balances) => {
      queryClient.setQueryData(['balances', accounts.map((a) => a.accountNo).join(',')], balances)
    },
  })
}

/**
 * 숫자 포맷팅 유틸리티 훅
 */
export function useFormatters() {
  // 통화 포맷 (어카운팅 통화 심볼 ₩ 사용)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCurrencyFull = (value: number): string => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number, decimals = 2): string => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(decimals)}%`
  }

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  const getChangeType = (value: number): 'positive' | 'negative' | 'neutral' => {
    if (value > 0) return 'positive'
    if (value < 0) return 'negative'
    return 'neutral'
  }

  return {
    formatCurrency,
    formatCurrencyFull,
    formatPercent,
    formatNumber,
    getChangeType,
  }
}
