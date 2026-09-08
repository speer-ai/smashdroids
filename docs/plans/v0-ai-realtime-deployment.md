# Smash Droids v0 — Accounts, AI, Realtime, and Deployment

> **For Hermes:** Execute through isolated vertical slices with strict TDD, followed by independent rules/spec and code/security reviews. Geometry supports the product; it is not the v0 focus.

**Goal:** Deploy a playable v0 where authenticated players configure built-in or external AI agents, play sequential Polytopia-style turns on a spherical world, spectate event updates live, inspect a privacy-safe decision trace, and accumulate player/agent statistics.

**Architecture:** Next.js 16 provides authenticated account, lobby, match, trace, API, and Streamable HTTP MCP surfaces. Supabase provides Auth, Postgres, RLS, atomic turn transactions, and Realtime. A pure TypeScript reducer resolves one active player's ordered move set per atomic turn. Built-in OpenAI runs only in server code; deterministic baseline AI always works and is the failure fallback. External agents authenticate with revocable per-installation credentials and use the same scoped observation/order contract over MCP or HTTP.

**Tech stack:** Next.js 16, TypeScript, Supabase Auth/Postgres/Realtime, OpenAI Responses API with strict structured output, MCP Streamable HTTP, Zod, Vitest, Three.js, Vercel.

---

## 1. V0 player flow

1. Sign up or log in.
2. Complete a public player profile and private account preferences.
3. Create an AI installation:
   - Deterministic Baseline
   - Built-in OpenAI
   - External/BYO Agent
4. For BYO, select Claude, Codex, OpenClaw, Hermes, or Generic MCP and follow a tailored setup wizard.
5. Test the connection; the server confirms authentication and tool discovery without starting a game.
6. Create or join a 2–4 player match and select one connected AI installation for the seat.
7. Start the match. One player is active at a time.
8. The active AI receives a scoped turn-start observation and returns a bounded ordered move set.
9. The server validates and resolves those moves in order as one atomic player turn.
10. Supabase broadcasts public event deltas; every spectator updates without refreshing.
11. Control rotates to the next living player. A round ends after every living player has acted.
12. Players inspect turn traces, replay the match, and see verified stats after completion.

## 2. Sequential turn contract

Smash Droids v0 uses sequential player turns inspired by Polytopia, not simultaneous sealed turns.

- `activeSeatId` identifies the only player allowed to act.
- The active AI receives one immutable turn-start observation.
- It submits one ordered `MoveSet` containing zero to the configured maximum moves.
- Move order is semantically meaningful: later moves see the state produced by earlier accepted moves.
- Every move is independently validated against current intermediate state.
- An invalid move is rejected with a stable reason; it does not roll back earlier valid moves unless the entire envelope is malformed/stale/unauthorized.
- Units normally act once per player turn; action state resets when that seat becomes active again.
- Economy/build/recruit actions consume resources immediately and cannot overspend.
- `end_turn` is explicit; exhausting the move budget also ends the turn.
- On commit, control advances to the next living seat.
- Eliminated seats are skipped deterministically.
- `roundNumber` increments only when rotation crosses the round boundary after every living seat had an opportunity to act.
- Duplicate advance/submission idempotency keys return the original committed result.
- Network arrival time never changes results; only the declared move order within the active player's envelope does.

## 3. V0 game slice

Included:

- 2–4 players, bounded rounds/turns.
- Seeded spherical world artifact.
- HQ and territorial ownership.
- Credits, Industry, Supply.
- Outpost, factory, depot, radar.
- Recon, infantry, tank, artillery.
- Role-scoped fog and radar contact tracks.
- Moves: claim, build, recruit, move, recon, attack, guard, end_turn.
- Territory, production, supply, detection, movement, ranged combat, capture, score.
- Public events, private observations, deterministic replay.

Deferred:

- Aircraft, ships, satellites, research, diplomacy, weather, population simulation, multi-session campaigns, and multiple cooperating agents inside one seat.

Deferred mechanics are documented omissions and are not present as fake legal actions.

## 4. Accounts and login

### Authentication

Use Supabase Auth with:

- Email and password signup/login.
- Email verification.
- Password reset.
- Magic-link login.
- Server-managed session cookies using current Supabase SSR helpers.
- Protected routes and server-side authorization on every private read/mutation.

OAuth providers are deferred until their credentials and redirect domains are intentionally configured. No fake OAuth buttons.

### Public player profile

- Unique username and display name.
- Avatar URL using controlled storage or generated default.
- Join date.
- Public aggregate stats.
- Recent public matches subject to privacy setting.

### Private account settings

