#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { heist } from "./index.js";
import { scaffoldRebuild } from "./scaffold.js";

const argv = process.argv.slice(2);
const flag = (n: string) => { const i = argv.indexOf(n); if (i < 0) return undefined; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const usage = `heist <target> "<feature>" [--keywords a,b] [--out evidence] [--rea rea] [--rea-args "--type Ns.Type"] [--procedure sym --provider ghidra]
heist rebuild <evidence-slug> --name <kebab-name> [--title "Title"] [--root .] [--no-site]
heist doctor            run rea doctor + rea capabilities`;

if (argv[0] === "doctor") {
  for (const a of [["doctor"], ["capabilities", "--json"]]) spawnSync("rea", a, { stdio: "inherit" });
  process.exit(0);
}
if (argv[0] === "rebuild") {
  const name = flag("--name"); const title = flag("--title"); const root = flag("--root") ?? process.cwd();
  const noSite = argv.includes("--no-site");
  const slug = argv[1];
  if (!slug || !name) { console.error(usage); process.exit(2); }
  try {
    const r = scaffoldRebuild({ root, slug, name, title, noSite });
    console.log(JSON.stringify(r, null, 2));
    console.error("next: pnpm install, implement src/index.ts, add an oracle test, pnpm test");
    process.exit(0);
  } catch (e) { console.error(`heist: ${(e as Error).message}`); process.exit(1); }
}
const keywords = flag("--keywords")?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const reaArgs = flag("--rea-args")?.split(" ").filter(Boolean);
const procedure = flag("--procedure"); const provider = flag("--provider");
const outDir = flag("--out"); const rea = flag("--rea");
const [target, feature] = argv;
if (!target || !feature) { console.error(usage); process.exit(2); }
heist({ target, feature, keywords, outDir, rea, reaArgs, procedure, provider, log: (m) => console.error(m) })
  .then(({ manifest, slice, dir }) => {
    console.log(JSON.stringify({ dir, evidence_id: manifest.evidence_id, hits: slice.hits.length, call_chain: slice.call_chain }, null, 2));
  })
  .catch((e) => { console.error(`heist: ${e.message}`); process.exit(1); });
