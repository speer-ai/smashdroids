import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  canonicalJson,
  generateWorld,
  parseWorldArtifact,
  serializeWorld,
  type WorldArtifact,
} from "./index.js";

const DEMO_SEED = "smash-droids-public-demo-v1";

function mutateAndResign(world: WorldArtifact, mutation: (copy: any) => void): string {
  const copy = structuredClone(world) as any;
  mutation(copy);
  const { digest: _digest, ...payload } = copy;
  copy.digest = createHash("sha256").update(canonicalJson(payload)).digest("hex");
  return JSON.stringify(copy);
}

function rejectsMutation(name: string, mutation: (copy: any) => void): void {
  test(`parser rejects re-signed ${name}`, () => {
    const world = generateWorld({ resolution: 4, seed: DEMO_SEED });
    assert.throws(() => parseWorldArtifact(mutateAndResign(world, mutation)), /World (schema|compatibility|geometry|topology|HQ) rejection/);
  });
}

test("parser accepts a valid canonical world", () => {
  const world = generateWorld({ resolution: 4, seed: DEMO_SEED });
  assert.equal(serializeWorld(parseWorldArtifact(serializeWorld(world))), serializeWorld(world));
});

test("parser rejects a malformed digest before hashing", () => {
  const world = generateWorld({ resolution: 4, seed: DEMO_SEED });
  assert.throws(() => parseWorldArtifact(JSON.stringify({ ...world, digest: "not-a-digest" })), /schema rejection/i);
});

for (const [name, mutation] of [
  ["missing generator version", (world: any) => { delete world.generatorVersion; }],
  ["geometry ID", (world: any) => { world.geometry.id = "cs2"; }],
  ["geometry ABI", (world: any) => { world.geometry.abi = 2; }],
  ["projection", (world: any) => { world.geometry.projection = "equal-area-qsc"; }],
  ["equal-area claim", (world: any) => { world.geometry.equalArea = true; }],
  ["logical-cell identity", (world: any) => { world.geometry.logicalCell = "octagon"; }],
  ["movement topology", (world: any) => { world.rules.movementTopology = "edge-8"; }],
  ["diagonal movement", (world: any) => { world.rules.diagonalMovementEncoded = true; }],
  ["resolution mismatch", (world: any) => { world.metadata.dimensions.resolution = 99; }],
  ["tile order", (world: any) => { [world.tiles[0], world.tiles[1]] = [world.tiles[1], world.tiles[0]]; }],
  ["tile coordinates", (world: any) => { world.tiles[0].row = 1; }],
  ["missing neighbor", (world: any) => { world.tiles[0].neighbors.pop(); }],
  ["unsorted neighbors", (world: any) => { world.tiles[0].neighbors.reverse(); }],
  ["asymmetric neighbors", (world: any) => {
    const tile = world.tiles[0];
    tile.neighbors[0] = world.tiles.find((candidate: any) => candidate.id !== tile.id && !tile.neighbors.includes(candidate.id)).id;
    tile.neighbors.sort();
  }],
  ["false connected metadata", (world: any) => { world.metadata.topology.globallyConnected = false; }],
  ["disconnected graph", (world: any) => {
    const isolated = world.tiles[0];
    for (const neighborId of isolated.neighbors) {
      const neighbor = world.tiles.find((tile: any) => tile.id === neighborId);
      neighbor.neighbors = neighbor.neighbors.filter((id: string) => id !== isolated.id);
      neighbor.neighbors.push(neighbor.id);
      neighbor.neighbors.sort();
    }
    isolated.neighbors = Array(4).fill(isolated.id);
  }],
  ["non-finite center", (world: any) => { world.tiles[0].center[0] = null; }],
  ["non-unit center", (world: any) => { world.tiles[0].center = [9, 9, 9]; }],
  ["non-unit polygon vertex", (world: any) => { world.tiles[0].polygon[0] = [9, 9, 9]; }],
  ["duplicate polygon vertex", (world: any) => { world.tiles[0].polygon[1] = world.tiles[0].polygon[0]; }],
  ["missing logical quad", (world: any) => { delete world.tiles[0].logicalQuad; }],
  ["invalid logical quad", (world: any) => { world.tiles[0].logicalQuad[0] = [9, 9, 9]; }],
  ["unsorted HQ refs", (world: any) => { world.hqCandidates.reverse(); }],
  ["unknown HQ ref", (world: any) => { world.hqCandidates[0] = "cs1/0/5/99/99"; world.hqCandidates.sort(); }],
  ["prohibited HQ source", (world: any) => { world.hqSources[0].biome = "tundra"; }],
  ["missing area metadata", (world: any) => { delete world.geometry.areaDistortion; }],
  ["area metadata", (world: any) => { world.geometry.areaDistortion.maxToMinRatio = 1; }],
  ["topology exception metadata", (world: any) => { world.metadata.topology.exceptions.cubeVertices = 7; }],
] as const) rejectsMutation(name, mutation);
