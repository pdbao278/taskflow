import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  // Prevent the common "placeholder" situation from docs/templates.
  if (url.includes("POSTGRES_USER") || url.includes("POSTGRES_PASSWORD")) {
    throw new Error(
      "DATABASE_URL is still using placeholder values. Please update it in .env with your real Postgres credentials.",
    );
  }

  return url;
}

let prismaInstance: PrismaClient | undefined = globalForPrisma.prisma;

export function getPrisma() {
  if (prismaInstance) return prismaInstance;

  const connectionString = getDatabaseUrl();
  prismaInstance = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  globalForPrisma.prisma = prismaInstance;
  return prismaInstance;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaInstance;
}

