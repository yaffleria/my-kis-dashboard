import { NextResponse } from 'next/server'
import { getAccountBalance, parseNumber, maskAccountNo } from '@/lib/kis-api'
import { DEMO_BALANCES } from '@/lib/demo-data'
import { serverLog } from '@/lib/server-logger'
import type {
  AccountBalance,
  StockHolding,
  BalanceSummary,
  Account,
  AccountType,
  KisBalanceOutput1,
  KisBalanceOutput2,
  KisPensionOutput2,
} from '@/types'

/**
 * 환경변수에서 계좌 목록 조회
 * KIS_ACCOUNTS 환경변수에서 JSON 배열을 파싱하여 반환
 */
/**
 * 환경변수에서 계좌 목록 조회
 * KIS_ACCOUNTS 환경변수(JSON 배열)만 사용
 */
function getAccountsFromEnv(): Account[] {
  const accountsJson = process.env.KIS_ACCOUNTS

  if (!accountsJson) {
    return []
  }

  try {
    const parsed = JSON.parse(accountsJson)
    if (Array.isArray(parsed)) {
      return parsed.map((acc) => {
        // 계좌번호 정제: 문자열 변환, 하이픈 및 공백 제거 (숫자만 남김)
        const rawAccountNo = String(acc.accountNo || '')
        const accountNo = rawAccountNo.replace(/[^0-9]/g, '')

        // 상품코드 정제: 문자열 변환, 공백 제거, 1자리인 경우 2자리로 패딩
        let productCode = String(acc.productCode || '01').trim()
        if (productCode.length === 1) productCode = productCode.padStart(2, '0')

        return {
          accountNo,
          productCode: productCode as AccountType,
          appKey: acc.appKey,
          appSecret: acc.appSecret,
          accountName: acc.accountName || acc.name || '계좌',
          isPension: acc.isPension || productCode === '22' || productCode === '29',
        }
      })
    }
  } catch (err) {
    console.error('KIS_ACCOUNTS 파싱 오류. JSON 형식을 확인하세요:', err)
  }

  return []
}

