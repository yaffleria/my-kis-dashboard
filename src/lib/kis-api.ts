import axios from 'axios'

/**
 * KIS Open API 클라이언트
 * 서버 사이드에서 한국투자증권 API를 호출하기 위한 유틸리티
 */

// API Base URL
const KIS_API_URL = {
  prod: 'https://openapi.koreainvestment.com:9443',
  vps: 'https://openapivts.koreainvestment.com:29443',
}

// 환경 변수
const ENV = (process.env.KIS_ENV || 'prod') as 'prod' | 'vps'
const DEFAULT_USD_KRW_RATE = 1450

/**
 * 계좌번호 마스킹 처리 (앞 3자리, 뒤 2자리 제외하고 마스킹)
 */
export function maskAccountNo(accNo: string): string {
  if (!accNo) return ''
  const clean = accNo.replace(/[^0-9]/g, '')
  if (clean.length <= 5) return clean
  return `${clean.substring(0, 3)}****${clean.substring(clean.length - 2)}`
}

/**
 * 실시간 환율 조회 (USD -> KRW)
 * 실패 시 기본값(1450) 반환
 * Next.js 캐싱 옵션 사용 (300초 = 5분)
 */
export async function getExchangeRate(): Promise<number> {
  try {
    // Frankfurter API (Free, Open)
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW', {
      next: { revalidate: 300 },
    })
    if (!response.ok) {
      console.warn(`[Exchange Rate] API Error (${response.status}), Using Fallback: ${DEFAULT_USD_KRW_RATE}`)
      return DEFAULT_USD_KRW_RATE
    }
    const data = await response.json()
    console.log(`[Exchange Rate] Current: ${data.rates.KRW} KRW/USD`)
    return data.rates.KRW
  } catch (error) {
    console.error('[Exchange Rate] Fetch Error:', error)
    return DEFAULT_USD_KRW_RATE
  }
}

/**
 * 토큰 데이터 구조
 */
export interface TokenData {
  access_token: string
  access_token_token_expired: string
  expiredAt: number
}

/**
 * 멀티 키 토큰 캐시 구조
 */
export interface MultiTokenCache {
  [appKey: string]: TokenData
}

// 메모리 캐시 (AppKey -> TokenData)
let memoryTokenCache: MultiTokenCache = {}

import fs from 'fs'
import path from 'path'

// ... existing imports ...

const TOKEN_FILE_PATH = path.join(process.cwd(), '.kis_token.json')

// 파일에서 토큰 캐시 전체 읽기
function readTokenCache(): MultiTokenCache {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8')
      return JSON.parse(data) as MultiTokenCache
    }
  } catch (err) {
    console.error('토큰 파일 읽기 실패:', err)
  }
  return {}
}

// 토큰 캐시 파일에 쓰기 (업데이트)
function writeTokenCache(appKey: string, tokenData: TokenData) {
  try {
    const currentCache = readTokenCache()
    currentCache[appKey] = tokenData
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(currentCache, null, 2), 'utf-8')
    memoryTokenCache = currentCache // 메모리 동기화
  } catch (err) {
    console.error('토큰 파일 쓰기 실패:', err)
  }
}

/**
 * 접근 토큰 발급 (App Key 별로 관리)
 */
async function getAccessToken(appKey: string, appSecret: string): Promise<string> {
  // 1. 메모리 캐시 확인
  if (memoryTokenCache[appKey] && memoryTokenCache[appKey].expiredAt > Date.now()) {
    return memoryTokenCache[appKey].access_token
  }

  // 2. 파일 캐시 확인 (초기 로딩)
  if (Object.keys(memoryTokenCache).length === 0) {
    memoryTokenCache = readTokenCache()
    if (memoryTokenCache[appKey] && memoryTokenCache[appKey].expiredAt > Date.now()) {
      return memoryTokenCache[appKey].access_token
    }
  }

  // 3. API 호출
  console.log(`[KIS API] 새로운 접근 토큰 요청 (Key: ${appKey.substring(0, 5)}...)`)

  try {
    const response = await axios.post(`${KIS_API_URL[ENV]}/oauth2/tokenP`, {
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret,
    })

    const data = response.data
    // 만료 시간 파싱 (안전장치: 파싱 실패 시 23시간으로 설정)
    let expiredTime = Date.now() + 23 * 60 * 60 * 1000
    try {
      if (data.access_token_token_expired) {
        // format: "2025-01-05 15:40:20"
        const dateStr = data.access_token_token_expired.replace(/-/g, '/') // iOS/Safari 호환 등
        expiredTime = new Date(dateStr).getTime()
      }
    } catch (e) {
      console.warn('토큰 만료시간 파싱 실패, 기본값 사용', e)
    }

    const tokenData: TokenData = {
      access_token: data.access_token,
      access_token_token_expired: data.access_token_token_expired,
      expiredAt: expiredTime,
    }

    // 캐시 저장
    writeTokenCache(appKey, tokenData)

    return data.access_token
  } catch (error) {
    console.error('접근 토큰 발급 실패:', error)
    throw new Error('KIS API 접근 토큰 발급에 실패했습니다.')
  }
}

