import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, test } from "vitest";
import { parseWorldArtifactBrowser } from "../../../../packages/world/src/validation.js";

const artifactPath = resolve(import.meta.dirname, "../../public/worlds/demo-world.json");

describe("browser world artifact validator", () => {
  test("browser-compatible validator verifies the checked-in artifact with Web Crypto", async () => {
    const serialized = await readFile(artifactPath, "utf8");
    const world = await parseWorldArtifactBrowser(serialized);
    assert.equal(world.tiles.length, 1536);
    assert.equal(world.digest, "a3d3b011b7ca2b211c2806a31c519a1c3da4686fd522c5e40a33ef5e46dfa6fc");
  });

  test("browser-compatible validator rejects tampering before rendering", async () => {
    const serialized = await readFile(artifactPath, "utf8");
    const tampered = JSON.parse(serialized);
    tampered.tiles[0].elevation += 0.001;
    await assert.rejects(parseWorldArtifactBrowser(JSON.stringify(tampered)), /digest mismatch/i);
  });
});
