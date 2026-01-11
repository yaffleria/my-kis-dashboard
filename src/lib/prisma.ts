// src/lib/prisma.ts
import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1. Vercel이 준 URL을 가져옵니다.
const connectionString = process.env.POSTGRES_PRISMA_URL!;
const url = new URL(connectionString);

// 2. [핵심] 'require'의 맹목적인 시스템 기본 검증을 막기 위해 파라미터를 제거합니다.
//    (pgbouncer=true는 유지됩니다. 이는 풀링 모드 식별에 도움을 줄 수 있습니다.)
url.searchParams.delete("sslmode");

// 3. 인증서 준비 (Vercel 환경변수 사용)
const rawCert = process.env.SUPABASE_CA_CERT;
const caCert = rawCert ? rawCert.replace(/\\n/g, "\n") : undefined;

const pool = new Pool({
  connectionString: url.toString(), // sslmode가 제거된 URL
  ssl: caCert
    ? {
        // 여기가 진짜 'require'입니다.
        // "암호화 필수(true)이며, 내가 준 족보(ca)로 검증해라"
        rejectUnauthorized: true,
        ca: caCert,
      }
    : {
        // 로컬 개발 등 인증서가 없을 때를 위한 대비책
        rejectUnauthorized: false,
      },
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
