import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const component = readFileSync(resolve(import.meta.dirname, "spherefall-battle.tsx"), "utf8");

describe("Spherefall battle product contract", () => {
  it("integrates faction art, terrain, troop tokens, and canonical spherical controls", () => {
    expect(component).toContain("CLANS.map");
    expect(component).toContain("clan.name");
    expect(component).toContain("clan.subtitle");
    expect(component).toContain("projectGlobeTiles");
    expect(component).toContain("onPointerMove");
    expect(component).toContain("onKeyDown={rotateWithKeyboard}");
    expect(component).toContain('aria-label="Rotatable spherical battlefield"');
    expect(component).toContain("/assets/terrain/");
    expect(component).toContain("/assets/factions/tokens/");
    expect(component).not.toMatch(/tutorial|prototype|demo/i);
  });
});
