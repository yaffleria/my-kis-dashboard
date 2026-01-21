"use server";

import { getPortfolio } from "@/services/portfolio.service";
import { revalidatePath } from "next/cache";
import type { ApiResponse, SafeBalanceResponse, SafeHolding } from "@/types";

/**
 * 전역 잔고 데이터를 서버에서 직접 조회하는 서버 액션
 * [보안] 클라이언트 네트워크 탭에 민감한 정보(평가금, 수량 등)가 노출되지 않도록 필터링합니다.
 */
export async function getBalanceAction(): Promise<
  ApiResponse<SafeBalanceResponse>
> {
  try {
    const rawData = await getPortfolio();

    // 1. 서버 사이드 계산: 비중 및 수익률 계산
    const aggregated: Record<
      string,
      {
        stockCode: string;
        stockName: string;
        value: number; // 평가금액 (내부 계산용)
        buyAmount: number; // 매입금액 (내부 계산용)
      }
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

        const val = h.evaluationAmount || 0;
        const buy = h.buyAmount || 0;

        aggregated[h.stockCode].value += val;
        aggregated[h.stockCode].buyAmount += buy;
        totalValue += val;
      });
    });

    // 2. 데이터 정제 (Sanitization):
    // 클라이언트에는 오직 비중(%)과 수익률(%)만 전송합니다.
    // 평가금액(value)과 수량(quantity)은 의도적으로 제외합니다.
    const sanitizedHoldings: SafeHolding[] = Object.values(aggregated)
      .map((h) => {
        const weight = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
        const profitLossRate =
          h.buyAmount > 0 ? ((h.value - h.buyAmount) / h.buyAmount) * 100 : 0;

        return {
          stockCode: h.stockCode,
          stockName: h.stockName,
          weight: Number(weight.toFixed(2)),
          profitLossRate: Number(profitLossRate.toFixed(2)),
        };
      })
      .sort((a, b) => b.weight - a.weight);

    return {
      success: true,
      data: {
        holdings: sanitizedHoldings,
        lastUpdated: new Date().toISOString(),
      },
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
