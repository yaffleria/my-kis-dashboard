/**
 * 환율 조회 서비스
 */

export async function getExchangeRate(from: string = "USD"): Promise<number> {
  const FALLBACK_RATES: Record<string, number> = {
    USD: 1450,
    CAD: 1050,
    JPY: 9.5, // 100엔 기준이 아니라 1엔 기준 (Frankfurter Provides 1 Unit)
  };

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=KRW`,
      {
        next: { revalidate: 300 }, // 5분 캐시
      }
    );

    if (!response.ok) {
      console.warn(
        `[Exchange Rate] API Error (${response.status}), Using Fallback for ${from}`
      );
      return FALLBACK_RATES[from] || 1;
    }

    const data = await response.json();
    return data.rates.KRW;
  } catch (error) {
    console.error(`[Exchange Rate] Fetch Error (${from}):`, error);
    return FALLBACK_RATES[from] || FALLBACK_RATES["USD"];
  }
}
