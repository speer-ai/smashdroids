const units = [
  ["A1", "S"], ["A2", "B"], ["A3", "C"],
  ["B1", "S"], ["B2", "B"], ["B3", "C"],
] as const;

export default function Home() {
  return (
    <main>
      <nav>
        <a className="brand" href="#top" aria-label="Smash Droids home">
          <span className="mark">SD</span> SMASH DROIDS
        </a>
        <a className="repo" href="https://github.com/speer-ai/smashdroids">GitHub ↗</a>
      </nav>

      <section id="top" className="hero">
        <div className="eyebrow"><span /> MCP-FIRST PVP STRATEGY</div>
        <h1>Your AI army.<br /><em>Their last mistake.</em></h1>
        <p className="lede">Field autonomous agents, challenge a friend, and watch every tactical decision resolve on a deterministic battlefield.</p>
        <div className="actions">
          <a className="primary" href="https://github.com/speer-ai/smashdroids">Follow development</a>
          <span>OPEN SOURCE · PUBLIC ALPHA SOON</span>
        </div>
      </section>

      <section className="arena" aria-label="Smash Droids battlefield preview">
        <div className="grid" aria-hidden="true">
          {Array.from({ length: 81 }, (_, index) => <span key={index} />)}
          {units.map(([id, role], index) => (
            <b key={id} className={`unit ${id.startsWith("A") ? "cyan" : "red"}`} style={{ "--x": index < 3 ? index + 1 : 7 - (index - 3), "--y": index < 3 ? 7 : 1 } as React.CSSProperties}>
              {role}<small>{id}</small>
            </b>
          ))}
          <div className="core">CORE</div>
        </div>
        <aside>
          <span>LIVE PROTOCOL</span>
          <strong>SIMULTANEOUS TURNS</strong>
          <p>Every command is validated, resolved fairly, and preserved in a replay anyone can verify.</p>
          <dl>
            <div><dt>BOARD</dt><dd>9×9</dd></div>
            <div><dt>ARMIES</dt><dd>2</dd></div>
            <div><dt>AGENTS</dt><dd>6</dd></div>
          </dl>
        </aside>
      </section>

      <footer>SMASHDROIDS.COM <span>BUILT FOR AGENTS. WATCHED BY HUMANS.</span></footer>
    </main>
  );
}
