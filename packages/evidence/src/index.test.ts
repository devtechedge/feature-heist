import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateRecord, sliceFeature, store, load, slugify, EvidenceError } from "./index.js";

const rec = {
  evidence_id: "ev_abc", subject: { name: "app", digest: { sha256: "a".repeat(64) } },
  provider: { id: "p", name: "P", version: "1" }, operation: "analyze_javascript_application",
  normalized_result: { summary: { ipc: { operations: 1 } }, statistics: {}, semantic_graph: { nodes: [
    { kind: "function", label: "toggleFormat", identity: { module_path: "a/format.js", role_key: "callable", source_range: { start: { line: 8 }, end: { line: 21 } } } },
    { kind: "expression", label: null, identity: { module_path: "a/ipc.js", role_key: "reference:1:read:toggleFormat", source_range: { start: { line: 103 }, end: { line: 103 } } } },
    { kind: "function", label: "other", identity: { module_path: "a/x.js", role_key: "c" } },
  ] } },
};

describe("evidence", () => {
  it("validates", () => {
    expect(validateRecord(rec).evidence_id).toBe("ev_abc");
    expect(() => validateRecord({})).toThrow(EvidenceError);
  });
  it("slices by keyword and orders call chain caller -> definition", () => {
    const s = sliceFeature(JSON.stringify(rec), "bold", ["toggleformat"]);
    expect(s.hits).toHaveLength(2);
    expect(s.call_chain).toEqual(["a/ipc.js", "a/format.js"]);
  });
  it("round-trips with hash verification", () => {
    const d = mkdtempSync(join(tmpdir(), "ev-"));
    const m = store(d, { raw: JSON.stringify(rec), slug: "x", feature: "f", target: "t", reaVersion: "6.7.0", keywords: ["toggleformat"] });
    expect(load(d).manifest.record_sha256).toBe(m.record_sha256);
    writeFileSync(join(d, "manifest.json"), JSON.stringify({ ...m, record_sha256: "0" }));
    expect(() => load(d)).toThrow(/hash mismatch/);
  });
  it("falls back to generic array hits for non-JS records (EVM-style)", () => {
    const evm = { ...rec, operation: "inspect_evm_interface", raw_result: { functions: [{ selector: "d0e30db0", arguments: "" }, { selector: "2e1a7d4d", arguments: "uint256" }] }, normalized_result: {} };
    expect(sliceFeature(JSON.stringify(evm), "x", ["uint256"]).hits.map((h) => h.label)).toEqual(["2e1a7d4d"]);
    expect(sliceFeature(JSON.stringify(evm), "x", ["*"]).hits).toHaveLength(2);
  });
  it("keeps a native function dossier for analyze_function records", () => {
    const fn = { ...rec, operation: "analyze_function", raw_result: { value: {} }, normalized_result: {
      procedure: { name: "fh_pan", address: "0x1013c0" }, pseudocode: "\nint fh_pan(){}\n", assembly: ["a", "b"], callers: [{ name: "main" }], callees: [] } };
    expect(sliceFeature(JSON.stringify(fn), "pan", ["fh_pan"]).native).toEqual({ procedure: "fh_pan", address: "0x1013c0", pseudocode: "int fh_pan(){}", callers: ["main"], callees: [], instructions: 2 });
    expect(sliceFeature(JSON.stringify(rec), "x", ["toggleformat"]).native).toBeNull();
  });
  it("slugifies", () => expect(slugify("Bold / Italic toggle!")).toBe("bold-italic-toggle"));
});
