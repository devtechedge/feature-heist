/**
 * Rebuild of Markdownify's Ctrl+B / Ctrl+I / Ctrl+/ format toggle, derived from REA evidence
 * (ipc_renderer.js -> toggleFormat -> _toggleFormat in app/scripts/format.js).
 *
 * Pure and editor-agnostic: takes document lines + a selection and returns new lines + selection.
 * Behaviour, including the original's quirks, is pinned by differential tests against the original code.
 */
export type FormatType = "bold" | "italic" | "strikethrough";
export interface Pos { line: number; ch: number }
export interface Selection { start: Pos; end: Pos }
export interface EditorState { lines: string[]; selection: Selection }

export const MODIFIERS: Record<FormatType, string[]> = {
  bold: ["**", "__"],
  italic: ["*", "_"],
  strikethrough: ["~~"],
};
/** Order matters: longer markers are tried before their single-char prefixes. */
const ALL = ["**", "__", "~~", "*", "_", "`"];

const cmp = (a: Pos, b: Pos) => a.line - b.line || a.ch - b.ch;

function getRange(lines: string[], a: Pos, b: Pos): string {
  if (cmp(a, b) > 0) [a, b] = [b, a];
  if (a.line === b.line) return lines[a.line].slice(a.ch, b.ch);
  const out = [lines[a.line].slice(a.ch)];
  for (let l = a.line + 1; l < b.line; l++) out.push(lines[l]);
  out.push(lines[b.line].slice(0, b.ch));
  return out.join("\n");
}

function replaceRange(lines: string[], text: string, a: Pos, b: Pos): string[] {
  if (cmp(a, b) > 0) [a, b] = [b, a];
  const before = lines[a.line].slice(0, a.ch);
  const after = lines[b.line].slice(b.ch);
  const mid = (before + text + after).split("\n");
  return [...lines.slice(0, a.line), ...mid, ...lines.slice(b.line + 1)];
}

export function toggleFormat(state: EditorState, type: FormatType): EditorState {
  const modifiers = MODIFIERS[type];
  let lines = [...state.lines];
  const [s0, e0] = cmp(state.selection.start, state.selection.end) <= 0
    ? [state.selection.start, state.selection.end] : [state.selection.end, state.selection.start];
  const start = { ...s0 };
  const end = { ...e0 };

  // 1. Exclude markers already inside the selection. Quirk preserved: the original tests the
  //    *original* selection text on every pass, so a matching marker is peeled repeatedly while
  //    the column width allows it.
  const selText = getRange(lines, start, end);
  for (let found = true; found; ) {
    found = false;
    for (const m of ALL) {
      if (selText.startsWith(m) && selText.endsWith(m) && end.ch - start.ch >= 2 * m.length) {
        found = true; start.ch += m.length; end.ch -= m.length; break;
      }
    }
  }

  // 2. Collect markers wrapping the selection from the inside out.
  const found: string[] = [];
  const rs = { ...start }, re = { ...end };
  const endLineLen = lines[re.line].length;
  for (let hit = true; hit; ) {
    hit = false;
    for (const m of ALL) {
      if (rs.ch < m.length || re.ch > endLineLen - m.length) continue;
      rs.ch -= m.length; re.ch += m.length;
      const t = getRange(lines, rs, re);
      if (t.startsWith(m) && t.endsWith(m)) { hit = true; found.push(m); break; }
      rs.ch += m.length; re.ch -= m.length;
    }
  }

  // 3. Toggle: remove the first matching marker, else add the primary one innermost-out.
  let idx = -1;
  for (const m of modifiers) { idx = found.indexOf(m); if (idx !== -1) break; }
  let delta: number;
  if (idx !== -1) { delta = -found[idx].length; found.splice(idx, 1); }
  else { found.unshift(modifiers[0]); delta = modifiers[0].length; }

  const prefix = found.join("");
  const suffix = [...found].reverse().join("");
  lines = replaceRange(lines, suffix, end, re);
  lines = replaceRange(lines, prefix, rs, start);

  start.ch += delta;
  if (start.line === end.line) end.ch += delta;
  return { lines, selection: { start, end } };
}

/** Convenience for plain strings with [from, to) offsets on a single line. */
export function toggleInline(text: string, from: number, to: number, type: FormatType) {
  const r = toggleFormat({ lines: [text], selection: { start: { line: 0, ch: from }, end: { line: 0, ch: to } } }, type);
  return { text: r.lines.join("\n"), from: r.selection.start.ch, to: r.selection.end.ch };
}
