import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account, AccountBalance, PortfolioSummary } from '@/types'

/**
 * 계좌 설정 스토어 타입
 */
interface AccountStore {
  // State
  accounts: Account[]
  selectedAccountNo: string | null

  // Actions
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  removeAccount: (accountNo: string) => void
  setSelectedAccount: (accountNo: string | null) => void
}

/**
 * 대시보드 데이터 스토어 타입
 */
/**
 * 대시보드 데이터 스토어 타입
 */
interface DashboardStore {
  // State
  balances: AccountBalance[]
  portfolioSummary: PortfolioSummary | null
  isLoading: boolean
  error: string | null
  lastUpdated: string | null

  // Actions
  setBalances: (balances: AccountBalance[]) => void
  setPortfolioSummary: (summary: PortfolioSummary) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastUpdated: (date: string) => void
  clearData: () => void
}

/**
 * 계좌 설정 스토어
 * - 사용자가 등록한 계좌 목록 관리
 * - localStorage에 영속화
 */
export const useAccountStore = create<AccountStore>()(
  persist(
    (set) => ({
      // Initial State
      accounts: [],
      selectedAccountNo: null,

      // Actions
      setAccounts: (accounts) => set({ accounts }),

      addAccount: (account) =>
        set((state) => {
          const exists = state.accounts.some(
            (a) => a.accountNo === account.accountNo && a.productCode === account.productCode
          )
          if (exists) return state
          return {
            accounts: [...state.accounts, account],
          }
        }),

      removeAccount: (accountNo) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.accountNo !== accountNo),
          selectedAccountNo: state.selectedAccountNo === accountNo ? null : state.selectedAccountNo,
        })),

      setSelectedAccount: (accountNo) => set({ selectedAccountNo: accountNo }),
    }),
    {
      name: 'kis-accounts', // localStorage key
    }
  )
)

/**
 * 대시보드 데이터 스토어
 * - API로부터 받은 잔고 데이터 관리
 * - 포트폴리오 요약, 차트 데이터 등
 */
export const useDashboardStore = create<DashboardStore>((set) => ({
  // Initial State
  balances: [],
  portfolioSummary: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Actions
  setBalances: (balances) => set({ balances }),

  setPortfolioSummary: (summary) => set({ portfolioSummary: summary }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setLastUpdated: (date) => set({ lastUpdated: date }),

  clearData: () =>
    set({
      balances: [],
      portfolioSummary: null,
      error: null,
      lastUpdated: null,
    }),
}))

// Chart Colors - constants에서 re-export (하위 호환성 유지)
export { HOMEBREW_CHART_COLORS as CHART_COLORS } from '@/lib/constants'
