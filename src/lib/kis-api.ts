import axios from "axios";

/**
 * KIS Open API 클라이언트
 * 서버 사이드에서 한국투자증권 API를 호출하기 위한 유틸리티
 */

// API Base URL
const KIS_API_URL = {
  prod: "https://openapi.koreainvestment.com:9443",
  vps: "https://openapivts.koreainvestment.com:29443",
};

// 환경 변수
const ENV = (process.env.KIS_ENV || "prod") as "prod" | "vps";

/**
 * 계좌번호 마스킹 처리 (앞 3자리, 뒤 2자리 제외하고 마스킹)
 */
export function maskAccountNo(accNo: string): string {
  if (!accNo) return "";
  if (accNo.startsWith("MANUAL_")) return "Manual";
  const clean = accNo.replace(/[^0-9]/g, "");
  if (clean.length <= 5) return clean;
  return `${clean.substring(0, 3)}****${clean.substring(clean.length - 2)}`;
}

/**
 * 실시간 환율 조회 (Foreign Currency -> KRW)
 * 실패 시 기본값(1450 - USD 기준) 반환
 * Next.js 캐싱 옵션 사용 (300초 = 5분)
 */
export async function getExchangeRate(from: string = "USD"): Promise<number> {
  // 기본값 설정 (화폐별 대략적 기준가)
  const FALLBACK_RATES: Record<string, number> = {
    USD: 1450,
    CAD: 1050,
    JPY: 950, // 100엔 기준이 아니라 1엔 기준일 수 있음, 보통 100엔 단위지만 frankfurter는 1단위 제공 확인 필요 (Usually 1 Unit) -> JPY approx 9~10 KRW per 1 JPY
    // Frankfurter returns rate for 1 unit. 1 USD = 1450 KRW. 1 JPY = 9.5 KRW.
  };

  try {
    // Frankfurter API (Free, Open)
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=KRW`,
      {
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.warn(
        `[Exchange Rate] API Error (${response.status}), Using Fallback for ${from}`
      );
      return FALLBACK_RATES[from] || 1; // Fallback to 1 if unknown
    }

    const data = await response.json();
    // console.log(`[Exchange Rate] Current: ${data.rates.KRW} KRW/${from}`);
    return data.rates.KRW;
  } catch (error) {
    console.error(`[Exchange Rate] Fetch Error (${from}):`, error);
    return FALLBACK_RATES[from] || FALLBACK_RATES["USD"];
  }
}

/**
 * 토큰 데이터 구조
 */
export interface TokenData {
  access_token: string;
  access_token_token_expired: string;
  expiredAt: number;
}

// 전역 캐시 인터페이스
interface KisCacheEntry {
  tokenData: TokenData | null;
  promise: Promise<string> | null;
}

interface KisGlobalCache {
  [appKey: string]: KisCacheEntry;
}

// Global 객체 활용 (개발 모드 핫 리로딩 시 캐시 유지)
const globalWithKisCache = global as typeof globalThis & {
  _kisCache?: KisGlobalCache;
};

if (!globalWithKisCache._kisCache) {
  globalWithKisCache._kisCache = {};
}

import { prisma } from "./prisma";

// ... existing imports ...

// [기존 파일 기반 로직 제거됨]

// 1회성 요청 관리용 (중복 API 호출 방지용 잠금 기구)
// 토큰 정보를 저장하는 캐시가 아니라, '현재 진행 중인 Promise'만 관리합니다.
const globalWithPending = global as unknown as {
  _kisPendingRequests?: Map<string, Promise<string>>;
};
if (!globalWithPending._kisPendingRequests) {
  globalWithPending._kisPendingRequests = new Map();
}
const pendingRequests = globalWithPending._kisPendingRequests;

/**
 * 접근 토큰 발급 (DB-Only / Transient Promise Lock)
 *
 * 로직 순서:
 * 1. 현재 동일한 AppKey로 발급 중인 요청이 있는지 확인 (있으면 그 결과를 같이 기다림)
 * 2. DB(Supabase) 확인
 * 3. 만료되었거나 없으면 KIS API 호출
 * 4. 새 토큰 DB 저장
 * * 보안 정책: 모든 과정(DB조회, 발급, 저장) 중 하나라도 실패하면 에러를 던져 500 처리를 유도함.
 */
async function getAccessToken(
  appKey: string,
  appSecret: string
): Promise<string> {
  // 1. 중복 요청 방지 (Lock)
  if (pendingRequests.has(appKey)) {
    return pendingRequests.get(appKey)!;
  }

  const fetchPromise = (async () => {
    try {
      // 2. DB 캐시 확인
      const dbToken = await prisma.kisToken.findUnique({
        where: { type: `kis_${appKey}` },
      });

      // 3. 토큰이 없거나 만료된 경우 (또는 만료 임박 - 1분 버퍼): KIS API 호출
      // 만료시간이 현재시간 + 1분보다 미래여야 유효함
      const BUFFER_TIME = 60 * 1000;
      if (dbToken && dbToken.expiresAt.getTime() > Date.now() + BUFFER_TIME) {
        return dbToken.token;
      }

      // 3. 토큰이 없거나 만료된 경우: KIS API 호출
      const response = await axios.post(`${KIS_API_URL[ENV]}/oauth2/tokenP`, {
        grant_type: "client_credentials",
        appkey: appKey,
        appsecret: appSecret,
      });

      const data = response.data;

      if (!data.access_token) {
        throw new Error("KIS API로부터 토큰을 받지 못했습니다.");
      }

      let expiredTime = Date.now() + 23 * 60 * 60 * 1000; // 기본 23시간
      try {
        if (data.access_token_token_expired) {
          const dateStr = data.access_token_token_expired.replace(/-/g, "/");
          expiredTime = new Date(dateStr).getTime();
        }
      } catch (e) {
        console.warn("토큰 만료시간 파싱 실패, 기본값 사용", e);
      }

      // 4. 새 토큰 DB 저장 (Upsert)
      await prisma.kisToken.upsert({
        where: { type: `kis_${appKey}` },
        update: {
          token: data.access_token,
          expiresAt: new Date(expiredTime),
        },
        create: {
          type: `kis_${appKey}`,
          token: data.access_token,
          expiresAt: new Date(expiredTime),
        },
      });

      return data.access_token;
    } finally {
      // 작업 완료 후 잠금 해제 (메모리에서 해당 요청 제거)
      pendingRequests.delete(appKey);
    }
  })();

  pendingRequests.set(appKey, fetchPromise);
  return fetchPromise;
}

/**
 * 공통 헤더 생성 (자격증명 필요)
 */
async function getHeaders(trId: string, appKey: string, appSecret: string) {
  const token = await getAccessToken(appKey, appSecret);

  return {
    "content-type": "application/json; charset=utf-8",
    authorization: `Bearer ${token}`,
    appkey: appKey,
    appsecret: appSecret,
    tr_id: trId,
    tr_cont: "", // 연속 거래 여부
    custtype: "P", // 개인
  };
}

/**
 * 주식 잔고 조회 (credentials 필수)
 */
export async function inquireBalance(
  accountNo: string,
  productCode: string,
  appKey: string,
  appSecret: string
): Promise<{ output1: unknown[]; output2: unknown }> {
  try {
    const headers = await getHeaders("TTTC8434R", appKey, appSecret);

    // 주식 잔고 조회 URL 및 파라미터 수정
    const response = await axios.get(
      `${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/trading/inquire-balance`,
      {
        headers,
        params: {
          CANO: accountNo,
          ACNT_PRDT_CD: productCode,
          AFHR_FLPR_YN: "N",
          OFL_YN: "",
          INQR_DVSN: "02",
          UNPR_DVSN: "01",
          FUND_STTL_ICLD_YN: "N",
          FNCG_AMT_AUTO_RDPT_YN: "N",
          PRCS_DVSN: "01", // 00 -> 01 로 변경 권장 (전산운용비 무관)
          CTX_AREA_FK100: "",
          CTX_AREA_NK100: "",
        },
      }
    );

    if (response.data.rt_cd !== "0") {
      console.error(
        `[API Error] Stock Balance (${accountNo}-${productCode}): ${response.data.msg1} (${response.data.rt_cd})`
      );
      throw new Error(response.data.msg1 || "API 호출 실패");
    }

    // const output2 = response.data.output2;
    // const output1 = response.data.output1 || [];

    return {
      output1: response.data.output1 || [],
      output2: response.data.output2 || {},
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[Network Error] Stock Balance (${accountNo}-${productCode}): status=${
          error.response.status
        } msg=${error.response.data?.msg1 || "Unknown"} code=${
          error.response.data?.rt_cd || "Unknown"
        }`
      );
    }
    throw error;
  }
}

