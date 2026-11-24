import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL for the intended PostgreSQL database.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const directory = new URL("../db/migrations/", import.meta.url);
  for (const file of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
    await client.query(await readFile(new URL(file, directory), "utf8"));
  }
  await client.query("COMMIT");
  console.log("Vouch schema ready.");
} finally {
  await client.end();
}