- Email/security links through Supabase Auth.
- Time zone and reduced-motion preferences.
- Match/realtime notification preferences.
- Default world seed visibility and autoplay speed.
- Preferred AI installation.
- Match-history visibility: public, unlisted, private.
- Connected AI installations and credential rotation/revocation.
- Account deletion/export workflow placeholders only when actually functional.

Never expose email, auth identities, provider credentials, API keys, token hashes, or private match traces in public profiles.

## 5. Player, AI, and match identity

Keep these identities distinct:

- `profile_id` — human account.
- `agent_installation_id` — a configured baseline/OpenAI/BYO connection owned by a profile.
- `agent_version_id` — immutable adapter/protocol/model/config identity used for a match.
- `match_seat_id` — one player/agent pairing in one match.
- `turn_id` — one committed active-player turn.

Changing an installation later never rewrites historical match identity.

### Agent installation metadata

- User-selected name.
- Adapter: baseline, built_in_openai, external_mcp.
- Client family: built_in, claude, codex, openclaw, hermes, generic.
- Protocol version and declared capabilities.
- Status: pending, connected, failing, revoked.
- Last successful handshake and last error class.
- No chain-of-thought, provider secret, or raw bearer credential.

## 6. Player and agent statistics

Stats update only from finalized authoritative matches and are reproducible from match results.

### Player stats

- Games played/completed/abandoned.
- Wins, losses, draws, win rate.
- Current and peak rating.
- Current and longest streak.
- Average finish and score differential.
- Territory captured, HQ captures, units lost/destroyed.
- Average turn latency.
- Baseline/OpenAI/BYO usage breakdown.

### Agent-version stats

- Games and record.
- Rating against other agent versions.
- Average score/territory/economy/combat metrics.
- Valid move rate and rejected-move reason distribution.
- Timeout/fallback rate.
- Average latency and model token usage where available.

### Rating

Use a documented deterministic rating update after match finalization. V0 may use multiplayer Elo with fixed initial rating and K factor. The formula, tie treatment, and participant ordering are versioned and golden-tested. A match finalization key prevents double-counting.

## 7. AI observation and move contract

### Turn-start observation

Each observation carries:

- Match, seat, turn, round, rules, world, state, and observation digests.
- Active-seat proof and deadline/budget.
- Owned territory, structures, units, resources, and unit action availability.
- Visible terrain/structures/enemies.
- Uncertain contact tracks with confidence, age, and source class.
- Legal move templates, entity IDs, costs, ranges, and hard move cap.
- Bounded recent public events.

It never includes hidden canonical state, another player's private observation/orders, credentials, or private model reasoning.

### MoveSet

- Match, seat, turn, observation digest.
- Idempotency key.
- Ordered typed moves.
- Optional short public rationale.

No prose is accepted as reducer input. Rationale is presentation metadata and cannot alter game state.

## 8. Complete turn trace

Every committed turn stores an immutable trace envelope:

- Rules/world/engine/schema identities.
- Match, round, active seat, player profile, agent installation, and immutable agent version.
- Turn-start canonical state digest.
- Exact private observation artifact ID and digest.
- Adapter/client/model identity and protocol version.
- Requested ordered move set.
- Per-move accepted/rejected status and stable reason.
- Canonical resulting events.
- Final state digest.
- Request/response latency, retry/fallback status, and token usage where available.
- Short public rationale if supplied.
- Server timestamps for audit only; timestamps do not influence deterministic resolution.

### Trace access

- Public spectators see public observation projections, accepted public moves/events, adapter labels, and public rationale.
- A seat owner can inspect that seat's historical private observations and rejected moves.
- Opponents never gain access to historical hidden observations merely because the game ends, unless an explicit future match setting permits disclosure.
- Administrators do not receive raw model chain-of-thought because it is never requested or stored.

## 9. Built-in AI

### Deterministic baseline

Always available, free, deterministic, and used for tests/failover. It builds an ordered legal move set using a fixed seeded policy:

1. Defend threatened HQ.
2. Restore supply.
3. Attack high-confidence vulnerable targets.
4. Expand into valuable legal territory.
5. Build/recruit within remaining budget.
6. Recon unexplored frontier.
7. End turn.

### Built-in OpenAI

- `OPENAI_API_KEY` is server-only and never uses a `NEXT_PUBLIC_*` name.
- Deployment selects `OPENAI_MODEL`; artifacts record the actual model snapshot/name returned.
- One request per built-in OpenAI seat turn.
- Strict structured output validated against the current MoveSet schema.
- Compact scoped observation; no hidden state or complete private replay.
- Hard timeout and response-token cap.
- At most one retry for transport/schema failure.
- Deterministic baseline fallback on failure.
- Store usage, latency, fallback reason, and short rationale—not chain-of-thought.
- Per-account and per-match budgets/rate limits.

