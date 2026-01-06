import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account, AccountBalance, PortfolioSummary, AssetAllocation, StockWeight, AccountWeight } from '@/types'

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
interface DashboardStore {
  // State
  balances: AccountBalance[]
  portfolioSummary: PortfolioSummary | null
  assetAllocation: AssetAllocation[]
  stockWeights: StockWeight[]
  accountWeights: AccountWeight[]
  isLoading: boolean
  error: string | null
  lastUpdated: string | null

  // Actions
  setBalances: (balances: AccountBalance[]) => void
  setPortfolioSummary: (summary: PortfolioSummary) => void
  setAssetAllocation: (allocation: AssetAllocation[]) => void
  setStockWeights: (weights: StockWeight[]) => void
  setAccountWeights: (weights: AccountWeight[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastUpdated: (date: string) => void
  clearData: () => void
}

/**
 * UI 상태 스토어 타입
 */
interface UIStore {
  // State
  sidebarOpen: boolean
  activeView: 'overview' | 'accounts' | 'holdings' | 'analysis'
  refreshInterval: number // 자동 갱신 간격 (분)

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setActiveView: (view: UIStore['activeView']) => void
  setRefreshInterval: (interval: number) => void
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
  assetAllocation: [],
  stockWeights: [],
  accountWeights: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Actions
  setBalances: (balances) => set({ balances }),

  setPortfolioSummary: (summary) => set({ portfolioSummary: summary }),

  setAssetAllocation: (allocation) => set({ assetAllocation: allocation }),

  setStockWeights: (weights) => set({ stockWeights: weights }),

  setAccountWeights: (weights) => set({ accountWeights: weights }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setLastUpdated: (date) => set({ lastUpdated: date }),

  clearData: () =>
    set({
      balances: [],
      portfolioSummary: null,
      assetAllocation: [],
      stockWeights: [],
      accountWeights: [],
      error: null,
      lastUpdated: null,
    }),
}))

/**
 * UI 상태 스토어
 * - 사이드바, 뷰 상태 등 UI 관련 상태 관리
 */
export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Initial State
      sidebarOpen: true,
      activeView: 'overview',
      refreshInterval: 5,

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setActiveView: (view) => set({ activeView: view }),

      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
    }),
    {
      name: 'kis-ui-preferences',
    }
  )
)

// Chart Colors - Homebrew Terminal 테마
export const CHART_COLORS = [
  '#2ea44f', // brew-green (Primary)
  '#3fb950', // brew-neonGreen (Highlight)
  '#58a6ff', // brew-blue (Info)
  '#d29922', // brew-yellow (Warning)
  '#f85149', // brew-red (Error)
  '#a371f7', // Purple
  '#79c0ff', // Light Blue
  '#7ee787', // Light Green
  '#ffa657', // Orange
  '#ff7b72', // Light Red
]
