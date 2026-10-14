import "dotenv/config";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) console.info("Skipping database integration tests: DATABASE_URL is empty; unit tests need no database.");

const migrationSql = await readFile(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations", "001_init.sql"), "utf8");
const seedSql = await readFile(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations", "seed.sql"), "utf8");
const dbDescribe = describe.skipIf(!databaseUrl);

dbDescribe("Postgres migrations and seed", () => {
  let client: Client;
  let schemaName: string;

  beforeEach(async () => {
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
    schemaName = `pawtner_test_${process.pid}_${Date.now()}`;
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}", public`);
  });

  afterEach(async () => {
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await client.end();
  });

  it("applies the initial migration to an empty schema", async () => {
    await client.query(migrationSql);
    const result = await client.query("SELECT to_regclass('users') AS users, to_regclass('agent_decisions') AS agent_decisions");
    expect(result.rows[0]).toEqual({ users: "users", agent_decisions: "agent_decisions" });
  });

  it("loads only fictional demo seed rows", async () => {
    await client.query(migrationSql);
    await client.query(seedSql);
    const result = await client.query("SELECT name FROM users");
    expect(result.rows).toEqual([{ name: "Siew Lan" }]);
  });

  it("rejects caretaker thresholds below two in the database", async () => {
    await client.query(migrationSql);
    await client.query(seedSql);
    await expect(client.query(
      "INSERT INTO user_caregivers (user_id, caregiver_id, opted_in, threshold) VALUES ($1, $2, false, 1)",
      ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000099"],
    )).rejects.toThrow(/check constraint/i);
  });
});

it.skip("API handlers return contract-shaped responses (pending contract confirmation and handler authorization)", () => {});
