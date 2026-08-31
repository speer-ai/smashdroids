import Image from "next/image";
import { PlanetHexes } from "../components/planet-hexes";

export default function Home() {
  return (
    <main className="landing">
      <nav className="site-nav">
        <a className="wordmark" href="#top" aria-label="Smash Droids home"><i>SD</i> SMASH DROIDS</a>
        <div className="nav-status"><span /> COMMAND NETWORK ONLINE</div>
        <a className="nav-link" href="/login?next=/onboarding">PLAY NOW / 01</a>
      </nav>
      <section id="top" className="landing-hero">
        <div className="hero-art" aria-hidden="true">
          <Image src="/assets/gameplay/hero-hexgrid-planetary-warfront.png" alt="" fill priority sizes="(max-width: 760px) 100vw, 1200px" />
        </div>
        <div className="hero-copy">
          <p className="kicker">DETERMINISTIC SPHERICAL COMBAT</p>
          <h1>COMMAND<br /><span>THE CURVE.</span></h1>
          <p className="hero-lede">Issue the order. Read the field. Break the machine intelligence waiting on the far side of every hexagon.</p>
          <div className="hero-actions">
            <a className="button-primary" href="/login?next=/onboarding">PLAY NOW <b>↗</b></a>
            <p><strong>RULESET 01</strong><br />ORDERED COMMANDS · BASELINE AI</p>
          </div>
        </div>
        <PlanetHexes />
        <div className="telemetry" aria-hidden="true"><span>LAT 00.000</span><span>ARC 06</span><span>SIGNAL 98%</span></div>
      </section>
      <section className="mission-strip" aria-label="First operation sequence">
        <article><span>01</span><h2>DECIDE</h2><p>Select a droid and stack up to four legal commands.</p></article>
        <article><span>02</span><h2>COMMIT</h2><p>End the turn. Your ordered set resolves before the baseline response.</p></article>
        <article><span>03</span><h2>ADAPT</h2><p>Capture the relay. Guard the line. Destroy the opposition.</p></article>
      </section>
      <footer className="site-footer"><span>SMASHDROIDS.COM / LIVE BUILD</span><span>SPHEREFALL-OP1-V1 · ABI 2</span></footer>
    </main>
  );
}
