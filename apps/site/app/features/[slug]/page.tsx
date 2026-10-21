import { notFound } from "next/navigation";
import { getFeature, getFeatures } from "../../../lib/data";
import Demo from "../../../components/Demo";

export function generateStaticParams() { return getFeatures().map((f) => ({ slug: f.slug })); }
export const dynamicParams = false;

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = getFeature((await params).slug);
  if (!f) notFound();
  const hits = f.slice?.hits ?? [];
  return (
    <main>
      <p><a href="../../">← all features</a></p>
      <span className="tag">{f.targetType}</span>
      <h2 style={{ fontSize: 34, margin: "8px 0" }}>{f.title}</h2>
      <p className="lede">{f.tagline}</p>
      <section className="demo"><h3 style={{ marginTop: 0 }}>Try the rebuild</h3><Demo kind={f.demo} /></section>
      <section>
        <h3>Provenance</h3>
        <dl>
          <dt>Target</dt><dd><a href={f.targetUrl}>{f.target}</a> ({f.targetLicense})</dd>
          <dt>REA command</dt><dd><code>{f.reaCommand}</code></dd>
          <dt>REA provider</dt><dd>{f.slice ? `${f.slice.provider.name} (${f.slice.provider.version ?? "n/a"})` : "-"}</dd>
          <dt>Evidence id</dt><dd className="mono" data-testid="evidence-id">{f.manifest?.evidence_id}</dd>
          <dt>Record sha256</dt><dd className="mono">{f.manifest?.record_sha256}</dd>
          <dt>Record size</dt><dd>{f.manifest ? `${(f.manifest.record_bytes / 1e6).toFixed(2)} MB (stored gzipped)` : "-"}</dd>
          <dt>Oracle</dt><dd>{f.oracle}</dd>
          <dt>Rebuild</dt><dd><a href={`https://github.com/devtechedge/feature-heist/tree/main/${f.rebuildPackage}`}><code>{f.rebuildPackage}</code></a></dd>
        </dl>
      </section>
      {f.slice && f.slice.call_chain.length > 0 && (
        <section><h3>Call chain recovered by REA</h3><ol>{f.slice.call_chain.map((c) => <li key={c}><code>{c}</code></li>)}</ol></section>
      )}
      <section>
        <h3>Evidence hits ({hits.length})</h3>
        <table><thead><tr><th>kind</th><th>label</th><th>where</th></tr></thead>
          <tbody>{hits.slice(0, 60).map((h, i) => (
            <tr key={i}><td>{h.kind}</td><td className="mono">{h.label}</td><td className="mono">{h.module_path}:{h.start_line}{h.end_line !== h.start_line ? `-${h.end_line}` : ""}</td></tr>
          ))}</tbody></table>
        {hits.length > 60 && <p className="muted">…and {hits.length - 60} more in slice.json</p>}
      </section>
      {f.spec && <section><h3>SPEC.md</h3><pre>{f.spec}</pre></section>}
    </main>
  );
}
