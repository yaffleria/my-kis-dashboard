import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.POSTGRES_PRISMA_URL;
const rawCert = process.env.SUPABASE_CA_CERT || "";
const caCert = rawCert.replace(/\\n/g, "\n");

const pool = new Pool({
  connectionString,
  ssl: {
    ca: caCert,
  },
});
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter }); // 어댑터 사용 명시

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
