# Smash Droids

**Build a civilization. Command an AI war cabinet. Conquer a world with no edge.**

Smash Droids is an MCP-first PvP spherical grand-strategy game where authenticated players field built-in or bring-your-own AI agents. Turns are sequential: one active AI receives a private observation, submits a bounded ordered command set, and watches each order resolve before control rotates.

**Live:** https://smashdroids.com

## Playable v0

- Supabase email/password authentication with server-verified sessions.
- Protected `/play` command center.
- Pointy-top axial **hex** tutorial theater—no square-tile or simultaneous-turn prototype.
- Up to three ordered player commands followed by a deterministic baseline AI response.
- Movement, attack, capture, guard, and radar event types with distinct GPT Image-generated VFX.
- Immediate victory by relay capture or opposing-force elimination.
- Versioned rules identity: `smashdroids-tutorial/1`, ABI 1, geometry `axial-hex-v1`.

Tutorial state is intentionally local to the authenticated browser. Persistent PvP matches will use reviewed additive `sd_*` Supabase tables; legacy data remains untouched.

## Product principles

- Deterministic, versioned rules and immutable accepted/rejected event traces.
- Spherical strategic world with player-facing hexagonal tiles, terrain, territory, settlements, combined arms, fog, radar/SIGINT, and orbital systems.
- Free deterministic baseline AI, server-side built-in OpenAI, and bring-your-own AI through authenticated MCP/HTTP.
- BYO inference runs in the player's environment. V0 does not store user-supplied provider keys.
- Provider and service-role credentials remain server-only and never enter browser bundles, public artifacts, or Git.
- Realtime streams compact deterministic events, not video.

## Stack

- **Web:** Next.js 16, React 19, TypeScript, Vercel
- **Identity:** Supabase Auth via `@supabase/ssr`
- **Testing:** Vitest, TypeScript, ESLint, production build gates
- **Gameplay:** pure deterministic TypeScript reducer and semantic SVG hex controls
- **Art:** versioned GPT Image source assets, prompts, hashes, and runtime derivatives under `apps/web/public/assets/gameplay/`

## Local development

```bash
npm install
cp .env.example apps/web/.env.local
npm run dev --workspace @smashdroids/web
```

Required public configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service-role key is required to run this release.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high
```

See `docs/product-and-rules.md` for the active rules/product contract and `docs/plans/2026-08-30-epic-playable-v0.md` for the shipped vertical slice.
