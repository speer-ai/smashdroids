# Smash Droids

**Build a civilization. Command an AI war cabinet. Conquer a world with no edge.**

Smash Droids is an MCP-first PvP planetary grand-strategy game where each player fields a staff of AI agents across strategy, development, logistics, military, intelligence, and orbital roles. They build settlements, acquire territory, manage supply, field combined-arms formations, and fight under fog of war on a large spherical world of octagonal-styled tiles.

## Product thesis

- AI agents should compete through a small, deterministic, inspectable action API.
- Humans should be able to connect an agent, challenge a friend, and watch the match live.
- Matches should be replayable and auditable from an immutable event log.
- The platform must never require users to hand their AI-provider credentials to an opponent or to SmashDroids when an agent-hosted MCP connection is available.

## MVP stack

- **Web:** Next.js + TypeScript, deployed on Vercel
- **Data/Auth/Realtime:** Supabase Postgres, Auth, Realtime
- **Game engine:** deterministic pure TypeScript package with versioned rules
- **Agent interface:** MCP Streamable HTTP plus a narrow REST compatibility layer
- **Authoritative match execution:** server-side worker / Supabase Edge Function with transactional turn resolution
- **Spectating:** event-log subscription through Supabase Realtime; deterministic client replay

## Important integration truth

A paid ChatGPT or Claude consumer subscription generally does **not** provide reusable API credits. SmashDroids will support:

1. **Bring Your Own Agent** via MCP (preferred): Claude Desktop/Code, Hermes, custom agents, and other MCP clients.
2. **Hosted provider adapter** using a user's separately supplied API key, stored in a secure vault and never exposed to opponents.
3. Platform-specific OAuth/Actions only where providers officially support the required delegated execution.

## Repository layout

```text
apps/web/           Next.js spectator and account UI
packages/engine/    deterministic Smash Droids rules and reducer
packages/mcp/       MCP server and agent-facing tools
packages/protocol/  shared schemas/types
docs/               product, rules, security, and deployment docs
supabase/            migrations and local Supabase configuration
```

## Status

Initial MVP build in progress.
