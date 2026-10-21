# Feature spec: npm registry search client

- Target: `npm-search.redacted.har`
- REA 6.7.0, operation `inspect_web_network_capture`, evidence `ev_b2d45eca29cd317f1a1bde09445b88ad4fc84f71da33f4cc6061cb90ec19c152`
- Record sha256: `d213497b10214dc2cd035349ecff1790a55956d9f16c09f735f7496a8707929d`

## Call chain (from REA semantic graph)
_none found; refine --keywords_

## Evidence hits
| kind | label | location |
|---|---|---|
| headers | /-/v1/search?text=markdown%20editor&size=5 | `npm-search.redacted.har:2-2` |
| headers | /-/v1/search?text=markdown%20editor&size=5&from=5 | `npm-search.redacted.har:2-2` |
| headers | /-/v1/search?text=keywords:electron%20author:sindresorhus&size=3 | `npm-search.redacted.har:2-2` |
| headers | /-/v1/search?text=react&size=2&quality=0.1&popularity=0.8&maintenance=0.1 | `npm-search.redacted.har:2-2` |

## Behaviour (from REA evidence)
- REA retained 4 GET records to `https://registry.npmjs.org/-/v1/search` with JSON responses.
- Parameter order: `text`, `size`, `from`, `quality`, `popularity`, `maintenance`. `text` is percent-encoded but keeps `:` literal.
- Qualifiers are written `key:value` inside `text` (e.g. `keywords:electron author:sindresorhus`).
- Response: `{objects[], total, time}`, where each object has `package`, `score{final,detail}`, `searchScore`, `downloads`, `dependents`, `updated`, `flags`.
- Paging: `from` offsets; pages 1 and 2 of the capture are disjoint.

## Unknowns
- The server's ranking and current treatment of the quality/popularity/maintenance weights are opaque.
- E-mail addresses were redacted from the capture before analysis.
