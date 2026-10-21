import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { heist } from "../src/index.js";
import { load } from "@heist/evidence";

const reaOk = spawnSync("rea", ["--version"]).status === 0;
const app = fileURLToPath(new URL("./fixtures/mini-electron", import.meta.url));

describe.runIf(reaOk)("end-to-end against the real rea CLI", () => {
  it("captures, stores, slices and writes a SPEC for a tiny Electron app", async () => {
    const out = mkdtempSync(join(tmpdir(), "heist-it-"));
    const { dir, slice } = await heist({ target: app, feature: "shout ipc", keywords: ["shout"], outDir: out });
    const { manifest, record } = load(dir);
    expect(record.operation).toBe("analyze_javascript_application");
    expect(manifest.evidence_id).toBe(record.evidence_id);
    expect(slice.hits.some((h) => h.label === "shout" && h.kind === "function")).toBe(true);
    expect((record.normalized_result as any).summary.ipc.main_handlers).toBe(1);
  }, 120_000);
});
