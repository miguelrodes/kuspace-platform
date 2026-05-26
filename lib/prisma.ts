import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

function normalizePrismaRuntimeUrl(rawUrl: string | undefined) {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);

    if (url.hostname.includes(".pooler.supabase.com")) {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }

      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const prismaDatasourceUrl = normalizePrismaRuntimeUrl(
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL ?? process.env.DIRECT_URL,
);

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
