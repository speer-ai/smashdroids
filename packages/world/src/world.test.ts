import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BIOMES,
  canonicalJson,
  generateWorld,
  parseWorldArtifact,
  serializeWorld,
  summarizeWorld,
  type Vec3,
} from "./index.js";

const length = ([x, y, z]: Vec3) => Math.hypot(x, y, z);
const DEMO_SEED = "smash-droids-public-demo-v1";

test("resolution 16 produces the exact sorted stable cs1 tile set", () => {
  const world = generateWorld({ resolution: 16, seed: DEMO_SEED });
  const expectedIds = Array.from({ length: 6 }, (_, face) => Array.from({ length: 16 }, (_, row) => Array.from({ length: 16 }, (_, col) => `cs1/0/${face}/${row}/${col}`))).flat(2);
  assert.deepEqual(world.tiles.map((tile) => tile.id), expectedIds);
  assert.deepEqual(world.metadata.dimensions, { faces: 6, resolution: 16, tileCount: 1536 });
});

test("world declares the fixed compatibility identities", () => {
  const world = generateWorld({ resolution: 4, seed: DEMO_SEED });
  assert.equal(world.generatorVersion, "@smashdroids/world@0.1.0");
  assert.deepEqual({ ...world.geometry, areaDistortion: undefined }, {
    id: "cs1", abi: 1, projection: "normalized-cube-sphere-v1", equalArea: false,
    renderedCell: "inset-beveled-octagon", logicalCell: "cubed-sphere-quad", areaDistortion: undefined,
  });
  assert.deepEqual(world.rules, { movementTopology: "edge-4", diagonalMovementEncoded: false });
});

test("logical quads, centers, and eight bevel vertices lie on the unit sphere", () => {
  const world = generateWorld({ resolution: 16, seed: DEMO_SEED });
  for (const tile of world.tiles) {
    assert.ok(Math.abs(length(tile.center) - 1) < 1e-12, tile.id);
    assert.equal(tile.logicalQuad.length, 4, tile.id);
    for (const vertex of tile.logicalQuad) assert.ok(Math.abs(length(vertex) - 1) < 1e-12, tile.id);
    assert.equal(tile.polygon.length, 8, tile.id);
    for (const vertex of tile.polygon) assert.ok(Math.abs(length(vertex) - 1) < 1e-12, tile.id);
  }
});

test("terrain fields and assigned biomes are valid", () => {
  const world = generateWorld({ resolution: 16, seed: DEMO_SEED });
  for (const tile of world.tiles) {
    for (const field of [tile.elevation, tile.moisture, tile.temperature]) assert.ok(Number.isFinite(field));
    assert.ok(BIOMES.includes(tile.biome));
  }
});

test("logical quad topology has four seam-safe symmetric neighbors and is connected", () => {
  const world = generateWorld({ resolution: 16, seed: DEMO_SEED });
  const byId = new Map(world.tiles.map((tile) => [tile.id, tile]));
  for (const tile of world.tiles) {
    assert.equal(tile.neighbors.length, 4, tile.id);
    assert.equal(new Set(tile.neighbors).size, 4, tile.id);
    assert.deepEqual(tile.neighbors, [...tile.neighbors].sort(), tile.id);
    for (const neighbor of tile.neighbors) assert.ok(byId.get(neighbor)?.neighbors.includes(tile.id), `${tile.id} -> ${neighbor}`);
  }
  const seen = new Set<string>();
  const queue = [world.tiles[0]!.id];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...byId.get(id)!.neighbors);
  }
  assert.equal(seen.size, world.tiles.length);
  assert.equal(world.metadata.topology.exceptions.cubeVertices, 8);
});

test("HQ source evidence preserves viable pre-urban biomes", () => {
  const world = generateWorld({ resolution: 16, seed: DEMO_SEED });
  assert.ok(world.hqCandidates.length >= 6);
  assert.deepEqual(world.hqSources.map(({ id }) => id), world.hqCandidates);
  for (const source of world.hqSources) assert.ok(["plains", "forest", "desert", "wetland"].includes(source.biome), `${source.id}: ${source.biome}`);
  const byId = new Map(world.tiles.map((tile) => [tile.id, tile]));
  for (const id of world.hqCandidates) assert.equal(byId.get(id)!.biome, "urban", id);
});

test("same seed is byte-stable", () => {
  const a = serializeWorld(generateWorld({ resolution: 16, seed: DEMO_SEED }));
  const b = serializeWorld(generateWorld({ resolution: 16, seed: DEMO_SEED }));
  assert.equal(a, b);
});

test("seed directly changes terrain and HQ selection", () => {
  const a = generateWorld({ resolution: 16, seed: DEMO_SEED });
  const b = generateWorld({ resolution: 16, seed: `${DEMO_SEED}-other` });
  assert.notDeepEqual(a.tiles.map((tile) => [tile.biome, tile.elevation, tile.moisture, tile.temperature]), b.tiles.map((tile) => [tile.biome, tile.elevation, tile.moisture, tile.temperature]));
  assert.notDeepEqual(a.hqCandidates, b.hqCandidates);
});

test("demo world has an intentional fixed golden digest", () => {
  const world = generateWorld({ resolution: 16, seed: DEMO_SEED });
  assert.equal(world.digest, "a3d3b011b7ca2b211c2806a31c519a1c3da4686fd522c5e40a33ef5e46dfa6fc");
});

test("schema validation rejects malformed data and digest validation detects tampering", () => {
  const serialized = serializeWorld(generateWorld({ resolution: 4, seed: DEMO_SEED }));
  assert.equal(parseWorldArtifact(serialized).tiles.length, 96);
  const malformed = JSON.parse(serialized) as Record<string, unknown>;
  delete malformed.tiles;
  assert.throws(() => parseWorldArtifact(JSON.stringify(malformed)), /schema/i);
  const tampered = JSON.parse(serialized);
  tampered.tiles[0].elevation += 0.001;
  assert.throws(() => parseWorldArtifact(JSON.stringify(tampered)), /digest/i);
});

test("canonical JSON sorts object keys and generated data has no NaN", () => {
  assert.equal(canonicalJson({ z: 1, a: { d: 2, b: 1 } }), '{"a":{"b":1,"d":2},"z":1}');
  const serialized = serializeWorld(generateWorld({ resolution: 16, seed: DEMO_SEED }));
  assert.ok(!serialized.includes("NaN"));
  assert.ok(!serialized.includes("null"));
  const summary = summarizeWorld(parseWorldArtifact(serialized));
  assert.equal(summary.tileCount, 1536);
  assert.equal(Object.values(summary.biomes).reduce((sum, count) => sum + count, 0), 1536);
});
