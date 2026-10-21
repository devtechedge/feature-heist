# Feature spec: bold italic strikethrough toggle

- Target: `targets/electron-markdownify`
- REA 6.7.0, operation `analyze_javascript_application`, evidence `ev_36d4e2f2aa64888469a85805d70facd3988f1c09349a421168004102ef75fd1b`
- Record sha256: `e39f19de6ba4de3eeb3d85cd8234e954c0041aa5b6bb0db7ed39a5f4ccc0e20f`

## Call chain (from REA semantic graph)
1. `app/scripts/ipc_renderer.js`
2. `app/scripts/format.js`

## Evidence hits
| kind | label | location |
|---|---|---|
| function | toggleFormat | `app/scripts/format.js:8-21` |
| expression | variable | `app/scripts/format.js:8-8` |
| binding | toggleFormat | `app/scripts/format.js:8-8` |
| expression | _toggleFormat | `app/scripts/format.js:19-19` |
| binding | _toggleFormat | `app/scripts/format.js:23-23` |
| function | _toggleFormat | `app/scripts/format.js:23-105` |
| expression | variable | `app/scripts/format.js:23-23` |
| expression | toggleFormat | `app/scripts/ipc_renderer.js:103-103` |
| expression | toggleFormat | `app/scripts/ipc_renderer.js:107-107` |
| expression | toggleFormat | `app/scripts/ipc_renderer.js:111-111` |

## Behaviour (from REA evidence + original source at the recorded hash)
- Trigger: main process registers `Ctrl+B`, `Ctrl+I`, `Ctrl+/` local shortcuts and sends `ctrl+b`/`ctrl+i`/`ctrl+/` to the renderer; `ipc_renderer.js:103,107,111` call `toggleFormat('bold'|'italic'|'strikethrough')`.
- `toggleFormat` maps the type to marker sets (`**`/`__`, `*`/`_`, `~~`) and calls `_toggleFormat` (`format.js:23-105`).
- Inputs: document lines and selection. Outputs: new lines and selection.
- Step 1 peels markers inside the selection; step 2 collects markers wrapping it; step 3 removes the first matching marker or inserts the primary one innermost.
- Edge cases: an empty selection inserts a pair with the caret inside. Multi-line selections only shift the start column.

## Unknowns / quirks
- QUIRK: step 1 re-tests the *original* selection text on every pass, so selecting `**hi**` produces `**h****i**`. The rebuild preserves this on purpose; differential tests pin it.
- CodeMirror's own `replaceRange` normalisation isn't modelled beyond plain string edits.