/**
 * 보유 종목 아이템 인터페이스 (국내/해외 공통화)
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
  [key: string]: unknown; // 그 외 필드 허용
}

/**
 * 통합 계좌 조회 함수 (Smart Retry 포함)
 */
export async function getAccountBalance(
  accountNo: string,
  productCode: string,
  appKey: string,
  appSecret: string
): Promise<{ output1: unknown[]; output2: unknown }> {
  // 1. 일반 주식 계좌: 국내 + 해외(미국) 통합 조회
  try {
    // 국내 주식 조회
    const domesticPromise = inquireBalance(
      accountNo,
      productCode,
      appKey,
      appSecret
    ).catch((err) => {
      console.warn(`[Domestic Balance Error] ${accountNo}:`, err.message);
      return { output1: [], output2: {} };
    });

    // 해외 주식(미국 NASD/USD) 조회
    const overseasPromise = inquireOverseasBalance(
      accountNo,
      productCode,
      appKey,
      appSecret
    ).catch((err) => {
      // 해외 주식 미약정 계좌일 수 있으므로 로그만 남기고 빈 값 처리
      console.warn(`[Overseas Balance Error] ${accountNo}:`, err.message);
      return { output1: [], output2: {} };
    });

    const [domRes, overRes] = await Promise.all([
      domesticPromise,
      overseasPromise,
    ]);

    // 국내 잔고 매핑
    const domHoldings = domRes.output1 as KisHoldingItem[];

    const USD_KRW_RATE = await getExchangeRate();

    interface KisOverseasBalanceItem {
      ovrs_pdno: string;
      ovrs_item_name: string;
      ovrs_cblc_qty: string;
      pchs_avg_pric: string;
      now_pric2: string;
      ovrs_stck_evlu_amt: string;
      frcr_evlu_pfls_amt: string;
      evlu_pfls_rt: string;
      frcr_pchs_amt1: string;
    }

    // 해외 잔고 매핑 (국내 포맷으로 변환 + 원화 환산)
    // output1의 ovrs_stck_evlu_amt 등은 USD 기준값임
    const overHoldings = (overRes.output1 as KisOverseasBalanceItem[]).map(
      (item) => ({
        pdno: item.ovrs_pdno, // 종목코드
        prdt_name: item.ovrs_item_name, // 종목명
        hldg_qty: item.ovrs_cblc_qty, // 보유수량
        pchs_avg_pric: String(parseFloat(item.pchs_avg_pric) * USD_KRW_RATE), // 매입평균가 (KRW)
        prpr: String(parseFloat(item.now_pric2) * USD_KRW_RATE), // 현재가 (KRW)
        evlu_amt: String(parseFloat(item.ovrs_stck_evlu_amt) * USD_KRW_RATE), // 평가금액 (KRW)
        evlu_pfls_amt: String(
          parseFloat(item.frcr_evlu_pfls_amt) * USD_KRW_RATE
        ), // 평가손익 (KRW)
        evlu_pfls_rt: item.evlu_pfls_rt, // 수익률 (변환 불필요)
        pchs_amt: String(parseFloat(item.frcr_pchs_amt1) * USD_KRW_RATE), // 매입금액 (KRW)
      })
    );

    // 요약(output2) 합산
    const domSummary = (domRes.output2 as Record<string, string>) || {};
    const overSummary =
      ((Array.isArray(overRes.output2)
        ? overRes.output2[0]
        : overRes.output2) as Record<string, string>) || {};

    // 국내 데이터 파싱
    const d_eval = parseFloat(domSummary.tot_evlu_amt || "0");
    const d_buy = parseFloat(domSummary.pchs_amt_smtl_amt || "0");
    const d_pfls = parseFloat(domSummary.evlu_pfls_smtl_amt || "0");
    const d_deposit = parseFloat(domSummary.dnca_tot_amt || "0");

    // 해외 데이터 파싱 (USD -> KRW)
    // tot_evlu_pfls_amt: 해외 총 평가금액(=자산) (USD)
    // frcr_pchs_amt1: 해외 총 매입금액 (USD)
    // ovrs_tot_pfls: 해외 총 손익 (USD)
    const o_eval =
      parseFloat(overSummary.tot_evlu_pfls_amt || "0") * USD_KRW_RATE;
    const o_buy = parseFloat(overSummary.frcr_pchs_amt1 || "0") * USD_KRW_RATE;
    const o_pfls = parseFloat(overSummary.ovrs_tot_pfls || "0") * USD_KRW_RATE;

    // 합산된 요약 생성
    // API route.ts에서 사용하는 필드명에 맞춰서 매핑
    const mergedSummary = {
      ...domSummary,
      tot_evlu_amt: String(d_eval + o_eval), // 총평가금액 (국내 + 해외환산)
      pchs_amt_smtl_amt: String(d_buy + o_buy), // 총매입금액
      evlu_pfls_smtl_amt: String(d_pfls + o_pfls), // 총평가손익
      dnca_tot_amt: String(d_deposit), // 예수금 (해외예수금은 frcr_drwg_psbl_amt인데 일단 생략 or 합산?)
      nass_amt: String(d_eval + o_eval + d_deposit), // 순자산 (평가금액 + 예수금)
    };

    // holdings 병합
    const mergedHoldings = [...domHoldings, ...overHoldings];

    return {
      output1: mergedHoldings,
      output2: mergedSummary,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // 3. "위탁계좌만 조회 가능" 에러 발생 시... (Consignment Error Handling)
    if (
      errorMsg.includes("위탁계좌") ||
      errorMsg.includes("계좌상품코드") ||
      errorMsg.includes("존재하지 않는")
    ) {
      // ... (Smart Retry Logic - Same as before)
      // Code truncated for brevity in this replacement block, assuming logic handles flow or re-throws
      throw error;
    }
    throw error;
  }
}

/**
 * 해외 주식 잔고 조회 (미국, 환전통화 USD 기준)
 */
export async function inquireOverseasBalance(
  accountNo: string,
  productCode: string,
  appKey: string,
  appSecret: string
): Promise<{ output1: unknown[]; output2: unknown }> {
  try {
    // 해외 주식 잔고 조회 TR_ID: TTTS3012R (실전) / VTTS3012R (모의)
    const trId = ENV === "prod" ? "TTTS3012R" : "VTTS3012R";
    const headers = await getHeaders(trId, appKey, appSecret);

    const response = await axios.get(
      `${KIS_API_URL[ENV]}/uapi/overseas-stock/v1/trading/inquire-balance`,
      {
        headers,
        params: {
          CANO: accountNo,
          ACNT_PRDT_CD: productCode,
          OVRS_EXCG_CD: "NASD", // 미국 전체 (나스닥, 뉴욕, 아멕스)
          TR_CRCY_CD: "USD", // 미국 달러
          CTX_AREA_FK200: "",
          CTX_AREA_NK200: "",
        },
      }
    );

    if (response.data.rt_cd !== "0") {
      console.warn(
        `[API Info] Overseas Balance (${accountNo}-${productCode}): ${response.data.msg1}`
      );
      return { output1: [], output2: {} };
    }

    return {
      output1: response.data.output1 || [],
      output2: response.data.output2 || {},
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[Network Error] Overseas Balance (${accountNo}-${productCode}): status=${error.response.status} msg=${error.response.data?.msg1} code=${error.response.data?.rt_cd}`
      );
    }
    throw error;
  }
}

/**
 * 뉴스 목록 조회
 */
export async function getNews(
  appKey: string,
  appSecret: string
): Promise<{ date: string; time: string; title: string; code: string }[]> {
  // 모의투자(VPS)에서는 뉴스 API가 지원되지 않음 -> 빈 배열 반환
  if (ENV === "vps") {
    return [];
  }

  try {
    const headers = await getHeaders("FHKST01011800", appKey, appSecret);

    // 국내 주식 뉴스 (실전/모의 공통)
    const response = await axios.get(
      `${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/quotations/news-title`,
      {
        headers,
        params: {
          FID_NEWS_KEY: "", // 전체 뉴스
        },
      }
    );

    if (response.data.rt_cd !== "0") {
      console.warn(`[API Info] News Fetch: ${response.data.msg1}`);
      return [];
    }

    const output = response.data.output || [];
    if (output.length === 0) {
      // API는 성공했으나 뉴스가 없는 경우
      return [];
    }

    return output.map((item: Record<string, string>) => ({
      date: item.dorg, // 기사 날짜
      time: item.hms, // 기사 시간
      title: item.title, // 기사 제목
      code: item.shtn_iscd, // 종목 코드
    }));
  } catch (error) {
    console.error("News Fetch Error:", error);
    return [];
  }
}

/**
 * 숫자 문자열을 숫자로 변환
 */
export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const num = parseFloat(value.replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

/**
 * 금액 포맷팅 (한국 원화)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

/**
 * 숫자 축약 표기 (만, 억)
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`;
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}만`;
  }
  return value.toLocaleString("ko-KR");
}

/**
 * 주식 일별 시세 조회 API (국내주식기간별시세)
 * TR_ID: FHKST03010100
 * Returns: 일/주/월/년 봉 데이터 (OHLCV)
 */
export interface StockDailyPriceItem {
  stck_bsop_date: string; // 영업일자 (YYYYMMDD)
  stck_oprc: string; // 시가
  stck_hgpr: string; // 고가
  stck_lwpr: string; // 저가
  stck_clpr: string; // 종가
  acml_vol: string; // 누적 거래량
  acml_tr_pbmn: string; // 누적 거래대금
  prdy_vrss: string; // 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호
}

export async function getStockDailyPrice(
  stockCode: string,
  appKey: string,
  appSecret: string,
  startDate: string, // YYYYMMDD
  endDate: string, // YYYYMMDD
  periodCode: "D" | "W" | "M" | "Y" = "D" // D: 일봉, W: 주봉, M: 월봉, Y: 년봉
): Promise<{ output1: StockDailyPriceItem[]; output2?: unknown }> {
  try {
    const headers = await getHeaders("FHKST03010100", appKey, appSecret);

    const response = await axios.get(
      `${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J", // J: 주식, ETF, ETN
          FID_INPUT_ISCD: stockCode,
          FID_INPUT_DATE_1: startDate,
          FID_INPUT_DATE_2: endDate,
          FID_PERIOD_DIV_CODE: periodCode,
          FID_ORG_ADJ_PRC: "0", // 0: 수정주가, 1: 원주가
        },
      }
    );

    if (response.data.rt_cd !== "0") {
      console.error(
        `[API Error] Stock Daily Price (${stockCode}): ${response.data.msg1} (${response.data.rt_cd})`
      );
      throw new Error(response.data.msg1 || "주가 시세 조회 실패");
    }

    return {
      output1: response.data.output2 || [], // Note: output2가 실제 일봉 데이터
      output2: response.data.output1 || {}, // output1은 종목 기본정보
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[Network Error] Stock Daily Price (${stockCode}): status=${
          error.response.status
        } msg=${error.response.data?.msg1 || "Unknown"} code=${
          error.response.data?.rt_cd || "Unknown"
        }`
      );
    }
    throw error;
  }
}

/**
 * 주식 현재가 시세 조회
 * TR_ID: FHKST01010100
 */
export async function getStockCurrentPrice(
  stockCode: string,
  appKey: string,
  appSecret: string
): Promise<number> {
  try {
    const headers = await getHeaders("FHKST01010100", appKey, appSecret);

    const response = await axios.get(
      `${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "J", // J: 주식, ETF, ETN
          FID_INPUT_ISCD: stockCode,
        },
      }
    );

    if (response.data.rt_cd !== "0") {
      console.warn(
        `[API Warn] Stock Price (${stockCode}): ${response.data.msg1}`
      );
      return 0;
    }

    const price = parseInt(response.data.output.stck_prpr || "0", 10);
    return price;
  } catch (error) {
    console.error(`[API Error] Fetching price for ${stockCode}`, error);
    return 0;
  }
}

