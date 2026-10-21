import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { load, slugify, type FeatureSlice, type StoredManifest } from "@heist/evidence";

export interface ScaffoldOptions {
  /** Repository root (contains evidence/, packages/, apps/). */
  root: string;
  /** Evidence slug under evidence/. */
  slug: string;
  /** Package directory name under packages/rebuilds/ (kebab-case). */
  name: string;
  title?: string;
  /** Skip editing apps/site/lib/features.ts. */
  noSite?: boolean;
}

export interface ScaffoldResult { created: string[]; updated: string[] }

const OP_TYPE: Record<string, string> = {
  analyze_javascript_application: "JavaScript app",
  inspect_evm_interface: "EVM bytecode",
  inspect_web_network_capture: "Web traffic (HAR)",
  inspect_managed_members: ".NET assembly",
  analyze_function: "Native binary",
};

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Pull the hand-written Behaviour/Unknowns sections out of SPEC.md for the generated doc comment. */
export function specNotes(spec: string): string[] {
  const m = /## Behaviour[^\n]*\n([\s\S]*?)(?=\n## |$)/.exec(spec);
  return (m?.[1] ?? "").split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- ") && l.length > 3);
}

export function renderFiles(o: ScaffoldOptions, manifest: StoredManifest, slice: FeatureSlice, spec: string): Record<string, string> {
  const pkg = `packages/rebuilds/${o.name}`;
  const fn = camel(o.name);
  const notes = specNotes(spec);
  const depth = "../../../../";
  const files: Record<string, string> = {};
  files[`${pkg}/package.json`] = JSON.stringify({
    name: `@heist/rebuild-${o.name}`, version: "0.1.0", type: "module", main: "dist/index.js", types: "dist/index.d.ts",
    scripts: { build: "tsc -p .", test: "vitest run", typecheck: "tsc -p . --noEmit" },
    devDependencies: { "@heist/evidence": "workspace:*" },
  }, null, 2) + "\n";
  files[`${pkg}/tsconfig.json`] = JSON.stringify({ extends: "../../../tsconfig.base.json", include: ["src"], compilerOptions: { rootDir: "src", outDir: "dist" } }, null, 2) + "\n";
  files[`${pkg}/src/index.ts`] = `/**
 * ${o.title ?? manifest.feature}: rebuilt from REA evidence \`${manifest.evidence_id}\`
 * (operation \`${slice.operation}\`, provider ${slice.provider.name}).
 *
 * Behaviour from SPEC.md:
${(notes.length ? notes : ["- (complete SPEC.md, then re-run heist rebuild or edit this comment)"]).map((n) => ` * ${n}`).join("\n")}
 */
export function ${fn}(input: unknown): unknown {
  throw new Error("${fn}: not implemented yet. Implement from evidence/${o.slug}/SPEC.md");
}
`;
  files[`${pkg}/test/evidence.test.ts`] = `import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load } from "@heist/evidence";

const dir = fileURLToPath(new URL("${depth}evidence/${o.slug}", import.meta.url));

describe.runIf(existsSync(dir))("REA evidence backing this rebuild", () => {
  const { manifest, record, slice } = load(dir); // verifies the record's SHA-256
  it("is the evidence this package was scaffolded from", () => {
    expect(manifest.evidence_id).toBe(${JSON.stringify(manifest.evidence_id)});
    expect(record.operation).toBe(${JSON.stringify(slice.operation)});
  });
  it("still contains the hits the rebuild relies on", () => {
    expect(slice.hits.length).toBeGreaterThanOrEqual(${Math.min(slice.hits.length, 1)});
  });
  // TODO: assert the fixture you vendor is byte-identical to record.subject.digest.sha256
});
`;
  files[`${pkg}/test/${o.name}.test.ts`] = `import { describe, it, expect } from "vitest";
import { ${fn} } from "../src/index.js";

describe("${o.name}", () => {
  // Replace with examples from SPEC.md, then add a differential test against an oracle:
  // original code in a sandbox, original binary/bytecode in a VM, golden data, or recorded replay.
  it.todo("matches the original on known examples");
  it.todo("matches the oracle on seeded random inputs");
  it("is wired up", () => expect(typeof ${fn}).toBe("function"));
});
`;
  files[`docs/features/${o.name}.md`] = `# ${o.title ?? manifest.feature}

**Target:** \`${manifest.target}\`
**Evidence:** \`${manifest.evidence_id}\` (${slice.operation}, ${slice.provider.name})

## 1. Inspect
\`\`\`bash
heist ${manifest.target} "${manifest.feature}"
\`\`\`

## 2. What the evidence showed
${notes.join("\n") || "- "}

## 3. Rebuild
\`${pkg}\`

## 4. Proof
- 
`;
  return files;
}

export function siteEntry(o: ScaffoldOptions, manifest: StoredManifest, slice: FeatureSlice): string {
  const type = OP_TYPE[slice.operation] ?? slice.operation;
  return `  { slug: ${JSON.stringify(o.slug)}, title: ${JSON.stringify(o.title ?? manifest.feature)}, tagline: ${JSON.stringify(`Rebuilt from ${type} evidence`)},
    targetType: ${JSON.stringify(type)}, target: ${JSON.stringify(manifest.target)}, targetLicense: "TODO",
    targetUrl: "", reaCommand: ${JSON.stringify(`rea ${slice.operation.replace(/_/g, "-")}`)},
    rebuildPackage: "packages/rebuilds/${o.name}", oracle: "TODO", demo: "none" },
`;
}

/** Scaffold a rebuild package, tests, write-up and site entry from stored evidence. Never overwrites files. */
export function scaffoldRebuild(o: ScaffoldOptions): ScaffoldResult {
  if (!/^[a-z][a-z0-9-]*$/.test(o.name)) throw new Error(`--name must be kebab-case, got "${o.name}" (try "${slugify(o.name)}")`);
  const evDir = join(o.root, "evidence", o.slug);
  if (!existsSync(join(evDir, "manifest.json"))) throw new Error(`no evidence at ${relative(o.root, evDir)}; run heist <target> "<feature>" first`);
  const { manifest, slice } = load(evDir);
  const spec = existsSync(join(evDir, "SPEC.md")) ? readFileSync(join(evDir, "SPEC.md"), "utf8") : "";
  const files = renderFiles(o, manifest, slice, spec);
  const clash = Object.keys(files).filter((f) => existsSync(join(o.root, f)));
  if (clash.length) throw new Error(`refusing to overwrite: ${clash.join(", ")}`);
  const res: ScaffoldResult = { created: [], updated: [] };
  for (const [f, body] of Object.entries(files)) {
    mkdirSync(dirname(join(o.root, f)), { recursive: true });
    writeFileSync(join(o.root, f), body);
    res.created.push(f);
  }
  const site = join(o.root, "apps/site/lib/features.ts");
  if (!o.noSite && existsSync(site)) {
    const src = readFileSync(site, "utf8");
    if (!src.includes(JSON.stringify(o.slug))) {
      const at = src.lastIndexOf("];");
      if (at < 0) throw new Error("could not find the FEATURES array in apps/site/lib/features.ts");
      writeFileSync(site, src.slice(0, at) + siteEntry(o, manifest, slice) + src.slice(at));
      res.updated.push("apps/site/lib/features.ts");
    }
  }
  return res;
}
