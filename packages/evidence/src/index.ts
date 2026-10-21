import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { join } from "node:path";

/** Minimal shape of one REA Evidence record (as emitted by `rea <command> --json`). */
export interface ReaEvidenceRecord {
  evidence_id: string;
  subject: { name: string; digest: { sha256: string }; local_path?: string; format?: string };
  provider: { id: string; name: string; version: string | null };
  operation: string;
  predicate_type?: string;
  confidence?: string;
  authority?: string;
  limitations?: unknown[];
  normalized_result: Record<string, any>;
  [k: string]: unknown;
}

export interface SemanticHit {
  kind: string;
  label: string | null;
  module_path: string;
  start_line: number;
  end_line: number;
  role_key: string;
}

/** A feature-scoped, human-reviewable extract of a large Evidence record. */
export interface FeatureSlice {
  schema: "feature-heist/slice@1";
  feature: string;
  keywords: string[];
  evidence_id: string;
  record_sha256: string;
  subject: ReaEvidenceRecord["subject"];
  provider: ReaEvidenceRecord["provider"];
  operation: string;
  summary: unknown;
  statistics: unknown;
  hits: SemanticHit[];
  call_chain: string[];
  /** Native function dossiers: the provider's pseudocode and callers, kept verbatim for review. */
  native?: { procedure: string; address: string; pseudocode: string; callers: string[]; callees: string[]; instructions: number } | null;
  limitations: unknown[];
}

export interface StoredManifest {
  schema: "feature-heist/manifest@1";
  slug: string;
  feature: string;
  target: string;
  rea_version: string;
  created_at: string;
  evidence_id: string;
  record_sha256: string;
  record_bytes: number;
  files: { record_gz: string; slice: string };
}

export class EvidenceError extends Error {}

export function validateRecord(x: unknown): ReaEvidenceRecord {
  const r = x as ReaEvidenceRecord;
  const fail = (m: string) => { throw new EvidenceError(`invalid REA evidence: ${m}`); };
  if (!r || typeof r !== "object") fail("not an object");
  if (typeof r.evidence_id !== "string" || !r.evidence_id.startsWith("ev_")) fail("evidence_id");
  if (!r.subject || !/^[0-9a-f]{64}$/.test(r.subject?.digest?.sha256 ?? "")) fail("subject.digest.sha256");
  if (!r.provider || typeof r.provider.id !== "string") fail("provider.id");
  if (typeof r.operation !== "string") fail("operation");
  if (!r.normalized_result || typeof r.normalized_result !== "object") fail("normalized_result");
  return r;
}

export const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/** Pull semantic-graph nodes whose label or module path matches any keyword. */
export function sliceFeature(raw: string, feature: string, keywords: string[]): FeatureSlice {
  const r = validateRecord(JSON.parse(raw));
  const nr = r.normalized_result;
  const kws = keywords.map((k) => k.toLowerCase());
  const nodes: any[] = nr.semantic_graph?.nodes ?? [];
  const hits: SemanticHit[] = [];
  for (const n of nodes) {
    const label: string | null = n.label ?? null;
    const id = n.identity ?? {};
    const mp: string = id.module_path ?? "";
    const hay = `${label ?? ""} ${id.role_key ?? ""}`.toLowerCase();
    if (!kws.some((k) => hay.includes(k))) continue;
    hits.push({
      kind: n.kind, label, module_path: mp,
      start_line: id.source_range?.start?.line ?? 0,
      end_line: id.source_range?.end?.line ?? 0,
      role_key: id.role_key ?? "",
    });
  }
  if (!nr.semantic_graph) hits.push(...genericHits(r, kws));
  hits.sort((a, b) => a.module_path.localeCompare(b.module_path) || a.start_line - b.start_line);
  // Call chain: modules that reference a matched function, ordered caller -> definition.
  const defs = new Set(hits.filter((h) => h.kind === "function").map((h) => h.module_path));
  const callers = new Set(hits.filter((h) => h.kind === "expression" && !defs.has(h.module_path)).map((h) => h.module_path));
  return {
    schema: "feature-heist/slice@1", feature, keywords, evidence_id: r.evidence_id,
    record_sha256: sha256(raw), subject: r.subject, provider: r.provider, operation: r.operation,
    summary: nr.summary ?? null, statistics: nr.statistics ?? null, hits,
    call_chain: [...callers, ...defs], native: nativeDossier(r), limitations: r.limitations ?? [],
  };
}

