# Evidence storage schema

Each feature lives in `evidence/<slug>/`:

| File | Content |
|---|---|
| `record.json.gz` | The REA Evidence record exactly as `rea … --json` printed it, gzip level 9. |
| `manifest.json` | `feature-heist/manifest@1`: slug, feature, target, REA version, `evidence_id`, `record_sha256` (of the uncompressed JSON), `record_bytes`. |
| `slice.json` | `feature-heist/slice@1`: the feature-scoped extract shown on the site and checked by tests. |
| `SPEC.md` | Generated scaffold, completed by hand: behaviour, quirks and unknowns. |

## REA Evidence record (fields we rely on)

```ts
interface ReaEvidenceRecord {
  evidence_id: string;                   // "ev_<sha256>"
  subject: { name: string; digest: { sha256: string }; local_path?: string };
  provider: { id: string; name: string; version: string | null };
  operation: string;                     // analyze_javascript_application, inspect_evm_interface, …
  normalized_result: object;             // command-specific
  raw_result?: object | null;            // e.g. evmole output for EVM
  limitations?: unknown[];
}
```

`validateRecord()` checks `evidence_id` starts with `ev_`, the subject digest is 64 hex characters, and `provider.id`, `operation` and `normalized_result` are present.

## Slice (`feature-heist/slice@1`)

```ts
interface FeatureSlice {
  schema: "feature-heist/slice@1";
  feature: string; keywords: string[];
  evidence_id: string; record_sha256: string;
  subject; provider; operation; summary; statistics;
  hits: { kind; label; module_path; start_line; end_line; role_key }[];
  call_chain: string[];   // JS only: caller modules, then defining modules
  limitations: unknown[];
}
```

- **JavaScript/Electron**: hits are `normalized_result.semantic_graph.nodes` whose label or `role_key` contains a keyword. `call_chain` lists modules that only reference a matched function, then the modules that define one.
- **Everything else**: `genericHits()` walks `raw_result` (falling back to `normalized_result`) and keeps each object inside an array whose JSON mentions a keyword, or every such object for the keyword `*`. Labels prefer `selector`, `url`, `value`, `name`.

## Integrity

`load(dir)` decompresses the record, recomputes its SHA-256, compares it with the manifest and re-validates it. Every rebuild has an `evidence.test.ts` that loads its evidence this way and checks the vendored fixture is byte-identical to the artifact REA analysed.
