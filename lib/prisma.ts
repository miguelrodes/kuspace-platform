import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

const prismaDatasourceUrl =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    datasources: prismaDatasourceUrl
      ? {
          db: {
            url: prismaDatasourceUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
