/**
 * KIS API 관련 타입 정의
 */

export interface KisHoldingItem {
  pdno: string; // 종목번호
  prdt_name: string; // 상품명
  hldg_qty: string; // 보유수량
  pchs_avg_pric: string; // 매입평균가
  prpr: string; // 현재가
  evlu_amt: string; // 평가금액
  evlu_pfls_amt: string; // 평가손익금액
  evlu_pfls_rt: string; // 평가손익율
  pchs_amt: string; // 매입금액
  [key: string]: unknown;
}

export interface KisOverseasBalanceItem {
  ovrs_pdno: string;
  ovrs_item_name: string;
  ovrs_cblc_qty: string;
  pchs_avg_pric: string;
  now_pric2: string;
  ovrs_stck_evlu_amt: string;
  frcr_evlu_pfls_amt: string;
  evlu_pfls_rt: string;
  frcr_pchs_amt1: string;
  currency_code?: string; // Appended by Client
}

export interface StockDailyPriceItem {
  stck_bsop_date: string;
  stck_oprc: string;
  stck_hgpr: string;
  stck_lwpr: string;
  stck_clpr: string;
  acml_vol: string;
  acml_tr_pbmn: string;
  prdy_vrss: string;
  prdy_vrss_sign: string;
}

export interface OverseasDailyPriceItem {
  xymd: string;
  open: string;
  high: string;
  low: string;
  clos: string;
  tvol: string;
  tamt: string;
  diff: string;
  rate: string;
  sign: string;
}

export interface OverseasChartPriceItem {
  stck_bsop_date: string;
  ovrs_nmix_prpr: string;
  ovrs_nmix_oprc: string;
  ovrs_nmix_hgpr: string;
  ovrs_nmix_lwpr: string;
  acml_vol: string;
  acml_tr_pbmn: string;
  mod_yn: string;
}

export interface TokenData {
  access_token: string;
  access_token_token_expired: string;
  expiredAt: number;
}
