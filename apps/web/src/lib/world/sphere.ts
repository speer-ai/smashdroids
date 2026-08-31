export type Vector3 = Readonly<{ x: number; y: number; z: number }>;
export type TileId = `tile-${string}`;
export type SphericalTile = Readonly<{
  id: TileId;
  index: number;
  center: Vector3;
  corners: readonly Vector3[];
  neighbors: readonly TileId[];
  sides: 5 | 6;
}>;
export type SphericalTopology = Readonly<{
  frequency: number;
  tiles: readonly SphericalTile[];
  triangles: readonly (readonly [TileId, TileId, TileId])[];
  edges: readonly (readonly [TileId, TileId])[];
}>;

type MutableVector = { x: number; y: number; z: number };
type NumericTriangle = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;
const BASE_VERTICES: readonly Vector3[] = [
  { x: -1, y: PHI, z: 0 }, { x: 1, y: PHI, z: 0 },
  { x: -1, y: -PHI, z: 0 }, { x: 1, y: -PHI, z: 0 },
  { x: 0, y: -1, z: PHI }, { x: 0, y: 1, z: PHI },
  { x: 0, y: -1, z: -PHI }, { x: 0, y: 1, z: -PHI },
  { x: PHI, y: 0, z: -1 }, { x: PHI, y: 0, z: 1 },
  { x: -PHI, y: 0, z: -1 }, { x: -PHI, y: 0, z: 1 },
].map(normalize);

const BASE_FACES: readonly NumericTriangle[] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
];

function normalize(vector: Vector3): MutableVector {
  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  return { x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude };
}

function add(...vectors: readonly Vector3[]): MutableVector {
  return vectors.reduce<MutableVector>((sum, vector) => ({ x: sum.x + vector.x, y: sum.y + vector.y, z: sum.z + vector.z }), { x: 0, y: 0, z: 0 });
}

function scale(vector: Vector3, factor: number): MutableVector {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

function cross(a: Vector3, b: Vector3): MutableVector {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function freezeVector(vector: Vector3): Vector3 {
  return Object.freeze({ x: vector.x, y: vector.y, z: vector.z });
}

function coordinateKey(vector: Vector3): string {
  return [vector.x, vector.y, vector.z].map((value) => value.toFixed(10)).join(",");
}

function tileId(index: number): TileId {
  return `tile-${String(index).padStart(3, "0")}`;
}

function undirectedNumericEdge(a: number, b: number): readonly [number, number] {
  return a < b ? [a, b] : [b, a];
}

export function createSphericalTopology(frequency = 3): SphericalTopology {
  if (!Number.isInteger(frequency) || frequency < 1) throw new Error("Sphere frequency must be a positive integer");

  const rawCenters: MutableVector[] = [];
  const centerByKey = new Map<string, number>();
  const rawTriangles: NumericTriangle[] = [];

  const intern = (candidate: Vector3): number => {
    const center = normalize(candidate);
    const key = coordinateKey(center);
    const existing = centerByKey.get(key);
    if (existing !== undefined) return existing;
    const index = rawCenters.length;
    rawCenters.push(center);
    centerByKey.set(key, index);
    return index;
  };

  for (const [aIndex, bIndex, cIndex] of BASE_FACES) {
    const a = BASE_VERTICES[aIndex]!;
    const b = BASE_VERTICES[bIndex]!;
    const c = BASE_VERTICES[cIndex]!;
    const grid = new Map<string, number>();
    const at = (i: number, j: number) => grid.get(`${i},${j}`)!;

    for (let i = 0; i <= frequency; i += 1) {
      for (let j = 0; j <= frequency - i; j += 1) {
        const aWeight = frequency - i - j;
        const candidate = scale(add(scale(a, aWeight), scale(b, i), scale(c, j)), 1 / frequency);
        grid.set(`${i},${j}`, intern(candidate));
      }
    }

    for (let i = 0; i < frequency; i += 1) {
      for (let j = 0; j < frequency - i; j += 1) {
        rawTriangles.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
        if (i + j < frequency - 1) rawTriangles.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
      }
    }
  }

  const oldIndices = rawCenters.map((_, index) => index).sort((leftIndex, rightIndex) => {
    const left = rawCenters[leftIndex]!;
    const right = rawCenters[rightIndex]!;
    return right.y - left.y
      || Math.atan2(left.z, left.x) - Math.atan2(right.z, right.x)
      || left.x - right.x
      || left.z - right.z;
  });
  const newIndexByOld = new Map(oldIndices.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  const centers = oldIndices.map((oldIndex) => freezeVector(rawCenters[oldIndex]!));
  const indexedTriangles = rawTriangles.map((triangle): NumericTriangle => triangle.map((oldIndex) => newIndexByOld.get(oldIndex)!) as NumericTriangle);

  const neighbors = Array.from({ length: centers.length }, () => new Set<number>());
  const incidentTriangles = Array.from({ length: centers.length }, () => [] as number[]);
  const edgeMap = new Map<string, readonly [number, number]>();

  indexedTriangles.forEach((triangle, triangleIndex) => {
    for (const vertex of triangle) incidentTriangles[vertex]!.push(triangleIndex);
    for (const [from, to] of [[triangle[0], triangle[1]], [triangle[1], triangle[2]], [triangle[2], triangle[0]]] as const) {
      neighbors[from]!.add(to);
      neighbors[to]!.add(from);
      const edge = undirectedNumericEdge(from, to);
      edgeMap.set(`${edge[0]}|${edge[1]}`, edge);
    }
  });

  const faceCenters = indexedTriangles.map(([a, b, c]) => freezeVector(normalize(add(centers[a]!, centers[b]!, centers[c]!))));
  const tiles = centers.map((center, index): SphericalTile => {
    const reference = Math.abs(center.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const tangentX = normalize(cross(reference, center));
    const tangentY = normalize(cross(center, tangentX));
    const corners = incidentTriangles[index]!
      .map((triangleIndex) => faceCenters[triangleIndex]!)
      .sort((left, right) => Math.atan2(dot(left, tangentY), dot(left, tangentX)) - Math.atan2(dot(right, tangentY), dot(right, tangentX)));
    const adjacent = [...neighbors[index]!].sort((left, right) => left - right).map(tileId);
    if (adjacent.length !== 5 && adjacent.length !== 6) throw new Error(`Invalid spherical tile degree ${adjacent.length}`);
    return Object.freeze({
      id: tileId(index),
      index,
      center,
      corners: Object.freeze(corners),
      neighbors: Object.freeze(adjacent),
      sides: adjacent.length,
    });
  });

  const triangles = indexedTriangles
    .map((triangle) => Object.freeze(triangle.map(tileId).sort() as [TileId, TileId, TileId]))
    .sort((left, right) => left.join("|").localeCompare(right.join("|")));
  const edges = [...edgeMap.values()]
    .sort((left, right) => left[0] - right[0] || left[1] - right[1])
    .map(([from, to]) => Object.freeze([tileId(from), tileId(to)] as [TileId, TileId]));

  return Object.freeze({
    frequency,
    tiles: Object.freeze(tiles),
    triangles: Object.freeze(triangles),
    edges: Object.freeze(edges),
  });
}

export const SPHERE_TOPOLOGY = createSphericalTopology(3);
