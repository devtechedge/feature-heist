import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { load } from "@heist/evidence";

const ev = (slug: string) => fileURLToPath(new URL(`../../../../evidence/${slug}`, import.meta.url));
const sha = createHash("sha256").update(readFileSync(new URL("../target/pancrc", import.meta.url))).digest("hex");

for (const [slug, fn] of [["pancrc-fh-pan-native", "fh_pan"], ["pancrc-fh-crc16-native", "fh_crc16"]] as const) {
  describe.runIf(existsSync(ev(slug)))(`REA Ghidra evidence for ${fn}`, () => {
    const { record, slice } = load(ev(slug));
    it("is a Ghidra function dossier of the committed binary", () => {
      expect(record.operation).toBe("analyze_function");
      expect(record.provider.id).toBe("ghidra");
      expect(record.subject.digest.sha256).toBe(sha);
    });
    it("names the procedure, its caller and the constants the rebuild relies on", () => {
      expect(slice.native?.procedure).toBe(fn);
      expect(slice.native?.callers).toEqual(["main"]);
      const consts = fn === "fh_pan" ? ["0x7f", "0xf", "+ 7U"] : ["0x1021", "0xffffffff", "<< 8"];
      for (const c of consts) expect(slice.native?.pseudocode).toContain(c);
    });
  });
}
