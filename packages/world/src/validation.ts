export const BIOMES = [
  "ocean", "coast", "plains", "forest", "desert", "tundra", "mountain", "wetland", "urban",
] as const;
export const HQ_SOURCE_BIOMES = ["plains", "forest", "desert", "wetland"] as const;
export type Biome = (typeof BIOMES)[number];
export type HqSourceBiome = (typeof HQ_SOURCE_BIOMES)[number];
export type Vec3 = readonly [number, number, number];

export interface WorldTile {
  id: string;
  face: number;
  row: number;
  col: number;
  center: Vec3;
  logicalQuad: Vec3[];
  polygon: Vec3[];
  neighbors: string[];
  biome: Biome;
  elevation: number;
  moisture: number;
  temperature: number;
}

export interface HqSource {
  id: string;
  biome: HqSourceBiome;
}

export interface WorldArtifact {
  artifactType: "smashdroids.world.summary";
  schemaVersion: 1;
  generatorVersion: "@smashdroids/world@0.1.0";
  seed: string;
  geometry: {
    id: "cs1";
    abi: 1;
    projection: "normalized-cube-sphere-v1";
    equalArea: false;
    renderedCell: "inset-beveled-octagon";
    logicalCell: "cubed-sphere-quad";
    areaDistortion: { minSteradians: number; maxSteradians: number; maxToMinRatio: number };
  };
  rules: { movementTopology: "edge-4"; diagonalMovementEncoded: false };
  metadata: {
    dimensions: { faces: 6; resolution: number; tileCount: number };
    topology: {
      globallyConnected: true;
      symmetric: true;
      exceptions: { cubeVertices: 8; description: string };
    };
  };
  hqCandidates: string[];
  hqSources: HqSource[];
  tiles: WorldTile[];
  digest: string;
}

const round = (value: number): number => Math.round(value * 1e9) / 1e9;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const reject = (category: "schema" | "compatibility" | "geometry" | "topology" | "HQ", detail: string): never => {
  throw new Error(`World ${category} rejection: ${detail}`);
};
const sortedUnique = (values: string[]): boolean => values.every((value, index) => index === 0 || values[index - 1]! < value);

function vector(value: unknown, label: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))) reject("geometry", `${label} must be a finite vec3`);
  const result = value as unknown as Vec3;
  if (Math.abs(Math.hypot(...result) - 1) > 1e-12) reject("geometry", `${label} must lie on the unit sphere`);
  return result;
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

function assertCompatibility(world: Record<string, unknown>): void {
  if (world.artifactType !== "smashdroids.world.summary" || world.schemaVersion !== 1) reject("compatibility", "artifact identity mismatch");
  if (world.generatorVersion !== "@smashdroids/world@0.1.0") reject("compatibility", "generator version mismatch");
  const geometry = world.geometry;
  if (!isRecord(geometry) || geometry.id !== "cs1" || geometry.abi !== 1 || geometry.projection !== "normalized-cube-sphere-v1" || geometry.equalArea !== false || geometry.renderedCell !== "inset-beveled-octagon" || geometry.logicalCell !== "cubed-sphere-quad") reject("compatibility", "geometry identity mismatch");
  const rules = world.rules;
  if (!isRecord(rules) || rules.movementTopology !== "edge-4" || rules.diagonalMovementEncoded !== false) reject("compatibility", "rules topology mismatch");
}

