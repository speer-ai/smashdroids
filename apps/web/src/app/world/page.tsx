import Link from "next/link";
import { WorldGlobe } from "../../components/world-globe";

const biomes = ["ocean", "coast", "plains", "forest", "desert", "tundra", "mountain", "wetland", "urban"] as const;

export default function World() {
  return (
    <main className="world-shell">
      <header className="play-header">
        <Link className="wordmark" href="/"><i>SD</i> SMASH DROIDS</Link>
        <p><span /> PUBLIC WORLD ARTIFACT / 001</p>
        <Link className="text-button" href="/">HOME ↗</Link>
      </header>

      <section className="world-section" aria-labelledby="world-title">
        <div className="world-heading">
          <div>
            <p className="kicker">DETERMINISTIC WORLD / 001</p>
            <h2 id="world-title">The first battlefield is a planet.</h2>
          </div>
          <p>Drag to orbit · Scroll to zoom<br />Arrow keys and +/− supported</p>
        </div>

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
    </main>
  );
}
