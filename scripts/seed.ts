import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL_DIRECT;
if (!connectionString) throw new Error("DATABASE_URL_DIRECT is required to seed the database.");

const here = dirname(fileURLToPath(import.meta.url));
const client = new Client({ connectionString });
try {
  await client.connect();
  await client.query(await readFile(join(here, "..", "migrations", "seed.sql"), "utf8"));
  console.info("Loaded fictional Pawtner seed data.");
} finally {
  await client.end();
}
