import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { FEATURES, type FeatureMeta } from "./features";

const EVIDENCE = join(process.cwd(), "..", "..", "evidence");

export interface Hit { kind: string; label: string | null; module_path: string; start_line: number; end_line: number; role_key: string }
export interface FeatureData extends FeatureMeta {
  manifest: { evidence_id: string; record_sha256: string; record_bytes: number; rea_version: string; created_at: string } | null;
  slice: { native?: { procedure: string; address: string; pseudocode: string; callers: string[]; instructions: number } | null; operation: string; provider: { id: string; name: string; version: string | null }; hits: Hit[]; call_chain: string[]; limitations: unknown[] } | null;
  spec: string | null;
  relatedSlices: FeatureData["slice"][];
}

export function getFeatures(): FeatureData[] {
  return FEATURES.map((f) => {
    const dir = join(EVIDENCE, f.slug);
    const read = (n: string) => (existsSync(join(dir, n)) ? readFileSync(join(dir, n), "utf8") : null);
    const m = read("manifest.json"), s = read("slice.json");
    const relatedSlices = (f.related ?? []).map((r) => { const p = join(EVIDENCE, r, "slice.json"); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null; }).filter(Boolean);
    return { ...f, manifest: m ? JSON.parse(m) : null, slice: s ? JSON.parse(s) : null, spec: read("SPEC.md"), relatedSlices };
  });
}
export const getFeature = (slug: string) => getFeatures().find((f) => f.slug === slug) ?? null;
