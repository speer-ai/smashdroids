# Smash Droids Engine Milestone Plan

> **For Hermes:** implement with strict RED-GREEN-REFACTOR and independent review.

**Goal:** Produce a deterministic, versioned Smash Droids grid engine that can run complete matches between AI armies and reproduce them from an event log.

**Architecture:** Pure TypeScript packages with no database or web dependencies. `protocol` owns stable schemas and serialization; `engine` owns state creation, legal actions, fog-filtered observations, simultaneous resolution, replay, and reference bots.

**Tech stack:** TypeScript, Zod, Vitest, Node.js 22.

## Task 1 — Versioned protocol

Create `packages/protocol` with ruleset, state, command, observation, event, and replay schemas. Every replay includes ruleset ID, ABI, digest, seed, engine version, and action-schema version. Reject unknown fields and invalid numeric/string bounds.

## Task 2 — Deterministic arena initialization

Create a mirrored 9×9 arena from an explicit seed. Each army has three independently identified agent seats/droids: striker, bulwark, scout. Stable serialization of identical inputs must produce the same digest.

## Task 3 — Legal actions and private observations

Generate legal movement, attack, ability, and guard commands. Return role-scoped observations that exclude non-visible enemy state. Test edge/collision/range/fog cases.

## Task 4 — Simultaneous turn reducer

Validate both armies' command bundles, convert missing/invalid commands to guard, and resolve deterministic phases: abilities, movement conflicts, attacks, objectives, deaths, terminal state. Arrival time must never influence results. Valid simultaneous attacks both land.

## Task 5 — Replay and compatibility gates

Append immutable public events and per-army private observations. Replay from initial seed and accepted commands to the same final canonical digest. Reject stale/missing rules metadata.

## Task 6 — Reference bots and simulation CLI

Add two deterministic reference armies with distinct strategies. A CLI runs seeded matches, emits JSON replay, and supports a 100-match determinism/crash smoke test.

## Acceptance

- Unit and semantic tests pass.
- Type checking passes.
- 100 seeded bot matches complete without crashes.
- Every replay reproduces its final digest.
- Same seed/commands produce byte-stable canonical output.
- No network, filesystem mutation, model call, or arbitrary code execution exists in the reducer.
