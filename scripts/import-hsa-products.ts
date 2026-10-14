import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const resourceId = "d_767279312753558cbf19d48344577084";
const sourceUrl = "https://data.gov.sg/datasets/d_767279312753558cbf19d48344577084/view";
const apiUrl = "https://data.gov.sg/api/action/datastore_search";
const databaseUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_DIRECT or DATABASE_URL is required.");

type RecordRow = Record<string, unknown>;
function value(row: RecordRow, ...names: string[]): string | null {
  const normalized = new Map(Object.entries(row).map(([key, item]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), item]));
  for (const name of names) {
    const candidate = normalized.get(name.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

async function downloadAll(): Promise<RecordRow[]> {
  const rows: RecordRow[] = [];
  const limit = 1000;
  let total = Number.POSITIVE_INFINITY;
  while (rows.length < total) {
    const url = new URL(apiUrl);
    url.searchParams.set("resource_id", resourceId);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(rows.length));
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`data.gov.sg returned HTTP ${response.status}`);
    const payload = await response.json() as { success?: boolean; result?: { records?: RecordRow[]; total?: number } };
    if (!payload.success || !payload.result?.records) throw new Error("Unexpected data.gov.sg response shape.");
    const page = payload.result.records;
    total = Number(payload.result.total ?? rows.length + page.length);
    if (page.length === 0) break;
    rows.push(...page);
  }
  if (rows.length === 0) throw new Error("The HSA product register download was empty; database was not changed.");
  return rows;
}

const records = (await downloadAll()).map((row) => {
  const licenceNo = value(row, "LicenceNo", "LicenseNo");
  const brandName = value(row, "Productname", "ProductName", "Product Name");
  if (!licenceNo || !brandName) return null;
  const ingredients = value(row, "Activeingredients", "Active Ingredients");
  return {
    id: randomUUID(), licenceNo, brandName,
    genericName: ingredients,
    licenseholder: value(row, "Licenseholder", "Licenceholder", "License Holder"),
    approvalDate: value(row, "Approvaldate", "Approval Date"),
    classification: value(row, "Forensicclassification", "Forensic Classification"),
    atcCode: value(row, "ATCCode", "ATC Code"),
    dosageForm: value(row, "Dosageform", "Dosage Form"),
    route: value(row, "RouteofAdministration", "Route of Administration"),
    manufacturer: value(row, "Manufacturer"),
    country: value(row, "Countryofmanufacturer", "Country of Manufacturer"),
    ingredients,
    strength: value(row, "Strength"),
  };
}).filter((row): row is NonNullable<typeof row> => row !== null);

if (records.length === 0) throw new Error("No valid licensed product rows found; database was not changed.");

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("DELETE FROM sg_registered_products");
  for (let offset = 0; offset < records.length; offset += 200) {
    const batch = records.slice(offset, offset + 200);
    const params: unknown[] = [];
    const values = batch.map((row, index) => {
      const base = index * 16;
      params.push(row.id, row.brandName, row.genericName, row.licenceNo, row.licenseholder,
        row.approvalDate, row.classification, row.atcCode, row.dosageForm, row.route,
        row.manufacturer, row.country, row.ingredients, row.strength, "2026-08-07", sourceUrl);
      return `(${Array.from({ length: 16 }, (_, column) => `$${base + column + 1}`).join(", ")})`;
    });
    await client.query(
      `INSERT INTO sg_registered_products
         (id, brand_name, generic_name, licence_no, licenseholder, approval_date,
          forensic_classification, atc_code, dosage_form, route_of_administration,
          manufacturer, country_of_manufacturer, active_ingredients, strength, source_updated_at,
          source_attribution)
       VALUES ${values.join(", ")}`.replace(/\(\$(\d+),/g, "($1::uuid,"),
      params,
    );
  }
  await client.query("COMMIT");
  console.info(`Imported ${records.length} registered products from the HSA data.gov.sg dataset.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
