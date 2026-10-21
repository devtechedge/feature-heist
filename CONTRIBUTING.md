# Contributing

Thanks for helping. A new feature is welcome when it comes with **evidence, a rebuild and proof**.

## Setup
```bash
# Node >= 22.19 (REA's requirement) and pnpm 9
pnpm install
npm install --global rea-agents   # the runner wraps the rea CLI
pnpm build && pnpm test           # unit + differential tests
pnpm e2e                          # Playwright against the static site (needs a Chromium; CHROME_PATH works)
```

## Adding a feature
1. **Pick a lawful target**: open source, a public API, a public chain, or your own software. Record its license in `THIRD_PARTY_NOTICES.md`.
2. **Capture evidence**: `pnpm heist <target> "<feature>" --keywords a,b [--rea-args "..."]`. This writes `evidence/<slug>/`. Commit `manifest.json`, `slice.json`, `record.json.gz` and `SPEC.md`.
3. **Complete `SPEC.md`**: behaviour, edge cases, quirks and unknowns, citing evidence locations.
4. **Scaffold** with `pnpm heist rebuild <slug> --name <name> --title "…"`, then **rebuild** in `packages/rebuilds/<name>`: a pure TypeScript package with no dependency on REA or the target at runtime.
5. **Prove it** with three tests:
   - `evidence.test.ts`: loads the evidence through `@heist/evidence` (hash-verified) and ties the fixture to the analysed artifact.
   - A differential or golden test against an **oracle**: the original code in a sandbox, the original bytecode in a VM, golden outputs from the original library, or a recorded replay.
   - Readable example tests, including any quirks you intentionally preserve.
6. **Show it**: add an entry to `apps/site/lib/features.ts` and a demo in `apps/site/components/Demo.tsx`, and write `docs/features/<name>.md`.

## Conventions
- Conventional Commits (`feat(runner): …`, `test(rebuilds): …`, `docs: …`), one logical step per commit.
- Seed every randomised test with a fixed seed.
- Tests must never hit the network; use fixtures and replay.
