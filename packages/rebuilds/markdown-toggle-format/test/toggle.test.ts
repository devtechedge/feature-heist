import { describe, it, expect } from "vitest";
import { toggleFormat, toggleInline, type EditorState, type FormatType } from "../src/index.js";
import { runOriginal } from "./original-harness.js";

describe("rebuild: examples", () => {
  it("bolds a word", () => expect(toggleInline("say hi now", 4, 6, "bold")).toEqual({ text: "say **hi** now", from: 6, to: 8 }));
  it("un-bolds when already wrapped", () => expect(toggleInline("say **hi** now", 6, 8, "bold")).toEqual({ text: "say hi now", from: 4, to: 6 }));
  it("recognises __ as bold", () => expect(toggleInline("__x__", 2, 3, "bold").text).toBe("x"));
  it("nests italic inside bold", () => expect(toggleInline("**x**", 2, 3, "italic").text).toBe("***x***"));
  it("strikethrough", () => expect(toggleInline("a b", 2, 3, "strikethrough").text).toBe("a ~~b~~"));
  it("empty selection inserts a pair with caret inside", () => expect(toggleInline("ab", 1, 1, "italic")).toEqual({ text: "a**b", from: 2, to: 2 }));
  it("QUIRK (pinned): the original re-tests the unchanged selection text, over-peeling short selections", () => {
    // Original Markdownify keeps peeling "**" while the column width allows (e.g. "**hi**" -> "**h****i**", "**hello**" -> "**he**l**lo**"). The rebuild reproduces it on purpose.
    const s = { lines: ["**hi**"], selection: { start: { line: 0, ch: 0 }, end: { line: 0, ch: 6 } } };
    expect(toggleFormat(s, "bold")).toEqual(runOriginal(s, "bold"));
    expect(toggleFormat(s, "bold").lines[0]).toBe("**h****i**");
  });
});

// Deterministic PRNG so failures reproduce.
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32); }
const ALPH = ["a", "b", " ", "*", "**", "_", "__", "~~", "`"];
const TYPES: FormatType[] = ["bold", "italic", "strikethrough"];

function randomState(r: () => number): EditorState {
  const nLines = r() < 0.8 ? 1 : 2 + Math.floor(r() * 2);
  const lines = Array.from({ length: nLines }, () => Array.from({ length: Math.floor(r() * 8) }, () => ALPH[Math.floor(r() * ALPH.length)]).join(""));
  const p = () => { const line = Math.floor(r() * nLines); return { line, ch: Math.floor(r() * (lines[line].length + 1)) }; };
  let a = p(), b = p();
  if (a.line > b.line || (a.line === b.line && a.ch > b.ch)) [a, b] = [b, a];
  return { lines, selection: { start: a, end: b } };
}

describe("differential parity with the original Markdownify code", () => {
  it("matches the original on 5,000 random documents/selections", () => {
    const r = rng(42);
    let multi = 0;
    for (let i = 0; i < 5000; i++) {
      const s = randomState(r); const t = TYPES[i % 3];
      if (s.lines.length > 1) multi++;
      const want = runOriginal(s, t);
      const got = toggleFormat(s, t);
      expect({ case: i, ...got }).toEqual({ case: i, ...want });
    }
    expect(multi).toBeGreaterThan(500);
  }, 60_000);
  it("round-trips: toggling twice restores simple wrapped text", () => {
    for (const t of TYPES) {
      const once = toggleInline("one two", 4, 7, t);
      expect(toggleInline(once.text, once.from, once.to, t).text).toBe("one two");
    }
  });
});