V0 does not store user-provided provider API keys. BYO users run inference in their own client/environment.

## 10. BYO AI authentication

### Credential model

- Creating an external installation generates a high-entropy credential shown exactly once.
- Store only a keyed/slow hash, prefix, creation time, scopes, owner, expiry, and revocation state.
- Credential can authenticate only its installation and assigned match seats.
- Scope examples: `agent:observe`, `agent:submit`, `agent:events`, `agent:profile`.
- Rotate/revoke from account settings.
- Never put credentials in URLs, public logs, analytics, replays, screenshots, or generated documentation.
- Rate limit by credential, account, IP, and match.

### Connection handshake

`get_connection_status` confirms:

- Authentication.
- Account and installation identity.
- Protocol/rules compatibility.
- Tool availability.
- Current seat assignments.

It never returns the credential or private data unrelated to that installation.

## 11. MCP server and client setup wizard

Expose a standards-compliant Streamable HTTP endpoint:

- Production: `https://smashdroids.com/api/mcp`
- Authorization: `Bearer <installation credential>`
- Sampling disabled; Smash Droids never asks the connected client to run hidden server-initiated prompts.
- Stateless requests; match/turn/idempotency identities are explicit.

### MCP tools

- `get_connection_status()`
- `get_rules()`
- `list_assignments()`
- `get_match_status(match_id)`
- `get_observation(match_id)`
- `submit_move_set(match_id, turn_id, observation_digest, idempotency_key, moves, public_rationale?)`
- `watch_public_events(match_id, after_sequence)`
- `get_own_turn_trace(match_id, turn_id)`

### Setup wizard

The UI generates client-specific instructions from one canonical connection descriptor. Each guide includes endpoint, header/env handling, test command, expected tools, and revocation warning.

- **Claude:** current supported remote MCP connector/config shape; do not assume consumer subscription provides generic API credit.
- **Codex:** current supported MCP server configuration and secure environment-variable reference.
- **OpenClaw:** supported remote MCP configuration or local bridge only after validating its current config contract.
- **Hermes:** `mcp_servers.smashdroids.url` plus Authorization header sourced securely; include `hermes mcp test smashdroids`.
- **Generic:** Streamable HTTP endpoint, Bearer header, protocol/tool schemas, curl/SDK handshake example.

Client guides are versioned and tested against fixture parsers where practical. If a client's current configuration cannot be verified, show generic guidance rather than invented syntax.

### Connection bundle

A one-time downloadable/copyable bundle contains:

- Public endpoint.
- Protocol version.
- Installation ID/prefix.
- Client-specific non-secret config template.
- Separately displayed one-time credential.
- Test instructions.

The credential is never embedded in a file committed to source control. The wizard warns users to place it in the client's secret/environment store.

## 12. Supabase model

### Tables

- `profiles`
- `account_settings`
- `agent_installations`
- `agent_versions`
- `agent_credentials`
- `matches`
- `match_seats`
- `match_turns`
- `turn_observations`
- `requested_move_sets`
- `resolved_moves`
- `match_events`
- `match_snapshots`
- `agent_call_usage`
- `player_stats`
- `agent_version_stats`
- `rating_history`

### Security and integrity

- UUID primary keys and server sequence numbers.
- RLS on every user-facing table.
- Profiles expose only approved public columns.
- Owners control their settings/installations; credentials are write-only except metadata.
- Participants read only their private seat artifacts.
- Spectators read only public projections/events.
- Service role exists only in server routes and never reaches browser bundles.
- Unique active-turn and idempotency constraints.
- Atomic turn commit and atomic match finalization/stat update.
- Stats are derived from finalized matches and protected from client writes.

## 13. Realtime

Subscribe to public match-event inserts filtered by match ID. Events are compact deltas, not video.

- Every event has a monotonically increasing match sequence.
- Reconnect reads the latest public snapshot plus events after its sequence.
- Any gap triggers REST/RPC backfill before applying newer events.
- Private turn/observation updates use separate authorized channels or polling and never share the public payload.
- Presence is cosmetic and not simulation authority.

## 14. Atomic turn orchestration

`POST /api/matches/:id/turn`

1. Authenticate the owner/operator or active external installation.
2. Acquire the match active-turn lock.
3. Verify active seat, turn ID, observation digest, credential scope, and idempotency key.
4. For built-in seats, materialize observation and invoke the configured adapter.
5. Validate envelope and ordered moves.
6. Resolve moves sequentially through the pure reducer, recording each acceptance/rejection.
7. End the active player's turn.
8. Advance to the next living seat and update round if the rotation crossed its boundary.
9. Atomically write trace artifacts, events, snapshot/digest, usage, and next active-turn identity.
10. Broadcast public events after commit.
11. Return the original result for duplicate idempotency requests.

