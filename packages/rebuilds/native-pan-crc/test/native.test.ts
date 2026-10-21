import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pan, crc16 } from "../src/index.js";

const BIN = fileURLToPath(new URL("../target/pancrc", import.meta.url));
const SRC = fileURLToPath(new URL("../target/pancrc.c", import.meta.url));
const runnable = process.platform === "linux" && process.arch === "x64" && existsSync(BIN);

/** Drive the compiled binary in batch mode: one request per line, one answer per line. */
function oracle(lines: string[]): string[] {
  const r = spawnSync(BIN, ["batch"], { input: lines.join("\n") + "\n", encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trimEnd().split("\n");
}
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32); }

describe("known values", () => {
  it("CRC-16/CCITT-FALSE check value", () => expect(crc16("123456789")).toBe(0x29b1));
  it("empty input returns the init value", () => expect(crc16("")).toBe(0xffff));
  it("pan edges and dead zone", () => {
    expect(pan(0, 640)).toBe(-127);
    expect(pan(640, 640)).toBe(127);
    expect(pan(320, 640)).toBe(0);
    expect(pan(340, 640)).toBe(8);
    expect(pan(10, 0)).toBe(0);
  });
});

describe.runIf(runnable)("differential parity with the compiled ELF", () => {
  beforeAll(() => expect(readFileSync(SRC, "utf8")).toContain("fh_pan"));
  it("pan matches on 20,000 cases including 32-bit overflow widths", () => {
    const r = rng(99), cases: [number, number][] = [];
    for (let i = 0; i < 20000; i++) {
      const big = r() < 0.2;
      const w = big ? Math.floor(r() * 2 ** 31) - 5 : Math.floor(r() * 4000) - 10;
      const x = big ? Math.floor(r() * 2 ** 32) - 2 ** 31 : Math.floor(r() * (Math.abs(w) + 40)) - 20;
      cases.push([x, w]);
    }
    const want = oracle(cases.map(([x, w]) => `pan ${x} ${w}`));
    const bad = cases.map(([x, w], i) => [x, w, pan(x, w), Number(want[i])]).filter(([, , g, e]) => g !== e);
    expect(bad.slice(0, 5)).toEqual([]);
  });
  it("crc16 matches on 5,000 random ASCII strings", () => {
    const r = rng(5), strs: string[] = [];
    for (let i = 0; i < 5000; i++) strs.push(Array.from({ length: 1 + Math.floor(r() * 64) }, () => String.fromCharCode(32 + Math.floor(r() * 95))).join(""));
    const want = oracle(strs.map((s) => `crc16 ${s}`));
    expect(strs.filter((s, i) => crc16(s) !== Number(want[i]))).toEqual([]);
  });
});
