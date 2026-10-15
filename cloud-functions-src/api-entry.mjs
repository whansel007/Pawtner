// EdgeOne Pages Node (cloud) function source for the Pawtner API.
//
// This file is NOT deployed as-is. `npm run build:edgeone` bundles it, the
// api/*.ts and shared/*.ts it imports, and pg into one self-contained file:
// cloud-functions/api/[[default]].js. EdgeOne scans only cloud-functions/,
// where [[default]].js is the catch-all for /api/* (one or more segments).
// This source lives outside that folder so it never becomes a route itself.
//
// EdgeOne calls onRequest(context); the Web Fetch Request is context.request
// and project env vars are documented as context.env. The shared handler in
// api/handlers.ts already takes a Request and returns a Response.
import { Pool } from "pg";
import { createApiHandler } from "../api/handlers.js";
import { PawtnerRepository } from "../api/repository.js";

// Module-scoped so warm invocations reuse the pool and its connections.
let cached = null;

function handlerFor(databaseUrl) {
  if (!cached || cached.databaseUrl !== databaseUrl) {
    const pool = new Pool({ connectionString: databaseUrl, max: 4 });
    cached = { databaseUrl, handler: createApiHandler(new PawtnerRepository(pool)) };
  }
  return cached.handler;
}

export async function onRequest(context) {
  // Read lazily per request: a missing env var gives a clear JSON 503
  // instead of a module-load crash (which EdgeOne would turn into an opaque error).
  const databaseUrl = context?.env?.DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    return Response.json({ error: "DATABASE_URL is not configured on this host." }, { status: 503 });
  }
  return handlerFor(databaseUrl)(context.request);
}

export default onRequest;
