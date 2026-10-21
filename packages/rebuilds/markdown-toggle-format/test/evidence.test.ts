import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { load } from "@heist/evidence";

const dir = fileURLToPath(new URL("../../../../evidence/electron-markdownify-bold-italic-strikethrough-toggle", import.meta.url));
const fixture = readFileSync(new URL("../fixtures/original/format.js", import.meta.url));

describe.runIf(existsSync(dir))("REA evidence backing this rebuild", () => {
  const { manifest, record, slice } = load(dir);
  it("came from REA's JavaScript application analysis", () => {
    expect(record.operation).toBe("analyze_javascript_application");
    expect(manifest.rea_version).toMatch(/^\d+\.\d+\.\d+/);
  });
  it("traces the IPC shortcut handler to the format implementation", () => {
    expect(slice.call_chain).toEqual(["app/scripts/ipc_renderer.js", "app/scripts/format.js"]);
    const fns = slice.hits.filter((h) => h.kind === "function").map((h) => h.label);
    expect(fns).toEqual(expect.arrayContaining(["toggleFormat", "_toggleFormat"]));
  });
  it("the vendored original is byte-identical to the file REA analysed", () => {
    const sha = createHash("sha256").update(fixture).digest("hex");
    const hit = (record.normalized_result.semantic_graph.nodes as any[]).find((n) => n.identity?.module_path === "app/scripts/format.js");
    expect(hit.identity.artifact_sha256).toBe(sha);
  });
});
