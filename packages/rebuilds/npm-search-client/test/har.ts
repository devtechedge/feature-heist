import { readFileSync } from "node:fs";
import type { FetchLike } from "../src/index.js";
export const HAR = JSON.parse(readFileSync(new URL("../fixtures/npm-search.redacted.har", import.meta.url), "utf8"));
export const entries: { url: string; status: number; body: unknown }[] = HAR.log.entries.map((e: any) => ({
  url: e.request.url, status: e.response.status, body: JSON.parse(e.response.content.text),
}));
/** Replays recorded responses; unknown URLs fail loudly so tests never hit the network. */
export const replay: FetchLike = async (url) => {
  const e = entries.find((x) => x.url === url);
  if (!e) throw new Error(`no recorded response for ${url}`);
  return { ok: e.status < 400, status: e.status, json: async () => e.body };
};
