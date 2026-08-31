# Epic Playable V0 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the weak brochure with a cinematic Smash Droids landing page, production Supabase authentication, and an authenticated deterministic hex-tile tutorial battle.

**Architecture:** Next.js App Router with Supabase SSR for identity and protected routes. A pure TypeScript deterministic tutorial engine owns axial hex geometry, legality, sequential turn resolution, baseline AI, and event output; a client game surface renders semantic SVG hex buttons and maps events to distinct CSS/SVG effects. Tutorial state is local for v0, so no live database migration is required.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase SSR/JS, Vitest, SVG, CSS animations.

---

### Task 1: Test harness and public configuration
**Files:** modify `apps/web/package.json`, create `apps/web/vitest.config.ts`, copy safe ignored `.env.local` into worktree only.
1. Add Vitest test script and dependencies.
2. Run install and prove an intentionally failing smoke test fails.
3. Remove smoke test after harness verification.

### Task 2: Deterministic axial-hex tutorial engine
**Files:** create `apps/web/src/lib/game/tutorial.test.ts`, then `apps/web/src/lib/game/tutorial.ts`.
1. RED: tests assert pointy-top axial coordinates, six-neighbor adjacency, legal move/attack/guard/radar actions, bounded ordered command resolution, turn rotation, deterministic baseline AI, immutable event output, and terminal victory.
2. GREEN: implement minimal pure engine and rules identity `smashdroids-tutorial/1`, ABI 1, geometry `axial-hex-v1`.
3. Verify focused and full tests.

### Task 3: Safe Supabase authentication
**Files:** create tests under `apps/web/src/lib/auth/*.test.ts`; create `apps/web/src/lib/auth/*`, `apps/web/src/lib/supabase/*`, `apps/web/src/proxy.ts`, `apps/web/src/app/auth/callback/route.ts`.
1. RED: tests for same-origin safe `next` path, generic auth messages, required public env parsing.
2. GREEN: browser/server clients, cookie refresh proxy, callback exchange with fixed-origin redirect.
3. Verify no secret key enters browser code.

### Task 4: Login and protected play routes
**Files:** create `apps/web/src/app/login/page.tsx`, `apps/web/src/app/login/actions.ts`, `apps/web/src/app/play/page.tsx`, `apps/web/src/app/play/actions.ts`.
1. RED: product-contract tests assert landing and login-to-play copy/links and no obsolete square/simultaneous language.
2. GREEN: server actions for sign-up/sign-in/sign-out; authenticated `/play` redirect; generic errors.
3. Verify unauthenticated redirect and authenticated server rendering.

### Task 5: Cinematic landing and interactive hex battle
**Files:** replace `apps/web/src/app/page.tsx`, `globals.css`, update `layout.tsx`; create `apps/web/src/components/planet-hexes.tsx`, `tutorial-battle.tsx`, `action-effects.tsx`.
1. Build a Decide/Learn landing surface flowing into an Operate game surface.
2. Use semantic SVG hex buttons, visible spherical curvature, sharp black/spectral/acid palette, responsive layout, reduced-motion handling.
3. Wire click actions to the pure reducer and baseline AI; map move/attack/capture/guard/radar events to unique effects.
4. Add versioned `apps/web/public/assets/gameplay/manifest.json` with GPT Image provenance slots and procedural fallback declarations.

### Task 6: Verification and release
1. Run tests, typecheck, lint, production build, audit, secret scan, and `git diff --check`.
2. Browser QA landing/login/play at desktop and mobile; inspect console and keyboard/focus behavior.
3. Independent spec review, code/security review, and design slop audit; fix Critical/Important findings.
4. Commit, push to `main`, verify Vercel deployment, apex HTTP/TLS, login route, and production content.
