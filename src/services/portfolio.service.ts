import { kisClient } from "@/lib/kis/client";
import { getExchangeRate } from "@/services/currency";
import { parseNumber } from "@/lib/utils";
import type {
  Account,
  AccountBalance,
  AccountType,
  KisBalanceOutput1,
  KisBalanceOutput2,
  BalanceSummary,
} from "@/types";
import type { KisOverseasBalanceItem } from "@/lib/kis/types";

/**
 * 환경변수에서 계좌 목록 파싱
 */
export function getAccountsFromEnv(): Account[] {
  const accountsJson = process.env.KIS_ACCOUNTS;

  if (!accountsJson) return [];

  try {
    const cleanJson = accountsJson.replace(/,\s*([\]}])/g, "$1");
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) {
      return parsed.flatMap((acc) => {
        const rawAccountNo = String(acc.accountNo || "").replace(/[^0-9]/g, "");
        const rawProductCodes = acc.productCode
          ? Array.isArray(acc.productCode)
            ? acc.productCode
            : [acc.productCode]
          : ["01"];
        const rawAccountNames = acc.accountName
          ? Array.isArray(acc.accountName)
            ? acc.accountName
            : [acc.accountName]
          : [];

        return rawProductCodes.map((pc: string | number, idx: number) => {
          let productCode = String(pc).trim();
          if (productCode.length === 1)
            productCode = productCode.padStart(2, "0");

          const accountName =
            rawAccountNames[idx] || rawAccountNames[0] || acc.name || "계좌";

          return {
            accountNo: rawAccountNo,
            productCode: productCode as AccountType,
            appKey: acc.appKey,
            appSecret: acc.appSecret,
            accountName: accountName,
            isPension: ["22", "29"].includes(productCode),
          };
        });
      });
    }
  } catch (err) {
    console.error("KIS_ACCOUNTS Environment Parsing Error:", err);
  }

  return [];
}

/**
 * 단일 계좌 잔고 통합 조회 (국내 + 해외)
 */
