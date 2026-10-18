import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * No person or pet name in code (owner, 18 Oct): names come from data, and the fallback demo names live ONLY in
 * mobile/src/locales/en.json "demoNames". This test parses every .ts/.tsx file under mobile/src, shared and api with the
 * TypeScript compiler and checks only the text a user could see: string literals, template literal parts and JSX text.
 * Comments are not nodes in the syntax tree, so they are never checked. Locales, tests and fixtures are excluded.
 */
const root = fileURLToPath(new URL("../..", import.meta.url));
const en = JSON.parse(readFileSync(join(root, "mobile/src/locales/en.json"), "utf8"));
const names: string[] = Object.values(en.demoNames as Record<string, string>);
const EXCLUDED = ["mobile/src/locales/", "shared/fixtures.ts"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts") ? [path] : [];
  });
}

/** Every user-visible text piece in a source file: string literals, template parts and JSX text (never comments). */
export function textPieces(source: string, fileName = "file.tsx"): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const pieces: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)
      || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isJsxText(node)) pieces.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return pieces;
}

const hits = (pieces: string[]) => pieces.filter((piece) => names.some((name) => new RegExp(`\\b${name}\\b`).test(piece)));

describe("no hardcoded names", () => {
  it("has the demo names in one place", () => {
    expect(names.length).toBeGreaterThanOrEqual(3);
    expect(names.every((name) => typeof name === "string" && name.length > 0)).toBe(true);
  });

  it("catches a name in a string or JSX text, but not in a comment", () => {
    const [name] = names;
    expect(hits(textPieces(`const a = "${name}";`))).toHaveLength(1);
    expect(hits(textPieces("const b = `walks with " + name + "`;"))).toHaveLength(1);
    expect(hits(textPieces(`const c = <p>Hello ${name}</p>;`))).toHaveLength(1);
    expect(hits(textPieces(`// ${name}\n/* ${name} */\nconst d = DEMO_NAMES.dog;`))).toHaveLength(0);
  });

  it("keeps en.json strings on placeholders: only demoNames holds a name", () => {
    const strings = (value: unknown, path: string): Array<[string, string]> => typeof value === "string" ? [[path, value]]
      : value && typeof value === "object" ? Object.entries(value).flatMap(([key, child]) => strings(child, path ? `${path}.${key}` : key)) : [];
    const { demoNames: _demoNames, ...rest } = en;
    expect(strings(rest, "").filter(([, text]) => hits([text]).length > 0).map(([path]) => path)).toEqual([]);
  });

  it("finds none under mobile/src, shared or api (outside locales, tests and fixtures)", () => {
    const found = ["mobile/src", "shared", "api"]
      .flatMap((dir) => files(join(root, dir)))
      .map((path) => relative(root, path))
      .filter((path) => !EXCLUDED.some((excluded) => path.startsWith(excluded)))
      .flatMap((path) => hits(textPieces(readFileSync(join(root, path), "utf8"), path)).map((piece) => `${path}: ${JSON.stringify(piece)}`));
    expect(found).toEqual([]);
  });
});
