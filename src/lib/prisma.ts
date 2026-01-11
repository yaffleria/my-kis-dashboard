import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let connectionString = process.env.POSTGRES_PRISMA_URL;

// Supabase/Vercel 환경에서 Prisma 엔진의 TLS 에러를 방지하기 위해
// 연결 문자열에 sslmode=no-verify가 없다면 추가합니다.
if (connectionString && !connectionString.includes("sslmode=")) {
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString += `${separator}sslmode=no-verify`;
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    // 로그를 통해 연결 이슈를 더 자세히 볼 수 있게 설정 (선택 사항)
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
