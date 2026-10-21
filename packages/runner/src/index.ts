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
  /** Extra arguments appended to the rea command, e.g. ["--type", "Ns.Type"]. */
  reaArgs?: string[];
  /** Native binaries: the procedure (symbol or 0xADDRESS) to dossier. */
  procedure?: string;
  /** Native provider, default ghidra. */
  provider?: string;
  log?: (m: string) => void;
}

/** Choose the REA command for a target. Directories / .asar are JS/Electron apps; others go through generic inspect. */
const MAGIC: [string, number[]][] = [["elf", [0x7f, 0x45, 0x4c, 0x46]], ["pe", [0x4d, 0x5a]], ["macho", [0xcf, 0xfa, 0xed, 0xfe]], ["macho", [0xca, 0xfe, 0xba, 0xbe]]];

/** Sniff native executable formats by magic bytes. */
export function nativeFormat(path: string): string | null {
  if (!existsSync(path) || statSync(path).isDirectory()) return null;
  const head = readFileSync(path).subarray(0, 4);
  const hit = MAGIC.find(([, m]) => m.every((b, i) => head[i] === b));
  return hit ? hit[0] : null;
}

export function planCommand(target: string, opts: { procedure?: string; provider?: string } = {}): string[] {
  const abs = resolve(target);
  const fmt = nativeFormat(abs);
  if (fmt && !/\.(dll|exe)$/i.test(abs)) {
    if (!opts.procedure) throw new Error(`native ${fmt} target needs --procedure <symbol|0xADDRESS>`);
    return ["function", abs, opts.procedure, "--provider", opts.provider ?? "ghidra", "--format", "json"];
  }
  if (fmt === "pe" && opts.procedure) return ["function", abs, opts.procedure, "--provider", opts.provider ?? "ghidra", "--format", "json"];
  const lower = abs.toLowerCase();
  if (lower.endsWith(".har")) return ["inspect-web-network-capture", abs, "har", "--format", "json"];
  if (lower.endsWith(".saz")) return ["inspect-web-network-capture", abs, "saz", "--format", "json"];
  if (lower.endsWith(".hex") || lower.endsWith(".evm")) return ["inspect-evm-interface", abs, "hex", "--format", "json"];
  if (lower.endsWith(".bin")) return ["inspect-evm-interface", abs, "raw", "--format", "json"];
  if (lower.endsWith(".dll") || lower.endsWith(".exe")) return ["inspect-managed-members", abs, "--format", "json"];
  if (abs.endsWith(".asar") || (existsSync(abs) && statSync(abs).isDirectory())) {
    return ["analyze-javascript-application", abs, "--json"];
  }
  throw new Error(`unsupported target (supported: JS/Electron dir or .asar, native ELF/PE/Mach-O with --procedure, .har/.saz, .hex/.evm/.bin EVM bytecode, .dll/.exe managed assemblies): ${target}`);
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
${s.native ? `\n## Native dossier: \`${s.native.procedure}\` @ ${s.native.address}\n\nCallers: ${s.native.callers.join(", ") || "none"} · ${s.native.instructions} instructions\n\n\`\`\`c\n${s.native.pseudocode}\n\`\`\`\n` : ""}
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
  const args = [...planCommand(o.target, { procedure: o.procedure, provider: o.provider }), ...(o.reaArgs ?? [])];
  const slug = slugify(`${basename(resolve(o.target))}-${o.procedure ? o.procedure + "-" : ""}${o.feature}`);
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
