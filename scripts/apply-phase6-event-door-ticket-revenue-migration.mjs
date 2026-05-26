import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const migrationName = "20260426022000_phase6_event_door_ticket_revenue";
const migrationFile = new URL(
  "../prisma/migrations/20260426022000_phase6_event_door_ticket_revenue/migration.sql",
  import.meta.url,
);

function getPooledUrl() {
  const rawUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

  if (!rawUrl) {
    throw new Error("DATABASE_URL or DIRECT_URL is required");
  }

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
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getPooledUrl(),
    },
  },
});

async function main() {
  const script = await readFile(migrationFile, "utf8");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "events"
    ADD COLUMN IF NOT EXISTS "doorTicketRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0
  `);

  const existing = await prisma.$queryRawUnsafe(
    'SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1',
    migrationName,
  );

  if (!Array.isArray(existing) || existing.length === 0) {
    const checksum = createHash("sha256").update(script).digest("hex");
    const now = new Date();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" (
        id,
        checksum,
        finished_at,
        migration_name,
        logs,
        rolled_back_at,
        started_at,
        applied_steps_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      randomUUID(),
      checksum,
      now,
      migrationName,
      "",
      null,
      now,
      1,
    );

    console.log(`Applied and recorded ${migrationName}`);
    return;
  }

  console.log(`Migration already recorded: ${migrationName}`);
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
