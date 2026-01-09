import { NextResponse } from "next/server";
import {
  getAccountBalance,
  parseNumber,
  maskAccountNo,
  getExchangeRate,
} from "@/lib/kis-api";
import { serverLog } from "@/lib/server-logger";
export const dynamic = "force-dynamic"; // 캐싱 방지
import type {
  AccountBalance,
  StockHolding,
  BalanceSummary,
  Account,
  AccountType,
  KisBalanceOutput1,
  KisBalanceOutput2,
} from "@/types";

/**
 * 환경변수에서 계좌 목록 조회
 * KIS_ACCOUNTS 환경변수에서 JSON 배열을 파싱하여 반환
 */
/**
 * 환경변수에서 계좌 목록 조회
 * KIS_ACCOUNTS 환경변수(JSON 배열)만 사용
 */
function getAccountsFromEnv(): Account[] {
  const accountsJson = process.env.KIS_ACCOUNTS;

  if (!accountsJson) {
    return [];
  }

  try {
    // JSON Trailing Comma Clean-up (User convenience)
    const cleanJson = accountsJson.replace(/,\s*([\]}])/g, "$1");
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) {
      return parsed.map((acc) => {
        // 계좌번호 정제: 문자열 변환, 하이픈 및 공백 제거 (숫자만 남김)
        const rawAccountNo = String(acc.accountNo || "");
        const accountNo = rawAccountNo.replace(/[^0-9]/g, "");

        // 상품코드 정제: 문자열 변환, 공백 제거, 1자리인 경우 2자리로 패딩
        let productCode = String(acc.productCode || "01").trim();
        if (productCode.length === 1)
          productCode = productCode.padStart(2, "0");

        return {
          accountNo,
          productCode: productCode as AccountType,
          appKey: acc.appKey,
          appSecret: acc.appSecret,
          accountName: acc.accountName || acc.name || "계좌",
          isPension: false,
        };
      });
    }
  } catch (err) {
    console.error("KIS_ACCOUNTS 파싱 오류. JSON 형식을 확인하세요:", err);
  }

  return [];
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
interface ManualHolding {
  accountNo: string;
  code: string;
  name: string;
  qty: number;
  price: number;
  buyPrice: number;
  currency: string;
  exchangeRate: number;
}

/**
 * 매뉴얼 포트폴리오(환경변수) 처리 함수
 * 기존 results(KIS API 결과)에 매뉴얼 데이터를 병합하고 요약을 재계산
 */
