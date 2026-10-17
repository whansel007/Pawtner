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

testApi("Stopping a medicine (soft stop via active + stopped_at)", () => {
  let setup: Client;
  let pool: Pool;
  let schema: string;
  let handler: ReturnType<typeof createApiHandler>;

  beforeEach(async () => {
    schema = `pawtner_meds_${process.pid}_${Date.now()}`;
    setup = new Client({ connectionString: databaseUrl });
    await setup.connect();
    await setup.query(`CREATE SCHEMA "${schema}"`);
    await setup.query(`SET search_path TO "${schema}", public`);
    // Every migration in order (007 adds stopped_at), then the fictional seed, inside this throwaway schema only.
    for (const name of (await readdir(migrationDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort()) {
      await setup.query(await readFile(join(migrationDir, name), "utf8"));
    }
    await setup.query(await readFile(join(migrationDir, "seed.sql"), "utf8"));
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema},public` });
    handler = createApiHandler(new PawtnerRepository(pool));
  });

  afterEach(async () => {
    await pool?.end();
    if (setup) {
      await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await setup.end();
    }
  });

  const put = (id: string, data: unknown) => handler(new Request(`http://localhost/api/medications/${id}`, {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data),
  }));
  const get = async (path: string) => (await handler(new Request(`http://localhost${path}`))).json();
  const stoppedAt = async (id: string) =>
    (await setup.query(`SELECT stopped_at FROM "${schema}".medications WHERE id = $1`, [id])).rows[0].stopped_at as Date | null;

  it("rejects an active value that is not a real boolean", async () => {
    const [medicine] = (await get("/api/medications")).medications;
    for (const active of ["false", 0, null, "yes"]) {
      const response = await put(medicine.id, { active });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe("active must be true or false.");
    }
    expect(await stoppedAt(medicine.id)).toBeNull();
  });

  it("stops a medicine without erasing it, and starts it again", async () => {
    const before = (await get("/api/medications")).medications;
    const medicine = before[0];
    const dosesFor = async () => (await get("/api/today")).doses.filter((dose: { medicationId: string }) => dose.medicationId === medicine.id);
    expect((await dosesFor()).length).toBeGreaterThan(0);
    expect((await get("/api/caretaker/summary")).stoppedMedicine).toBeNull();

    const stop = await put(medicine.id, { active: false });
    expect(stop.status).toBe(200);
    expect((await stop.json()).medication).toMatchObject({ id: medicine.id, active: false });
    expect(await stoppedAt(medicine.id)).toBeInstanceOf(Date);
    const listed = (await get("/api/medications")).medications.map((m: { id: string }) => m.id);
    expect(listed).not.toContain(medicine.id);
    expect(listed).toHaveLength(before.length - 1);
    expect(await dosesFor()).toHaveLength(0);
    // Nothing erased: the row and its schedules are still there.
    expect((await setup.query(`SELECT count(*)::int AS n FROM "${schema}".med_schedules WHERE medication_id = $1`, [medicine.id])).rows[0].n).toBeGreaterThan(0);

    const summary = await get("/api/caretaker/summary");
    expect(summary.stoppedMedicine).toEqual({ stoppedAt: (await stoppedAt(medicine.id))!.toISOString() });
    expect(JSON.stringify(summary.stoppedMedicine)).not.toContain(medicine.name);

    const start = await put(medicine.id, { active: true });
    expect(start.status).toBe(200);
    expect((await start.json()).medication).toMatchObject({ id: medicine.id, active: true });
    expect(await stoppedAt(medicine.id)).toBeNull();
    expect((await get("/api/medications")).medications.map((m: { id: string }) => m.id)).toContain(medicine.id);
    expect((await dosesFor()).length).toBeGreaterThan(0);
    expect((await get("/api/caretaker/summary")).stoppedMedicine).toBeNull();
  }, 60_000);

  it("only reports a stop from the past week", async () => {
    const [medicine] = (await get("/api/medications")).medications;
    await put(medicine.id, { active: false });
    await setup.query(`UPDATE "${schema}".medications SET stopped_at = now() - interval '8 days' WHERE id = $1`, [medicine.id]);
    expect((await get("/api/caretaker/summary")).stoppedMedicine).toBeNull();
  });
});
