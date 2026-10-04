const EXPECTED_NEON_ENDPOINT = "ep-rough-tooth-b7ftobk5.c-13.us-east-1.aws.neon.tech";
const EXPECTED_DATABASE_NAME = "neondb";

function getTarget(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace("-pooler.", ".");
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    return { hostname, database };
  } catch {
    return null;
  }
}

export function assertPublicDemoDatabaseTargets(
  databaseUrl: string | undefined,
  directUrl: string | undefined,
) {
  const database = getTarget(databaseUrl);
  const direct = getTarget(directUrl);

  if (
    database?.hostname !== EXPECTED_NEON_ENDPOINT ||
    direct?.hostname !== EXPECTED_NEON_ENDPOINT ||
    database.database !== EXPECTED_DATABASE_NAME ||
    direct.database !== EXPECTED_DATABASE_NAME
  ) {
    throw new Error(
      "Refusing to reset or seed: DATABASE_URL and DIRECT_URL must both target the confirmed KUSPACE public-demo Neon database.",
    );
  }
}
