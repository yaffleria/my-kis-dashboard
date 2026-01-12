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
    const USD_KRW_RATE = await getExchangeRate();

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
    }));

    // 4. Map Overseas Holdings (Convert to KRW)
    const overHoldings = (overRes.output1 as KisOverseasBalanceItem[]).map(
      (item) => ({
        stockCode: item.ovrs_pdno,
        stockName: item.ovrs_item_name,
        quantity: parseNumber(item.ovrs_cblc_qty),
        buyAvgPrice: parseNumber(item.pchs_avg_pric) * USD_KRW_RATE,
        currentPrice: parseNumber(item.now_pric2) * USD_KRW_RATE,
        evaluationAmount: parseNumber(item.ovrs_stck_evlu_amt) * USD_KRW_RATE,
        profitLossAmount: parseNumber(item.frcr_evlu_pfls_amt) * USD_KRW_RATE,
        profitLossRate: parseNumber(item.evlu_pfls_rt),
        buyAmount: parseNumber(item.frcr_pchs_amt1) * USD_KRW_RATE,
      })
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

interface ManualHolding {
  accountNo: string;
  productCode: string;
  code: string;
  name: string;
  qty: number | string;
  price?: number | string;
  buyPrice: number | string;
  currency: string;
  exchangeRate?: number | string;
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

      let manualPrice = Number(item.price || 0);
      const rawRate = Number(item.exchangeRate || 0);
      const appliedRate =
        item.currency === "KRW" ? 1 : rawRate > 0 ? rawRate : 1;

      // Find Existing
      const existingIndex = accResult.holdings.findIndex(
        (h) => h.stockCode === item.code
      );

      if (existingIndex !== -1) {
        // Merge
        const existing = accResult.holdings[existingIndex];
        const totalQty = existing.quantity + manualQty;
        const manualBuyAmt = manualBuyPrice * manualQty * appliedRate;
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
        };
      } else {
        // Add New
        if (manualPrice === 0 && item.currency === "KRW") {
          // Fetch Real Price if KRW and missing price
          const accountInfo = allAccounts.find(
            (a) =>
              a.accountNo === accResult.account.accountNo &&
              a.productCode === accResult.account.productCode
          );
          const appKey = accountInfo?.appKey || process.env.KIS_APP_KEY;
          const appSecret =
            accountInfo?.appSecret || process.env.KIS_APP_SECRET;

          if (appKey && appSecret) {
            manualPrice = await kisClient.getStockCurrentPrice(
              item.code,
              appKey,
              appSecret
            );
          }
        }

        const evalAmt = manualPrice * manualQty * appliedRate;
        const buyAmt = manualBuyPrice * manualQty * appliedRate;
        const profitLossAmt = evalAmt - buyAmt;
        const profitLossRt = buyAmt > 0 ? (profitLossAmt / buyAmt) * 100 : 0;

        accResult.holdings.push({
          stockCode: item.code,
          stockName: item.name,
          quantity: manualQty,
          buyAvgPrice: manualBuyPrice * appliedRate,
          currentPrice: manualPrice * appliedRate,
          evaluationAmount: evalAmt,
          profitLossAmount: profitLossAmt,
          profitLossRate: profitLossRt,
          buyAmount: buyAmt,
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