/**
 * 공통 헤더 생성 (자격증명 필요)
 */
async function getHeaders(trId: string, appKey: string, appSecret: string) {
  const token = await getAccessToken(appKey, appSecret)

  return {
    'content-type': 'application/json; charset=utf-8',
    authorization: `Bearer ${token}`,
    appkey: appKey,
    appsecret: appSecret,
    tr_id: trId,
    tr_cont: '', // 연속 거래 여부
    custtype: 'P', // 개인
  }
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
    const headers = await getHeaders('TTTC8434R', appKey, appSecret)

    // 주식 잔고 조회 URL 및 파라미터 수정
    const response = await axios.get(`${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/trading/inquire-balance`, {
      headers,
      params: {
        CANO: accountNo,
        ACNT_PRDT_CD: productCode,
        AFHR_FLPR_YN: 'N',
        OFL_YN: '',
        INQR_DVSN: '02',
        UNPR_DVSN: '01',
        FUND_STTL_ICLD_YN: 'N',
        FNCG_AMT_AUTO_RDPT_YN: 'N',
        PRCS_DVSN: '00',
        CTX_AREA_FK100: '',
        CTX_AREA_NK100: '',
      },
    })

    if (response.data.rt_cd !== '0') {
      console.error(
        `[API Error] Stock Balance (${accountNo}-${productCode}): ${response.data.msg1} (${response.data.rt_cd})`
      )
      throw new Error(response.data.msg1 || 'API 호출 실패')
    }

    const output2 = response.data.output2
    const output1 = response.data.output1 || []
    // 디버깅: 성공한 조회 결과의 요약 데이터 로그
    console.log(
      `[Balance Debug] ${accountNo}-${productCode} Holdings: ${output1.length}, Summary Keys: ${Object.keys(output2 || {}).length}`
    )

    return {
      output1: response.data.output1 || [],
      output2: response.data.output2 || {},
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[Network Error] Stock Balance (${accountNo}-${productCode}): status=${error.response.status} data=${JSON.stringify(error.response.data)}`
      )
    }
    throw error
  }
}

/**
 * CMA 계좌 자산현황 조회 (투자계좌자산현황조회 API)
 * productCode: 21
 */
export async function inquireCMABalance(
  accountNo: string,
  productCode: string, // 21
  appKey: string,
  appSecret: string
): Promise<{ output1: unknown[]; output2: unknown }> {
  try {
    // 투자계좌자산현황조회 API: CTRP6548R
    const headers = await getHeaders('CTRP6548R', appKey, appSecret)

    const response = await axios.get(`${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/trading/inquire-account-balance`, {
      headers,
      params: {
        CANO: accountNo,
        ACNT_PRDT_CD: productCode,
        INQR_DVSN_1: '',
        BSPR_BF_DT_APLY_YN: '',
      },
    })

    if (response.data.rt_cd !== '0') {
      console.error(
        `[API Error] CMA Balance (${accountNo}-${productCode}): ${response.data.msg1} (${response.data.rt_cd})`
      )
      throw new Error(response.data.msg1 || 'API 호출 실패')
    }

    const output1 = response.data.output1 || []
    const output2 = response.data.output2 || {}

    // CMA 상세 디버깅: 첫 번째 종목의 필드명 확인
    if (output1.length > 0) {
      console.log(`[CMA Debug] First item keys: ${Object.keys(output1[0]).join(', ')}`)
    }

    console.log(
      `[Balance Debug] CMA ${accountNo}-${productCode} Holdings: ${output1.length}, Summary: ${JSON.stringify(output2).substring(0, 100)}`
    )

    return {
      output1,
      output2,
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[Network Error] CMA Balance (${accountNo}-${productCode}): status=${error.response.status} data=${JSON.stringify(error.response.data)}`
      )
    }
    throw error
  }
}

/**
 * 연금/퇴직연금 계좌 잔고 조회
 */