export function assertWorldArtifact(value: unknown): asserts value is WorldArtifact {
  if (!isRecord(value)) reject("schema", "expected object");
  const world = value as Record<string, unknown>;
  assertCompatibility(world);
  if (typeof world.seed !== "string" || !world.seed.trim()) reject("schema", "seed must be non-empty");
  if (typeof world.digest !== "string" || !/^[0-9a-f]{64}$/.test(world.digest)) reject("schema", "digest must be lowercase SHA-256 hex");
  if (!Array.isArray(world.tiles) || !Array.isArray(world.hqCandidates) || !Array.isArray(world.hqSources)) reject("schema", "tile and HQ arrays are required");

  const metadataValue = world.metadata;
  if (!isRecord(metadataValue) || !isRecord(metadataValue.dimensions) || !isRecord(metadataValue.topology)) reject("schema", "metadata is required");
  const metadata = metadataValue as { dimensions: Record<string, unknown>; topology: Record<string, unknown> };
  const dimensions = metadata.dimensions;
  const resolution = dimensions.resolution;
  if (dimensions.faces !== 6 || !Number.isInteger(resolution) || (resolution as number) < 2 || (resolution as number) > 256) reject("schema", "invalid dimensions");
  const expectedCount = 6 * (resolution as number) ** 2;
  const tiles = world.tiles as unknown[];
  if (dimensions.tileCount !== expectedCount || tiles.length !== expectedCount) reject("schema", "dimension and tile counts disagree");
  const topology = metadata.topology;
  if (topology.globallyConnected !== true || topology.symmetric !== true || !isRecord(topology.exceptions) || topology.exceptions.cubeVertices !== 8 || typeof topology.exceptions.description !== "string" || !topology.exceptions.description.trim()) reject("topology", "required topology metadata mismatch");

  const expectedIds: string[] = [];
  for (let face = 0; face < 6; face += 1) for (let row = 0; row < (resolution as number); row += 1) for (let col = 0; col < (resolution as number); col += 1) expectedIds.push(`cs1/0/${face}/${row}/${col}`);
  const byId = new Map<string, WorldTile>();
  const areas: number[] = [];
  for (let index = 0; index < tiles.length; index += 1) {
    const unknownTile = tiles[index];
    if (!isRecord(unknownTile)) reject("schema", `tile ${index} must be an object`);
    const tile = unknownTile as unknown as WorldTile;
    if (tile.id !== expectedIds[index]) reject("topology", `tile IDs must be the exact sorted stable set at index ${index}`);
    const parts = tile.id.split("/").map((part, partIndex) => partIndex < 2 ? part : Number(part));
    if (tile.face !== parts[2] || tile.row !== parts[3] || tile.col !== parts[4]) reject("topology", `${tile.id} coordinates disagree with ID`);
    vector(tile.center, `${tile.id} center`);
    if (!Array.isArray(tile.logicalQuad) || tile.logicalQuad.length !== 4) reject("geometry", `${tile.id} must have four logical quad corners`);
    if (!Array.isArray(tile.polygon) || tile.polygon.length !== 8) reject("geometry", `${tile.id} must have eight polygon vertices`);
    const quad = tile.logicalQuad.map((point, pointIndex) => vector(point, `${tile.id} logical corner ${pointIndex}`));
    const polygon = tile.polygon.map((point, pointIndex) => vector(point, `${tile.id} polygon vertex ${pointIndex}`));
    if (new Set(quad.map((point) => point.join(","))).size !== 4) reject("geometry", `${tile.id} has duplicate logical corners`);
    if (new Set(polygon.map((point) => point.join(","))).size !== 8) reject("geometry", `${tile.id} has duplicate polygon vertices`);
    if (!Array.isArray(tile.neighbors) || tile.neighbors.length !== 4 || !tile.neighbors.every((id) => typeof id === "string") || !sortedUnique(tile.neighbors)) reject("topology", `${tile.id} must have four sorted unique neighbors`);
    if (!BIOMES.includes(tile.biome) || ![tile.elevation, tile.moisture, tile.temperature].every(Number.isFinite)) reject("schema", `${tile.id} has invalid terrain data`);
    byId.set(tile.id, tile);
    areas.push(sphericalTriangleArea(quad[0]!, quad[1]!, quad[2]!) + sphericalTriangleArea(quad[0]!, quad[2]!, quad[3]!));
  }

  for (const tile of byId.values()) for (const neighborId of tile.neighbors) {
    const neighbor = byId.get(neighborId);
    if (!neighbor || !neighbor.neighbors.includes(tile.id)) reject("topology", `${tile.id} adjacency is not symmetric`);
  }
  const seen = new Set<string>();
  const queue = [expectedIds[0]!];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...byId.get(id)!.neighbors);
  }
  if (seen.size !== expectedCount) reject("topology", "tile graph is not globally connected");

  const geometry = world.geometry as Record<string, unknown>;
  const area = geometry.areaDistortion;
  const areaRecord = isRecord(area)
    ? area
    : reject("geometry", "area distortion metadata is required");
  const minArea = Math.min(...areas);
  const maxArea = Math.max(...areas);
  if (areaRecord.minSteradians !== round(minArea) || areaRecord.maxSteradians !== round(maxArea) || areaRecord.maxToMinRatio !== round(maxArea / minArea)) reject("geometry", "area distortion metadata does not match logical quads");

  const hqCandidates = world.hqCandidates as string[];
  if (hqCandidates.length < 6 || !hqCandidates.every((id) => typeof id === "string") || !sortedUnique(hqCandidates)) reject("HQ", "candidate IDs must be sorted and unique");
  const hqSources = world.hqSources as unknown[];
  if (hqSources.length !== hqCandidates.length) reject("HQ", "source evidence must match candidates");
  for (let index = 0; index < hqCandidates.length; index += 1) {
    const id = hqCandidates[index]!;
    const tile = byId.get(id);
    const source = hqSources[index];
    if (!tile || tile.biome !== "urban") reject("HQ", `${id} must reference an existing urban tile`);
    if (!isRecord(source) || source.id !== id || !HQ_SOURCE_BIOMES.includes(source.biome as HqSourceBiome)) reject("HQ", `${id} has invalid source-biome evidence`);
  }
}

function sortCanonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sortCanonical(child)]));
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortCanonical(value));
}

export function worldDigestPayload(world: WorldArtifact): string {
  const { digest: _digest, ...payload } = world;
  return canonicalJson(payload);
}

export async function sha256HexBrowser(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("World digest verification unavailable: Web Crypto is required");
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function parseWorldArtifactBrowser(serialized: string): Promise<WorldArtifact> {
  let value: unknown;
  try { value = JSON.parse(serialized); } catch { reject("schema", "invalid JSON"); }
  assertWorldArtifact(value);
  const actual = await sha256HexBrowser(worldDigestPayload(value));
  if (actual !== value.digest) throw new Error(`World digest mismatch: expected ${value.digest}, computed ${actual}`);
  return value;
}
