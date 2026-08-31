# Spherical World V1 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the flat 37-cell operation with a rotatable 92-cell mostly-hex spherical campaign featuring terrain, six clans, six troop classes, deeper deterministic strategy, and managed GPT Image assets.

**Architecture:** A frequency-3 subdivided icosahedron supplies 92 stable spherical tile centers and a closed triangular dual: 80 degree-6 hex tiles plus the mathematically required 12 degree-5 pentagons. A new immutable rules ABI owns topology IDs, terrain, units, resources, fog, sequential projected commands, events, and deterministic AI. React renders the front hemisphere as projected spherical Voronoi cells, while pointer/touch/quaternion-like rotation changes only presentation—not game state.

**Tech Stack:** Next.js 16, React 19, TypeScript, SVG/DOM projection, Vitest, official OpenAI Images API (`gpt-image-2`) for managed art generation.

---

## Release contract

- Worktree: `/Users/nickspeer/.hermes/worktrees/smashdroids-spherical-v1`
- Branch: `feat/spherical-world-v1`
- Base release: `643c3273288a94b2e60ed97c2a3ec6393451f1b0`
- Ruleset: `smashdroids-sphere/1`, ABI 2, geometry `icosphere-voronoi-f3`
- World: 92 cells, 80 hexagons, 12 pentagons, 270 adjacency edges, no boundary or seam.
- Command resolution remains ordered and sequential against projected intermediate state.
- Clan art is visual/lore identity; faction bonuses are small, explicit, deterministic, and tested.
- No OpenAI credential enters source control, browser bundles, Vercel public variables, or client code.

### Task 1: Implement canonical spherical topology

**Objective:** Produce a deterministic frequency-3 icosphere/Voronoi topology with stable tile IDs and exact invariants.

**Files:**
- Create: `apps/web/src/lib/world/sphere.ts`
- Create: `apps/web/src/lib/world/sphere.test.ts`

**Steps:**
1. Write RED tests for 92 vertices, 180 dual triangles, 270 edges, Euler 2, degree distribution `{5:12,6:80}`, symmetric adjacency, stable IDs, unit-length centers, ordered Voronoi corners, and no edge with other than two incident faces.
2. Run the focused test and verify it fails because the module is absent.
3. Implement normalized icosahedron subdivision, rounded coordinate deduplication, triangle generation, stable center sorting, adjacency, and tangent-plane corner ordering.
4. Re-run focused and full tests.

### Task 2: Define terrain, clans, troops, and weapons

**Objective:** Establish immutable catalogs and deterministic seeded world generation.

**Files:**
- Create: `apps/web/src/lib/game/catalog.ts`
- Create: `apps/web/src/lib/game/catalog.test.ts`
- Create: `apps/web/src/lib/game/world-generation.ts`
- Create: `apps/web/src/lib/game/world-generation.test.ts`

**Terrain:** ocean, plains, forest, desert, highlands, tundra.

**Troops:** vanguard, ranger, armor, artillery, drone, titan.

**Weapon profiles:** pulse rifle, arc blades, rail cannon, siege missiles, recon beam, fusion lance.

**Canonical faction names:** Neo Romans, Germanoids, XiRen, Hoshikage, Solandinos, Zoryani. These left-hand names are the primary player-facing identity everywhere. Aureate Cohort, Forgewood Union, Celestial Weave, Folded Circuit, Sunriver Concord, and Aurora Foundry are optional secondary subtitles only; they never replace the canonical names.

**Steps:**
1. Write RED tests for six unique terrain IDs, clans, troop classes, weapons, palette/emblem metadata, bounded clan modifiers, movement/defense/range profiles, deterministic generation, all terrain classes present, protected land spawns/objectives, and immutable catalogs.
2. Implement the minimal catalogs and seeded generator.
3. Verify tests and canonical catalog digest.

### Task 3: Build the spherical deterministic reducer

**Objective:** Replace axial coordinates with tile IDs and add terrain-aware movement, ranged combat, economy, control, visibility, and deterministic AI.

**Files:**
- Create: `apps/web/src/lib/game/spherical-operation.ts`
- Create: `apps/web/src/lib/game/spherical-operation.test.ts`
- Create: `apps/web/src/lib/game/spherical-command-description.ts`
- Create: `apps/web/src/lib/game/spherical-command-description.test.ts`

**Rules:**
- Each side starts with six troop classes, one headquarters, command energy, and explored territory.
- Movement uses deterministic shortest legal paths over topology adjacency and terrain costs.
- Ocean blocks ground units; drones can cross it; faction/terrain modifiers remain bounded.
- Attacks use weapon range, terrain defense, guard, and deterministic damage.
- Radar reveals hidden tiles; fog is derived from unit sight plus radar events.
- Three neutral relays and resource nodes generate energy.
- Ordered commands share projection/resolution semantics.
- Victory: eliminate the opposing command core or hold at least two relays for two consecutive own turns.
- Baseline AI prioritizes legal kills, endangered relays, captures, attacks, resource-efficient movement, then guard/radar using stable tie-breaks.

