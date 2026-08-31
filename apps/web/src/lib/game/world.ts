import { SPHERE_TOPOLOGY, type TileId, type Vector3 } from "../world/sphere";
import { RULESET_ID, TERRAIN, type TerrainId } from "./catalog";

export type Side = "player" | "ai";
export type ObjectiveKind = "headquarters" | "uplink" | "prime-relay";
export type WorldObjective = Readonly<{ kind: ObjectiveKind; owner: Side | null }>;
export type SpherefallTile = Readonly<{ id: TileId; terrainId: TerrainId; objective?: WorldObjective }>;
export type SpherefallWorld = Readonly<{
  id: string;
  seed: string;
  rulesetId: typeof RULESET_ID;
  topologyFrequency: 3;
  tiles: readonly SpherefallTile[];
}>;

const terrainById = new Map(TERRAIN.map((terrain) => [terrain.id, terrain]));
const tileById = new Map(SPHERE_TOPOLOGY.tiles.map((tile) => [tile.id, tile]));

function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalize(vector: Vector3): Vector3 {
  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  return { x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude };
}

function dot(left: Vector3, right: Vector3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function nearestUnusedTile(target: Vector3, used: ReadonlySet<TileId>): TileId {
  const match = SPHERE_TOPOLOGY.tiles
    .filter((tile) => !used.has(tile.id))
    .sort((left, right) => dot(right.center, target) - dot(left.center, target) || left.id.localeCompare(right.id))[0];
  if (!match) throw new Error("No unused spherical tile remains");
  return match.id;
}

function topologyPath(from: TileId, to: TileId): TileId[] {
  if (from === to) return [from];
  const queue: TileId[] = [from];
  const previous = new Map<TileId, TileId | null>([[from, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]!;
    for (const neighbor of tileById.get(current)?.neighbors ?? []) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, current);
      if (neighbor === to) {
        const path: TileId[] = [to];
        let step: TileId | null = current;
        while (step) {
          path.push(step);
          step = previous.get(step) ?? null;
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }
  return [];
}

export function shortestTilePath(world: SpherefallWorld, from: TileId, to: TileId, options: Readonly<{ passableOnly?: boolean }> = {}): TileId[] {
  if (!tileById.has(from) || !tileById.has(to)) return [];
  const worldTiles = new Map(world.tiles.map((tile) => [tile.id, tile]));
  const passable = (tileId: TileId) => !options.passableOnly || terrainById.get(worldTiles.get(tileId)?.terrainId ?? "ocean")?.groundPassable;
  if (!passable(from) || !passable(to)) return [];
  if (from === to) return [from];
  const queue: TileId[] = [from];
  const previous = new Map<TileId, TileId | null>([[from, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]!;
    for (const neighbor of tileById.get(current)?.neighbors ?? []) {
      if (previous.has(neighbor) || !passable(neighbor)) continue;
      previous.set(neighbor, current);
      if (neighbor === to) {
        const path: TileId[] = [to];
        let step: TileId | null = current;
        while (step) {
          path.push(step);
          step = previous.get(step) ?? null;
        }
        return path.reverse();
      }
      queue.push(neighbor);
    }
  }
  return [];
}

export function createSpherefallWorld(seed = "spherefall-op1"): SpherefallWorld {
  const used = new Set<TileId>();
  const objectives = new Map<TileId, WorldObjective>();
  const place = (target: Vector3, objective: WorldObjective): TileId => {
    const id = nearestUnusedTile(normalize(target), used);
    used.add(id);
    objectives.set(id, Object.freeze(objective));
    return id;
  };

  const playerHeadquarters = place({ x: 0, y: 1, z: 0 }, { kind: "headquarters", owner: "player" });
  const aiHeadquarters = place({ x: 0, y: -1, z: 0 }, { kind: "headquarters", owner: "ai" });
  const relay = place({ x: 1, y: 0, z: 0 }, { kind: "prime-relay", owner: null });
  const uplinkTargets: readonly [Vector3, Side | null][] = [
    [{ x: 1, y: 0.48, z: 1 }, "player"],
    [{ x: -1, y: 0.42, z: 0.35 }, null],
    [{ x: 0.15, y: 0.3, z: -1 }, null],
    [{ x: -1, y: -0.48, z: -1 }, "ai"],
    [{ x: 1, y: -0.42, z: -0.35 }, null],
    [{ x: -0.15, y: -0.3, z: 1 }, null],
  ];
  for (const [target, owner] of uplinkTargets) place(target, { kind: "uplink", owner });

  const orderedByNoise = [...SPHERE_TOPOLOGY.tiles].sort((left, right) => hash32(`${seed}:${left.id}`) - hash32(`${seed}:${right.id}`) || left.id.localeCompare(right.id));
  const terrain = new Map<TileId, TerrainId>();
  const allocations: readonly [TerrainId, number][] = [
    ["ocean", 10], ["forest", 15], ["desert", 15], ["highlands", 15], ["tundra", 15], ["plains", 22],
  ];
  let allocationIndex = 0;
  for (const [terrainId, count] of allocations) {
    for (let offset = 0; offset < count; offset += 1) terrain.set(orderedByNoise[allocationIndex++]!.id, terrainId);
  }

  const protectedRoute = new Set<TileId>([
    ...topologyPath(playerHeadquarters, relay),
    ...topologyPath(aiHeadquarters, relay),
    ...objectives.keys(),
  ]);
  for (const tileId of protectedRoute) terrain.set(tileId, "plains");

  for (const terrainId of ["ocean", "forest", "desert", "highlands", "tundra"] as const) {
    let count = [...terrain.values()].filter((candidate) => candidate === terrainId).length;
    for (const tile of orderedByNoise) {
      if (count >= 4) break;
      if (protectedRoute.has(tile.id) || terrain.get(tile.id) !== "plains") continue;
      terrain.set(tile.id, terrainId);
      count += 1;
    }
  }

  const tiles = SPHERE_TOPOLOGY.tiles.map((topologyTile): SpherefallTile => {
    const objective = objectives.get(topologyTile.id);
    const base = { id: topologyTile.id, terrainId: terrain.get(topologyTile.id)! };
    return Object.freeze(objective ? { ...base, objective } : base);
  });

  return Object.freeze({
    id: `${RULESET_ID}:${seed}`,
    seed,
    rulesetId: RULESET_ID,
    topologyFrequency: 3 as const,
    tiles: Object.freeze(tiles),
  });
}

export const SPHEREFALL_WORLD = createSpherefallWorld();
