import axios from "axios";
import { prisma } from "@/lib/prisma";
import type { KisHoldingItem, KisOverseasBalanceItem } from "./types";

const KIS_API_URL = {
  prod: "https://openapi.koreainvestment.com:9443",
  vps: "https://openapivts.koreainvestment.com:29443",
};

type KisEnv = "prod" | "vps";

// Global cache for pending token requests to prevent duplicate calls
const globalWithPending = global as unknown as {
  _kisPendingRequests?: Map<string, Promise<string>>;
};
if (!globalWithPending._kisPendingRequests) {
  globalWithPending._kisPendingRequests = new Map();
}
const pendingRequests = globalWithPending._kisPendingRequests!;

export class KisClient {
  private env: KisEnv;
  private baseUrl: string;

  private static instance: KisClient;

  private constructor() {
    this.env = (process.env.KIS_ENV || "prod") as KisEnv;
    this.baseUrl = KIS_API_URL[this.env];
  }

  /**
   * Invalidate cached token in DB when KIS reports it as expired.
   */
  private async invalidateTokenOnExpiry(appKey: string, error: unknown) {
    if (!axios.isAxiosError(error)) return;

    const msg1 = (error.response?.data as { msg1?: string })?.msg1;
    if (typeof msg1 === "string" && msg1.includes("기간이 만료된 token")) {
      try {
        await prisma.kisToken.delete({
          where: { type: `kis_${appKey}` },
        });
        console.warn(
          `[KIS Token] Deleted expired token for appKey=${appKey} (msg1='${msg1}')`,
        );
      } catch (e) {
        // 이미 삭제되었거나 존재하지 않아도 무시
        console.warn(
          `[KIS Token] Failed to delete expired token for appKey=${appKey}:`,
          e,
        );
      }
    }
  }

  public static getInstance(): KisClient {
    if (!KisClient.instance) {
      KisClient.instance = new KisClient();
    }
    return KisClient.instance;
  }

  /**
   * Get Access Token (with Supabase caching and memory locking)
   */
  public async getAccessToken(
    appKey: string,
    appSecret: string,
  ): Promise<string> {
    // 1. Check Memory Lock
    if (pendingRequests.has(appKey)) {
      return pendingRequests.get(appKey)!;
    }

    const fetchPromise = (async () => {
      try {
        // 2. Check DB Cache
        const dbToken = await prisma.kisToken.findUnique({
          where: { type: `kis_${appKey}` },
        });

        // 만료 시간이 실제로 현재 시각을 지난 경우에만 재발급.
        // BUFFER_TIME 을 두지 않고, KIS가 제공한 만료시각(expiresAt) 기준으로만 판단한다.
        if (dbToken && dbToken.expiresAt.getTime() > Date.now()) {
          return dbToken.token;
        }

        // 3. Call API
        const response = await axios.post(`${this.baseUrl}/oauth2/tokenP`, {
          grant_type: "client_credentials",
          appkey: appKey,
          appsecret: appSecret,
        });

        const data = response.data;
        if (!data.access_token) {
          throw new Error("Failed to retrieve access token from KIS API.");
        }

        let expiredTime = Date.now() + 23 * 60 * 60 * 1000;
        try {
          if (data.access_token_token_expired) {
            const dateStr = data.access_token_token_expired.replace(/-/g, "/");
            expiredTime = new Date(dateStr).getTime();
          }
        } catch (e) {
          console.warn("Token expiration parsing failed, using default.", e);
        }

        // 4. Save to DB
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
        pendingRequests.delete(appKey);
      }
    })();

    pendingRequests.set(appKey, fetchPromise);
    return fetchPromise;
  }

  private async getHeaders(trId: string, appKey: string, appSecret: string) {
    const token = await this.getAccessToken(appKey, appSecret);
    return {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: trId,
      tr_cont: "",
      custtype: "P",
    };
  }

