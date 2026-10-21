/**
 * npm registry search client, rebuilt from a recorded HAR inspected with REA
 * (`rea inspect-web-network-capture <har> har`). The request grammar (path, parameters,
 * qualifier syntax, paging) and the response shape are taken from the captured traffic.
 */
export const REGISTRY = "https://registry.npmjs.org";
export const SEARCH_PATH = "/-/v1/search";

/** Qualifiers observed in the capture, plus the documented siblings. */
export const QUALIFIERS = ["author", "maintainer", "scope", "keywords", "not", "is", "boost-exact"] as const;
export type Qualifier = (typeof QUALIFIERS)[number];

export interface SearchQuery {
  text?: string;
  qualifiers?: Partial<Record<Qualifier, string>>;
  size?: number;
  from?: number;
  quality?: number;
  popularity?: number;
  maintenance?: number;
}

/** Split "keywords:electron author:x free text" into qualifiers + free text. */
export function parseText(raw: string): { text: string; qualifiers: Partial<Record<Qualifier, string>> } {
  const qualifiers: Partial<Record<Qualifier, string>> = {};
  const free: string[] = [];
  for (const tok of raw.trim().split(/\s+/).filter(Boolean)) {
    const m = /^([a-z-]+):(.+)$/.exec(tok);
    if (m && (QUALIFIERS as readonly string[]).includes(m[1])) qualifiers[m[1] as Qualifier] = m[2];
    else free.push(tok);
  }
  return { text: free.join(" "), qualifiers };
}

export function formatText(q: SearchQuery): string {
  const quals = Object.entries(q.qualifiers ?? {}).map(([k, v]) => `${k}:${v}`);
  return [...quals, ...(q.text ? [q.text] : [])].join(" ");
}

const enc = (s: string) => encodeURIComponent(s).replace(/%3A/gi, ":"); // registry URLs keep ':' literal

export function validate(q: SearchQuery): void {
  if (q.size !== undefined && (!Number.isInteger(q.size) || q.size < 1 || q.size > 250)) throw new RangeError("size must be an integer 1..250");
  if (q.from !== undefined && (!Number.isInteger(q.from) || q.from < 0)) throw new RangeError("from must be a non-negative integer");
  for (const k of ["quality", "popularity", "maintenance"] as const) {
    const v = q[k];
    if (v !== undefined && !(v >= 0 && v <= 1)) throw new RangeError(`${k} must be within 0..1`);
  }
  if (!formatText(q)) throw new RangeError("text or a qualifier is required");
}

/** Build the request URL with parameters in the order the web client sends them. */
export function buildSearchUrl(q: SearchQuery, base = REGISTRY): string {
  validate(q);
  const parts = [`text=${enc(formatText(q))}`];
  for (const k of ["size", "from", "quality", "popularity", "maintenance"] as const) {
    if (q[k] !== undefined) parts.push(`${k}=${q[k]}`);
  }
  return `${base}${SEARCH_PATH}?${parts.join("&")}`;
}

/** Inverse of buildSearchUrl. */
export function parseSearchUrl(url: string): SearchQuery {
  const u = new URL(url);
  if (u.pathname !== SEARCH_PATH) throw new Error(`not a search URL: ${u.pathname}`);
  const { text, qualifiers } = parseText(u.searchParams.get("text") ?? "");
  const q: SearchQuery = {};
  if (Object.keys(qualifiers).length) q.qualifiers = qualifiers;
  if (text) q.text = text;
  for (const k of ["size", "from", "quality", "popularity", "maintenance"] as const) {
    const v = u.searchParams.get(k);
    if (v !== null) q[k] = Number(v);
  }
  return q;
}

export interface SearchHit {
  name: string;
  version: string;
  description: string | null;
  keywords: string[];
  license: string | null;
  date: string | null;
  links: Record<string, string>;
  score: number;
  detail: { quality: number; popularity: number; maintenance: number };
  downloads: { weekly: number; monthly: number } | null;
}
export interface SearchPage { total: number; time: string; hits: SearchHit[]; from: number; nextFrom: number | null }

/** Normalise a raw registry response into a stable shape. Throws on malformed input. */
export function parseSearchResponse(body: unknown, from = 0): SearchPage {
  const b = body as any;
  if (!b || !Array.isArray(b.objects) || typeof b.total !== "number") throw new TypeError("not an npm search response");
  const hits: SearchHit[] = b.objects.map((o: any) => {
    const p = o.package ?? {};
    if (typeof p.name !== "string" || typeof p.version !== "string") throw new TypeError("package.name/version missing");
    return {
      name: p.name, version: p.version, description: p.description ?? null,
      keywords: Array.isArray(p.keywords) ? p.keywords : [], license: p.license ?? null, date: p.date ?? null,
      links: p.links ?? {}, score: Number(o.score?.final ?? o.searchScore ?? 0),
      detail: { quality: Number(o.score?.detail?.quality ?? 0), popularity: Number(o.score?.detail?.popularity ?? 0), maintenance: Number(o.score?.detail?.maintenance ?? 0) },
      downloads: o.downloads ? { weekly: Number(o.downloads.weekly), monthly: Number(o.downloads.monthly) } : null,
    };
  });
  const next = from + hits.length;
  return { total: b.total, time: String(b.time ?? ""), hits, from, nextFrom: hits.length > 0 && next < b.total ? next : null };
}

export type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export async function search(q: SearchQuery, fetchImpl: FetchLike = (u) => fetch(u)): Promise<SearchPage> {
  const url = buildSearchUrl(q);
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`npm search failed: HTTP ${res.status}`);
  return parseSearchResponse(await res.json(), q.from ?? 0);
}

/** Iterate pages until `limit` hits or the end. */
export async function* searchAll(q: SearchQuery, limit: number, fetchImpl?: FetchLike): AsyncGenerator<SearchHit> {
  let from = q.from ?? 0, seen = 0;
  for (;;) {
    const page = await search({ ...q, from: from || undefined }, fetchImpl);
    for (const h of page.hits) { if (seen >= limit) return; seen++; yield h; }
    if (seen >= limit || page.nextFrom === null) return;
    from = page.nextFrom;
  }
}
