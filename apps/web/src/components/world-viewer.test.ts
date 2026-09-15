import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("world artifact viewer contract", () => {
  test("the shipped artifact has a mounted route that renders it", () => {
    assert.ok(existsSync(resolve(root, "public/worlds/demo-world.json")), "demo-world.json must ship in public/worlds");

    const routePath = resolve(root, "src/app/world/page.tsx");
    assert.ok(existsSync(routePath), "/world route must exist so the artifact stays reachable");
    const page = readFileSync(routePath, "utf8");
    expect(page).toContain("WorldGlobe");
  });

  test("the globe render path verifies the artifact before rendering", () => {
    const globe = read("src/components/world-globe.tsx");
    expect(globe).toContain("loadVerifiedWorld");
    expect(globe).toContain("/worlds/demo-world.json");
    // A raw JSON parse would bypass the digest check entirely.
    expect(globe).not.toMatch(/response\.json\(\)/);
  });

  test("the globe viewer is styled under the current design system", () => {
    const css = read("src/app/globals.css");
    for (const selector of [".globe-shell", ".globe-host", ".globe-canvas", ".world-layout", ".swatch.ocean"]) {
      expect(css).toContain(selector);
    }
  });

  test("three is a declared dependency with type declarations", () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.three).toBeDefined();
    expect(pkg.devDependencies?.["@types/three"]).toBeDefined();
  });
});