export async function fetchAccountBalance(
  account: Account,
  appKey: string,
  appSecret: string
): Promise<AccountBalance> {
  const safeAccount = {
    accountNo: account.accountNo,
    productCode: account.productCode,
    accountName: account.accountName,
    isPension: account.isPension,
  };

  try {
    // 1. Domestic Balance
    const domesticPromise = kisClient
      .inquireDomesticBalance(
        account.accountNo,
        account.productCode,
        appKey,
        appSecret
      )
      .catch((err) => {
        console.warn(
          `[Domestic Balance Error] ${account.accountNo}:`,
          err.message
        );
        return { output1: [], output2: {} };
      });

    // 2. Overseas Balance
    const overseasPromise = kisClient
      .inquireOverseasBalance(
        account.accountNo,
        account.productCode,
        appKey,
        appSecret
      )
      .catch((err) => {
        console.warn(
          `[Overseas Balance Error] ${account.accountNo}:`,
          err.message
        );
        return { output1: [], output2: {} };
      });

    const [domRes, overRes] = await Promise.all([
      domesticPromise,
      overseasPromise,
    ]);

    const [rateUSD, rateJPY, rateHKD] = await Promise.all([
      getExchangeRate("USD"),
      getExchangeRate("JPY"), // 1 JPY -> KRW (approx 9.0 ~ 9.5)
      getExchangeRate("HKD"),
    ]);

    const getAppliedRate = (code?: string) => {
      if (code === "JPY") return rateJPY;
      if (code === "HKD") return rateHKD;
      return rateUSD; // Default/Fallback
    };

    // 3. Map Domestic Holdings
    const domHoldings = (domRes.output1 as KisBalanceOutput1[]).map((item) => ({
      stockCode: item.pdno,
      stockName: item.prdt_name,
      quantity: parseNumber(item.hldg_qty),
      buyAvgPrice: parseNumber(item.pchs_avg_pric),
      currentPrice: parseNumber(item.prpr),
      evaluationAmount: parseNumber(item.evlu_amt),
      profitLossAmount: parseNumber(item.evlu_pfls_amt),
      profitLossRate: parseNumber(item.evlu_pfls_rt),
      buyAmount: parseNumber(item.pchs_amt),
      market: "KR" as const,
    }));

    // 4. Map Overseas Holdings (Convert to KRW)
    const overHoldings = (overRes.output1 as KisOverseasBalanceItem[]).map(
      (item) => {
        const rate = getAppliedRate(item.currency_code);
        return {
          stockCode: item.ovrs_pdno,
          stockName: item.ovrs_item_name,
          quantity: parseNumber(item.ovrs_cblc_qty),
          buyAvgPrice: parseNumber(item.pchs_avg_pric) * rate,
          currentPrice: parseNumber(item.now_pric2) * rate,
          evaluationAmount: parseNumber(item.ovrs_stck_evlu_amt) * rate,
          profitLossAmount: parseNumber(item.frcr_evlu_pfls_amt) * rate,
          profitLossRate: parseNumber(item.evlu_pfls_rt),
          buyAmount: parseNumber(item.frcr_pchs_amt1) * rate,
          market: "US" as const,
        };
      }
    );

    const holdings = [...domHoldings, ...overHoldings].filter(
      (h) => h.quantity > 0
    );

    // 5. Calculate Summary from Holdings (More Reliable)
    let totalEvaluation = 0;
    let totalBuy = 0;
    let totalProfitLoss = 0;

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
    } else {
      // Fallback to output2 Summary if no holdings (e.g., Pension)
      const domSummary = domRes.output2 as KisBalanceOutput2;
      totalEvaluation = parseNumber(
        domSummary?.evlu_amt_smtl_amt || domSummary?.tot_evlu_amt
      );
      totalBuy = parseNumber(domSummary?.pchs_amt_smtl_amt);
      totalProfitLoss = parseNumber(domSummary?.evlu_pfls_smtl_amt);
    }

    // "Invested Only" Summary
    const summary: BalanceSummary = {
      totalEvaluationAmount: totalEvaluation,
      totalBuyAmount: totalBuy,
      totalProfitLossAmount: totalProfitLoss,
      totalProfitLossRate:
        totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0,
      depositAmount: 0,
      cashAvailable: 0,
      totalAsset: totalEvaluation,
    };

    return {
      account: safeAccount,
      holdings,
      summary,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Portfolio Service] Error fetching ${account.accountNo}: ${errorMsg}`
    );

    return {
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
    };
  }
}

type ManualMarket = "US" | "KR" | "CA";

interface ManualHolding {
  accountNo: string;
  productCode: string;
  code: string;
  qty: number | string;
  buyPrice: number | string;
  market: ManualMarket;
  currentPrice?: number | string; // 현재가 직접 입력 (선택, 해당 통화 단위)
}

/**
 * Apply Manual Holdings (Merged logic)
 */
export async function applyManualHoldings(
  results: AccountBalance[],
  allAccounts: Account[]
): Promise<AccountBalance[]> {
  const manualEnv = process.env.MANUAL_PORTFOLIO;
  if (!manualEnv) return results;

  let manualHoldings: ManualHolding[] = [];
  try {
    const cleanJson = manualEnv.replace(/,\s*([\]}])/g, "$1");
    manualHoldings = JSON.parse(cleanJson);
  } catch (err) {
    console.error("MANUAL_PORTFOLIO Parsing Error:", err);
    return results;
  }

  if (!Array.isArray(manualHoldings) || manualHoldings.length === 0)
    return results;

  for (const accResult of results) {
    const matchedItems = manualHoldings.filter((m) => {
      const manualAccNo = String(m.accountNo).replace(/[^0-9]/g, "");
      const kisAccNo = accResult.account.accountNo;
      const manualProdCode = String(m.productCode || "")
        .trim()
        .padStart(2, "0");
      const kisProdCode = String(accResult.account.productCode).padStart(
        2,
        "0"
      );
      return manualAccNo === kisAccNo && manualProdCode === kisProdCode;
    });

    if (matchedItems.length === 0) continue;

    for (const item of matchedItems) {
      const manualQty = Number(item.qty || 0);
      const manualBuyPrice = Number(item.buyPrice || 0);
      if (manualBuyPrice <= 0) continue;

      // Determine market & FX rate
      const market: ManualMarket = item.market;

      // KR, US는 기존 KIS 가격/환율 체계를 그대로 사용 (KIS 잔고와 병합 가능)
      // CA는 Massive + FX로 별도 처리 (KIS API에서 조회 불가한 거래소이므로 병합하지 않음)

      // Find Existing (CA 마켓은 KIS 잔고와 병합하지 않음 - 동일 티커가 미국에 있을 수 있음)
      const existingIndex =
        market === "CA"
          ? -1
          : accResult.holdings.findIndex((h) => h.stockCode === item.code);

      if (existingIndex !== -1) {
        // Merge
        const existing = accResult.holdings[existingIndex];
        const totalQty = existing.quantity + manualQty;

        // manual 쪽 매수금액도 항상 원화 기준으로 맞춘다.
        let manualBuyAmt = manualBuyPrice * manualQty;
        if (market === "US") {
          const rateUSD = await getExchangeRate("USD");
          manualBuyAmt *= rateUSD;
        } else if (market === "CA") {
          const rateCAD = await getExchangeRate("CAD");
          manualBuyAmt *= rateCAD;
        }
        // KR은 이미 원화이므로 환율 적용 불필요

        const totalBuyAmt = existing.buyAmount + manualBuyAmt;
        const currentPrice = existing.currentPrice; // Trust API price
        const totalEvalAmt = currentPrice * totalQty;
        const totalProfitLossAmt = totalEvalAmt - totalBuyAmt;
        const totalProfitLossRt =
          totalBuyAmt > 0 ? (totalProfitLossAmt / totalBuyAmt) * 100 : 0;
        const newBuyAvgPrice = totalQty > 0 ? totalBuyAmt / totalQty : 0;

        accResult.holdings[existingIndex] = {
          ...existing,
          quantity: totalQty,
          buyAmount: totalBuyAmt,
          evaluationAmount: totalEvalAmt,
          profitLossAmount: totalProfitLossAmt,
          profitLossRate: totalProfitLossRt,
          buyAvgPrice: newBuyAvgPrice,
          market: existing.market ?? market,
        };
      } else {
        // Add New
        let currentPriceKRW = 0;
        let buyPriceKRW = manualBuyPrice;

        if (market === "KR") {
          // 한국 종목은 한국투자증권 API를 통해 가격 조회 (KRW 단위)
          const accountInfo = allAccounts.find(
            (a) =>
              a.accountNo === accResult.account.accountNo &&
              a.productCode === accResult.account.productCode
          );
          const appKey = accountInfo?.appKey || process.env.KIS_APP_KEY;
          const appSecret =
            accountInfo?.appSecret || process.env.KIS_APP_SECRET;

          if (appKey && appSecret) {
            currentPriceKRW = await kisClient.getStockCurrentPrice(
              item.code,
              appKey,
              appSecret
            );
          }
          // buyPriceKRW는 이미 원화이므로 그대로 사용
        } else if (market === "US") {
          // 미국 종목: KIS 해외잔고에서 조회된 종목이 없으면 현재가를 알 수 없음
          // buyPrice는 USD 단위이므로 환율 적용
          const rateUSD = await getExchangeRate("USD");
          buyPriceKRW = manualBuyPrice * rateUSD;
          // currentPriceKRW는 0 (해외 개별 종목 시세 조회 API가 없음)
          // 기존 잔고와 병합되는 경우에만 현재가 사용 가능
          console.warn(
            `[Manual] US stock ${item.code} added without current price (not in KIS balance)`
          );
        } else if (market === "CA") {
          // 캐나다 종목은 Google Finance + 환율 적용 (매수가/현재가 모두 원화 기준으로 환산)
          const rateCAD = await getExchangeRate("CAD");
          buyPriceKRW = manualBuyPrice * rateCAD;

          // MANUAL_PORTFOLIO에 currentPrice가 지정되어 있으면 사용
          if (item.currentPrice && Number(item.currentPrice) > 0) {
            currentPriceKRW = Number(item.currentPrice) * rateCAD;
          } else {
            // Google Finance에서 가격 조회 (CVE = Canadian Venture Exchange)
            try {
              const resp = await fetch(
                `https://www.google.com/finance/quote/${encodeURIComponent(
                  item.code
                )}:CVE`,
                {
                  headers: {
                    "User-Agent":
                      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  },
                }
              );
              if (resp.ok) {
                const html = await resp.text();
                // Google Finance HTML에서 가격 추출: data-last-price="8.7" 패턴
                const priceMatch = html.match(/data-last-price="([\d.]+)"/);
                if (priceMatch && priceMatch[1]) {
                  const price = parseFloat(priceMatch[1]);
                  if (price > 0) {
                    currentPriceKRW = price * rateCAD;
                  }
                } else {
                  // 대안: AF_initDataCallback에서 가격 추출
                  const jsonMatch = html.match(
                    /\["[^"]+",\["[^"]+","CVE"\],"[^"]+",\d+,"CAD",\[([\d.]+),/
                  );
                  if (jsonMatch && jsonMatch[1]) {
                    const price = parseFloat(jsonMatch[1]);
                    if (price > 0) {
                      currentPriceKRW = price * rateCAD;
                    }
                  }
                }
              } else {
                console.warn(
                  `[Google Finance] Failed to fetch CA price for ${item.code}: ${resp.status}`
                );
              }
            } catch (e) {
              console.error(
                `[Google Finance] Error fetching CA price for ${item.code}:`,
                e
              );
            }
          }
        }

        const evalAmt = currentPriceKRW * manualQty;
        const buyAmt = buyPriceKRW * manualQty;
        const profitLossAmt = evalAmt - buyAmt;
        const profitLossRt = buyAmt > 0 ? (profitLossAmt / buyAmt) * 100 : 0;

        accResult.holdings.push({
          stockCode: item.code,
          stockName: item.code,
          quantity: manualQty,
          buyAvgPrice: buyPriceKRW,
          currentPrice: currentPriceKRW,
          evaluationAmount: evalAmt,
          profitLossAmount: profitLossAmt,
          profitLossRate: profitLossRt,
          buyAmount: buyAmt,
          market,
        });
      }
    }

    // Re-summarize
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

    accResult.summary = {
      ...accResult.summary,
      totalEvaluationAmount: totalEvaluation,
      totalBuyAmount: totalBuy,
      totalProfitLossAmount: totalProfitLoss,
      totalProfitLossRate:
        totalBuy > 0 ? (totalProfitLoss / totalBuy) * 100 : 0,
      totalAsset: accResult.summary.depositAmount + totalEvaluation,
    };
  }

  return results;
}

/**
 * 전체 계좌에 대한 포트폴리오 조회 및 병합 (Main Entry Point)
 */
export async function getPortfolio(
  targetAccounts?: Account[]
): Promise<AccountBalance[]> {
  const allAccounts = getAccountsFromEnv();
  const accountsToFetch = targetAccounts || allAccounts;

  if (accountsToFetch.length === 0) {
    return [];
  }

  const results: AccountBalance[] = [];

  for (const account of accountsToFetch) {
    // Skip manual placeholder accounts from list iteration if they exist
    if (account.isManual) continue;

    // Resolve Credentials
    let resolvedAppKey = account.appKey;
    let resolvedAppSecret = account.appSecret;

    if (!resolvedAppKey || !resolvedAppSecret) {
      const envMatch = allAccounts.find(
        (ea) => ea.accountNo === account.accountNo
      );
      if (envMatch) {
        resolvedAppKey = resolvedAppKey || envMatch.appKey;
        resolvedAppSecret = resolvedAppSecret || envMatch.appSecret;
      }
    }

    // Final fallback to global envs
    resolvedAppKey = resolvedAppKey || process.env.KIS_APP_KEY;
    resolvedAppSecret = resolvedAppSecret || process.env.KIS_APP_SECRET;

    if (!resolvedAppKey || !resolvedAppSecret) {
      console.warn(
        `[Portfolio] Skipping ${account.accountNo}: Missing Credentials`
      );
      continue;
    }

    const result = await fetchAccountBalance(
      account,
      resolvedAppKey,
      resolvedAppSecret
    );
    results.push(result);

    // Rate Limit (Simple)
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Apply Manual Holdings
  await applyManualHoldings(results, allAccounts);

  return results;
}
