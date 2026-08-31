import type { SphericalTopology, TileId, Vector3 } from "./sphere";

export type GlobeRotation = Readonly<{ yaw: number; pitch: number }>;
export type ProjectedPoint = Readonly<{ x: number; y: number }>;
export type ProjectedGlobeTile = Readonly<{
  id: TileId;
  index: number;
  sides: 5 | 6;
  depth: number;
  center: Readonly<{ x: number; y: number; z: number }>;
  polygon: readonly ProjectedPoint[];
}>;

export function rotateVector(vector: Vector3, rotation: GlobeRotation): Vector3 {
  const yawCosine = Math.cos(rotation.yaw);
  const yawSine = Math.sin(rotation.yaw);
  const yawX = vector.x * yawCosine + vector.z * yawSine;
  const yawZ = -vector.x * yawSine + vector.z * yawCosine;
  const pitchCosine = Math.cos(rotation.pitch);
  const pitchSine = Math.sin(rotation.pitch);
  return {
    x: yawX,
    y: vector.y * pitchCosine - yawZ * pitchSine,
    z: vector.y * pitchSine + yawZ * pitchCosine,
  };
}

export function projectGlobeTiles(topology: SphericalTopology, rotation: GlobeRotation, radius: number): readonly ProjectedGlobeTile[] {
  if (!Number.isFinite(radius) || radius <= 0) throw new Error("Globe radius must be positive");
  const projected = topology.tiles
    .map((tile): ProjectedGlobeTile => {
      const center = Object.freeze(rotateVector(tile.center, rotation));
      const polygon = Object.freeze(tile.corners.map((corner) => {
        const rotated = rotateVector(corner, rotation);
        return Object.freeze({ x: rotated.x * radius, y: -rotated.y * radius });
      }));
      return Object.freeze({ id: tile.id, index: tile.index, sides: tile.sides, depth: center.z, center, polygon });
    })
    .filter((tile) => tile.depth > -0.12)
    .sort((left, right) => left.depth - right.depth || left.id.localeCompare(right.id));
  return Object.freeze(projected);
}
