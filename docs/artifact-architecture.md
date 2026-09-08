# Smash Droids Artifact Architecture

## Principle

The simulation produces small, deterministic, versioned artifacts. Rendering, video, commentary, and thumbnails are derived from those artifacts and never become game truth.

Every canonical artifact carries:

- artifact type and schema version
- match and turn identity
- ruleset ID, ABI, and canonical digest
- geometry ID, ABI, dimensions/level, and digest
- world seed
- producer engine version
- visibility class (`public`, `player-private`, `role-private`, `server-only`)
- parent artifact digests
- canonical content digest
- creation sequence (not trusted wall-clock ordering)

Missing or mismatched compatibility metadata is a hard rejection.

## Canonical artifacts

### `rules.manifest.json`
Immutable game constants, legal actions, unit/building catalogs, phases, economy, sensors, combat, victory, omissions, and schema identities.

### `world.bundle.cbor`
Compact authoritative world definition: spherical mesh, stable tile IDs, adjacency, polygon vertices, centers, biome/elevation/climate, resources, start regions, and deterministic generation proof. A readable `world.summary.json` accompanies it in development.

### `match.genesis.json`
Players, AI role seats, public commitments, selected mode, initial HQs, initial public state, rules/world digests, and turn-zero digest.

### `orders/<turn>/<player>/<role>.json`
Typed idempotent order envelope. Contains authorization scope, observation digest, sequence, orders, and client signature/nonce. It never contains hidden chain-of-thought.

### `turns/<turn>/accepted-orders.cbor`
Server-normalized orders plus deterministic rejection codes. Private until resolution; then exposed according to mode policy.

### `turns/<turn>/events.cbor`
Append-only authoritative events sufficient to reproduce the turn from its parent snapshot. Public events and hidden events are physically separated.

### `snapshots/<turn>.cbor`
Periodic complete canonical state for fast replay seek and disaster recovery. Every intermediate turn remains reproducible from genesis plus events.

### `intel/<turn>/<player>/<role>.cbor`
Private role observation. Contact tracks store confidence, uncertainty, age, and source class—not leaked canonical enemy coordinates.

### `ledger/<turn>/<player>.cbor`
Economic, production, logistics, territorial, and readiness accounting with explicit deltas and causes.

### `replay.bundle.cbor`
Genesis, ordered public events, public snapshots, final result, compatibility metadata, and digest chain. Private/full replays are separate access-controlled artifacts.

## Derived artifacts

These can be regenerated or deleted without affecting results:

- vector map deltas and WebGL instance buffers
- spectator JSON frames
- tile/terrain textures
- match thumbnails
- battle cards and timelines
- heat maps, supply overlays, sensor coverage overlays
- human-readable battle reports and economic briefs
- AI-safe role summaries
- post-match after-action reports
- cinematic camera tracks, WebM/MP4 clips, and livestream compositing

Derived text may summarize submitted rationale, but Smash Droids does not request, retain, or expose private model chain-of-thought.

## Formats

- **JSON:** manifests, debugging, MCP payloads, small envelopes.
- **Canonical CBOR:** production world/state/event/replay payloads; stable map-key ordering and integer encodings.
- **Parquet:** offline analytics and balance datasets, never live authority.
- **PNG/WebP/AVIF:** thumbnails and static maps.
- **WebM/MP4:** optional generated highlights only.

## Streaming

Spectators receive compact public event deltas over Supabase Realtime. The browser animates units and camera locally. Smash Droids does not stream server-rendered video for normal matches.

A client joining late receives the latest public snapshot plus subsequent event deltas. Sequence gaps trigger bounded replay fetch, not silent interpolation.

## Storage and retention

- Postgres stores metadata, access control, match index, ratings, and current match pointers.
- Small active-match events may live in Postgres during MVP.
- Larger immutable bundles move to object storage when free-tier limits require it.
- Public replay bundles are retained.
- Private observations and rejected raw envelopes receive a bounded retention window.
- Derived frames and videos are cacheable and disposable.

## Verification

A replay verifier must:

1. Validate every schema and compatibility identity.
2. Validate the digest chain from genesis.
3. Regenerate each accepted order set and event sequence.
4. Recompute snapshots and final result.
5. Confirm public/private redaction boundaries.
6. Reject reordered, omitted, added, or modified events.
7. Produce the same final digest on Node and the authoritative runtime.
