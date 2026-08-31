import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG_CANONICAL_JSON, CATALOG_DIGEST, CLANS, RULESET_ID, TERRAIN, TROOPS, WEAPONS } from "./catalog";

describe("Spherefall catalog", () => {
  it("keeps canonical faction names primary and subtitles secondary", () => {
    expect(CLANS.map(({ name, subtitle }) => [name, subtitle])).toEqual([
      ["Neo Romans", "Aureate Cohort"],
      ["Germanoids", "Forgewood Union"],
      ["XiRen", "Celestial Weave"],
      ["Hoshikage", "Folded Circuit"],
      ["Solandinos", "Sunriver Concord"],
      ["Zoryani", "Aurora Foundry"],
    ]);
  });

  it("defines the bounded rules catalog deterministically", () => {
    expect(RULESET_ID).toBe("spherefall-op1-v1");
    expect(TERRAIN).toHaveLength(6);
    expect(TROOPS).toHaveLength(6);
    expect(WEAPONS).toHaveLength(6);
    expect(CATALOG_DIGEST).toBe("f0e2e7ae27da7e54b722e9bbe7519a8c113b85a2b17cdccccb53ee39b4db6c6a");
    expect(JSON.parse(CATALOG_CANONICAL_JSON).rulesetId).toBe(RULESET_ID);
  });

  it("keeps generated-art provenance subtitles canonical", () => {
    const root = resolve(import.meta.dirname, "../../../../..");
    for (const relative of ["art/prompts/spherical-world-v1.json", "apps/web/public/assets/factions/manifest.json"]) {
      const source = readFileSync(resolve(root, relative), "utf8");
      for (const subtitle of CLANS.map((clan) => clan.subtitle)) {
        expect(source).toContain(`\"subtitle\": \"${subtitle}\"`);
        expect(source).not.toContain(`\"subtitle\": \"The ${subtitle}\"`);
      }
    }
  });
});
