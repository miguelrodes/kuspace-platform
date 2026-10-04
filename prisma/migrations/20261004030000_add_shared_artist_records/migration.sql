CREATE TABLE "artists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

INSERT INTO "artists" ("id", "name", "updatedAt")
SELECT "artistId", MIN("name"), CURRENT_TIMESTAMP
FROM "event_lineup_entries"
GROUP BY "artistId";

CREATE INDEX "artists_name_idx" ON "artists"("name");

ALTER TABLE "event_lineup_entries"
ADD CONSTRAINT "event_lineup_entries_artistId_fkey"
FOREIGN KEY ("artistId") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
