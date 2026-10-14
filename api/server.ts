import "dotenv/config";
import { createServer } from "node:http";
import { Pool } from "pg";
import { createApiHandler } from "./handlers.js";
import { PawtnerRepository } from "./repository.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const handler = createApiHandler(new PawtnerRepository(pool));
const server = createServer(async (incoming, outgoing) => {
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
  const request = new Request(`http://${incoming.headers.host ?? "localhost"}${incoming.url ?? "/"}`, {
    method: incoming.method,
    headers: incoming.headers as HeadersInit,
    ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
  });
  const response = await handler(request);
  outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  outgoing.end(await response.text());
});
const port = Number(process.env.API_PORT ?? 3001);
server.listen(port, "0.0.0.0", () => console.log(`Pawtner API listening on ${port}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close(() => void pool.end()));
