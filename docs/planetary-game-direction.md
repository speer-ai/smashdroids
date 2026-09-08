# Smash Droids — Planetary Game Direction

**Status:** Product direction v2; geometry and rules ABI are provisional until semantic review.

## Player promise

Build a civilization on a living sphere, assemble a staff of AI commanders, and watch them compete across economics, intelligence, logistics, and combined-arms warfare.

## The planet

- A closed spherical world with no artificial east/west edge.
- Canonical prototype geometry: cubed-sphere DGGS.
- Each logical cell is rendered as a beveled octagon; topology remains deterministic and machine-addressable.
- Prototype sizes: 16 cells per cube-face edge (1,536 cells), then 32 (6,144) and 64 (24,576).
- Stable tile IDs: `cs1/<level>/<face>/<row>/<column>`.
- Biomes include ocean, coast, plains, forest, desert, tundra, mountain, wetland, and urban.
- Elevation, moisture, temperature, resources, rivers, and coastlines derive from a public world seed.

A sphere cannot be tiled exclusively by regular octagons with normal three-or-more-face vertices. Smash Droids preserves the octagonal visual and eight-direction tactical language using beveled cells over a valid spherical topology. The geometry artifact records the exact topology and seams.

## Player start

Each player begins with:

- One HQ settlement.
- A small controlled territory.
- A starter population, treasury, industrial capacity, energy, and supply stockpile.
- A limited reconnaissance picture rather than a revealed world.
- A configurable AI command staff.

Start positions must be seed-derived, separated, biome-viable, and reproducibly balanced.

## AI command staff

A player fields multiple agents with bounded authority:

1. **Strategic Command** — objectives, doctrine, inter-command arbitration.
2. **Economy & Development** — settlements, budgets, construction, research.
3. **Logistics** — supply networks, depots, transport, readiness.
4. **Land Command** — battalions, tanks, artillery, air defense.
5. **Air Command** — aircraft, airlift, interception, strike missions.
6. **Naval Command** — fleets, battleships, submarines, amphibious movement.
7. **Intelligence Command** — reconnaissance, SIGINT, radar, deception, contact fusion.
8. **Orbital Command** — satellites, orbital coverage, launch allocation.

MVP uses Strategic, Development, Land, and Intelligence roles. Later roles activate only when their game systems exist. Each role receives a private observation and submits a typed order envelope through MCP. No agent receives another role's private scratchpad or chain-of-thought.

## Turn model

Smash Droids uses sequential player turns rather than real-time twitch control. Like Polytopia, one player is active at a time; that player's AI receives a turn-start observation and submits a bounded ordered set of moves. The move set resolves atomically, then control passes to the next living player.

1. **Observation** — the active seat receives role-scoped state and intelligence artifacts.
2. **Planning** — its AI proposes one bounded ordered move set.
3. **Commit** — the player submits the move set with its observation digest and idempotency key.
4. **Resolution** — moves resolve in declared order through the deterministic reducer.
5. **Rotation** — public events and private traces are emitted, then the next living player becomes active.

Network arrival time never changes results. Order inside the active player's declared move set is intentionally semantic.

## Civilization layer

### Territory

- Territory is controlled through HQs, settlements, cities, outposts, and connected influence.
- Unclaimed land is acquired by exploration, settlement, or occupation.
- Control can be contested; movement through contested cells is possible but costly.
- Occupation is not instant ownership: capture, stabilization, and supply take time.

### Settlements and cities

Settlements provide population, local storage, production, and influence. They upgrade through explicit tiers:

`outpost → settlement → city → regional capital`

Districts specialize cities: industry, research, logistics, radar, airfield, shipyard, orbital, defense, and civilian economy. Population, infrastructure, morale, damage, and supply constrain output.

### Economy

Canonical resources for the first full ruleset:

- **Credits** — fungible budget.
- **Industry** — construction capacity.
- **Energy** — operations and advanced systems.
- **Materials** — unit/building inputs.
- **Supply** — readiness, ammunition, fuel, and sustainment abstraction.
- **Research** — unlocks capabilities rather than arbitrary stat inflation.

The MVP vertical slice uses Credits, Industry, and Supply only.

## Combined arms

Units are formations, not individual soldiers. A unit definition specifies domain, footprint, movement, sensors, signatures, attack profiles, defense, range, supply demand, production cost, and prerequisites.

Initial catalog:

- Infantry battalion
- Mechanized battalion
- Tank battalion
- Reconnaissance company
- Artillery battery
- Air-defense battery
- Fighter squadron
- Strike squadron
- Transport aircraft
- Destroyer group
- Battleship group
- Submarine group
- Engineering/logistics unit
- Radar installation
- Reconnaissance satellite

Combat is typed: direct, indirect, air-to-air, air-to-ground, surface-to-air, naval, anti-submarine, electronic, and strategic. Detection is required before effective engagement; a contact can be attacked with uncertainty and penalties without revealing canonical hidden state.

## Fog, intelligence, and orbit

The engine stores canonical truth but never sends it directly to players.

A contact track includes:

- estimated position or region
- classification hypothesis
- confidence
- age and decay
- source/provenance class
- uncertainty radius
- last correlated event

Sensors include visual reconnaissance, radar, passive SIGINT, active electronic search, sonar, and satellites. Active sensors reveal more but increase emitter signature. Satellites follow deterministic orbital tracks and provide time-bounded coverage footprints; they are not permanent global vision.

## Victory

The first playable mode is **Planetary Supremacy**:

- Immediate victory by controlling all surviving enemy HQs after a stabilization period.
- Score victory at the turn limit using population, controlled territory, city value, economic output, military readiness, and strategic objectives.
- Concession and inactivity resolution are explicit.
- Tie-breaks are deterministic and published in the rules artifact.

## Smallest fun vertical slice

The first playable build deliberately includes:

- 1,536-cell seeded sphere.
- Two players and four AI roles each.
- Plains, forest, mountain, ocean, coast, and urban biomes.
- HQ, outpost, settlement, road, depot, radar, and factory.
- Infantry, tank, artillery, recon, and radar units.
- Credits, Industry, Supply.
- Territory, production, supply paths, role-scoped fog, radar contacts, movement, ranged combat, capture, and replay.
- 30-turn matches.

Deliberately omitted from the first playable build: naval combat, aircraft, satellites, diplomacy, research tree, population migration, weather, nuclear weapons, espionage operations, tactical sub-turns, and user-generated unit definitions. Their schemas may be reserved, but they are not legal actions until implemented and tested.
