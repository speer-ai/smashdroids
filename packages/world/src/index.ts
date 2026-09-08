import { createHash } from "node:crypto";
import { assertWorldArtifact, BIOMES, canonicalJson, worldDigestPayload, type Biome, type Vec3, type WorldArtifact, type WorldTile } from "./validation.js";
export { assertWorldArtifact, BIOMES, canonicalJson, parseWorldArtifactBrowser, sha256HexBrowser, worldDigestPayload } from "./validation.js";
export type { Biome, HqSource, HqSourceBiome, Vec3, WorldArtifact, WorldTile } from "./validation.js";

type TileDraft = Omit<WorldTile, "neighbors" | "biome"> & { corners: readonly LatticePoint[]; neighbors: string[]; biome: Biome };
type LatticePoint = readonly [number, number, number];

const round = (value: number): number => Math.round(value * 1e9) / 1e9;
const normalize = ([x, y, z]: Vec3): Vec3 => {
  const magnitude = Math.hypot(x, y, z);
  return [x / magnitude, y / magnitude, z / magnitude];
};

function cubePoint(face: number, u: number, v: number): LatticePoint {
  switch (face) {
    case 0: return [1, v, -u];
    case 1: return [-1, v, u];
    case 2: return [u, 1, -v];
    case 3: return [u, -1, v];
    case 4: return [u, v, 1];
    case 5: return [-u, v, -1];
    default: throw new Error(`Invalid cube face ${face}`);
  }
}

function latticePoint(face: number, u: number, v: number, resolution: number): LatticePoint {
  const [x, y, z] = cubePoint(face, u, v);
  return [Math.round(x * resolution), Math.round(y * resolution), Math.round(z * resolution)];
}

const pointKey = (point: LatticePoint): string => point.join(",");
const edgeKey = (a: LatticePoint, b: LatticePoint): string => [pointKey(a), pointKey(b)].sort().join("|");
const tileId = (face: number, row: number, col: number): string => `cs1/0/${face}/${row}/${col}`;

function hash32(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(seed: string, salt: number): Vec3 {
  const a = (hash32(`${seed}:a:${salt}`) / 0xffffffff) * Math.PI * 2;
  const z = (hash32(`${seed}:z:${salt}`) / 0xffffffff) * 2 - 1;
  const radial = Math.sqrt(Math.max(0, 1 - z * z));
  return [radial * Math.cos(a), radial * Math.sin(a), z];
}

function coherentField(seed: string, name: string, point: Vec3): number {
  let value = 0;
  let weight = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    const direction = randomUnit(`${seed}:${name}`, octave);
    const frequency = octave + 1;
    const phase = (hash32(`${seed}:${name}:phase:${octave}`) / 0xffffffff) * Math.PI * 2;
    const amplitude = 1 / (octave + 1);
    value += Math.sin((point[0] * direction[0] + point[1] * direction[1] + point[2] * direction[2]) * Math.PI * frequency + phase) * amplitude;
    weight += amplitude;
  }
  return value / weight;
}

function sphericalTriangleArea(a: Vec3, b: Vec3, c: Vec3): number {
  const determinant = Math.abs(
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0]),
  );
  const denominator = 1 + a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + b[0] * c[0] + b[1] * c[1] + b[2] * c[2] + c[0] * a[0] + c[1] * a[1] + c[2] * a[2];
  return 2 * Math.atan2(determinant, denominator);
}

function classify(tile: TileDraft, oceanNeighbor: boolean): Biome {
  if (tile.elevation < -0.18) return "ocean";
  if (oceanNeighbor || tile.elevation < -0.1) return "coast";
  if (tile.elevation > 0.43) return "mountain";
  if (tile.temperature < -0.38) return "tundra";
  if (tile.moisture < -0.34 && tile.temperature > -0.05) return "desert";
  if (tile.moisture > 0.48 && tile.elevation < 0.24) return "wetland";
  if (tile.moisture > 0.08) return "forest";
  return "plains";
}

