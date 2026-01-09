import { NextResponse } from "next/server";
import {
  getStockDailyPrice,
  getOverseasDailyPrice,
  parseNumber,
  type StockDailyPriceItem,
  type OverseasDailyPriceItem,
} from "@/lib/kis-api";
import type { StockChartDataPoint } from "@/types";

export const dynamic = "force-dynamic";

/**
 * 환경변수에서 첫 번째 계좌의 API 키 가져오기
 */
function getApiCredentials(): { appKey: string; appSecret: string } | null {
  const accountsJson = process.env.KIS_ACCOUNTS;
  if (!accountsJson) {
    // Fallback to legacy single key
    const appKey = process.env.KIS_APP_KEY;
    const appSecret = process.env.KIS_APP_SECRET;
    if (appKey && appSecret) {
      return { appKey, appSecret };
    }
    return null;
  }

  try {
    const cleanJson = accountsJson.replace(/,\s*([\]}])/g, "$1");
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const { appKey, appSecret } = parsed[0];
      if (appKey && appSecret) {
        return { appKey, appSecret };
      }
    }
  } catch (err) {
    console.error("KIS_ACCOUNTS 파싱 오류:", err);
  }

  return null;
}

/**
 * 날짜 포맷 변환 (YYYYMMDD -> YYYY-MM-DD)
 */
function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(
    6,
    8
  )}`;
}

/**
 * N일 전 날짜 계산 (YYYYMMDD 형식)
 */
function getDateBefore(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 오늘 날짜 (YYYYMMDD 형식)
 */
function getToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 종목코드가 해외주식인지 판별 (간단한 휴리스틱)
 * 국내: 6자리 숫자 (005930, 373220 등)
 * 해외: 영문 티커 (AAPL, MSFT, TSLA 등)
 */
function isOverseasStock(stockCode: string): boolean {
  // 6자리 숫자면 국내주식
  if (/^\d{6}$/.test(stockCode)) return false;
  // 영문자가 포함되면 해외주식
  if (/[A-Za-z]/.test(stockCode)) return true;
  return false;
}

/**
 * GET /api/stock-chart?code=005930&days=90
 * 주식 일별 시세 조회 API
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stockCode = searchParams.get("code");
  const daysParam = searchParams.get("days") || "90";
  const exchangeParam = searchParams.get("exchange") || "NASD"; // 해외주식용

  if (!stockCode) {
    return NextResponse.json(
      { success: false, error: "종목코드(code)가 필요합니다." },
      { status: 400 }
    );
  }

  const credentials = getApiCredentials();
  if (!credentials) {
    return NextResponse.json(
      { success: false, error: "KIS API 인증 정보가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const days = parseInt(daysParam, 10);
    const startDate = getDateBefore(days);
    const endDate = getToday();

    let chartData: StockChartDataPoint[] = [];

    if (isOverseasStock(stockCode)) {
      // 해외주식 조회
      const result = await getOverseasDailyPrice(
        stockCode,
        exchangeParam,
        credentials.appKey,
        credentials.appSecret,
        startDate,
        endDate,
        "D" // 일봉
      );

      const items = result.output1 as OverseasDailyPriceItem[];

      chartData = items
        .filter((item) => item.xymd) // 빈 데이터 제외
        .map((item) => ({
          date: formatDate(item.xymd),
          open: parseNumber(item.open),
          high: parseNumber(item.high),
          low: parseNumber(item.low),
          close: parseNumber(item.clos),
          volume: parseNumber(item.tvol),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // 날짜 오름차순 정렬
    } else {
      // 국내주식 조회
      const result = await getStockDailyPrice(
        stockCode,
        credentials.appKey,
        credentials.appSecret,
        startDate,
        endDate,
        "D" // 일봉
      );

      const items = result.output1 as StockDailyPriceItem[];

      chartData = items
        .filter((item) => item.stck_bsop_date) // 빈 데이터 제외
        .map((item) => ({
          date: formatDate(item.stck_bsop_date),
          open: parseNumber(item.stck_oprc),
          high: parseNumber(item.stck_hgpr),
          low: parseNumber(item.stck_lwpr),
          close: parseNumber(item.stck_clpr),
          volume: parseNumber(item.acml_vol),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)); // 날짜 오름차순 정렬
    }

    return NextResponse.json({
      success: true,
      stockCode,
      data: chartData,
      dataCount: chartData.length,
    });
  } catch (error) {
    console.error(`[Stock Chart API Error] ${stockCode}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json({
      success: false,
      stockCode,
      data: [],
      error: errorMessage,
    });
  }
}
