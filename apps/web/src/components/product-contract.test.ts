import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Spherefall product contract", () => {
  it("routes PLAY NOW through authentication and two-step onboarding", () => {
    const landing = read("src/app/page.tsx");
    const login = read("src/app/login/page.tsx");
    const onboarding = read("src/components/command-onboarding.tsx");
    expect(landing).toContain("PLAY NOW");
    expect(landing).toContain("DETERMINISTIC SPHERICAL COMBAT");
    expect(landing).toContain("stack up to four legal commands");
    expect(landing).toContain("SPHEREFALL-OP1-V1 · ABI 2");
    expect(landing).not.toMatch(/axial|three legal commands|ABI 1/i);
    expect(landing).toContain("/login?next=/onboarding");
    expect(login).toContain('"/onboarding"');
    const onboardingAction = read("src/app/onboarding/actions.ts");
    expect(onboarding).not.toMatch(/instinct|doctrine/i);
    expect(onboardingAction).not.toMatch(/instinct|doctrine/i);
    expect(onboarding).toContain("step {step + 1} of 2");
    expect(onboarding).toContain('aria-describedby="callsign-help"');
    expect(onboarding).toContain('role="status"');
    expect(onboarding).toContain("ROTATABLE GEODESIC WORLD");
    expect(onboarding).toContain("Stack up to four orders");
    expect(onboarding).toContain("/play");
    expect(onboardingAction).toContain('store.set("sd_onboarded_user", user.id');
    expect(read("src/app/play/page.tsx")).toContain('store.get("sd_onboarded_user")?.value !== user.id');
  });

  it("serves the spherical battle instead of the retired flat surface", () => {
    const page = read("src/app/play/page.tsx");
    const battle = read("src/components/spherefall-battle.tsx");
    expect(page).toContain("SpherefallBattle");
    expect(page).not.toContain("TutorialBattle");
    expect(battle).toContain("projectGlobeTiles");
    expect(battle).toContain("SPHERE_TOPOLOGY");
    expect(battle).toContain("onPointerMove");
    expect(battle).toContain("rotateWithKeyboard");
    expect(battle).toContain('aria-label="Rotatable spherical battlefield"');
    expect(battle).toContain('role="region"');
    expect(battle).not.toContain('role="application"');
    expect(battle).toContain("globe-focus-tile");
    expect(battle).toContain("aria-label={tileLabel");
    expect(battle).toContain("observedUnits");
    expect(battle).toContain("spherefallObservation");
    expect(battle).toContain("projectSpherefallCommands(planningState");
    expect(battle).toContain('new Set(game ? visibleTileIds(game, "player") : [])');
    expect(battle).not.toContain('visibleTileIds(view, "player")');
    expect(battle).not.toMatch(/tutorial|prototype|demo/i);
  });

  it("ships responsive, non-color-only, reduced-motion globe controls", () => {
    const css = read("src/app/globals.css");
    const battle = read("src/components/spherefall-battle.tsx");
    expect(css).toContain(".spherefall-globe");
    expect(css).toContain(".sphere-tile.is-legal");
    expect(css).toContain("@media(max-width:1050px)");
    expect(css).toContain("@media(max-width:780px)");
    expect(css).toContain("@media(max-width:520px)");
    expect(css).toContain("prefers-reduced-motion");
    expect(battle).toContain("is-selected");
    expect(battle).toContain("is-legal");
    expect(battle).toContain('aria-live="polite"');
  });
});