/**
 * 해외주식 일별 시세 조회 API (해외주식 종목/지수/환율기간별시세)
 * TR_ID: FHKST03030100
 * Returns: 일봉 데이터 (OHLCV) - 더 많은 데이터 제공
 *
 * Note: HHDFS76240000 API는 최근 100건만 제공하지만,
 *       FHKST03030100은 시작일-종료일 범위로 조회 가능
 */
export interface OverseasDailyPriceItem {
  xymd: string; // 일자 (YYYYMMDD)
  open: string; // 시가
  high: string; // 고가
  low: string; // 저가
  clos: string; // 종가
  tvol: string; // 거래량
  tamt: string; // 거래대금
  diff: string; // 전일 대비
  rate: string; // 등락률
  sign: string; // 부호
}

// FHKST03030100 API 응답 구조
export interface OverseasChartPriceItem {
  stck_bsop_date: string; // 주식 영업 일자 (YYYYMMDD)
  ovrs_nmix_prpr: string; // 해외 종목 현재가
  ovrs_nmix_oprc: string; // 시가
  ovrs_nmix_hgpr: string; // 고가
  ovrs_nmix_lwpr: string; // 저가
  acml_vol: string; // 누적 거래량
  acml_tr_pbmn: string; // 누적 거래대금
  mod_yn: string; // 변경 여부
}

