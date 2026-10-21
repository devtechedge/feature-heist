# npm registry search client (web, HAR)

**Target:** the public `registry.npmjs.org/-/v1/search` endpoint, recorded in real Chrome by `scripts/capture-har.mjs`. E-mail addresses were removed by `scripts/redact-har.mjs` before analysis.

## 1. Inspect
```bash
node scripts/capture-har.mjs npm-search.har
node scripts/redact-har.mjs npm-search.har npm-search.redacted.har
heist npm-search.redacted.har "npm registry search client" --keywords "/-/v1/search"
```
REA's `inspect-web-network-capture` (har-schema + lossless-json adapter) kept all 4 records losslessly, with no network refetch.

## 2. Rebuild
`packages/rebuilds/npm-search-client` provides:
- `buildSearchUrl` and `parseSearchUrl`: parameter order and encoding match the recorded requests.
- `parseText`: handles qualifiers such as `keywords:` and `author:`.
- `parseSearchResponse`: normalised hits and paging.
- `search` and `searchAll`: take an injectable `fetch`.

## 3. Proof
- Each recorded URL round-trips byte-for-byte.
- Recorded responses normalise; pages 1 and 2 are disjoint.
- `search`/`searchAll` run against a HAR replay that refuses unrecorded URLs, so tests never touch the network.
- Writing the tests caught a real off-by-one: `searchAll` fetched one extra page.
