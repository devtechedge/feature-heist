#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { heist } from "./index.js";

const argv = process.argv.slice(2);
const flag = (n: string) => { const i = argv.indexOf(n); if (i < 0) return undefined; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const usage = `heist <target> "<feature>" [--keywords a,b] [--out evidence] [--rea rea]
heist doctor            run rea doctor + rea capabilities`;

if (argv[0] === "doctor") {
  for (const a of [["doctor"], ["capabilities", "--json"]]) spawnSync("rea", a, { stdio: "inherit" });
  process.exit(0);
}
const keywords = flag("--keywords")?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const outDir = flag("--out"); const rea = flag("--rea");
const [target, feature] = argv;
if (!target || !feature) { console.error(usage); process.exit(2); }
heist({ target, feature, keywords, outDir, rea, log: (m) => console.error(m) })
  .then(({ manifest, slice, dir }) => {
    console.log(JSON.stringify({ dir, evidence_id: manifest.evidence_id, hits: slice.hits.length, call_chain: slice.call_chain }, null, 2));
  })
  .catch((e) => { console.error(`heist: ${e.message}`); process.exit(1); });
