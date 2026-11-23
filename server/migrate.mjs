import { readFile } from "node:fs/promises";
import pg from "pg";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL for the intended PostgreSQL database.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(
    await readFile(
      new URL(
        "../db/migrations/20261121133000_vouch.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await client.query("COMMIT");
  console.log("Vouch schema ready.");
} finally {
  await client.end();
}
