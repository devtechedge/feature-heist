#!/usr/bin/env node
// Replace e-mail addresses in a HAR (including embedded response bodies) before it is analysed or committed.
// Usage: node scripts/redact-har.mjs <in.har> <out.har>
import { readFileSync, writeFileSync } from "node:fs";
const [i, o] = process.argv.slice(2);
const txt = readFileSync(i, "utf8").replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "redacted@example.invalid");
JSON.parse(txt); // still valid JSON
writeFileSync(o, txt);
console.log(`redacted -> ${o}`);