/**
 * POST /api/balance
 * 계좌 잔고 조회 API
 *
 * Request Body:
 * {
 *   accounts: Account[]
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data: AccountBalance[],
 *   error?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accounts } = body as { accounts: Account[] }

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json({ success: false, error: '계좌 정보가 필요합니다.' }, { status: 400 })
    }

    const results: AccountBalance[] = []

    // 환경변수의 계좌 목록 미리 로드 (Credential Lookup용)
    const envAccounts = getAccountsFromEnv()

    // 각 계좌별로 잔고 조회
    for (const account of accounts) {
      // 보안: 민감 정보 분리 및 사용자 키 우선 사용 (없으면 전역 키 Fallback)
      const { appKey: _ak, appSecret: _as, ...safeAccount } = account

      let appKey = _ak
      let appSecret = _as

      // 키가 없으면 환경변수 매칭 시도
      if (!appKey || !appSecret) {
        const envMatch = envAccounts.find((ea) => ea.accountNo === account.accountNo)
        if (envMatch) {
          appKey = envMatch.appKey
          appSecret = envMatch.appSecret
        }
      }

      // 그래도 없으면 전역 키(구방식) Fallback
      if (!appKey) appKey = process.env.KIS_APP_KEY
      if (!appSecret) appSecret = process.env.KIS_APP_SECRET

      try {
        if (!appKey || !appSecret) {
          throw new Error('API 인증 정보(AppKey/Secret)가 설정되지 않았습니다.')
        }

        const { output1, output2 } = await getAccountBalance(account.accountNo, account.productCode, appKey, appSecret)

        // 보유 종목 데이터 변환
        const holdings: StockHolding[] = (output1 as KisBalanceOutput1[])
          .map((item) => ({
            stockCode: item.pdno || '',
            stockName: item.prdt_name || '',
            quantity: parseNumber(item.hldg_qty),
            buyAvgPrice: parseNumber(item.pchs_avg_pric),
            currentPrice: parseNumber(item.prpr),
            evaluationAmount: parseNumber(item.evlu_amt),
            profitLossAmount: parseNumber(item.evlu_pfls_amt),
            profitLossRate: parseNumber(item.evlu_pfls_rt),
            buyAmount: parseNumber(item.pchs_amt),
          }))
          .filter((h) => h.quantity > 0) // 보유수량 0인 종목 제외

        // 계좌 요약 데이터 변환
        let summaryRaw: KisBalanceOutput2 | KisPensionOutput2 | undefined = undefined

        if (Array.isArray(output2)) {
          if (output2.length > 0) {
            summaryRaw = output2[0] as KisBalanceOutput2 | KisPensionOutput2
          }
        } else {
          summaryRaw = output2 as KisBalanceOutput2 | KisPensionOutput2
        }

        // output2가 비어있을 경우 holdings에서 직접 계산
        // CMA(21) 계좌는 필드명이 다름: evlu_amt_smtl, pchs_amt_smtl, nass_tot_amt
        type CombinedOutput2 = KisBalanceOutput2 &
          KisPensionOutput2 & {
            evlu_amt_smtl?: string
            pchs_amt_smtl?: string
            evlu_pfls_amt_smtl?: string
            nass_tot_amt?: string
          }

        const raw = summaryRaw as CombinedOutput2 | undefined

        let totalEvaluation = parseNumber(raw?.evlu_amt_smtl_amt || raw?.tot_evlu_amt || raw?.evlu_amt_smtl)
        let totalBuy = parseNumber(raw?.pchs_amt_smtl_amt || raw?.pchs_amt_smtl)
        let totalProfitLoss = parseNumber(raw?.evlu_pfls_smtl_amt || raw?.evlu_pfls_amt_smtl)
        const deposit = parseNumber(raw?.dnca_tot_amt)
        const netAsset = parseNumber(raw?.nass_amt || raw?.nass_tot_amt)

        // Fallback: output2에서 평가금액이나 손익이 0인데 holdings가 있으면 holdings에서 계산 (IRP 등)
        if ((totalEvaluation === 0 || totalProfitLoss === 0) && holdings.length > 0) {
          totalEvaluation = holdings.reduce((sum, h) => sum + h.evaluationAmount, 0)
          totalBuy = holdings.reduce((sum, h) => sum + h.buyAmount, 0)
          totalProfitLoss = holdings.reduce((sum, h) => sum + h.profitLossAmount, 0)
          console.log(
            `[Fallback] ${maskAccountNo(account.accountNo)}-${account.productCode}: Calculated from ${holdings.length} holdings`
          )
        }

        const summary: BalanceSummary = {
          totalEvaluationAmount: totalEvaluation,
          totalBuyAmount: totalBuy,
          totalProfitLossAmount: totalProfitLoss,
          totalProfitLossRate: totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0,
          depositAmount: deposit,
          cashAvailable: netAsset || deposit + totalEvaluation,
          totalAsset: deposit + totalEvaluation,
        }

        results.push({
          account: safeAccount,
          holdings,
          summary,
          lastUpdated: new Date().toISOString(),
        })
      } catch (err) {
        // 에러 로그 및 가이드
        const errorMessage = err instanceof Error ? err.message : String(err)
        let simpleMsg = errorMessage
        if (errorMessage.includes('INVALID_CHECK_ACNO'))
          simpleMsg = '계좌번호 또는 상품코드가 올바르지 않습니다 (KIS오류: INVALID_CHECK_ACNO)'
        else if (errorMessage.includes('위탁계좌')) simpleMsg = '상품코드 불일치 (연금/CMA 등 확인 필요)'
        else if (errorMessage.includes('MOCK_INVESTMENT')) simpleMsg = '모의투자 미지원 기능'

        console.warn(`[SKIP] 계좌 ${maskAccountNo(account.accountNo)} (${account.productCode}): ${simpleMsg}`)

        // 개별 계좌 실패 시에도 다른 계좌는 계속 조회
        results.push({
          account: safeAccount,
          holdings: [],
          summary: {
            totalEvaluationAmount: 0,
            totalBuyAmount: 0,
            totalProfitLossAmount: 0,
            totalProfitLossRate: 0,
            depositAmount: 0,
            cashAvailable: 0,
            totalAsset: 0,
          },
          lastUpdated: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('Balance API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '잔고 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/balance
 * 환경변수에 설정된 계좌의 잔고 조회 또는 데모 데이터 반환
 */
