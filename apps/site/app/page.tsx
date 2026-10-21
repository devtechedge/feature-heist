import { getFeatures } from "../lib/data";

export default function Home() {
  const features = getFeatures();
  return (
    <main>
      <p className="lede">Each card is a feature lifted from a real app: an Electron editor, a mainnet contract, a web API, a .NET library. Each was traced using
        {" "}<a href="https://github.com/morluto/rea">REA</a> evidence, and then rebuilt in TypeScript and checked against the original.</p>
      <div className="steps">
        <div><b>1 · Inspect</b><code>heist &lt;target&gt; "&lt;feature&gt;"</code> runs REA</div>
        <div><b>2 · Slice</b>Evidence is hashed, stored and cut to the feature</div>
        <div><b>3 · Rebuild</b>Pure TypeScript package with a SPEC</div>
        <div><b>4 · Prove</b>Differential tests against the original</div>
      </div>
      <div className="grid">
        {features.map((f) => (
          <a key={f.slug} className="card" href={`features/${f.slug}/`} data-testid="feature-card">
            <span className="tag">{f.targetType}</span>
            <h2>{f.title}</h2>
            <p>{f.tagline}</p>
            <p className="muted mono">{f.slice ? `${f.slice.hits.length} evidence hits · ${f.slice.operation}` : "evidence missing"}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
