# Legacy Engine Milestone — Superseded

This plan described the discarded 9×9 simultaneous-turn prototype. It is retained only as historical context; **do not implement it on `main`**.

The active product contract is `docs/product-and-rules.md` and the current playable release plan is `docs/plans/2026-08-30-epic-playable-v0.md`.

## Superseding decisions

- Player-facing tiles are hexagons, not squares or octagonal display plates.
- The strategic world is spherical, not a bounded 9×9 arena.
- Turns are sequential: one active player submits an ordered bounded command set, commands resolve against intermediate state, then control rotates.
- Ruleset, geometry, action vocabulary, observations, events, replays, and model artifacts remain deterministic and compatibility-gated.
- The first deployed slice is `smashdroids-tutorial/1` on pointy-top axial hex geometry. It proves login-to-play, deterministic baseline response, event-specific effects, and immediate capture/elimination victory before persistent PvP expansion.

Historical prototype code remains isolated in its legacy branch and must not be merged into the active engine without a new rules/geometry review.
