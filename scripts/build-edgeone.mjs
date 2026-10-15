// Bundles the EdgeOne Pages Node (cloud) function into one self-contained file.
//
// EdgeOne Pages registers Node functions from cloud-functions/ (only .js/.ts
// files are scanned; [[default]].js is the multi-segment catch-all). Our API
// handler and repository are .ts files importing shared/*.ts, so esbuild
// bundles cloud-functions-src/api-entry.mjs + those imports + pg into
// cloud-functions/api/[[default]].js. pg is bundled (not external) so the
// function needs no node_modules at runtime. The output is committed:
// EdgeOne deploys it from the repo as-is.
//
// The old functions/ folder is not written to any more (EdgeOne does not
// scan it).
import { build } from "esbuild";
import { rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const entry = join(root, "cloud-functions-src", "api-entry.mjs");
const outfile = join(root, "cloud-functions", "api", "[[default]].js");

await rm(outfile, { force: true });

await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  outfile,
  // Optional pg backends that are never used on Node over TCP:
  // pg-native (libpq binding) and pg-cloudflare (Cloudflare Workers sockets).
  external: ["pg-native", "pg-cloudflare", "cloudflare:sockets"],
  // pg is CommonJS; in an ESM bundle esbuild's require() shim cannot load
  // Node built-ins (net, tls, events...), so give the bundle a real require.
  // Only built-ins are required through it, so the base path barely matters;
  // the cwd fallback keeps it loading if a host re-bundles the file as CJS
  // (where import.meta.url is empty).
  banner: {
    js: "import { createRequire as __pawtnerCreateRequire } from 'node:module';\nconst require = __pawtnerCreateRequire(import.meta.url || process.cwd() + '/');",
  },
  // Resolve .js import specifiers to .ts source files
  resolveExtensions: [".ts", ".js", ".mjs"],
  legalComments: "none",
  logLevel: "info",
});

const { size } = await stat(outfile);
console.log(`EdgeOne function bundled to ${relative(root, outfile)} (${(size / 1024).toFixed(1)} KB)`);
