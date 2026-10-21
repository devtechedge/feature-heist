# Markdown format toggle (Electron)

**Target:** [electron-markdownify](https://github.com/amitmerchant1990/electron-markdownify) @ `13cb55c` (MIT), an Electron + CodeMirror Markdown editor.
**Question:** what exactly do Ctrl+B / Ctrl+I / Ctrl+/ do to the text and selection?

## 1. Inspect
```bash
heist targets/electron-markdownify "bold italic strikethrough toggle" --keywords toggleFormat,_toggleFormat
```
REA's `analyze-javascript-application` parsed 18 JS files (119,920 AST nodes), found 1 BrowserWindow and 1 literal IPC channel, and built a semantic graph of 58,468 nodes. That's 106.7 MB of JSON, stored as an 18 MB gzip.

## 2. What the evidence showed
- `app/scripts/ipc_renderer.js:103/107/111` read `toggleFormat`: the IPC listeners for `ctrl+b`, `ctrl+i` and `ctrl+/`.
- `app/scripts/format.js:8-21` defines `toggleFormat`, which calls `_toggleFormat` (`format.js:23-105`).
- REA's `artifact_sha256` for `format.js` (`41e79362…`) equals the hash of the vendored oracle file. A test checks this.

## 3. Rebuild
`packages/rebuilds/markdown-toggle-format` exports `toggleFormat({lines, selection}, type)` and `toggleInline(text, from, to, type)`. They're pure functions with no editor dependency.

## 4. Proof
- 5,000 seeded random documents (20% multi-line) and selections: output lines and selection match the original exactly.
- **Quirk found and preserved:** the original checks the *unchanged* selection text on every peel pass, so a fully selected `**hi**` becomes `**h****i**`. This is arguably a bug in the original; a "fixed" mode would be easy to add on top.