function applyManualHoldings(results: AccountBalance[]) {
  const manualEnv = process.env.MANUAL_PORTFOLIO;
  if (!manualEnv) return results;

  let manualHoldings: ManualHolding[] = [];
  try {
    // JSON Trailing Comma 등 정리
    const cleanJson = manualEnv.replace(/,\s*([\]}])/g, "$1");
    manualHoldings = JSON.parse(cleanJson);
  } catch (err) {
    console.error("MANUAL_PORTFOLIO Parsing Error:", err);
    console.error("Raw Content causing error:", manualEnv);
    return results;
  }

  if (!Array.isArray(manualHoldings) || manualHoldings.length === 0) {
    return results;
  }

  results.forEach((accResult) => {
    // 현재 계좌번호와 일치하는 매뉴얼 항목 필터링
    // (계좌번호 형식은 이미 숫자만 남게 정제되어 있으므로, 매뉴얼의 '-' 제거 후 비교)
    const matchedItems = manualHoldings.filter(
      (m) =>
        String(m.accountNo).replace(/[^0-9]/g, "") ===
        accResult.account.accountNo
    );

    if (matchedItems.length > 0) {
      console.log(
        `[Manual Portfolio] Found ${matchedItems.length} items for account ${accResult.account.accountNo}`
      );

      const newHoldings: StockHolding[] = matchedItems.map((item) => {
        const evalAmt = item.price * item.qty * item.exchangeRate;
        const buyAmt = item.buyPrice * item.qty * item.exchangeRate;
        const profitLossAmt = evalAmt - buyAmt;
        const profitLossRt = buyAmt > 0 ? (profitLossAmt / buyAmt) * 100 : 0;

        return {
          stockCode: item.code,
          stockName: item.name,
          quantity: item.qty,
          buyAvgPrice: item.buyPrice * item.exchangeRate, // 원화 환산 단가
          currentPrice: item.price * item.exchangeRate, // 원화 환산 현재가
          evaluationAmount: evalAmt,
          profitLossAmount: profitLossAmt,
          profitLossRate: profitLossRt,
          buyAmount: buyAmt,
        };
      });

      // 기존 holdings에 추가
      accResult.holdings = [...accResult.holdings, ...newHoldings];

      // Summary 재계산
      const totalEvaluation = accResult.holdings.reduce(
        (sum, h) => sum + h.evaluationAmount,
        0
      );
      const totalBuy = accResult.holdings.reduce(
        (sum, h) => sum + h.buyAmount,
        0
      );
      const totalProfitLoss = accResult.holdings.reduce(
        (sum, h) => sum + h.profitLossAmount,
        0
      );

      // 기존 deposit, cashAvailable 유지하면서 투자 자산 관련 필드 갱신
      accResult.summary = {
        ...accResult.summary,
        totalEvaluationAmount: totalEvaluation,
        totalBuyAmount: totalBuy,
        totalProfitLossAmount: totalProfitLoss,
        totalProfitLossRate:
          totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0,
        totalAsset: accResult.summary.depositAmount + totalEvaluation, // 예수금 + 평가금
      };
    }
  });

  return results;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accounts } = body as { accounts: Account[] };

    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        { success: false, error: "계좌 정보가 필요합니다." },
        { status: 400 }
      );
    }

    const results: AccountBalance[] = [];

    // 환경변수의 계좌 목록 미리 로드 (Credential Lookup용)
    const envAccounts = getAccountsFromEnv();

    // 각 계좌별로 잔고 조회
    for (const account of accounts) {
      if (account.isManual || account.accountNo.startsWith("MANUAL_")) continue;

      // 보안: 민감 정보 분리 및 사용자 키 우선 사용 (없으면 전역 키 Fallback)
      const { appKey: _ak, appSecret: _as, ...safeAccount } = account;

      let appKey = _ak;
      let appSecret = _as;

      // 키가 없으면 환경변수 매칭 시도
      if (!appKey || !appSecret) {
        const envMatch = envAccounts.find(
          (ea) => ea.accountNo === account.accountNo
        );
        if (envMatch) {
          appKey = envMatch.appKey;
          appSecret = envMatch.appSecret;
        }
      }

      // 그래도 없으면 전역 키(구방식) Fallback
      if (!appKey) appKey = process.env.KIS_APP_KEY;
      if (!appSecret) appSecret = process.env.KIS_APP_SECRET;

      try {
        if (!appKey || !appSecret) {
          throw new Error(
            "API 인증 정보(AppKey/Secret)가 설정되지 않았습니다."
          );
        }

        const { output1, output2 } = await getAccountBalance(
          account.accountNo,
          account.productCode,
          appKey,
          appSecret
        );

        // 보유 종목 데이터 변환
        const holdings: StockHolding[] = (output1 as KisBalanceOutput1[])
          .map((item) => ({
            stockCode: item.pdno || "",
            stockName: item.prdt_name || "",
            quantity: parseNumber(item.hldg_qty),
            buyAvgPrice: parseNumber(item.pchs_avg_pric),
            currentPrice: parseNumber(item.prpr),
            evaluationAmount: parseNumber(item.evlu_amt),
            profitLossAmount: parseNumber(item.evlu_pfls_amt),
            profitLossRate: parseNumber(item.evlu_pfls_rt),
            buyAmount: parseNumber(item.pchs_amt),
          }))
          .filter((h) => h.quantity > 0); // 보유수량 0인 종목 제외

        // 계좌 요약 데이터 변환
        let summaryRaw: KisBalanceOutput2 | undefined = undefined;

        if (Array.isArray(output2)) {
          if (output2.length > 0) {
            summaryRaw = output2[0] as KisBalanceOutput2;
          }
        } else {
          summaryRaw = output2 as KisBalanceOutput2;
        }

        // output2가 비어있을 경우 holdings에서 직접 계산
        // CMA(21) 계좌는 필드명이 다름: evlu_amt_smtl, pchs_amt_smtl, nass_tot_amt
        type CombinedOutput2 = KisBalanceOutput2 & {
          evlu_amt_smtl?: string;
          pchs_amt_smtl?: string;
          evlu_pfls_amt_smtl?: string;
          nass_tot_amt?: string;
        };

        const raw = summaryRaw as CombinedOutput2 | undefined;

        let totalEvaluation = parseNumber(
          raw?.evlu_amt_smtl_amt || raw?.tot_evlu_amt || raw?.evlu_amt_smtl
        );
        let totalBuy = parseNumber(
          raw?.pchs_amt_smtl_amt || raw?.pchs_amt_smtl
        );
        let totalProfitLoss = parseNumber(
          raw?.evlu_pfls_smtl_amt || raw?.evlu_pfls_amt_smtl
        );
        // Note: deposit, netAsset = 0 (사용자 요청: "현금은 카운트하지 않음, 투자 중인 자산만")

        // 전략 변경: Holdings가 있으면 무조건 Holdings 기반으로 요약 재계산
        // 이유:
        // 1. ISA 등 일부 계좌에서 output2 요약값이 0으로 오는 경우 방지
        // 2. output2에는 현금/예수금 등이 섞여있을 수 있는데, 사용자는 "투자 자산(주식/ETF)"만 원함
        // 3. Matrix(상세)와 Left Panel(요약)의 데이터 불일치(Blinking/Diff) 방지
        if (holdings.length > 0) {
          totalEvaluation = holdings.reduce(
            (sum, h) => sum + h.evaluationAmount,
            0
          );
          totalBuy = holdings.reduce((sum, h) => sum + h.buyAmount, 0);
          totalProfitLoss = holdings.reduce(
            (sum, h) => sum + h.profitLossAmount,
            0
          );
          // debugging
          if (account.productCode === "01") {
            console.log(
              `[Summary Recalc] ${maskAccountNo(account.accountNo)}-${
                account.productCode
              }: Holdings=${
                holdings.length
              }, Eval=${totalEvaluation}, P/L=${totalProfitLoss}`
            );
            if (holdings.length > 0) {
              console.log(
                `[First Holding] Val=${
                  holdings[0].evaluationAmount
                } (Type: ${typeof holdings[0].evaluationAmount})`
              );
            }
          }
        } else {
          // holdings가 0인 경우(연금 등 API가 리스트를 안 줄 때), output2의 요약값 사용
          // 이때도 현금은 이미 0으로 설정됨.
        }

        const summary: BalanceSummary = {
          totalEvaluationAmount: totalEvaluation,
          totalBuyAmount: totalBuy,
          totalProfitLossAmount: totalProfitLoss,
          totalProfitLossRate:
            totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0,
          depositAmount: 0,
          cashAvailable: 0,
          totalAsset: totalEvaluation, // 투자 자산만 합산
        };

        results.push({
          account: safeAccount,
          holdings,
          summary,
          lastUpdated: new Date().toISOString(),
        });
      } catch (err) {
        // 에러 로그 및 가이드
        const errorMessage = err instanceof Error ? err.message : String(err);
        let simpleMsg = errorMessage;
        if (errorMessage.includes("INVALID_CHECK_ACNO"))
          simpleMsg =
            "계좌번호 또는 상품코드가 올바르지 않습니다 (KIS오류: INVALID_CHECK_ACNO)";
        else if (errorMessage.includes("위탁계좌"))
          simpleMsg = "상품코드 불일치 (연금/CMA 등 확인 필요)";
        else if (errorMessage.includes("MOCK_INVESTMENT"))
          simpleMsg = "모의투자 미지원 기능";

        console.warn(
          `[SKIP] 계좌 ${maskAccountNo(account.accountNo)} (${
            account.productCode
          }): ${simpleMsg}`
        );

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
        });
      }
    }

    // Manual Portfolio 적용
    applyManualHoldings(results);

    return NextResponse.json({
      success: true,
      data: results,
      source: "api",
      totalAccounts: accounts.length,
      processed: results.length,
    });
  } catch (error) {
    console.error("Balance API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "잔고 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/balance
 * 환경변수에 설정된 계좌의 잔고 조회
 */
export async function GET() {
  // 환경변수에서 계좌 목록 가져오기
  const envAccounts = getAccountsFromEnv();

  // API 키 유효성 체크 (하나라도 유효한 설정이 있으면 진행)
  if (envAccounts.length > 0) {
    serverLog.info(
      `Fetching balance for ${envAccounts.length} accounts...`,
      "BALANCE"
    );
    const results: AccountBalance[] = [];

    for (const account of envAccounts) {
      // 보안: 민감 정보 분리 및 사용자 키 우선 사용 (없으면 전역 키 Fallback)
      const { appKey: _ak, appSecret: _as, ...safeAccount } = account;
      const appKey = _ak || process.env.KIS_APP_KEY;
      const appSecret = _as || process.env.KIS_APP_SECRET;

      try {
        if (!appKey || !appSecret) {
          throw new Error("API Key/Secret 미설정");
        }

        const accountLabel = `${
          safeAccount.accountName || maskAccountNo(safeAccount.accountNo)
        } (${account.productCode})`;
        serverLog.info(`Requesting: ${accountLabel}`, "KIS-API");
        const { output1, output2 } = await getAccountBalance(
          account.accountNo,
          account.productCode,
          appKey,
          appSecret
        );

        // 보유 종목 데이터 변환
        const holdings: StockHolding[] = (output1 as KisBalanceOutput1[])
          .map((item) => ({
            stockCode: item.pdno || "",
            stockName: item.prdt_name || "",
            quantity: parseNumber(item.hldg_qty),
            buyAvgPrice: parseNumber(item.pchs_avg_pric),
            currentPrice: parseNumber(item.prpr),
            evaluationAmount: parseNumber(item.evlu_amt),
            profitLossAmount: parseNumber(item.evlu_pfls_amt),
            profitLossRate: parseNumber(item.evlu_pfls_rt),
            buyAmount: parseNumber(item.pchs_amt),
          }))
          .filter((h) => h.quantity > 0);

        // 계좌 요약 데이터 변환
        let summaryRaw: KisBalanceOutput2 | undefined = undefined;
        if (Array.isArray(output2) && output2.length > 0) {
          summaryRaw = output2[0] as KisBalanceOutput2;
        } else {
          summaryRaw = output2 as KisBalanceOutput2;
        }

        const raw = summaryRaw as KisBalanceOutput2 | undefined;
        let totalEvaluation = parseNumber(
          raw?.evlu_amt_smtl_amt || raw?.tot_evlu_amt
        );
        let totalBuy = parseNumber(raw?.pchs_amt_smtl_amt);
        let totalProfitLoss = parseNumber(raw?.evlu_pfls_smtl_amt);
        const deposit = parseNumber(raw?.dnca_tot_amt);
        const netAsset = parseNumber(raw?.nass_amt);

        // 전략 변경: Holdings가 있으면 무조건 Holdings 기반으로 요약 재계산 (POST 핸들러와 동일 로직 적용)
        // ISA 등 일부 계좌에서 output2 요약값이 0으로 오는 경우 방지
        if (holdings.length > 0) {
          totalEvaluation = holdings.reduce(
            (sum, h) => sum + h.evaluationAmount,
            0
          );
          totalBuy = holdings.reduce((sum, h) => sum + h.buyAmount, 0);
          totalProfitLoss = holdings.reduce(
            (sum, h) => sum + h.profitLossAmount,
            0
          );
        }

        // 성공 로그
        serverLog.success(
          `${accountLabel}: ${holdings.length} holdings, ₩${Math.round(
            totalEvaluation
          ).toLocaleString()}`,
          "KIS-API"
        );

        results.push({
          account: safeAccount,
          holdings,
          summary: {
            totalEvaluationAmount: totalEvaluation,
            totalBuyAmount: totalBuy,
            totalProfitLossAmount: totalProfitLoss,
            totalProfitLossRate:
              totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0,
            depositAmount: deposit,
            cashAvailable: netAsset,
            totalAsset: deposit + totalEvaluation,
          },
          lastUpdated: new Date().toISOString(),
        });
      } catch (err) {
        // 에러 가이드 및 로깅
        const errorMessage = err instanceof Error ? err.message : String(err);
        let simpleMsg = errorMessage;
        if (errorMessage.includes("INVALID_CHECK_ACNO"))
          simpleMsg =
            "계좌번호 또는 상품코드가 올바르지 않습니다 (KIS오류: INVALID_CHECK_ACNO)";
        else if (errorMessage.includes("위탁계좌"))
          simpleMsg = "상품코드 불일치 (연금/CMA 등 확인 필요)";
        else if (errorMessage.includes("MOCK_INVESTMENT"))
          simpleMsg = "모의투자 미지원 기능";

        const accountLabel = `${
          safeAccount.accountName || maskAccountNo(safeAccount.accountNo)
        } (${account.productCode})`;
        serverLog.error(`${accountLabel}: ${simpleMsg}`, "KIS-API");

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
        });
      }

      // KIS API 초당 호출 제한 방지 (200ms 딜레이)
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Manual Portfolio 적용
    applyManualHoldings(results);

    // 전체 요약 로그
    const totalEval = results.reduce(
      (sum, r) => sum + r.summary.totalEvaluationAmount,
      0
    );
    const totalPL = results.reduce(
      (sum, r) => sum + r.summary.totalProfitLossAmount,
      0
    );
    const plSign = totalPL >= 0 ? "+" : "";
    serverLog.success(
      `Total: ${results.length} accounts, ₩${Math.round(
        totalEval
      ).toLocaleString()} (${plSign}${Math.round(totalPL).toLocaleString()})`,
      "BALANCE"
    );

    return NextResponse.json({
      success: true,
      data: results,
      source: "api",
      accounts: envAccounts.length,
    });
  }

  // API 키가 없거나 계좌가 없으면 빈 배열 반환
  serverLog.warn("No KIS_ACCOUNTS configured", "BALANCE");
  return NextResponse.json({
    success: false,
    data: [],
    source: "no-accounts",
    error: "KIS_ACCOUNTS 환경변수가 설정되지 않았습니다.",
  });
}
