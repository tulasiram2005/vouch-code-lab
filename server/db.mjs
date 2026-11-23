import pg from "pg";
let pool;

export function database() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw Object.assign(
      new Error(
        "Shared sessions are unavailable. Local practice is available.",
      ),
      { status: 503 },
    );
  }
  pool ??= new pg.Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    statement_timeout: 8000,
    allowExitOnIdle: true,
  });
  return pool;
}
export async function transaction(work) {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function purgeExpired() {
  return transaction(async (client) => {
    await client.query(
      "DELETE FROM attempts WHERE created_at < now() - interval '30 days'",
    );
    await client.query("DELETE FROM sessions WHERE expires_at < now()");
    await client.query(
      "DELETE FROM rate_windows WHERE started_at < now() - interval '1 hour'",
    );
  });
}

let signingKey;
export async function getSigningKey() {
  if (!signingKey)
    signingKey = (
      await database().query("SELECT value FROM app_key WHERE singleton")
    ).rows[0].value;
  return signingKey;
}