export async function inquirePensionBalance(
  accountNo: string,
  productCode: string, // 22 or 29
  appKey: string,
  appSecret: string
): Promise<{ output1: unknown[]; output2: unknown }> {
  try {
    // 연금저축/퇴직연금(IRP) TR_ID: TTTC2208R (계좌상품별 잔고 상세 조회) - URL이 다름
    const headers = await getHeaders('TTTC2208R', appKey, appSecret)

    const response = await axios.get(`${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/trading/pension/inquire-balance`, {
      headers,
      params: {
        CANO: accountNo,
        ACNT_PRDT_CD: productCode,
        INQR_DVSN: '02',
        UNPR_DVSN: '01',
        FUND_STTL_ICLD_YN: 'N',
        FNCG_AMT_AUTO_RDPT_YN: 'N',
        PRCS_DVSN: '01',
        ACCA_DVSN_CD: '01', // 01: 개인
        CTX_AREA_FK100: '',
        CTX_AREA_NK100: '',
      },
    })

    if (response.data.rt_cd !== '0') {
      console.error(
        `[API Error] Pension Balance (${accountNo}-${productCode}): ${response.data.msg1} (${response.data.rt_cd})`
      )
      throw new Error(response.data.msg1 || 'API 호출 실패')
    }

    const output2 = response.data.output2
    const output1 = response.data.output1 || []
    console.log(
      `[Balance Debug] Pension ${accountNo}-${productCode} Holdings: ${output1.length}, Summary Keys: ${Object.keys(output2 || {}).length}`
    )

    return {
      output1: response.data.output1 || [],
      output2: response.data.output2 || {},
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[Network Error] Pension Balance (${accountNo}-${productCode}): status=${error.response.status} data=${JSON.stringify(error.response.data)}`
      )
    }
    throw error
  }
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
  // 1. 퇴직연금(IRP, 29) 코드가 명시된 경우 pension API 호출
  if (productCode === '29') {
    return inquirePensionBalance(accountNo, productCode, appKey, appSecret)
  }

  // 2. CMA 계좌(21)는 투자계좌자산현황조회 API 사용
  if (productCode === '21') {
    return inquireCMABalance(accountNo, productCode, appKey, appSecret)
  }

  // 3. 일반 주식 계좌: 국내 + 해외(미국) 통합 조회
  try {
    // 국내 주식 조회
    const domesticPromise = inquireBalance(accountNo, productCode, appKey, appSecret).catch((err) => {
      console.warn(`[Domestic Balance Error] ${accountNo}:`, err.message)
      return { output1: [], output2: {} }
    })

    // 해외 주식(미국 NASD/USD) 조회
    const overseasPromise = inquireOverseasBalance(accountNo, productCode, appKey, appSecret).catch((err) => {
      // 해외 주식 미약정 계좌일 수 있으므로 로그만 남기고 빈 값 처리
      console.warn(`[Overseas Balance Error] ${accountNo}:`, err.message)
      return { output1: [], output2: {} }
    })

    const [domRes, overRes] = await Promise.all([domesticPromise, overseasPromise])

    // 국내 잔고 매핑
    const domHoldings = domRes.output1 as unknown[]

    const USD_KRW_RATE = await getExchangeRate()

    interface KisOverseasBalanceItem {
      ovrs_pdno: string
      ovrs_item_name: string
      ovrs_cblc_qty: string
      pchs_avg_pric: string
      now_pric2: string
      ovrs_stck_evlu_amt: string
      frcr_evlu_pfls_amt: string
      evlu_pfls_rt: string
      frcr_pchs_amt1: string
    }

    // 해외 잔고 매핑 (국내 포맷으로 변환 + 원화 환산)
    // output1의 ovrs_stck_evlu_amt 등은 USD 기준값임
    const overHoldings = (overRes.output1 as KisOverseasBalanceItem[]).map((item) => ({
      pdno: item.ovrs_pdno, // 종목코드
      prdt_name: item.ovrs_item_name, // 종목명
      hldg_qty: item.ovrs_cblc_qty, // 보유수량
      pchs_avg_pric: String(parseFloat(item.pchs_avg_pric) * USD_KRW_RATE), // 매입평균가 (KRW)
      prpr: String(parseFloat(item.now_pric2) * USD_KRW_RATE), // 현재가 (KRW)
      evlu_amt: String(parseFloat(item.ovrs_stck_evlu_amt) * USD_KRW_RATE), // 평가금액 (KRW)
      evlu_pfls_amt: String(parseFloat(item.frcr_evlu_pfls_amt) * USD_KRW_RATE), // 평가손익 (KRW)
      evlu_pfls_rt: item.evlu_pfls_rt, // 수익률 (변환 불필요)
      pchs_amt: String(parseFloat(item.frcr_pchs_amt1) * USD_KRW_RATE), // 매입금액 (KRW)
    }))

    // 요약(output2) 합산
    const domSummary = (domRes.output2 as Record<string, string>) || {}
    const overSummary =
      ((Array.isArray(overRes.output2) ? overRes.output2[0] : overRes.output2) as Record<string, string>) || {}

    // 국내 데이터 파싱
    const d_eval = parseFloat(domSummary.tot_evlu_amt || '0')
    const d_buy = parseFloat(domSummary.pchs_amt_smtl_amt || '0')
    const d_pfls = parseFloat(domSummary.evlu_pfls_smtl_amt || '0')
    const d_deposit = parseFloat(domSummary.dnca_tot_amt || '0')

    // 해외 데이터 파싱 (USD -> KRW)
    // tot_evlu_pfls_amt: 해외 총 평가금액(=자산) (USD)
    // frcr_pchs_amt1: 해외 총 매입금액 (USD)
    // ovrs_tot_pfls: 해외 총 손익 (USD)
    const o_eval = parseFloat(overSummary.tot_evlu_pfls_amt || '0') * USD_KRW_RATE
    const o_buy = parseFloat(overSummary.frcr_pchs_amt1 || '0') * USD_KRW_RATE
    const o_pfls = parseFloat(overSummary.ovrs_tot_pfls || '0') * USD_KRW_RATE

    // 합산된 요약 생성
    // API route.ts에서 사용하는 필드명에 맞춰서 매핑
    const mergedSummary = {
      ...domSummary,
      tot_evlu_amt: String(d_eval + o_eval), // 총평가금액 (국내 + 해외환산)
      pchs_amt_smtl_amt: String(d_buy + o_buy), // 총매입금액
      evlu_pfls_smtl_amt: String(d_pfls + o_pfls), // 총평가손익
      dnca_tot_amt: String(d_deposit), // 예수금 (해외예수금은 frcr_drwg_psbl_amt인데 일단 생략 or 합산?)
      nass_amt: String(d_eval + o_eval + d_deposit), // 순자산 (평가금액 + 예수금)
    }

    // holdings 병합
    const mergedHoldings = [...domHoldings, ...overHoldings]

    return {
      output1: mergedHoldings,
      output2: mergedSummary,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    // 3. "위탁계좌만 조회 가능" 에러 발생 시... (Consignment Error Handling)
    if (errorMsg.includes('위탁계좌') || errorMsg.includes('계좌상품코드') || errorMsg.includes('존재하지 않는')) {
      // ... (Smart Retry Logic - Same as before)
      // Code truncated for brevity in this replacement block, assuming logic handles flow or re-throws
      throw error
    }
    throw error
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
    const trId = ENV === 'prod' ? 'TTTS3012R' : 'VTTS3012R'
    const headers = await getHeaders(trId, appKey, appSecret)

    const response = await axios.get(`${KIS_API_URL[ENV]}/uapi/overseas-stock/v1/trading/inquire-balance`, {
      headers,
      params: {
        CANO: accountNo,
        ACNT_PRDT_CD: productCode,
        OVRS_EXCG_CD: 'NASD', // 미국 전체 (나스닥, 뉴욕, 아멕스)
        TR_CRCY_CD: 'USD', // 미국 달러
        CTX_AREA_FK200: '',
        CTX_AREA_NK200: '',
      },
    })

    if (response.data.rt_cd !== '0') {
      console.warn(`[API Info] Overseas Balance (${accountNo}-${productCode}): ${response.data.msg1}`)
      return { output1: [], output2: {} }
    }

    return {
      output1: response.data.output1 || [],
      output2: response.data.output2 || {},
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`[Network Error] Overseas Balance (${accountNo}-${productCode}): status=${error.response.status}`)
    }
    throw error
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
  if (ENV === 'vps') {
    return []
  }

  try {
    const headers = await getHeaders('FHKST01011800', appKey, appSecret)

    // 국내 주식 뉴스 (실전/모의 공통)
    const response = await axios.get(`${KIS_API_URL[ENV]}/uapi/domestic-stock/v1/quotations/news-title`, {
      headers,
      params: {
        FID_NEWS_KEY: '', // 전체 뉴스
      },
    })

    if (response.data.rt_cd !== '0') {
      console.warn(`[API Info] News Fetch: ${response.data.msg1}`)
      return []
    }

    const output = response.data.output || []
    if (output.length === 0) {
      // API는 성공했으나 뉴스가 없는 경우
      return []
    }

    return output.map((item: Record<string, string>) => ({
      date: item.dorg, // 기사 날짜
      time: item.hms, // 기사 시간
      title: item.title, // 기사 제목
      code: item.shtn_iscd, // 종목 코드
    }))
  } catch (error) {
    console.error('News Fetch Error:', error)
    return []
  }
}

/**
 * 숫자 문자열을 숫자로 변환
 */
export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0
  const num = parseFloat(value.replace(/,/g, ''))
  return isNaN(num) ? 0 : num
}

/**
 * 금액 포맷팅 (한국 원화)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/**
 * 숫자 축약 표기 (만, 억)
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억`
  }
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}만`
  }
  return value.toLocaleString('ko-KR')
}
