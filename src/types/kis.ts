// 한국투자증권 API 관련 타입 정의

/**
 * 계좌 타입 정의
 */
export type AccountType = string; // "01": 종합위탁, "22": 연금저축, "29": IRP 등

/**
 * 계좌 정보
 */
export interface Account {
  accountNo: string; // 계좌번호 (앞 8자리)
  productCode: AccountType; // 계좌상품코드 (뒤 2자리)
  accountName: string; // 계좌명
  isPension: boolean; // 연금계좌 여부
  appKey?: string; // API 인증 키 (계좌별)
  appSecret?: string; // API 인증 시크릿 (계좌별)
  isManual?: boolean; // 수동 등록 계좌 여부
}

/**
 * 보유 종목 정보
 */
export interface StockHolding {
  stockCode: string; // 종목코드 (ex. 005930)
  stockName: string; // 종목명 (ex. 삼성전자)
  quantity: number; // 보유수량 (hldg_qty)
  buyAvgPrice: number; // 매입평균가 (pchs_avg_pric)
  currentPrice: number; // 현재가 (prpr)
  evaluationAmount: number; // 평가금액 (evlu_amt)
  profitLossAmount: number; // 평가손익금액 (evlu_pfls_amt)
  profitLossRate: number; // 평가손익률 (evlu_pfls_rt)
  buyAmount: number; // 매입금액 (pchs_amt)
}

/**
 * 계좌 잔고 요약 정보
 */
export interface BalanceSummary {
  totalEvaluationAmount: number; // 총 평가금액 (tot_evlu_amt)
  totalBuyAmount: number; // 총 매입금액 (pchs_amt_smtl_amt)
  totalProfitLossAmount: number; // 총 평가손익금액 (evlu_pfls_smtl_amt)
  totalProfitLossRate: number; // 총 수익률
  depositAmount: number; // 예수금 (dnca_tot_amt)
  cashAvailable: number; // 주문가능현금 (nass_amt / ord_psbl_cash)
  totalAsset: number; // 순자산 (예수금 + 평가금액)
}

/**
 * 계좌별 전체 잔고 데이터
 */
export interface AccountBalance {
  account: Account;
  holdings: StockHolding[];
  summary: BalanceSummary;
  lastUpdated: string;
}

/**
 * 전체 포트폴리오 요약
 */
export interface PortfolioSummary {
  totalAsset: number; // 전체 자산
  totalEvaluation: number; // 전체 평가금액
  totalBuyAmount: number; // 전체 매입금액 (원금)
  totalProfitLossAmount: number; // 전체 손익
  totalProfitLossRate: number; // 전체 수익률
  accountCount: number; // 계좌 수
  stockCount: number; // 보유 종목 수
}

/**
 * 자산 배분 데이터 (차트용)
 */
export interface AssetAllocation {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * 종목별 비중 데이터 (차트용)
 */
export interface StockWeight {
  stockCode: string;
  stockName: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * 계좌별 비중 데이터 (차트용)
 */
export interface AccountWeight {
  accountNo: string;
  accountName: string;
  value: number;
  percentage: number;
  color: string;
}

/**
 * API 응답 공통 형식
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * KIS API 원본 응답 - 주식잔고조회 output1 (보유종목)
 */
export interface KisBalanceOutput1 {
  pdno: string; // 종목번호
  prdt_name: string; // 상품명
  hldg_qty: string; // 보유수량
  ord_psbl_qty: string; // 주문가능수량
  pchs_avg_pric: string; // 매입평균가격
  pchs_amt: string; // 매입금액
  prpr: string; // 현재가
  evlu_amt: string; // 평가금액
  evlu_pfls_amt: string; // 평가손익금액
  evlu_pfls_rt: string; // 평가손익률
  evlu_erng_rt: string; // 평가수익률
  loan_dt: string; // 대출일자
  loan_amt: string; // 대출금액
  stln_slng_chgs: string; // 대주매각대금
  expd_dt: string; // 만기일자
  fltt_rt: string; // 등락률
  bfdy_cprs_icdc: string; // 전일대비증감
  item_mgna_rt_name: string; // 종목증거금율명
  grta_rt_name: string; // 보증금율명
  sbst_pric: string; // 대용가격
  stck_loan_unpr: string; // 주식대출단가
}

/**
 * KIS API 원본 응답 - 주식잔고조회 output2 (계좌요약)
 */
export interface KisBalanceOutput2 {
  dnca_tot_amt: string; // 예수금총금액
  nxdy_excc_amt: string; // 익일정산금액
  prvs_rcdl_excc_amt: string; // 가수도정산금액
  cma_evlu_amt: string; // CMA평가금액
  bfdy_buy_amt: string; // 전일매수금액
  thdt_buy_amt: string; // 금일매수금액
  nxdy_auto_rdpt_amt: string; // 익일자동상환금액
  bfdy_sll_amt: string; // 전일매도금액
  thdt_sll_amt: string; // 금일매도금액
  d2_auto_rdpt_amt: string; // D+2자동상환금액
  bfdy_tlex_amt: string; // 전일제비용금액
  thdt_tlex_amt: string; // 금일제비용금액
  tot_loan_amt: string; // 총대출금액
  scts_evlu_amt: string; // 유가평가금액
  tot_evlu_amt: string; // 총평가금액
  nass_amt: string; // 순자산금액
  fncg_gld_auto_rdpt_yn: string; // 융자금자동상환여부
  pchs_amt_smtl_amt: string; // 매입금액합계금액
  evlu_amt_smtl_amt: string; // 평가금액합계금액
  evlu_pfls_smtl_amt: string; // 평가손익합계금액
  tot_stln_slng_chgs: string; // 총대주매각대금
  bfdy_tot_asst_evlu_amt: string; // 전일총자산평가금액
  asst_icdc_amt: string; // 자산증감금액
  asst_icdc_erng_rt: string; // 자산증감수익율
}

/**
 * 계좌 설정 (사용자가 등록한 계좌 목록)
 */
export interface AccountConfig {
  accounts: Account[];
}