function chooseHqCandidates(tiles: TileDraft[], seed: string): string[] {
  const viable = tiles
    .filter((tile) => !["ocean", "coast", "mountain", "tundra"].includes(tile.biome))
    .sort((a, b) => {
      const scoreA = Math.abs(a.elevation) + Math.abs(a.moisture) * 0.35 + hash32(`${seed}:hq:${a.id}`) / 0xffffffff * 0.08;
      const scoreB = Math.abs(b.elevation) + Math.abs(b.moisture) * 0.35 + hash32(`${seed}:hq:${b.id}`) / 0xffffffff * 0.08;
      return scoreA - scoreB || a.id.localeCompare(b.id);
    });
  const selected: TileDraft[] = [];
  for (const tile of viable) {
    if (selected.every((other) => tile.center[0] * other.center[0] + tile.center[1] * other.center[1] + tile.center[2] * other.center[2] < 0.72)) selected.push(tile);
    if (selected.length === 8) break;
  }
  if (selected.length < 6) throw new Error("World generation could not find six separated HQ regions");
  return selected.map((tile) => tile.id).sort();
}

export function generateWorld(options: { resolution: number; seed: string }): WorldArtifact {
  const { resolution, seed } = options;
  if (!Number.isInteger(resolution) || resolution < 2 || resolution > 256) throw new Error("resolution must be an integer from 2 through 256");
  if (!seed.trim()) throw new Error("seed must be non-empty");

  const drafts: TileDraft[] = [];
  const edgeOwners = new Map<string, string[]>();
  const cornerVectors = new Map<string, Vec3[]>();

  for (let face = 0; face < 6; face += 1) {
    for (let row = 0; row < resolution; row += 1) {
      for (let col = 0; col < resolution; col += 1) {
        const u0 = -1 + (2 * col) / resolution;
        const u1 = -1 + (2 * (col + 1)) / resolution;
        const v0 = -1 + (2 * row) / resolution;
        const v1 = -1 + (2 * (row + 1)) / resolution;
        const latticeCorners = [
          latticePoint(face, u0, v0, resolution), latticePoint(face, u1, v0, resolution),
          latticePoint(face, u1, v1, resolution), latticePoint(face, u0, v1, resolution),
        ] as const;
        const corners = latticeCorners.map((corner) => normalize(corner));
        const center = normalize(cubePoint(face, (u0 + u1) / 2, (v0 + v1) / 2));
        const polygon: Vec3[] = [];
        for (let edge = 0; edge < 4; edge += 1) {
          const start = corners[edge]!;
          const end = corners[(edge + 1) % 4]!;
          polygon.push(normalize([start[0] * 0.84 + end[0] * 0.16, start[1] * 0.84 + end[1] * 0.16, start[2] * 0.84 + end[2] * 0.16]));
          polygon.push(normalize([start[0] * 0.16 + end[0] * 0.84, start[1] * 0.16 + end[1] * 0.84, start[2] * 0.16 + end[2] * 0.84]));
        }
        const elevation = round(coherentField(seed, "elevation", center));
        const moisture = round(coherentField(seed, "moisture", center));
        const latitude = center[1];
        const temperature = round(Math.max(-1, Math.min(1, 0.72 - Math.abs(latitude) * 1.35 + coherentField(seed, "temperature", center) * 0.35 - Math.max(0, elevation) * 0.28)));
        const id = tileId(face, row, col);
        drafts.push({ id, face, row, col, center, logicalQuad: corners, corners: latticeCorners, polygon, neighbors: [], biome: elevation < -0.18 ? "ocean" : "plains", elevation, moisture, temperature });
        for (let edge = 0; edge < 4; edge += 1) {
          const key = edgeKey(latticeCorners[edge]!, latticeCorners[(edge + 1) % 4]!);
          const owners = edgeOwners.get(key) ?? [];
          owners.push(id);
          edgeOwners.set(key, owners);
        }
        cornerVectors.set(id, corners);
      }
    }
  }

  const byId = new Map(drafts.map((tile) => [tile.id, tile]));
  for (const [key, owners] of edgeOwners) {
    if (owners.length !== 2) throw new Error(`Topology edge ${key} has ${owners.length} owners`);
    const [a, b] = owners as [string, string];
    byId.get(a)!.neighbors.push(b);
    byId.get(b)!.neighbors.push(a);
  }
  for (const tile of drafts) tile.neighbors.sort();
  for (const tile of drafts) tile.biome = classify(tile, tile.neighbors.some((id) => byId.get(id)!.elevation < -0.18));

  const hqCandidates = chooseHqCandidates(drafts, seed);
  const hqSources = hqCandidates.map((id) => ({ id, biome: byId.get(id)!.biome as "plains" | "forest" | "desert" | "wetland" }));
  for (const id of hqCandidates) byId.get(id)!.biome = "urban";

  const areas = drafts.map((tile) => {
    const corners = cornerVectors.get(tile.id)!;
    return sphericalTriangleArea(corners[0]!, corners[1]!, corners[2]!) + sphericalTriangleArea(corners[0]!, corners[2]!, corners[3]!);
  });
  const minArea = Math.min(...areas);
  const maxArea = Math.max(...areas);
  const tiles: WorldTile[] = drafts.map(({ corners: _corners, ...tile }) => tile);
  const payload: Omit<WorldArtifact, "digest"> = {
    artifactType: "smashdroids.world.summary",
    schemaVersion: 1,
    generatorVersion: "@smashdroids/world@0.1.0",
    seed,
    geometry: {
      id: "cs1", abi: 1, projection: "normalized-cube-sphere-v1", equalArea: false,
      renderedCell: "inset-beveled-octagon", logicalCell: "cubed-sphere-quad",
      areaDistortion: { minSteradians: round(minArea), maxSteradians: round(maxArea), maxToMinRatio: round(maxArea / minArea) },
    },
    rules: { movementTopology: "edge-4", diagonalMovementEncoded: false },
    metadata: {
      dimensions: { faces: 6, resolution, tileCount: tiles.length },
      topology: {
        globallyConnected: true, symmetric: true,
        exceptions: { cubeVertices: 8, description: "Eight cube-corner vertices have valence 3; all non-corner mesh vertices have valence 4." },
      },
    },
    hqCandidates,
    hqSources,
    tiles,
  };
  const digest = createHash("sha256").update(canonicalJson(payload)).digest("hex");
  return { ...payload, digest };
}

export function serializeWorld(world: WorldArtifact): string {
  return `${canonicalJson(world)}\n`;
}

export function parseWorldArtifact(serialized: string): WorldArtifact {
  let value: unknown;
  try { value = JSON.parse(serialized); } catch { throw new Error("World schema rejection: invalid JSON"); }
  assertWorldArtifact(value);
  const digest = value.digest;
  const actual = createHash("sha256").update(worldDigestPayload(value)).digest("hex");
  if (digest !== actual) throw new Error(`World digest mismatch: expected ${digest}, computed ${actual}`);
  return value;
}

export function summarizeWorld(world: WorldArtifact) {
  const biomes = Object.fromEntries(BIOMES.map((biome) => [biome, world.tiles.filter((tile) => tile.biome === biome).length])) as Record<Biome, number>;
  return {
    seed: world.seed,
    projection: world.geometry.projection,
    resolution: world.metadata.dimensions.resolution,
    tileCount: world.tiles.length,
    digest: world.digest,
    hqCandidateCount: world.hqCandidates.length,
    biomes,
    areaDistortion: world.geometry.areaDistortion,
    topologyExceptions: world.metadata.topology.exceptions,
  };
}
