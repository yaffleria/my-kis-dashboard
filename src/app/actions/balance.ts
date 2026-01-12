"use server";

import { getPortfolio } from "@/services/portfolio.service";
import { revalidatePath } from "next/cache";

/**
 * 전역 잔고 데이터를 서버에서 직접 조회하는 서버 액션
 * 네트워크 탭의 /api/balance 호출을 대체합니다.
 */
export async function getBalanceAction() {
  try {
    const rawData = await getPortfolio();

    // 데이터 집계 및 민감 정보 제거
    const aggregated: Record<
      string,
      { stockCode: string; stockName: string; value: number; buyAmount: number }
    > = {};
    let totalValue = 0;

    rawData.forEach((account) => {
      account.holdings.forEach((h) => {
        if (!h.stockCode) return;
        if (!aggregated[h.stockCode]) {
          aggregated[h.stockCode] = {
            stockCode: h.stockCode,
            stockName: h.stockName,
            value: 0,
            buyAmount: 0,
          };
        }
        const val = Number(h.evaluationAmount) || 0;
        const buy = Number(h.buyAmount) || 0;
        aggregated[h.stockCode].value += val;
        aggregated[h.stockCode].buyAmount += buy;
        totalValue += val;
      });
    });

    const totalBuyAmountGlobal = Object.values(aggregated).reduce(
      (sum, item) => sum + item.buyAmount,
      0
    );

    // 가중치(Weight) 및 수익률(ROI) 계산
    const sanitizedHoldings = Object.values(aggregated)
      .map((h) => {
        const weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
        const profitLossRate =
          h.buyAmount > 0 ? ((h.value - h.buyAmount) / h.buyAmount) * 100 : 0;

        return {
          stockCode: h.stockCode,
          stockName: h.stockName,
          quantity: 0, // 수량 은폐
          buyAvgPrice: 0, // 매입가 은폐
          currentPrice: 0, // 현재가 은폐
          evaluationAmount: weight, // 평가금 대신 가중치(%) 전송
          profitLossAmount: 0, // 절대 수익금 제거
          profitLossRate: profitLossRate, // 계산된 수익률은 공개
          buyAmount: 0, // 절대 매입금 제거
        };
      })
      .sort((a, b) => b.evaluationAmount - a.evaluationAmount);

    // 필요 시 캐시 무효화
    revalidatePath("/");

    // Calculate Global ROI safely
    const totalProfitLossAmount = totalValue - totalBuyAmountGlobal;
    const totalProfitLossRate =
      totalBuyAmountGlobal > 0
        ? (totalProfitLossAmount / totalBuyAmountGlobal) * 100
        : 0;

    // 기존 AccountBalance[] 형식을 유지하여 프론트엔드 호환성 보장
    const sanitizedData: import("@/types").AccountBalance[] = [
      {
        account: {
          accountNo: "********",
          productCode: "00",
          accountName: "Sanitized Portfolio",
          isPension: false,
        },
        holdings: sanitizedHoldings,
        summary: {
          totalEvaluationAmount: 100, // 가중치 합계
          totalBuyAmount: 0,
          totalProfitLossAmount: 0,
          totalProfitLossRate: totalProfitLossRate, // 전체 수익률 공개 (절대값은 은폐)
          depositAmount: 0,
          cashAvailable: 0,
          totalAsset: 100,
        },
        lastUpdated: new Date().toISOString(),
      },
    ];

    return {
      success: true,
      data: sanitizedData,
    };
  } catch (error) {
    console.error("Server Action Error (getBalanceAction):", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "데이터 처리 중 서버 오류가 발생했습니다.",
    };
  }
}
