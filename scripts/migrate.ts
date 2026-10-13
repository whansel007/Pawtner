import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL_DIRECT;
if (!connectionString) throw new Error("DATABASE_URL_DIRECT is required to run migrations.");

const here = dirname(fileURLToPath(import.meta.url));
const migrationDir = join(here, "..", "migrations");
const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  for (const name of (await readdir(migrationDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort()) {
    const result = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
    if (result.rowCount) continue;
    await client.query(await readFile(join(migrationDir, name), "utf8"));
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    console.info(`Applied ${name}`);
  }
} finally {
  await client.end();
}
