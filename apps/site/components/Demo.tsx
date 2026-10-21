"use client";
import { useMemo, useRef, useState } from "react";
import { toggleInline, type FormatType } from "@heist/rebuild-markdown-toggle-format";
import { Weth9, encodeCall } from "@heist/rebuild-weth9-ledger";
import { buildSearchUrl, parseText } from "@heist/rebuild-npm-search-client";
import { toWords, toOrdinalWords, toTuple } from "@heist/rebuild-english-number-words";

function ToggleDemo() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("Select some words in this line and toggle them.");
  const apply = (t: FormatType) => {
    const el = ref.current!; const r = toggleInline(text, el.selectionStart, el.selectionEnd, t);
    setText(r.text); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.from, r.to); });
  };
  return (<div>
    <textarea data-testid="toggle-input" ref={ref} rows={3} style={{ width: "100%" }} value={text} onChange={(e) => setText(e.target.value)} />
    <div className="row">{(["bold", "italic", "strikethrough"] as const).map((t) => <button key={t} data-testid={`toggle-${t}`} onClick={() => apply(t)}>{t}</button>)}</div>
  </div>);
}

function WethDemo() {
  const w = useRef(new Weth9());
  const [log, setLog] = useState<string[]>([]);
  const [amt, setAmt] = useState("5");
  const me = 0xa11cen, you = 0xb0bn;
  const run = (label: string, sender: bigint, data: string, value = 0n) => {
    const r = w.current.call(sender, data, value);
    const bal = (a: bigint) => w.current.balanceOf.get(a) ?? 0n;
    setLog((l) => [`${label}: ${r.reverted ? "REVERT" : "ok"} | alice=${bal(me)} bob=${bal(you)} totalSupply=${w.current.ethBalance}`, ...l].slice(0, 8));
  };
  const n = BigInt(amt || "0");
  return (<div>
    <div className="row">amount <input data-testid="weth-amount" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} size={6} />
      <button data-testid="weth-deposit" onClick={() => run(`alice deposit ${n}`, me, encodeCall("deposit()"), n)}>deposit</button>
      <button onClick={() => run(`alice transfer ${n} → bob`, me, encodeCall("transfer(address,uint256)", [you, n]))}>transfer to bob</button>
      <button onClick={() => run(`alice withdraw ${n}`, me, encodeCall("withdraw(uint256)", [n]))}>withdraw</button></div>
    <pre data-testid="weth-log">{log.join("\n") || "no calls yet"}</pre>
  </div>);
}

function NpmDemo() {
  const [q, setQ] = useState("keywords:electron author:sindresorhus");
  const [size, setSize] = useState(5);
  const url = useMemo(() => { try { const p = parseText(q); return buildSearchUrl({ ...p, text: p.text || undefined, size }); } catch (e) { return `error: ${(e as Error).message}`; } }, [q, size]);
  return (<div>
    <div className="row"><input data-testid="npm-q" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
      size <input type="number" min={1} max={250} value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ width: 80 }} /></div>
    <pre data-testid="npm-url">{url}</pre>
    {url.startsWith("http") && <a href={url} target="_blank" rel="noreferrer">open live registry response ↗</a>}
  </div>);
}

function WordsDemo() {
  const [n, setN] = useState("1234567");
  let out: string[];
  try { const b = BigInt(n || "0"); out = [`ToWords: ${toWords(b)}`, `ToWords(addAnd:false): ${toWords(b, { addAnd: false })}`];
    try { out.push(`ToOrdinalWords: ${toOrdinalWords(b)}`, `ToTuple: ${toTuple(b)}`); } catch { out.push("(ordinal/tuple need an Int32)"); }
  } catch (e) { out = [`error: ${(e as Error).message}`]; }
  return (<div><div className="row">number <input data-testid="words-n" value={n} onChange={(e) => setN(e.target.value.replace(/[^\d-]/g, ""))} /></div>
    <pre data-testid="words-out">{out.join("\n")}</pre></div>);
}

export default function Demo({ kind }: { kind: "toggle" | "weth" | "npm" | "words" }) {
  return kind === "toggle" ? <ToggleDemo /> : kind === "weth" ? <WethDemo /> : kind === "npm" ? <NpmDemo /> : <WordsDemo />;
}