export function store(dir: string, opts: { raw: string; slug: string; feature: string; target: string; reaVersion: string; keywords: string[] }): StoredManifest {
  const r = validateRecord(JSON.parse(opts.raw));
  mkdirSync(dir, { recursive: true });
  const gz = gzipSync(Buffer.from(opts.raw), { level: 9 });
  writeFileSync(join(dir, "record.json.gz"), gz);
  const slice = sliceFeature(opts.raw, opts.feature, opts.keywords);
  writeFileSync(join(dir, "slice.json"), JSON.stringify(slice, null, 2) + "\n");
  const m: StoredManifest = {
    schema: "feature-heist/manifest@1", slug: opts.slug, feature: opts.feature, target: opts.target,
    rea_version: opts.reaVersion, created_at: new Date().toISOString(), evidence_id: r.evidence_id,
    record_sha256: sha256(opts.raw), record_bytes: Buffer.byteLength(opts.raw),
    files: { record_gz: "record.json.gz", slice: "slice.json" },
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  return m;
}

/** Re-read a stored record and verify it against the manifest hash. */
export function load(dir: string): { manifest: StoredManifest; record: ReaEvidenceRecord; slice: FeatureSlice } {
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as StoredManifest;
  const raw = gunzipSync(readFileSync(join(dir, manifest.files.record_gz))).toString("utf8");
  if (sha256(raw) !== manifest.record_sha256) throw new EvidenceError("record hash mismatch");
  const slice = JSON.parse(readFileSync(join(dir, manifest.files.slice), "utf8")) as FeatureSlice;
  return { manifest, record: validateRecord(JSON.parse(raw)), slice };
}

export const hasEvidence = (dir: string) => existsSync(join(dir, "manifest.json"));

/**
 * For records without a JS semantic graph (EVM, HAR, .NET, ...): walk raw_result and
 * normalized_result and keep every object inside an array whose JSON mentions a keyword.
 * The keyword "*" keeps everything (capped).
 */
export function genericHits(r: ReaEvidenceRecord, kws: string[], cap = 500): SemanticHit[] {
  const out: SemanticHit[] = [];
  const all = kws.includes("*");
  const walk = (v: unknown, path: string) => {
    if (out.length >= cap) return;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const j = JSON.stringify(item);
          if (j.length < 4000 && (all || kws.some((k) => j.toLowerCase().includes(k)))) {
            const o = item as Record<string, unknown>;
            const label = (o.selector ?? o.url ?? o.value ?? o.name ?? o.label ?? null) as string | null;
            out.push({ kind: path.split(".").pop() ?? "item", label: label === null ? null : String(label),
              module_path: r.subject.name, start_line: i, end_line: i, role_key: `${path}[${i}]` });
            return;
          }
        }
        walk(item, `${path}[${i}]`);
      });
    } else if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    }
  };
  walk(r.raw_result, "raw_result");
  if (out.length === 0) walk(r.normalized_result, "normalized_result");
  return out;
}

/** Extract a compact dossier from `rea function … --provider ghidra|hopper|ida` records. */
export function nativeDossier(r: ReaEvidenceRecord): FeatureSlice["native"] {
  if (r.operation !== "analyze_function") return null;
  const v = (r.normalized_result as any) ?? {};
  const name = (x: any) => String(x?.name ?? x?.address ?? "?");
  return {
    procedure: name(v.procedure), address: String(v.procedure?.address ?? ""),
    pseudocode: String(v.pseudocode ?? "").trim(),
    callers: (v.callers ?? []).map(name), callees: (v.callees ?? []).map(name),
    instructions: Array.isArray(v.assembly) ? v.assembly.length : 0,
  };
}
