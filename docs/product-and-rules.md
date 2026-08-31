# Smash Droids Spherefall Product and Rules Contract

## Player promise

Command one of six machine factions across a rotatable spherical world with no board edge. Every accepted or rejected order resolves through the bounded deterministic `spherefall-op1-v1` reducer.

## Canonical faction names

Primary player-facing names always appear first; lore subtitles remain secondary:

- **Neo Romans** — Aureate Cohort
- **Germanoids** — Forgewood Union
- **XiRen** — Celestial Weave
- **Hoshikage** — Folded Circuit
- **Solandinos** — Sunriver Concord
- **Zoryani** — Aurora Foundry

## World and geometry

- The canonical world is a frequency-3 subdivided-icosahedron dual containing exactly 92 playable cells.
- It contains 80 hexagons and the mathematically required 12 pentagonal defects; the product never claims an impossible all-hex closed sphere.
- Canonical tile IDs, centers, ordered corners, adjacency, edges, and faces are independent from rendering.
- Movement, attacks, objectives, radar, and pathfinding cross projected seams naturally because legality uses canonical topology rather than screen position.
- Six terrain classes are authored: Abyssal Ocean, Signal Plains, Circuit Forest, Glass Desert, Crown Highlands, and Aurora Tundra.

## Operation ruleset

The playable release uses `spherefall-op1-v1`, ABI 2, catalog digest `f0e2e7ae27da7e54b722e9bbe7519a8c113b85a2b17cdccccb53ee39b4db6c6a`:

- Six active droids per side: Striker, Bulwark, Lancer, Artillery, Scout, and Hacker.
- Four command points per side and a maximum of ten rounds.
- Ordered commands resolve sequentially against each intermediate state.
- Actions are Move, Attack, Guard, Radar, Capture, and Deploy.
- Combat is deterministic: weapon power, armor piercing, armor, Guard, terrain cover, formation cover, and faction modifiers determine damage without random rolls.
- Terrain affects movement, concealment, line of sight, sensors, and long-range power.
- Supply funds reinforcements beside a controlled headquarters, up to the six-unit active cap.
- Uplinks and the Prime Relay generate supply and victory points.
- Victory occurs by force elimination, reaching the VP threshold, or leading when the tenth round resolves; exact ties draw.

## Troop mechanics

- **Striker — Momentum:** +1 power after moving at least two cells in the projected command set.
- **Bulwark — Anchor:** Guard grants +2 armor and one point of adjacent formation cover.
- **Lancer — Braced Shot:** +1 power when firing without moving that turn.
- **Artillery — Indirect Fire:** Arc Mortar ignores Highlands line-of-sight blocking and applies armor-reduced friendly-fire splash.
- **Scout — Wide Sweep:** Radar reaches radius four before terrain and faction modifiers.
- **Hacker — Rapid Override:** the only class that may Move then Capture in one ordered command set; Disruptor hits jam surviving targets.

## Sequential turn loop

1. The active player receives a private observation and legal-action contract.
2. The player returns an ordered command set bounded to four commands.
3. Commands resolve one at a time; invalid commands emit immutable rejection events.
4. The deterministic AI selects a bounded, stably sorted response against the projected intermediate state.
5. Economy, scoring, temporary Guard/jam state, visibility, round progression, and terminal victory resolve through the same reducer.

Planning and final resolution use identical reducer semantics. Rendering never invents state transitions.

## Interaction and accessibility

- The globe supports pointer drag, touch drag, arrow-key rotation, keyboard zoom, and Home reset.
- Selection, movement legality, ownership, and unavailable states use shape, markers, text, or stroke treatment in addition to color.
- Controls maintain 44×44 CSS-pixel targets where applicable.
- Mobile layouts avoid horizontal overflow and preserve the complete globe.
- Non-trivial motion respects `prefers-reduced-motion`.
- Live command and event regions expose updates to assistive technology.

## Generated art provenance

Faction key art, troop sheets, troop-token derivatives, terrain atlas, and terrain derivatives retain prompts, generation configuration, dimensions, SHA-256 hashes, source/derivative relationships, and OpenAI `gpt-image-2` provenance. Credentials remain server/tool-side and never enter browser code, Git, or manifests.

## Security and data

- Supabase browser access uses only the public URL and publishable key protected by RLS.
- Service-role and provider credentials never enter browser bundles or Git.
- New persistence must use additive `sd_*` tables and preserve all legacy data.
- Existing legacy tables remain untouched without ownership review.
- Match state remains local to the authenticated browser in this release; persistent multiplayer requires a separately reviewed namespaced schema.