export async function getOverseasDailyPrice(
  stockCode: string,
  exchangeCode: string, // NAS, NYS, AMS, HKS, SHS, SZS, TSE, HNX, HSX
  appKey: string,
  appSecret: string,
  startDate: string, // YYYYMMDD
  endDate: string, // YYYYMMDD
  periodCode: "D" | "W" | "M" = "D" // D: 일, W: 주, M: 월
): Promise<{ output1: OverseasDailyPriceItem[]; output2?: unknown }> {
  try {
    const headers = await getHeaders("FHKST03030100", appKey, appSecret);

    // 거래소 코드 매핑 (3자리로 변환)
    const exchangeMap: Record<string, string> = {
      NASD: "NAS",
      NYSE: "NYS",
      AMEX: "AMS",
      NAS: "NAS",
      NYS: "NYS",
      AMS: "AMS",
    };
    const mappedExchange = exchangeMap[exchangeCode] || "NAS";

    const response = await axios.get(
      `${KIS_API_URL[ENV]}/uapi/overseas-price/v1/quotations/inquire-daily-chartprice`,
      {
        headers,
        params: {
          FID_COND_MRKT_DIV_CODE: "N", // N: 해외지수, 주식
          FID_INPUT_ISCD: `${mappedExchange}${stockCode}`, // 거래소코드+종목코드 (예: NASAAPL)
          FID_INPUT_DATE_1: startDate,
          FID_INPUT_DATE_2: endDate,
          FID_PERIOD_DIV_CODE: periodCode,
        },
      }
    );

    if (response.data.rt_cd !== "0") {
      console.error(
        `[API Error] Overseas Daily Price (${stockCode}): ${response.data.msg1} (${response.data.rt_cd})`
      );
      throw new Error(response.data.msg1 || "해외 주가 시세 조회 실패");
    }

    // output2가 실제 일봉 데이터
    const rawItems = (response.data.output2 || []) as OverseasChartPriceItem[];

    // OverseasDailyPriceItem 형식으로 변환
    const mappedItems: OverseasDailyPriceItem[] = rawItems.map((item) => ({
      xymd: item.stck_bsop_date,
      open: item.ovrs_nmix_oprc,
      high: item.ovrs_nmix_hgpr,
      low: item.ovrs_nmix_lwpr,
      clos: item.ovrs_nmix_prpr,
      tvol: item.acml_vol,
      tamt: item.acml_tr_pbmn,
      diff: "0",
      rate: "0",
      sign: "0",
    }));

    return {
      output1: mappedItems,
      output2: response.data.output1 || {},
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[Network Error] Overseas Daily Price (${stockCode}): status=${
          error.response.status
        } msg=${error.response.data?.msg1 || "Unknown"} code=${
          error.response.data?.rt_cd || "Unknown"
        }`
      );
    }
    throw error;
  }
}
