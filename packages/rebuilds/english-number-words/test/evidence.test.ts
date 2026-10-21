import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { load } from "@heist/evidence";
import { toWords, toOrdinalWords, toTuple } from "../src/index.js";

const dir = fileURLToPath(new URL("../../../../evidence/humanizer-dll-english-number-to-words", import.meta.url));
describe.runIf(existsSync(dir))("REA evidence backing this rebuild", () => {
  const { record } = load(dir);
  const nr = record.normalized_result as any;
  it("came from REA's managed member inspection of the exact DLL", () => {
    expect(record.operation).toBe("inspect_managed_members");
    const sha = createHash("sha256").update(readFileSync(new URL("../fixtures/Humanizer.dll", import.meta.url))).digest("hex");
    expect(nr.artifact.sha256).toBe(sha);
  });
  it("the rebuild covers the public surface REA listed", () => {
    const names = nr.methods.map((m: any) => m.name);
    expect(names).toEqual(expect.arrayContaining(["Convert", "ConvertToOrdinal", "ConvertToTuple", "RemoveOnePrefix", "GetUnitValue"]));
  });
  it("every word the rebuild can emit is an ldstr literal REA recovered (or built from one)", () => {
    const lits = new Set<string>(nr.user_strings.literals.map((l: any) => l.value));
    const vocab = new Set<string>();
    for (let n = 0; n < 1200; n++) for (const s of [toWords(n), toOrdinalWords(n), toTuple(n)]) for (const w of s.split(/[ -]/)) vocab.add(w);
    const scale = ["quintillion", "quadrillion", "trillion", "billion", "million", "thousand", "hundred"];
    const derived = (w: string) => lits.has(w) || scale.some((s) => lits.has(`{0} ${s}`) && (w === s || w === s + "th"))
      || (w.endsWith("th") && lits.has(w.slice(0, -2))) || (w.endsWith("ieth") && lits.has(w.slice(0, -4) + "y"))
      || /^\d+$/.test(w) || w === "tuple" || w === "minus";
    expect([...vocab].filter((w) => !derived(w))).toEqual([]);
  });
});
