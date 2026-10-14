// Bundles the EdgeOne Pages Function into a single self-contained .mjs file.
//
// EdgeOne Pages Functions run .mjs files directly on Node.js with no
// TypeScript build step. Our API handler and repository are .ts files
// that import from shared/*.ts — Node cannot resolve those at runtime.
// This script uses esbuild to bundle entry.mjs + all .ts imports into
// a single [[path]].mjs that EdgeOne routes to automatically.
import { build } from "esbuild";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "functions", "api");
const entry = join(outDir, "entry.mjs");
const outfile = join(outDir, "[[path]].mjs");

// Clean previous output
await rm(outfile, { force: true });

await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  outfile,
  // pg is a native CJS module — mark it as external so Node resolves it
  // from node_modules at runtime (EdgeOne installs dependencies).
  external: ["pg"],
  // Resolve .js import specifiers to .ts source files
  resolveExtensions: [".ts", ".js", ".mjs"],
  logLevel: "info",
});

console.log("EdgeOne function bundled to functions/api/[[path]].mjs");