export async function GET() {
  // Check for USE_DEMO flag FIRST (priority over real accounts)
  if (process.env.USE_DEMO === 'true') {
    serverLog.info('Demo mode active - returning simulated data', 'BALANCE')
    return NextResponse.json({
      success: true,
      data: DEMO_BALANCES,
      source: 'demo-mode',
      message: 'Running in DEMO MODE with simulated data.',
    })
  }

  // 환경변수에서 계좌 목록 가져오기
  const envAccounts = getAccountsFromEnv()

  // API 키 유효성 체크 (하나라도 유효한 설정이 있으면 진행)
  if (envAccounts.length > 0) {
    serverLog.info(`Fetching balance for ${envAccounts.length} accounts...`, 'BALANCE')
    const results: AccountBalance[] = []

    for (const account of envAccounts) {
      // 보안: 민감 정보 분리 및 사용자 키 우선 사용 (없으면 전역 키 Fallback)
      const { appKey: _ak, appSecret: _as, ...safeAccount } = account
      const appKey = _ak || process.env.KIS_APP_KEY
      const appSecret = _as || process.env.KIS_APP_SECRET

      try {
        if (!appKey || !appSecret) {
          throw new Error('API Key/Secret 미설정')
        }

        serverLog.info(`Requesting: ${safeAccount.accountName || safeAccount.accountNo}`, 'KIS-API')
        const { output1, output2 } = await getAccountBalance(account.accountNo, account.productCode, appKey, appSecret)

        // 보유 종목 데이터 변환
        const holdings: StockHolding[] = (output1 as KisBalanceOutput1[])
          .map((item) => ({
            stockCode: item.pdno || '',
            stockName: item.prdt_name || '',
            quantity: parseNumber(item.hldg_qty),
            buyAvgPrice: parseNumber(item.pchs_avg_pric),
            currentPrice: parseNumber(item.prpr),
            evaluationAmount: parseNumber(item.evlu_amt),
            profitLossAmount: parseNumber(item.evlu_pfls_amt),
            profitLossRate: parseNumber(item.evlu_pfls_rt),
            buyAmount: parseNumber(item.pchs_amt),
          }))
          .filter((h) => h.quantity > 0)

        // 계좌 요약 데이터 변환
        let summaryRaw: KisBalanceOutput2 | KisPensionOutput2 | undefined = undefined
        if (Array.isArray(output2) && output2.length > 0) {
          summaryRaw = output2[0] as KisBalanceOutput2 | KisPensionOutput2
        } else {
          summaryRaw = output2 as KisBalanceOutput2 | KisPensionOutput2
        }

        const raw = summaryRaw as (KisBalanceOutput2 & KisPensionOutput2) | undefined
        const totalEvaluation = parseNumber(raw?.evlu_amt_smtl_amt || raw?.tot_evlu_amt)
        const totalBuy = parseNumber(raw?.pchs_amt_smtl_amt)
        const totalProfitLoss = parseNumber(raw?.evlu_pfls_smtl_amt)
        const deposit = parseNumber(raw?.dnca_tot_amt)
        const netAsset = parseNumber(raw?.nass_amt)

        results.push({
          account: safeAccount,
          holdings,
          summary: {
            totalEvaluationAmount: totalEvaluation,
            totalBuyAmount: totalBuy,
            totalProfitLossAmount: totalProfitLoss,
            totalProfitLossRate: totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0,
            depositAmount: deposit,
            cashAvailable: netAsset,
            totalAsset: deposit + totalEvaluation,
          },
          lastUpdated: new Date().toISOString(),
        })
      } catch (err) {
        // 에러 가이드 및 로깅
        const errorMessage = err instanceof Error ? err.message : String(err)
        let simpleMsg = errorMessage
        if (errorMessage.includes('INVALID_CHECK_ACNO'))
          simpleMsg = '계좌번호 또는 상품코드가 올바르지 않습니다 (KIS오류: INVALID_CHECK_ACNO)'
        else if (errorMessage.includes('위탁계좌')) simpleMsg = '상품코드 불일치 (연금/CMA 등 확인 필요)'
        else if (errorMessage.includes('MOCK_INVESTMENT')) simpleMsg = '모의투자 미지원 기능'

        console.warn(`[SKIP] 계좌 ${maskAccountNo(account.accountNo)} (${account.productCode}): ${simpleMsg}`)

        results.push({
          account: safeAccount,
          holdings: [],
          summary: {
            totalEvaluationAmount: 0,
            totalBuyAmount: 0,
            totalProfitLossAmount: 0,
            totalProfitLossRate: 0,
            depositAmount: 0,
            cashAvailable: 0,
            totalAsset: 0,
          },
          lastUpdated: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      source: 'api',
      accounts: envAccounts.length,
    })
  }

  // API 키가 없거나 계좌가 없으면 데모 데이터로 Fallback
  return NextResponse.json({
    success: true,
    data: DEMO_BALANCES,
    source: 'demo-fallback',
    message: 'No KIS_ACCOUNTS configured. Showing Demo Data.',
  })
}
