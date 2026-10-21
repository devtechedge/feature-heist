import { describe, it, expect } from "vitest";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { store } from "@heist/evidence";
import { scaffoldRebuild, specNotes } from "../src/scaffold.js";

const rec = {
  evidence_id: "ev_test", subject: { name: "app", digest: { sha256: "b".repeat(64) } },
  provider: { id: "p", name: "Prov", version: "1" }, operation: "inspect_evm_interface",
  raw_result: { functions: [{ selector: "d0e30db0" }] }, normalized_result: {},
};
const SPEC = "# Feature spec\n\n## Behaviour (from REA evidence)\n- deposits credit the sender\n- fallback is payable\n\n## Unknowns\n- gas\n";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "heist-scaffold-"));
  store(join(root, "evidence", "tok"), { raw: JSON.stringify(rec), slug: "tok", feature: "token", target: "tok.hex", reaVersion: "6.7.0", keywords: ["*"] });
  writeFileSync(join(root, "evidence", "tok", "SPEC.md"), SPEC);
  mkdirSync(join(root, "apps/site/lib"), { recursive: true });
  writeFileSync(join(root, "apps/site/lib/features.ts"), "export const FEATURES = [\n  { slug: \"a\" },\n];\n");
  return root;
}

describe("heist rebuild scaffolding", () => {
  it("extracts behaviour bullets from SPEC.md", () => expect(specNotes(SPEC)).toEqual(["- deposits credit the sender", "- fallback is payable"]));

  it("creates package, tests, write-up and a site entry", () => {
    const root = repo();
    const r = scaffoldRebuild({ root, slug: "tok", name: "tok-ledger", title: "Token ledger" });
    expect(r.created).toEqual([
      "packages/rebuilds/tok-ledger/package.json", "packages/rebuilds/tok-ledger/tsconfig.json",
      "packages/rebuilds/tok-ledger/src/index.ts", "packages/rebuilds/tok-ledger/test/evidence.test.ts",
      "packages/rebuilds/tok-ledger/test/tok-ledger.test.ts", "docs/features/tok-ledger.md",
    ]);
    expect(r.updated).toEqual(["apps/site/lib/features.ts"]);
    const src = readFileSync(join(root, "packages/rebuilds/tok-ledger/src/index.ts"), "utf8");
    expect(src).toContain("export function tokLedger(");
    expect(src).toContain("- deposits credit the sender");
    expect(JSON.parse(readFileSync(join(root, "packages/rebuilds/tok-ledger/package.json"), "utf8")).name).toBe("@heist/rebuild-tok-ledger");
    expect(readFileSync(join(root, "packages/rebuilds/tok-ledger/test/evidence.test.ts"), "utf8")).toContain('"ev_test"');
    const site = readFileSync(join(root, "apps/site/lib/features.ts"), "utf8");
    expect(site).toMatch(/slug: "tok", title: "Token ledger"[\s\S]*targetType: "EVM bytecode"[\s\S]*\];\n$/);
  });

  it("is idempotent for the site entry and refuses to overwrite files", () => {
    const root = repo();
    scaffoldRebuild({ root, slug: "tok", name: "tok-ledger" });
    expect(() => scaffoldRebuild({ root, slug: "tok", name: "tok-ledger" })).toThrow(/refusing to overwrite/);
    const r = scaffoldRebuild({ root, slug: "tok", name: "tok-ledger-2" });
    expect(r.updated).toEqual([]);
  });

  it("validates inputs", () => {
    const root = repo();
    expect(() => scaffoldRebuild({ root, slug: "tok", name: "Bad Name" })).toThrow(/kebab-case/);
    expect(() => scaffoldRebuild({ root, slug: "missing", name: "x" })).toThrow(/no evidence/);
    expect(scaffoldRebuild({ root, slug: "tok", name: "nosite", noSite: true }).updated).toEqual([]);
  });

  it("generated tests type-check and pass with vitest", () => {
    const root = repo();
    scaffoldRebuild({ root, slug: "tok", name: "tok-ledger" });
    // Run the generated package's tests inside this monorepo's toolchain.
    const here = fileURLToPath(new URL("../../..", import.meta.url));
    const pkg = join(root, "packages/rebuilds/tok-ledger");
    mkdirSync(join(pkg, "node_modules/@heist"), { recursive: true });
    cpSync(join(here, "packages/evidence"), join(pkg, "node_modules/@heist/evidence"), { recursive: true, dereference: true, filter: (s) => !s.includes("node_modules") });
    writeFileSync(join(root, "tsconfig.base.json"), readFileSync(join(here, "tsconfig.base.json")));
    const tsc = spawnSync(join(here, "node_modules/.bin/tsc"), ["-p", "."], { cwd: pkg, encoding: "utf8" });
    expect(tsc.stdout + tsc.stderr).toBe("");
    const vt = spawnSync(join(here, "node_modules/.bin/vitest"), ["run", "--root", pkg], { cwd: pkg, encoding: "utf8" });
    expect(vt.status, vt.stdout + vt.stderr).toBe(0);
    expect(existsSync(join(pkg, "dist/index.js"))).toBe(true);
  }, 60_000);
});
