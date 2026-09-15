import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "vitest";
import { parseWorldArtifact } from "../../../../packages/world/src/index.js";
import { buildRenderBuffers, pickLogicalTile, type Vec3 } from "./world-geometry.js";

const world = parseWorldArtifact(readFileSync(resolve(import.meta.dirname, "../../public/worlds/demo-world.json"), "utf8"));
const normalize = ([x, y, z]: Vec3): Vec3 => {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
};
const blend = (a: Vec3, b: Vec3, weightA: number): Vec3 => normalize([
  a[0] * weightA + b[0] * (1 - weightA),
  a[1] * weightA + b[1] * (1 - weightA),
  a[2] * weightA + b[2] * (1 - weightA),
]);
const radialRay = (target: Vec3) => ({ origin: [target[0] * 3, target[1] * 3, target[2] * 3] as Vec3, direction: [-target[0], -target[1], -target[2]] as Vec3 });

describe("world geometry render buffers", () => {
  test("checked-in artifact builds one merged display buffer with stable logical triangle ownership", () => {
    const buffers = buildRenderBuffers(world);
    assert.equal(buffers.triangles.length, 1536 * 8 * 3 * 3);
    assert.equal(buffers.colors.length, buffers.triangles.length);
    assert.equal(buffers.boundaries.length, 1536 * 8 * 2 * 3);
    assert.equal(buffers.logicalHitTriangles.length, 1536 * 4 * 3 * 3);
    assert.equal(buffers.logicalTriangleTileIds.length, 1536 * 4);
    assert.equal(new Set(buffers.logicalTriangleTileIds).size, 1536);
    assert.ok([...buffers.triangles, ...buffers.boundaries, ...buffers.logicalHitTriangles].every(Number.isFinite));
  });

  test("a central ray is owned by the stable logical tile", () => {
    const tile = world.tiles.find(({ id }) => id === "cs1/0/0/8/8")!;
    const ray = radialRay(tile.center);
    assert.equal(pickLogicalTile(buildRenderBuffers(world), ray.origin, ray.direction), tile.id);
  });

  test("a bevel-gap ray remains owned by the full logical quad", () => {
    const tile = world.tiles.find(({ id }) => id === "cs1/0/0/8/8")!;
    const insideCorner = blend(tile.logicalQuad[0]!, tile.center, 0.94);
    const ray = radialRay(insideCorner);
    assert.equal(pickLogicalTile(buildRenderBuffers(world), ray.origin, ray.direction), tile.id);
  });

  test("a seam-adjacent ray maps to the intended face tile", () => {
    const tile = world.tiles.find(({ id }) => id === "cs1/0/0/8/0")!;
    const seamMidpoint = normalize([
      tile.logicalQuad[0]![0] + tile.logicalQuad[3]![0],
      tile.logicalQuad[0]![1] + tile.logicalQuad[3]![1],
      tile.logicalQuad[0]![2] + tile.logicalQuad[3]![2],
    ]);
    const justInside = blend(seamMidpoint, tile.center, 0.94);
    const ray = radialRay(justInside);
    assert.equal(pickLogicalTile(buildRenderBuffers(world), ray.origin, ray.direction), tile.id);
  });
});