**Steps:**
1. RED tests for pathfinding over the sphere, movement across original face boundaries, terrain costs, ocean restrictions, ranged attacks, defense modifiers, fog/radar, resource income, control streak victory, immutable nested paths/events, command-energy bounds, sequential projection, and deterministic AI.
2. Implement reducer and descriptions.
3. Verify focused and full tests.

### Task 4: Build rotatable spherical rendering

**Objective:** Render the actual spherical topology with terrain/troop tiles and accessible rotation/navigation.

**Files:**
- Create: `apps/web/src/components/spherical-world.tsx`
- Create: `apps/web/src/components/spherical-world.test.ts`
- Create: `apps/web/src/components/spherical-battle.tsx`
- Modify: `apps/web/src/app/play/page.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interaction:**
- Pointer/touch drag rotates pitch/yaw with bounded pitch and inertial-free deterministic release.
- Keyboard rotation controls and a reset-view button are always available.
- Orthographic projection renders front-hemisphere Voronoi cells with depth sorting and atmospheric limb treatment.
- Visible tiles expose roving 44px DOM buttons aligned to projected centers.
- Terrain is readable by texture/icon as well as color.
- Troops use class silhouette, clan emblem, health, and side marker.
- Legal routes, attack ranges, objectives, fog, and queued paths are visible and non-color-only.
- Reduced motion disables animated rotation/effects without removing state feedback.

**Steps:**
1. RED source/behavior tests for spherical projection, culling, drag rotation, keyboard rotation, reset, 44px controls, terrain classes, troop classes, and no flat axial board contract.
2. Implement projection and battle shell.
3. Browser-verify desktop, 390px, and 320px layouts plus keyboard-only use.

### Task 5: Add clan draft and campaign identity

**Objective:** Let every player—including already-onboarded users—choose a clan before deploying.

**Files:**
- Create: `apps/web/src/components/clan-draft.tsx`
- Create: `apps/web/src/components/clan-draft.test.ts`
- Modify: `apps/web/src/components/spherical-battle.tsx`
- Modify: `apps/web/src/components/command-onboarding.tsx`
- Modify: `apps/web/src/app/globals.css`

**Steps:**
1. RED tests for six selectable clans, keyboard radio semantics, lore/doctrine presentation, explicit small gameplay modifier, enemy-clan deterministic selection, and local profile persistence.
2. Implement a pre-deployment clan draft modal shown when no clan is stored, with “Change clan / New campaign” available later.
3. Extend onboarding briefing copy to describe spherical geometry without invalidating existing authenticated onboarding markers.
4. Verify focus trapping/restoration and mobile card layout.

### Task 6: Establish GPT Image API tooling and provenance

**Objective:** Generate consistent faction and troop art without browser automation when a server-side key is available.

**Files:**
- Create: `scripts/generate-game-art.mjs`
- Create: `art/prompts/spherical-world-v1.json`
- Create: `apps/web/public/assets/factions/manifest.json`
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`

**Steps:**
1. Add a dry-run/manifest test or script validation that requires no key and prints planned `gpt-image-2` requests.
2. Implement official OpenAI Images API calls from a local Node script only; read `OPENAI_API_KEY` from process environment; never expose it to Next.js.
3. Generate square faction key art and transparent troop-token sheets when credentials are present. Until then, retain prompts and use browser GPT Image generation as a provenance-recorded fallback.
4. Record model, prompt, date, source dimensions, derivatives, and SHA-256 for every output.

### Task 7: Integrate faction, terrain, and troop graphics

**Objective:** Give each clan and unit class a consistent visual identity while keeping gameplay state legible.

**Files:**
- Add: `apps/web/public/assets/factions/*`
- Add: `apps/web/public/assets/terrain/*`
- Add: `apps/web/public/assets/troops/*`
- Modify: `apps/web/src/components/clan-draft.tsx`
- Modify: `apps/web/src/components/spherical-world.tsx`
- Modify: `apps/web/src/app/globals.css`

**Steps:**
1. Generate or derive web-optimized AVIF/WebP/PNG assets from managed sources.
2. Integrate terrain textures, faction key art, emblems, and troop silhouettes without making color the only distinction.
3. Verify every manifest digest and browser-load every production asset.

### Task 8: Update product/rules documentation

**Objective:** Make the expanded operation contract truthful and remove obsolete flat-board language.

**Files:**
- Modify: `docs/product-and-rules.md`
- Modify: `README.md`
- Modify: `apps/web/src/components/product-contract.test.ts`

**Steps:**
1. RED contract assertions for spherical topology, terrain, clans, troop classes, sequential reducer, and generated asset provenance.
2. Document V1 implemented scope versus future persistent PvP/MCP scope.
3. Verify no player-facing tutorial/demo/prototype copy.

### Task 9: Final verification and release

**Objective:** Ship only an approved exact tree.

**Checks:**
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- `npm audit --omit=dev`
- canonical topology hash/invariants
- asset manifest SHA-256 verification
- secret scan on added lines
- desktop/mobile browser smoke
- pointer, touch, keyboard, reduced-motion, and screen-reader semantics
- independent rules/spec review
- independent security/code-quality review
- independent visual/accessibility review

After zero Critical/Important findings, commit the exact approved tree, push public `main`, verify Vercel Production success, apex 200, `www` 308, protected auth routes, spherical release marker, and deployed asset hashes.
