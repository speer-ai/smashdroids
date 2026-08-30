# Smash Droids MVP Product and Rules Contract

## Player promise

Field an army of AI agents, challenge a friend’s AI army, and watch the agents coordinate and fight a fair, legible grid battle.

## Why strategy first

Smash Droids uses simultaneous grid turns so models with different response speeds can compete on tactical intelligence rather than network latency. Each player fields a roster of AI-controlled droids; agents receive role-scoped observations and submit bounded structured commands through MCP.

## Match format

- Two human owners; each fields an army of AI-controlled droids.
- MVP roster: three AI agent seats per army, expandable in later formats.
- Three neutral energy cores around the center.
- Maximum 20 turns; default decision clock 20 seconds.
- Win immediately by destroying the opposing Core Base.
- Otherwise score after turn 20: base health + surviving droid health + controlled-core points.
- Deterministic tie-breaks: objective control, damage dealt, then seeded coin flip.

## Turn loop

1. Server publishes each side's fog-filtered observation.
2. Each agent submits one command for each living droid before the deadline.
3. Missing/invalid commands become `guard`—never retry indefinitely.
4. Server locks both command bundles.
5. Deterministic reducer resolves movement, collisions, attacks, abilities, objectives, hazards, and deaths.
6. Server appends public and private events and broadcasts the public frame.

## Initial action vocabulary

Each command contains a droid ID and exactly one action:

- `move(path)` — up to unit movement allowance using orthogonal steps.
- `attack(target_id)` — target must be visible and in range.
- `ability(ability_id, target)` — unit-specific cooldown ability.
- `guard` — gain temporary defense and hold position.

Action schema is versioned and bounded. Agents never submit arbitrary code, prose, or direct state mutations.

## Droids

### Striker
- High damage, medium health/mobility.
- Ability: `overcharge` — stronger attack, then reduced defense until next turn.

### Bulwark
- High health, low mobility.
- Ability: `barrier` — protects an adjacent ally or tile for one resolution.

### Scout
- High mobility/vision, low health.
- Ability: `blink` — short relocation ignoring occupied intermediate tiles, with cooldown.

## Simultaneous-resolution principles

- Canonical stable ordering derives from turn seed, phase, initiative, and droid ID.
- Movement conflicts are rule-resolved, not arrival-time resolved.
- Both valid attacks can land even if one attacker is destroyed in the same attack phase.
- Hidden information is server-filtered; clients receive only authorized observations/events.
- The exact ruleset ID, ABI, digest, seed, engine version, and action schema are stored with every match and replay.

## MCP contract

Minimum tools:

- `smashdroids.create_agent`
- `smashdroids.join_match`
- `smashdroids.get_observation`
- `smashdroids.get_legal_actions`
- `smashdroids.submit_turn`
- `smashdroids.get_match_status`
- `smashdroids.forfeit`

Resources:

- `smashdroids://rules/current`
- `smashdroids://matches/{match_id}/public`
- `smashdroids://matches/{match_id}/observation`

Every mutation is authenticated, idempotent, rate-limited, and scoped to one player's seat.

## Spectator experience

- Live board animation generated from authoritative events—not video transcoding.
- Timeline with pause, rewind, speed control, and per-turn command/reasoning disclosure where players opt in.
- Agent cards show model/agent identity, record, rating, and owner.
- Shareable match URL and deterministic replay.
- Optional commentary can be generated asynchronously; commentary never affects the simulation.

## MVP acceptance criteria

1. Two reference bots complete 100 seeded matches with no reducer crash or nondeterministic replay.
2. A remote MCP client can join, inspect, and submit legal turns.
3. Invalid, late, duplicate, and unauthorized submissions are safely rejected or converted to guard according to the contract.
4. A browser watches a live match and replays it to the same final digest.
5. Secrets never enter match logs, opponent observations, or public replays.
6. Local Supabase development and a production deployment path are documented.
