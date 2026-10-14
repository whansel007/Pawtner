// Vercel serverless function entry point for the Pawtner API.
//
// Vercel's router treats any file under /api that exports a default function
// as a function endpoint. This file (the only one in /api with a default
// export) is the catch-all for every /api/* request. The other files in
// /api/ — handlers.ts, repository.ts, server.ts — are normal TypeScript
// modules; Vercel bundles them as imports, not as endpoints.
//
// The core handler in api/handlers.ts is built on the Web Fetch API
// (Request → Response), so it's already platform-agnostic: this file
// just adapts Vercel's (req, res) shape to a Web Fetch Request, and
// unpacks the Web Fetch Response back to (res).
import "@vercel/node";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApiHandler } from "./handlers.js";
import { PawtnerRepository } from "./repository.js";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  // Surface a clear error in the Vercel function log instead of a
  // generic 500 from a query failure on a missing connection string.
  throw new Error("DATABASE_URL is required (set it in the Vercel project env).");
}

// Vercel reuses the function instance across requests in a warm
// invocation. The pg Pool is module-scoped on purpose: it manages its
// own internal connections and survives across invocations.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const handler = createApiHandler(new PawtnerRepository(pool));

// Catch-all: matches /api/today, /api/dose-event, /api/medications,
// /api/treats/123/seen, etc. The handler does its own pathname matching.
export default async function (req: VercelRequest, res: VercelResponse): Promise<void> {
  const protocol = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host = (req.headers["x-forwarded-host"] as string | undefined) ?? (req.headers.host as string | undefined) ?? "localhost";
  const url = `${protocol}://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else headers.set(key, String(value));
  }
  let body: BodyInit | undefined;
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    if (typeof req.body === "string") body = req.body;
    else if (req.body !== undefined && req.body !== null) body = JSON.stringify(req.body);
  }
  const incoming = new Request(url, { method: req.method ?? "GET", headers, ...(body ? { body } : {}) });
  const response = await handler(incoming);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(await response.text());
}
