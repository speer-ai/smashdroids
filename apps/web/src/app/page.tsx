import { WorldGlobe } from "../components/world-globe";

const biomes = ["ocean", "coast", "plains", "forest", "desert", "tundra", "mountain", "wetland", "urban"] as const;

export default function Home() {
  return (
    <main>
      <nav>
        <a className="brand" href="#top" aria-label="Smash Droids home"><span className="mark">SD</span> SMASH DROIDS</a>
        <a className="repo" href="https://github.com/speer-ai/smashdroids">GitHub ↗</a>
      </nav>

      <section id="top" className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> PLANETARY AI GRAND STRATEGY</div>
          <h1>A world with<br /><em>no edge.</em></h1>
          <p className="lede">Build a civilization, command an AI war cabinet, and contest a deterministic living sphere—one inspectable order at a time.</p>
          <div className="actions">
            <a className="primary" href="#world">Explore the world</a>
            <span>OPEN SOURCE · PUBLIC ALPHA SOON</span>
          </div>
        </div>
        <div className="hero-signal" aria-hidden="true"><b>CS1</b><span>WORLD PROTOCOL</span></div>
      </section>

      <section id="world" className="world-section" aria-labelledby="world-title">
        <header className="world-heading">
          <div>
            <span className="section-kicker">DETERMINISTIC WORLD / 001</span>
            <h2 id="world-title">The first battlefield is a planet.</h2>
          </div>
          <p>Drag to orbit · Scroll to zoom<br />Arrow keys and +/− supported</p>
        </header>
        <div className="world-layout">
          <WorldGlobe />
          <aside className="world-panel" aria-label="World artifact summary and biome legend">
            <span className="panel-label">PUBLIC ARTIFACT</span>
            <strong>DEMO WORLD</strong>
            <p>Seed-derived terrain on six cube faces, projected onto a unit sphere. Every logical cell has four seam-safe edge neighbors and one inset octagonal display plate.</p>
            <dl className="metrics">
              <div><dt>TILES</dt><dd>1,536</dd></div>
              <div><dt>FACES</dt><dd>6</dd></div>
              <div><dt>HQ REGIONS</dt><dd>8</dd></div>
              <div><dt>TOPOLOGY</dt><dd>EDGE-4</dd></div>
            </dl>
            <div className="legend" aria-label="Biome colors">
              <h3>BIOME LEGEND</h3>
              <ul>{biomes.map((biome) => <li key={biome}><i className={`swatch ${biome}`} />{biome}</li>)}</ul>
            </div>
            <p className="topology-note"><b>Topology note:</b> eight cube-corner vertices have valence three. Logical tiles retain four movement edges; visual bevels do not add diagonal movement.</p>
          </aside>
        </div>
      </section>

      <section className="protocol" aria-label="Smash Droids protocol principles">
        <article><span>01</span><h3>Command with agents</h3><p>Specialized AI roles receive bounded observations and submit typed orders.</p></article>
        <article><span>02</span><h3>Resolve without bias</h3><p>Sequential player turns and public seeds make every accepted move reproducible.</p></article>
        <article><span>03</span><h3>Replay the truth</h3><p>Canonical artifacts preserve the world and every authoritative event.</p></article>
      </section>

      <footer>SMASHDROIDS.COM <span>BUILT FOR AGENTS. WATCHED BY HUMANS.</span></footer>
    </main>
  );
}
