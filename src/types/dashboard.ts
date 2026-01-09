/**
 * 대시보드 컴포넌트 전용 타입 정의
 */

/**
 * 보유 종목 정보 (프론트엔드용)
 */
export interface DashboardHolding {
  stockCode: string;
  stockName: string;
  quantity: number | string;
  currentPrice: number;
  evaluationAmount: number | string;
  buyAmount: number | string;
  profitLossRate: number;
}

/**
 * 계좌 잔고 요약 (프론트엔드용)
 */
export interface DashboardBalanceSummary {
  totalBuyAmount: number;
  totalProfitLossAmount: number;
  totalEvaluationAmount: number;
  totalAsset: number;
  totalProfitLossRate: number;
}

/**
 * 계좌 잔고 데이터 (프론트엔드용)
 */
export interface DashboardBalance {
  account: {
    accountNo: string;
    productCode: string;
    accountName: string;
    isManual?: boolean;
  };
  summary: DashboardBalanceSummary;
  holdings: DashboardHolding[];
}

/**
 * Holdings 테이블 행 데이터
 */
export interface HoldingsRow {
  stockCode: string;
  stockName: string;
  quantity: number;
  currentPrice: number;
  evaluationAmount: number;
  profitLossRate: number;
  weight?: number;
}

/**
 * 시스템 로그 엔트리
 */
export interface LogEntry {
  time: string;
  msg: string;
  type: "info" | "success" | "error" | "network";
}

/**
 * 차트 데이터 아이템
 */
export interface ChartDataItem {
  name: string;
  value: number;
  fill?: string;
}

/**
 * 배당금 데이터 아이템
 */
export interface DividendItem {
  name: string;
  date: string;
  currency: "KRW" | "USD";
  rate?: number;
  type: "pension" | "regular";
  amount: number;
}