  /**
   * Domestic Stock Balance Inquiry
   */
  public async inquireDomesticBalance(
    accountNo: string,
    productCode: string,
    appKey: string,
    appSecret: string,
  ): Promise<{ output1: KisHoldingItem[]; output2: unknown }> {
    try {
      const headers = await this.getHeaders("TTTC8434R", appKey, appSecret);
      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`,
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
            PRCS_DVSN: "01",
            CTX_AREA_FK100: "",
            CTX_AREA_NK100: "",
          },
        },
      );

      if (response.data.rt_cd !== "0") {
        throw new Error(`${response.data.msg1} (${response.data.rt_cd})`);
      }

      return {
        output1: response.data.output1 || [],
        output2: response.data.output2 || {},
      };
    } catch (error) {
      await this.invalidateTokenOnExpiry(appKey, error);
      this.handleError("Domestic Balance", accountNo, error);
      throw error;
    }
  }

  /**
  /**
   * Overseas Stock Balance Inquiry (Multi-Exchange Support)
   */
  public async inquireOverseasBalance(
    accountNo: string,
    productCode: string,
    appKey: string,
    appSecret: string,
  ): Promise<{ output1: KisOverseasBalanceItem[]; output2: unknown }> {
    const EXCHANGES = [
      { code: "NASD", cy: "USD" },
      { code: "NYSE", cy: "USD" },
      { code: "AMEX", cy: "USD" },
      { code: "TKSE", cy: "JPY" }, // Japan
      { code: "SEHK", cy: "HKD" }, // Hong Kong
    ];

    try {
      const trId = this.env === "prod" ? "TTTS3012R" : "VTTS3012R";
      const headers = await this.getHeaders(trId, appKey, appSecret);

      const promises = EXCHANGES.map(async (exch) => {
        try {
          const response = await axios.get(
            `${this.baseUrl}/uapi/overseas-stock/v1/trading/inquire-balance`,
            {
              headers,
              params: {
                CANO: accountNo,
                ACNT_PRDT_CD: productCode,
                OVRS_EXCG_CD: exch.code,
                TR_CRCY_CD: exch.cy,
                CTX_AREA_FK200: "",
                CTX_AREA_NK200: "",
              },
            },
          );

          if (response.data.rt_cd !== "0") {
            // Ignore common "no data" errors to avoid log spam
            // msg1 example: "조회할 내역이 없습니다."
            return [];
          }

          const items = (response.data.output1 ||
            []) as KisOverseasBalanceItem[];

          return items.map((item) => ({ ...item, currency_code: exch.cy }));
        } catch (error) {
          await this.invalidateTokenOnExpiry(appKey, error);
          // Log specific exchange error but allow others to succeed
          console.warn(
            `[KIS Info] Overseas Balance Partial Fail (${exch.code}):`,
            axios.isAxiosError(error) ? error.message : String(error),
          );
          return [];
        }
      });

      const results = await Promise.all(promises);
      const output1 = results.flat();

      return {
        output1,
        output2: {}, // Aggregated summary not easily possible, leaving empty
      };
    } catch (error) {
      this.handleError("Overseas Balance", accountNo, error);
      throw error;
    }
  }

  /**
   * Get Current Price (Domestic)
   */
  public async getStockCurrentPrice(
    stockCode: string,
    appKey: string,
    appSecret: string,
  ): Promise<number> {
    try {
      // FHKST01010100 /uapi/domestic-stock/v1/quotations/inquire-price 는
      // 문서상 "[국내주식] 기본시세, 주식현재가 시세" 전용이므로
      // 순수 6자리 숫자 종목(보통/우선주, ETF/ETN 등)만 대상으로 하고,
      // 채권/권리 등 문자 포함 코드(예: 0019K0)는 이 엔드포인트를 타지 않도록 방어한다.
      if (!/^\d{6}$/.test(stockCode)) {
        console.warn(
          `[KIS Info] Skip getStockCurrentPrice for non-equity code: ${stockCode}`,
        );
        return 0;
      }

      const headers = await this.getHeaders("FHKST01010100", appKey, appSecret);
      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          headers,
          params: {
            FID_COND_MRKT_DIV_CODE: "J",
            FID_INPUT_ISCD: stockCode,
          },
        },
      );

      if (response.data.rt_cd !== "0") {
        return 0;
      }
      return parseInt(response.data.output.stck_prpr || "0", 10);
    } catch (error) {
      await this.invalidateTokenOnExpiry(appKey, error);
      // KIS가 특정 코드(예: 일부 ETF/채권/권리)에 대해 500을 반환하는 경우가 있어
      // 스택 전체를 찍지 않고 요약 정보만 경고로 남긴다.
      if (axios.isAxiosError(error)) {
        console.warn(
          `[KIS Error] Price Fetch (${stockCode}): status=${error.response?.status} message=${error.message}`,
        );
      } else {
        console.warn(
          `[KIS Error] Price Fetch (${stockCode}): ${String(error)}`,
        );
      }
      return 0;
    }
  }

  /**
   * Get News
   */
  public async getNews(
    appKey: string,
    appSecret: string,
  ): Promise<{ date: string; time: string; title: string; code: string }[]> {
    if (this.env === "vps") return [];

    try {
      const headers = await this.getHeaders("FHKST01011800", appKey, appSecret);
      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/news-title`,
        {
          headers,
          params: { FID_NEWS_KEY: "" },
        },
      );

      if (response.data.rt_cd !== "0") return [];

      const output = response.data.output || [];
      return output.map((item: Record<string, string>) => ({
        date: item.dorg,
        time: item.hms,
        title: item.title,
        code: item.shtn_iscd,
      }));
    } catch (error) {
      console.error("[KIS Error] News Fetch:", error);
      return [];
    }
  }

  private handleError(context: string, id: string, error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `[KIS API Error] ${context} (${id}): status=${
          error.response.status
        } msg=${error.response.data?.msg1 || "Unknown"} code=${
          error.response.data?.rt_cd || "Unknown"
        }`,
      );
    } else {
      console.error(`[KIS Internal Error] ${context} (${id}):`, error);
    }
  }
}

export const kisClient = KisClient.getInstance();
