# Smash Droids V0 Product and Rules Contract

## Player promise

Build a civilization, command an AI war cabinet, and conquer a spherical world with no edge. Players authenticate, field built-in or external AI agents, and watch every accepted or rejected order resolve through a deterministic event stream.

## World and geometry

- The player-facing world is spherical and uses **hexagonal tiles**. Squares and octagonal display plates are obsolete.
- Terrain, territory, settlements, headquarters, combined arms, fog, radar/SIGINT, and orbiting satellites expand from the v0 tutorial slice.
- Geometry identity is versioned. A geometry change is a hard replay/model compatibility boundary.
- A mathematically closed sphere cannot contain only perfect regular hexagons; the production world artifact must explicitly encode unavoidable defect cells or seam topology rather than disguising squares as hexes.

## Sequential turn loop

1. The server identifies one active player/seat.
2. That player's AI receives a private turn-start observation and legal-action contract.
3. The AI submits an ordered, bounded command set.
4. Commands resolve one at a time against each intermediate state; invalid commands emit immutable rejection events.
5. Terminal victory stops the remaining command set immediately.
6. Control rotates to the next living player.

This is Polytopia-style sequential play—not simultaneous bundle resolution. Response speed never changes the deterministic order within an accepted command set.

## Playable tutorial ruleset

The deployed first slice uses `smashdroids-tutorial/1`, ABI 1, geometry `axial-hex-v1`:

- Pointy-top axial hex theater, radius 3.
- Three droids per side: striker, bulwark, scout.
- Player submits up to three ordered commands, then the deterministic baseline AI responds.
- Actions: adjacent `move`, adjacent `attack`, `capture`, `guard`, and `radar`.
- Capturing the relay or eliminating the opposing force wins immediately.
- Every resolution emits a typed event used by the UI's action-specific animation.

Tutorial match state is local to the authenticated browser in this release. Persistent PvP matches require the reviewed namespaced Supabase schema before launch.

## Agent modes

- Free deterministic baseline AI.
- Server-side built-in OpenAI agent; provider credentials remain server-only.
- Bring-your-own agents over authenticated MCP/HTTP. Inference runs in the player's environment by default.
- No user provider keys are stored in v0.

## Canonical provenance

Every persistent match and replay must carry ruleset ID, ABI, digest, geometry, state schema, action vocabulary, seed, and engine version. Store private observations, ordered commands, accepted/rejected outcomes, compact public events, model/agent metadata, latency, fallbacks, and final replay/state digests under strict visibility rules.

## MCP contract

Minimum tools remain:

- `smashdroids.create_agent`
- `smashdroids.join_match`
- `smashdroids.get_observation`
- `smashdroids.get_legal_actions`
- `smashdroids.submit_turn`
- `smashdroids.get_match_status`
- `smashdroids.forfeit`

Every mutation is authenticated, idempotent, rate-limited, and scoped to one player's seat. One-time MCP credentials are stored only as hashes.

## Visual contract

- GPT Image-generated art is versioned with source prompts, source outputs, derivatives, and hashes.
- Movement, attack, capture, guard, radar/recon, construction, and other resolved actions use distinct visual language.
- Procedural timing is driven by authoritative events; visuals never invent state transitions.
- Non-trivial motion has a reduced-motion equivalent.

## Security and data

- Supabase browser access uses only the public URL and publishable key protected by RLS.
- Service-role and provider credentials never enter browser bundles or Git.
- New persistence uses additive `sd_*` tables and preserves all legacy data.
- Existing legacy tables are not modified without ownership review.
