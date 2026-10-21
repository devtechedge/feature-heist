import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { load } from "@heist/evidence";
import { buildSearchUrl, parseSearchUrl } from "../src/index.js";

const dir = fileURLToPath(new URL("../../../../evidence/npm-search-redacted-har-npm-registry-search-client", import.meta.url));
describe.runIf(existsSync(dir))("REA evidence backing this rebuild", () => {
  const { record, slice } = load(dir);
  it("came from REA's HAR inspection", () => expect(record.operation).toBe("inspect_web_network_capture"));
  it("every request REA retained is reproduced by the client", () => {
    const recs = (record.normalized_result as any).records as any[];
    expect(recs.length).toBe(4);
    for (const r of recs) expect(buildSearchUrl(parseSearchUrl(r.reported.request.url))).toBe(r.reported.request.url);
    expect(slice.hits.map((h) => h.label)).toEqual(recs.map((r) => new URL(r.reported.request.url).pathname + new URL(r.reported.request.url).search));
  });
  it("the fixture is the capture REA analysed", () => {
    const sha = createHash("sha256").update(readFileSync(new URL("../fixtures/npm-search.redacted.har", import.meta.url))).digest("hex");
    expect(sha).toBe(record.subject.digest.sha256);
  });
});
