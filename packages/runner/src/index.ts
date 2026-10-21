import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { store, slugify, type StoredManifest, type FeatureSlice } from "@heist/evidence";

export interface HeistOptions {
  target: string;
  feature: string;
  keywords?: string[];
  outDir?: string;
  rea?: string;
  log?: (m: string) => void;
}

/** Choose the REA command for a target. Directories / .asar are JS/Electron apps; others go through generic inspect. */
export function planCommand(target: string): string[] {
  const abs = resolve(target);
  const lower = abs.toLowerCase();
  if (lower.endsWith(".har")) return ["inspect-web-network-capture", abs, "har", "--format", "json"];
  if (lower.endsWith(".saz")) return ["inspect-web-network-capture", abs, "saz", "--format", "json"];
  if (lower.endsWith(".hex") || lower.endsWith(".evm")) return ["inspect-evm-interface", abs, "hex", "--format", "json"];
  if (lower.endsWith(".bin")) return ["inspect-evm-interface", abs, "raw", "--format", "json"];
  if (lower.endsWith(".dll") || lower.endsWith(".exe")) return ["inspect-managed-members", abs, "--format", "json"];
  if (abs.endsWith(".asar") || (existsSync(abs) && statSync(abs).isDirectory())) {
    return ["analyze-javascript-application", abs, "--json"];
  }
  throw new Error(`unsupported target (supported: JS/Electron dir or .asar, .har/.saz, .hex/.evm/.bin EVM bytecode, .dll/.exe managed assemblies): ${target}`);
}

/** Default search keywords: the feature's words plus any camelCase hints. */
export function deriveKeywords(feature: string): string[] {
  return [...new Set(feature.split(/[^A-Za-z0-9_]+/).filter((w) => w.length >= 3).map((w) => w.toLowerCase()))];
}

export function reaVersion(rea = "rea"): string {
  const r = spawnSync(rea, ["--version"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`rea not runnable (${rea}); install with: npm i -g rea-agents (Node >=22.19)`);
  return r.stdout.trim();
}

function runToFile(cmd: string, args: string[], file: string, log: (m: string) => void): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.pipe(createWriteStream(file));
    let err = "";
    p.stderr.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n")) {
        if (!line) continue;
        try { const j = JSON.parse(line); if (j.rea_progress) { log(`  rea: ${j.rea_progress.message}`); continue; } } catch {}
        err += line + "\n";
      }
    });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(`rea exited ${c}: ${err.slice(-2000)}`))));
  });
}

export function specTemplate(m: StoredManifest, s: FeatureSlice): string {
  const hits = s.hits.slice(0, 40).map((h: FeatureSlice["hits"][number]) => `| ${h.kind} | ${h.label ?? ""} | \`${h.module_path}:${h.start_line}-${h.end_line}\` |`).join("\n");
  return `# Feature spec: ${m.feature}

- Target: \`${m.target}\`
- REA ${m.rea_version}, operation \`${s.operation}\`, evidence \`${m.evidence_id}\`
- Record sha256: \`${m.record_sha256}\`

## Call chain (from REA semantic graph)
${s.call_chain.map((c: string, i: number) => `${i + 1}. \`${c}\``).join("\n") || "_none found; refine --keywords_"}

## Evidence hits
| kind | label | location |
|---|---|---|
${hits}

## Behaviour (fill in from evidence)
- Inputs:
- Outputs:
- Edge cases:

## Unknowns
- 
`;
}

export async function heist(o: HeistOptions): Promise<{ manifest: StoredManifest; slice: FeatureSlice; dir: string }> {
  const log = o.log ?? (() => {});
  const rea = o.rea ?? "rea";
  const version = reaVersion(rea);
  const args = planCommand(o.target);
  const slug = slugify(`${basename(resolve(o.target))}-${o.feature}`);
  const dir = resolve(o.outDir ?? "evidence", slug);
  const tmp = mkdtempSync(join(tmpdir(), "heist-"));
  const raw = join(tmp, "record.json");
  log(`rea ${version}: ${args.join(" ")}`);
  try {
    await runToFile(rea, args, raw, log);
    const manifest = store(dir, { raw: readFileSync(raw, "utf8"), slug, feature: o.feature, target: o.target,
      reaVersion: version, keywords: o.keywords?.length ? o.keywords : deriveKeywords(o.feature) });
    const slice = JSON.parse(readFileSync(join(dir, "slice.json"), "utf8")) as FeatureSlice;
    if (!existsSync(join(dir, "SPEC.md"))) writeFileSync(join(dir, "SPEC.md"), specTemplate(manifest, slice));
    return { manifest, slice, dir };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}
