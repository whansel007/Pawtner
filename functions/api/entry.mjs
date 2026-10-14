// EdgeOne Pages Function entry point for the Pawtner API.
//
// EdgeOne Pages Functions use file-based routing: anything under /functions
// becomes an endpoint, and [[path]].js is the catch-all for /api/*. The
// handler receives a standard Web Fetch Request and must return a Response —
// which is exactly the signature of the shared handler in api/handlers.ts,
// so this file is a thin wrapper.
//
// Note: the file is .mjs (not .ts) because EdgeOne Pages Functions run
// directly on Node.js without a TypeScript build step. The .ts source in
// this folder is bundled by Vercel instead.
import { createApiHandler } from "../../api/handlers.js";
import { PawtnerRepository } from "../../api/repository.js";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (set it in the EdgeOne Pages env).");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const handler = createApiHandler(new PawtnerRepository(pool));

export default async function (request) {
  return handler(request);
}