Autoplay invokes exactly one player turn at a time after observing the prior commit. No idle Vercel worker is required.

## 15. API routes

- `POST /api/auth/*` through Supabase-supported flows.
- `GET/PATCH /api/account/profile`
- `GET/PATCH /api/account/settings`
- `POST /api/account/agents`
- `POST /api/account/agents/:id/credential`
- `POST /api/account/agents/:id/test`
- `POST /api/account/agents/:id/revoke`
- `POST /api/matches`
- `GET /api/matches/:id`
- `POST /api/matches/:id/start`
- `POST /api/matches/:id/turn`
- `GET /api/matches/:id/events?after=`
- `GET /api/matches/:id/replay`
- `GET /api/matches/:id/trace`
- `POST /api/agent/observation`
- `POST /api/agent/moves`
- `POST /api/mcp`
- `GET /api/health`

All mutations require JSON, typed validation, body limits, rate limits, and server-side authorization. Browser mutations also validate Origin/CSRF posture appropriate to the session mechanism.

## 16. UI routes

### Authentication

- `/login`
- `/signup`
- `/forgot-password`
- `/auth/callback`

### Account

- `/account/profile`
- `/account/settings`
- `/account/agents`
- `/account/agents/new`
- `/account/agents/[id]/setup`
- `/players/[username]`

### Game

- `/play` — create/join match and select AI installation.
- `/matches/[id]` — public live globe, active-player status, timeline, roster, events, autoplay.
- `/matches/[id]/trace` — public trace projection.
- `/matches/[id]/seat/[seatId]` — authorized private observation/trace.

The live UI visibly distinguishes waiting, thinking, resolving, committed, fallback, disconnected, and complete states.

## 17. Local-first mode

Without Supabase, a memory/file adapter runs demo matches with guest local identities and baseline agents. Login, durable stats, credential issuance, external remote MCP, and cloud Realtime clearly show as unavailable—not simulated. OpenAI activates only when a server-side key exists.

## 18. Cost controls

- Baseline agents default and remain free.
- Maximum four seats and bounded rounds/moves.
- One OpenAI request per OpenAI player turn.
- Compact observations and strict response cap.
- No paid spectator commentary.
- Static world bundles and compact event deltas.
- No idle workers.
- Usage/account budgets and deterministic fallback.
- Trace retention separates compact canonical data from optional derived presentation.

## 19. Implementation sequence

1. **World/globe foundation:** finish and verify deterministic artifact/rendering only.
2. **Sequential rules core:** schemas, reducer, replay, baseline agent, OpenAI adapter; 100-match smoke.
3. **Auth/account vertical slice:** Supabase login/session, profiles, settings, protected routes, RLS.
4. **Agent installation/authentication:** credential lifecycle, handshake, installation/version identity.
5. **MCP and setup wizard:** canonical MCP server plus verified Claude/Codex/OpenClaw/Hermes/Generic guides.
6. **Persistence and turn transaction:** memory contract, Supabase schema/RPC, trace artifacts, idempotency.
7. **Realtime:** public event stream, sequence gap detection, backfill, two-browser test.
8. **Lobby/live match/trace/stats UI:** complete user loop and finalized stats.
9. **Review/deploy:** rules review, security review, push, Vercel import, Supabase migration, production smoke and log inspection.

## 20. Acceptance gates

- Signup, verification, login, logout, password reset, and session persistence work in production.
- Account profile/settings enforce public/private boundaries.
- External credential is shown once, stored only hashed, testable, rotatable, revocable, and scope-limited.
- Claude, Codex, OpenClaw, Hermes, and Generic setup pages contain verified current configuration or explicitly fall back to generic guidance.
- A BYO client authenticates, observes its active turn, and submits a move set without seeing another seat's private data.
- A baseline/OpenAI mixed match completes sequential turns correctly.
- OpenAI produces valid moves or deterministically falls back without stalling.
- Two browser sessions receive live turn events without refresh and correctly recover a sequence gap.
- Every turn is traceable from observation digest through requested/resolved moves to resulting state digest.
- Public trace/replay contains no hidden observations, token material, provider secrets, or chain-of-thought.
- Duplicate/concurrent turn requests commit exactly once.
- Finalization updates player and immutable agent-version stats exactly once and is reproducible.
- Full tests, typecheck, lint, build, dependency audit, 100-match replay smoke, rules/spec review, and code/security review pass.
- Vercel production deployment and Supabase advisors/logs are clean.
