/** Runs the ORIGINAL Markdownify format.js (MIT) inside a VM against a minimal CodeMirror stand-in. */
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import type { EditorState, FormatType, Pos } from "../src/index.js";

const SRC = readFileSync(new URL("../fixtures/original/format.js", import.meta.url), "utf8");

class FakeCM {
  lines: string[]; anchor: Pos; head: Pos;
  constructor(s: EditorState) { this.lines = [...s.lines]; this.anchor = { ...s.selection.start }; this.head = { ...s.selection.end }; }
  private ord(): [Pos, Pos] { const a = this.anchor, b = this.head; return a.line < b.line || (a.line === b.line && a.ch <= b.ch) ? [a, b] : [b, a]; }
  getCursor(w: string) { const [s, e] = this.ord(); return { ...(w === "start" ? s : e) }; }
  getLine(n: number) { return this.lines[n]; }
  getRange(a: Pos, b: Pos) {
    if (a.line === b.line) return this.lines[a.line].slice(a.ch, b.ch);
    const out = [this.lines[a.line].slice(a.ch)];
    for (let l = a.line + 1; l < b.line; l++) out.push(this.lines[l]);
    out.push(this.lines[b.line].slice(0, b.ch));
    return out.join("\n");
  }
  getSelection() { const [s, e] = this.ord(); return this.getRange(s, e); }
  setSelection(a: Pos, b: Pos) { this.anchor = { line: a.line, ch: a.ch }; this.head = { line: b.line, ch: b.ch }; }
  replaceRange(text: string, a: Pos, b: Pos) {
    const before = this.lines[a.line].slice(0, a.ch), after = this.lines[b.line].slice(b.ch);
    this.lines.splice(a.line, b.line - a.line + 1, ...(before + text + after).split("\n"));
  }
  operation(f: () => void) { f(); }
  focus() {}
}

export function runOriginal(s: EditorState, type: FormatType): EditorState {
  const cm = new FakeCM(s);
  const ctx = createContext({ cm, CodeMirror: { Pos: function (this: any, line: number, ch: number) { this.line = line; this.ch = ch; } } });
  runInContext(SRC, ctx);
  runInContext(`toggleFormat(${JSON.stringify(type)})`, ctx);
  return { lines: cm.lines, selection: { start: cm.getCursor("start"), end: cm.getCursor("end") } };
}
