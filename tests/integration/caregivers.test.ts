import "dotenv/config";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Pool } from "pg";
import { createApiHandler } from "../../api/handlers.js";
import { PawtnerRepository } from "../../api/repository.js";

const databaseUrl = process.env.DATABASE_URL;
const testApi = describe.skipIf(!databaseUrl);
const migrationDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");
const ROSE = "00000000-0000-4000-8000-000000000001";

testApi("Caretakers from data: user_caregivers, every caretaker, in order", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let repository: PawtnerRepository;

  beforeEach(async () => {
    schema = `pawtner_caregivers_${process.pid}_${Date.now()}`;
    setup = new Client({ connectionString: databaseUrl });
    await setup.connect();
    await setup.query(`CREATE SCHEMA "${schema}"`);
    await setup.query(`SET search_path TO "${schema}", public`);
    for (const name of (await readdir(migrationDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort()) {
      await setup.query(await readFile(join(migrationDir, name), "utf8"));
    }
    await setup.query(await readFile(join(migrationDir, "seed.sql"), "utf8"));
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema},public` });
    repository = new PawtnerRepository(pool);
  });

  afterEach(async () => {
    await pool?.end();
    if (setup) {
      await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await setup.end();
    }
  });

  it("lists the seed's two caretakers in caregiver id order, with opted_in as receivesCheckIns", async () => {
    expect(await repository.listCaregivers(ROSE)).toEqual([
      { id: "00000000-0000-4000-8000-000000000002", name: "Jamie", receivesCheckIns: true },
      { id: "00000000-0000-4000-8000-00000000000a", name: "Alex", receivesCheckIns: false },
    ]);
  });

  it("only lists the user's own caretakers, and follows a name changed in the database", async () => {
    await setup.query(`INSERT INTO users (id, name, timezone) VALUES ('00000000-0000-4000-8000-0000000000f1', 'Other', 'Asia/Singapore')`);
    await setup.query(`INSERT INTO caregivers (id, name) VALUES ('00000000-0000-4000-8000-000000000001', 'Someone else')`);
    await setup.query(`INSERT INTO user_caregivers (user_id, caregiver_id, opted_in) VALUES ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-000000000001', true)`);
    await setup.query(`UPDATE caregivers SET name = 'Sam' WHERE id = '00000000-0000-4000-8000-00000000000a'`);
    expect((await repository.listCaregivers(ROSE)).map((entry) => entry.name)).toEqual(["Jamie", "Sam"]);
    expect(await repository.listCaregivers("00000000-0000-4000-8000-0000000000f1")).toEqual([
      { id: "00000000-0000-4000-8000-000000000001", name: "Someone else", receivesCheckIns: true },
    ]);
  });

  it("is on the caretaker summary as caregivers, next to the unchanged caregiver", async () => {
    const response = await createApiHandler(repository)(new Request("http://localhost/api/caretaker/summary"));
    const summary = await response.json();
    expect(response.status).toBe(200);
    expect(summary.caregivers.map((entry: { name: string }) => entry.name)).toEqual(["Jamie", "Alex"]);
    expect(summary.caregiver).toEqual({ id: expect.any(String), name: expect.any(String) });
  });
});
