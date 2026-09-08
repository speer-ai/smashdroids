export type Vec3 = readonly [number, number, number];
export type RenderBiome = "ocean" | "coast" | "plains" | "forest" | "desert" | "tundra" | "mountain" | "wetland" | "urban";

export interface RenderTile {
  id: string;
  face: number;
  row: number;
  col: number;
  center: Vec3;
  logicalQuad: Vec3[];
  polygon: Vec3[];
  neighbors: string[];
  biome: RenderBiome;
}

export interface RenderWorld {
  tiles: RenderTile[];
}

export interface RenderBuffers {
  triangles: number[];
  colors: number[];
  boundaries: number[];
  logicalHitTriangles: number[];
  logicalTriangleTileIds: string[];
}

export const BIOME_COLORS: Record<RenderBiome, readonly [number, number, number]> = {
  ocean: [0.025, 0.19, 0.28],
  coast: [0.12, 0.48, 0.52],
  plains: [0.48, 0.58, 0.25],
  forest: [0.08, 0.34, 0.21],
  desert: [0.67, 0.46, 0.2],
  tundra: [0.66, 0.74, 0.75],
  mountain: [0.35, 0.36, 0.38],
  wetland: [0.16, 0.44, 0.35],
  urban: [0.1, 0.9, 0.82],
};

export function buildRenderBuffers(world: RenderWorld): RenderBuffers {
  const triangles: number[] = [];
  const colors: number[] = [];
  const boundaries: number[] = [];
  const logicalHitTriangles: number[] = [];
  const logicalTriangleTileIds: string[] = [];
  for (const tile of world.tiles) {
    if (tile.polygon.length !== 8) throw new Error(`Tile ${tile.id} must have exactly eight rendered vertices`);
    if (tile.logicalQuad.length !== 4) throw new Error(`Tile ${tile.id} must have exactly four logical corners`);
    const color = BIOME_COLORS[tile.biome];
    if (!color) throw new Error(`Tile ${tile.id} has unsupported biome ${tile.biome as string}`);
    for (let index = 0; index < 8; index += 1) {
      triangles.push(...tile.center, ...tile.polygon[index]!, ...tile.polygon[(index + 1) % 8]!);
      colors.push(...color, ...color, ...color);
      boundaries.push(...tile.polygon[index]!, ...tile.polygon[(index + 1) % 8]!);
    }
    for (let index = 0; index < 4; index += 1) {
      logicalHitTriangles.push(...tile.center, ...tile.logicalQuad[index]!, ...tile.logicalQuad[(index + 1) % 4]!);
      logicalTriangleTileIds.push(tile.id);
    }
  }
  return { triangles, colors, boundaries, logicalHitTriangles, logicalTriangleTileIds };
}

const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function rayTriangleDistance(origin: Vec3, direction: Vec3, a: Vec3, b: Vec3, c: Vec3): number | undefined {
  const edge1 = subtract(b, a);
  const edge2 = subtract(c, a);
  const p = cross(direction, edge2);
  const determinant = dot(edge1, p);
  if (Math.abs(determinant) < 1e-12) return undefined;
  const inverse = 1 / determinant;
  const t = subtract(origin, a);
  const u = dot(t, p) * inverse;
  if (u < -1e-10 || u > 1 + 1e-10) return undefined;
  const q = cross(t, edge1);
  const v = dot(direction, q) * inverse;
  if (v < -1e-10 || u + v > 1 + 1e-10) return undefined;
  const distance = dot(edge2, q) * inverse;
  return distance > 1e-10 ? distance : undefined;
}

export function pickLogicalTile(buffers: Pick<RenderBuffers, "logicalHitTriangles" | "logicalTriangleTileIds">, origin: Vec3, direction: Vec3): string | undefined {
  let closest = Number.POSITIVE_INFINITY;
  let tileId: string | undefined;
  for (let triangle = 0; triangle < buffers.logicalTriangleTileIds.length; triangle += 1) {
    const offset = triangle * 9;
    const vertices = buffers.logicalHitTriangles;
    const a = vertices.slice(offset, offset + 3) as unknown as Vec3;
    const b = vertices.slice(offset + 3, offset + 6) as unknown as Vec3;
    const c = vertices.slice(offset + 6, offset + 9) as unknown as Vec3;
    const distance = rayTriangleDistance(origin, direction, a, b, c);
    if (distance !== undefined && distance < closest) {
      closest = distance;
      tileId = buffers.logicalTriangleTileIds[triangle];
    }
  }
  return tileId;
}
