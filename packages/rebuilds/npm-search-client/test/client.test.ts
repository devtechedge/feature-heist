import { describe, it, expect } from "vitest";
import { buildSearchUrl, parseSearchUrl, parseSearchResponse, parseText, search, searchAll, validate } from "../src/index.js";
import { entries, replay } from "./har.js";

describe("request grammar reproduced from the HAR", () => {
  it.each(entries.map((e) => e.url))("round-trips %s byte-for-byte", (url) => {
    expect(buildSearchUrl(parseSearchUrl(url))).toBe(url);
  });
  it("parses qualifiers", () => {
    expect(parseText("keywords:electron author:sindresorhus")).toEqual({ text: "", qualifiers: { keywords: "electron", author: "sindresorhus" } });
    expect(parseText("foo:bar baz")).toEqual({ text: "foo:bar baz", qualifiers: {} });
  });
  it("validates inputs", () => {
    expect(() => validate({ text: "x", size: 0 })).toThrow(RangeError);
    expect(() => validate({ text: "x", quality: 2 })).toThrow(/quality/);
    expect(() => validate({})).toThrow(/required/);
  });
});

describe("response normalisation against recorded bodies", () => {
  it.each(entries.map((e, i) => [i, e] as const))("entry %i normalises", (_i, e) => {
    const q = parseSearchUrl(e.url);
    const page = parseSearchResponse(e.body, q.from ?? 0);
    expect(page.hits.length).toBeLessThanOrEqual(q.size ?? 20);
    expect(page.total).toBeGreaterThan(0);
    for (const h of page.hits) {
      expect(h.name).toMatch(/^(@[^/]+\/)?[a-z0-9._-]+$/i);
      expect(h.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(h.score).toBeGreaterThan(0);
    }
  });
  it("rejects malformed bodies", () => expect(() => parseSearchResponse({ nope: 1 })).toThrow(TypeError));
  it("recorded pages 1 and 2 are disjoint (from= paging works as modelled)", () => {
    const [p1, p2] = [0, 1].map((i) => parseSearchResponse(entries[i].body, i * 5));
    expect(p1.nextFrom).toBe(5);
    expect(p1.hits.map((h) => h.name).filter((n) => p2.hits.some((x) => x.name === n))).toEqual([]);
  });
});

describe("client over HAR replay (no network)", () => {
  it("search() hits the exact recorded URL", async () => {
    const page = await search({ qualifiers: { keywords: "electron", author: "sindresorhus" }, size: 3 }, replay);
    expect(page.hits.length).toBeGreaterThan(0);
  });
  it("searchAll() pages through recorded results", async () => {
    const names: string[] = [];
    for await (const h of searchAll({ text: "markdown editor", size: 5 }, 10, replay)) names.push(h.name);
    expect(names).toHaveLength(10);
    expect(new Set(names).size).toBe(10);
  });
});
