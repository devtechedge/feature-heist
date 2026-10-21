#!/usr/bin/env node
// Record a HAR of real browser traffic to the public npm registry search API.
// Usage: node scripts/capture-har.mjs <out.har>   (CHROME_PATH overrides the browser)
import { chromium } from "playwright-core";
const out = process.argv[2] ?? "npm-search.har";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome", headless: true });
const ctx = await browser.newContext({ recordHar: { path: out, content: "embed" } });
const page = await ctx.newPage();
for (const q of ["text=markdown%20editor&size=5", "text=markdown%20editor&size=5&from=5", "text=keywords:electron%20author:sindresorhus&size=3", "text=react&size=2&quality=0.1&popularity=0.8&maintenance=0.1"]) {
  await page.goto(`https://registry.npmjs.org/-/v1/search?${q}`);
}
await ctx.close(); await browser.close();
console.log(`wrote ${out}`);
