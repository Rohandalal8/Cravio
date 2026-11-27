import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const databaseUrl = new URL(env.DATABASE_URL);
if (!databaseUrl.searchParams.has("connection_limit")) {
  databaseUrl.searchParams.set("connection_limit", "1");
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl.toString() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
