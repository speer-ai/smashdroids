import { SPHERE_TOPOLOGY, type TileId } from "../world/sphere";
import { CATALOG_DIGEST, CLANS, RULES_ABI, RULESET_ID, TERRAIN, TROOPS, WEAPONS, type ClanId, type TerrainId, type TroopId, type WeaponId } from "./catalog";
import { SPHEREFALL_WORLD, type ObjectiveKind, type Side, type SpherefallWorld } from "./world";

export const SPHEREFALL_RULESET = Object.freeze({
  id: RULESET_ID,
  abi: RULES_ABI,
  digest: CATALOG_DIGEST,
  geometry: "frequency-3-geodesic-dual",
  tileCount: 92,
  commandPoints: 4,
  activeUnitCap: 6,
  roundLimit: 10,
} as const);

export type SpherefallUnit = Readonly<{
  id: string;
  side: Side;
  troopId: TroopId;
  tileId: TileId;
  hp: number;
  guarded: boolean;
  jammed: boolean;
}>;

export type SpherefallObjectiveState = Readonly<{ tileId: TileId; kind: ObjectiveKind; controller: Side | null }>;

export type SpherefallState = Readonly<{
  ruleset: typeof SPHEREFALL_RULESET;
  world: SpherefallWorld;
  round: number;
  clans: Readonly<Record<Side, ClanId>>;
  supply: Readonly<Record<Side, number>>;
  victoryPoints: Readonly<Record<Side, number>>;
  units: readonly SpherefallUnit[];
  objectives: readonly SpherefallObjectiveState[];
  revealedTiles: Readonly<Record<Side, readonly TileId[]>>;
  winner: Side | "draw" | null;
}>;

const topologyById = new Map(SPHERE_TOPOLOGY.tiles.map((tile) => [tile.id, tile]));
const troopById = new Map(TROOPS.map((troop) => [troop.id, troop]));
const terrainById = new Map(TERRAIN.map((terrain) => [terrain.id, terrain]));
const clanById = new Map(CLANS.map((clan) => [clan.id, clan]));
const weaponById = new Map(WEAPONS.map((weapon) => [weapon.id, weapon]));

export type MoveOption = Readonly<{ tileId: TileId; cost: number; path: readonly TileId[] }>;

function movementCost(state: SpherefallState, unit: SpherefallUnit, tileId: TileId): number {
  const worldTile = state.world.tiles.find((tile) => tile.id === tileId);
  const terrain = worldTile ? terrainById.get(worldTile.terrainId) : undefined;
  if (!terrain?.groundPassable) return Number.POSITIVE_INFINITY;
  const modifier = clanById.get(state.clans[unit.side])?.modifier.kind;
  if ((modifier === "forest-mobility" && terrain.id === "forest") || (modifier === "highland-mobility" && terrain.id === "highlands")) return Math.max(1, terrain.moveCost - 1);
  return terrain.moveCost;
}

export function legalMoveOptions(state: SpherefallState, unitId: string): readonly MoveOption[] {
  const unit = state.units.find((candidate) => candidate.id === unitId && candidate.hp > 0);
  if (!unit) return Object.freeze([]);
  const troop = troopById.get(unit.troopId)!;
  const clanModifier = clanById.get(state.clans[unit.side])?.modifier.kind;
  const budget = troop.move + (clanModifier === "opening-mobility" ? 1 : 0);
  const occupied = new Set(state.units.filter((candidate) => candidate.hp > 0 && candidate.id !== unit.id).map((candidate) => candidate.tileId));
  const bestCost = new Map<TileId, number>([[unit.tileId, 0]]);
  const bestPath = new Map<TileId, TileId[]>([[unit.tileId, [unit.tileId]]]);
  const frontier: TileId[] = [unit.tileId];

  while (frontier.length > 0) {
    frontier.sort((left, right) => bestCost.get(left)! - bestCost.get(right)! || left.localeCompare(right));
    const current = frontier.shift()!;
    const currentCost = bestCost.get(current)!;
    for (const neighbor of topologyById.get(current)?.neighbors ?? []) {
      if (occupied.has(neighbor)) continue;
      const nextCost = currentCost + movementCost(state, unit, neighbor);
      if (!Number.isFinite(nextCost) || nextCost > budget) continue;
      const nextPath = [...bestPath.get(current)!, neighbor];
      const priorCost = bestCost.get(neighbor);
      const priorPath = bestPath.get(neighbor);
      const pathWinsTie = priorCost === nextCost && nextPath.join("|").localeCompare(priorPath?.join("|") ?? "") < 0;
      if (priorCost === undefined || nextCost < priorCost || pathWinsTie) {
        bestCost.set(neighbor, nextCost);
        bestPath.set(neighbor, nextPath);
        if (!frontier.includes(neighbor)) frontier.push(neighbor);
      }
    }
  }

  return Object.freeze([...bestCost.entries()]
    .filter(([tileId]) => tileId !== unit.tileId && !occupied.has(tileId))
    .map(([tileId, cost]) => Object.freeze({ tileId, cost, path: Object.freeze(bestPath.get(tileId)!) }))
    .sort((left, right) => left.cost - right.cost || left.tileId.localeCompare(right.tileId)));
}

function starterTiles(world: SpherefallWorld, side: Side): readonly TileId[] {
  const headquarters = world.tiles.find((tile) => tile.objective?.kind === "headquarters" && tile.objective.owner === side);
  if (!headquarters) throw new Error(`Missing ${side} headquarters`);
  const adjacent = (topologyById.get(headquarters.id)?.neighbors ?? [])
    .filter((tileId) => {
      const tile = world.tiles.find((candidate) => candidate.id === tileId);
      return tile?.terrainId !== "ocean" && !tile?.objective;
    })
    .sort();
  if (adjacent.length < 5) throw new Error(`Insufficient deployment tiles near ${side} headquarters`);
  return Object.freeze([headquarters.id, ...adjacent.slice(0, 5)]);
}

function starterUnits(world: SpherefallWorld, side: Side): SpherefallUnit[] {
  const roles: readonly TroopId[] = ["striker", "bulwark", "lancer", "artillery", "scout", "hacker"];
  return starterTiles(world, side).map((tileId, index) => {
    const troopId = roles[index]!;
    const troop = troopById.get(troopId)!;
    return Object.freeze({ id: `${side === "player" ? "p" : "a"}-${troopId}`, side, troopId, tileId, hp: troop.hp, guarded: false, jammed: false });
  });
}

export type SpherefallCommand =
  | Readonly<{ type: "move"; unitId: string; to: TileId }>
  | Readonly<{ type: "attack"; unitId: string; targetId: string }>
  | Readonly<{ type: "guard"; unitId: string }>
  | Readonly<{ type: "capture"; unitId: string }>
  | Readonly<{ type: "radar"; unitId: string }>
  | Readonly<{ type: "deploy"; troopId: TroopId; to: TileId }>;
export type SpherefallEvent = Readonly<{
  type: "move" | "attack" | "guard" | "capture" | "radar" | "deploy" | "rejected";
  side: Side;
  unitId: string;
  targetId?: string;
  from?: TileId;
  to?: TileId;
  path?: readonly TileId[];
  cost?: number;
  weaponId?: WeaponId;
  damage?: number;
  remainingHp?: number;
  armorBonus?: number;
  objectiveKind?: ObjectiveKind;
  controller?: Side;
  radius?: number;
  revealedCount?: number;
  troopId?: TroopId;
  supplyCost?: number;
  splash?: boolean;
  reason?: string;
  round: number;
}>;

function freezeWithUnits(state: SpherefallState, units: readonly SpherefallUnit[]): SpherefallState {
  return Object.freeze({ ...state, units: Object.freeze(units) });
}

function topologyPath(from: TileId, to: TileId): readonly TileId[] {
  if (from === to) return Object.freeze([from]);
  const queue: TileId[] = [from];
  const previous = new Map<TileId, TileId | null>([[from, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]!;
    for (const neighbor of topologyById.get(current)?.neighbors ?? []) {
      if (previous.has(neighbor)) continue;
      previous.set(neighbor, current);
      if (neighbor === to) {
        const path: TileId[] = [to];
        let step: TileId | null = current;
        while (step) {
          path.push(step);
          step = previous.get(step) ?? null;
        }
        return Object.freeze(path.reverse());
      }
      queue.push(neighbor);
    }
  }
  return Object.freeze([]);
}

function tileDistance(from: TileId, to: TileId): number {
  const path = topologyPath(from, to);
  return path.length ? path.length - 1 : Number.POSITIVE_INFINITY;
}

function tilesWithinRadius(origin: TileId, radius: number): readonly TileId[] {
  const queue: TileId[] = [origin];
  const distance = new Map<TileId, number>([[origin, 0]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]!;
    const currentDistance = distance.get(current)!;
    if (currentDistance >= radius) continue;
    for (const neighbor of topologyById.get(current)?.neighbors ?? []) {
      if (distance.has(neighbor)) continue;
      distance.set(neighbor, currentDistance + 1);
      queue.push(neighbor);
    }
  }
  return Object.freeze([...distance.keys()].sort());
}

export function visibleTileIds(state: SpherefallState, side: Side): readonly TileId[] {
  const visible = new Set<TileId>(state.revealedTiles[side]);
  for (const unit of state.units.filter((candidate) => candidate.side === side && candidate.hp > 0)) {
    const troop = troopById.get(unit.troopId)!;
    const terrainId = state.world.tiles.find((tile) => tile.id === unit.tileId)?.terrainId;
    const radius = Math.max(1, troop.sensor - (terrainId === "tundra" ? 1 : 0) - (unit.jammed ? 1 : 0));
    for (const tileId of tilesWithinRadius(unit.tileId, radius)) visible.add(tileId);
  }
  return Object.freeze([...visible].sort());
}

export function spherefallObservation(state: SpherefallState, side: Side): SpherefallState {
  const visible = new Set(visibleTileIds(state, side));
  return Object.freeze({
    ...state,
    units: Object.freeze(state.units.filter((unit) => unit.side === side || visible.has(unit.tileId))),
  });
}

function rejection(state: SpherefallState, side: Side, unitId: string, reason: string): SpherefallEvent {
  return Object.freeze({ type: "rejected", side, unitId, reason, round: state.round });
}

export function projectSpherefallCommands(input: SpherefallState, commands: readonly SpherefallCommand[], side: Side): Readonly<{ state: SpherefallState; events: readonly SpherefallEvent[] }> {
  let state = input;
  const events: SpherefallEvent[] = [];
  const movedDistance = new Map<string, number>();
  for (const command of commands) {
    if (command.type === "deploy") {
      const troop = troopById.get(command.troopId)!;
      const activeCount = state.units.filter((unit) => unit.side === side && unit.hp > 0).length;
      const headquarters = state.objectives.find((objective) => objective.kind === "headquarters" && objective.controller === side);
      const deployZone = headquarters ? [headquarters.tileId, ...(topologyById.get(headquarters.tileId)?.neighbors ?? [])] : [];
      const destination = state.world.tiles.find((tile) => tile.id === command.to);
      const occupied = state.units.some((unit) => unit.hp > 0 && unit.tileId === command.to);
      if (!headquarters || activeCount >= SPHEREFALL_RULESET.activeUnitCap || state.supply[side] < troop.supply || !deployZone.includes(command.to) || !destination || !terrainById.get(destination.terrainId)?.groundPassable || occupied) {
        events.push(rejection(state, side, `${side}-deployment`, "illegal-deployment"));
        continue;
      }
      const unitId = `${side === "player" ? "p" : "a"}-${command.troopId}-${state.round}-${activeCount + 1}`;
      const unit = Object.freeze({ id: unitId, side, troopId: command.troopId, tileId: command.to, hp: troop.hp, guarded: false, jammed: false });
      const supply = Object.freeze({ ...state.supply, [side]: state.supply[side] - troop.supply });
      state = Object.freeze({ ...state, units: Object.freeze([...state.units, unit]), supply });
      events.push(Object.freeze({ type: "deploy", side, unitId, troopId: command.troopId, to: command.to, supplyCost: troop.supply, round: state.round }));
      continue;
    }

    const actor = state.units.find((unit) => unit.id === command.unitId && unit.side === side && unit.hp > 0);
    if (!actor) {
      events.push(rejection(state, side, command.unitId, "unit-unavailable"));
      continue;
    }

    if (command.type === "move") {
      const option = legalMoveOptions(state, actor.id).find((candidate) => candidate.tileId === command.to);
      if (!option) {
        events.push(rejection(state, side, actor.id, "illegal-move"));
        continue;
      }
      const units = state.units.map((unit) => unit.id === actor.id ? Object.freeze({ ...unit, tileId: option.tileId, guarded: false }) : unit);
      state = freezeWithUnits(state, units);
      movedDistance.set(actor.id, option.path.length - 1);
      events.push(Object.freeze({ type: "move", side, unitId: actor.id, from: actor.tileId, to: option.tileId, path: option.path, cost: option.cost, round: state.round }));
      continue;
    }

    if (command.type === "guard") {
      const armorBonus = actor.troopId === "bulwark" ? 2 : 1;
      const units = state.units.map((unit) => unit.id === actor.id ? Object.freeze({ ...unit, guarded: true }) : unit);
      state = freezeWithUnits(state, units);
      events.push(Object.freeze({ type: "guard", side, unitId: actor.id, to: actor.tileId, armorBonus, round: state.round }));
      continue;
    }

    if (command.type === "capture") {
      if (movedDistance.has(actor.id) && actor.troopId !== "hacker") {
        events.push(rejection(state, side, actor.id, "rapid-override-required"));
        continue;
      }
      const objective = state.objectives.find((candidate) => candidate.tileId === actor.tileId);
      const enemyAdjacent = state.units.some((unit) => unit.side !== side && unit.hp > 0 && topologyById.get(actor.tileId)?.neighbors.includes(unit.tileId));
      if (!objective || enemyAdjacent) {
        events.push(rejection(state, side, actor.id, objective ? "objective-contested" : "not-on-objective"));
        continue;
      }
      const objectives = Object.freeze(state.objectives.map((candidate) => candidate.tileId === objective.tileId ? Object.freeze({ ...candidate, controller: side }) : candidate));
      state = Object.freeze({ ...state, objectives });
      events.push(Object.freeze({ type: "capture", side, unitId: actor.id, to: actor.tileId, objectiveKind: objective.kind, controller: side, round: state.round }));
      continue;
    }

    if (command.type === "radar") {
      if (actor.jammed) {
        events.push(rejection(state, side, actor.id, "unit-jammed"));
        continue;
      }
      const terrainId = state.world.tiles.find((tile) => tile.id === actor.tileId)?.terrainId;
      const clanBonus = clanById.get(state.clans[side])?.modifier.kind === "radar-range" ? 1 : 0;
      const radius = Math.max(1, (actor.troopId === "scout" ? 4 : 3) + clanBonus - (terrainId === "tundra" ? 1 : 0));
      const revealed = tilesWithinRadius(actor.tileId, radius);
      const combined = Object.freeze([...new Set([...state.revealedTiles[side], ...revealed])].sort());
      const revealedTiles = Object.freeze({ ...state.revealedTiles, [side]: combined });
      state = Object.freeze({ ...state, revealedTiles });
      events.push(Object.freeze({ type: "radar", side, unitId: actor.id, to: actor.tileId, radius, revealedCount: revealed.length, round: state.round }));
      continue;
    }

    const target = state.units.find((unit) => unit.id === command.targetId && unit.side !== side && unit.hp > 0);
    const troop = troopById.get(actor.troopId)!;
    const weapon = weaponById.get(troop.weaponId)!;
    const distance = target ? tileDistance(actor.tileId, target.tileId) : Number.POSITIVE_INFINITY;
    if (!target || distance < weapon.minRange || distance > weapon.maxRange) {
      events.push(rejection(state, side, actor.id, "illegal-attack"));
      continue;
    }
    if (!visibleTileIds(state, side).includes(target.tileId)) {
      events.push(rejection(state, side, actor.id, "target-hidden"));
      continue;
    }
    const attackPath = topologyPath(actor.tileId, target.tileId);
    const blockedLineOfSight = actor.troopId !== "artillery" && attackPath.slice(1, -1).some((tileId) => {
      const terrainId = state.world.tiles.find((tile) => tile.id === tileId)?.terrainId;
      return terrainId ? terrainById.get(terrainId)?.blocksLineOfSight : false;
    });
    if (blockedLineOfSight) {
      events.push(rejection(state, side, actor.id, "blocked-line-of-sight"));
      continue;
    }
    const targetTroop = troopById.get(target.troopId)!;
    const actorWorldTile = state.world.tiles.find((tile) => tile.id === actor.tileId)!;
    const targetWorldTile = state.world.tiles.find((tile) => tile.id === target.tileId)!;
    if (targetWorldTile.terrainId === "forest" && distance > 2 && !state.revealedTiles[side].includes(target.tileId)) {
      events.push(rejection(state, side, actor.id, "target-concealed"));
      continue;
    }
    const targetTerrain = terrainById.get(targetWorldTile.terrainId)!;
    const targetModifier = clanById.get(state.clans[target.side])?.modifier.kind;
    const armorBonus = (target.guarded ? (target.troopId === "bulwark" ? 2 : 1) : 0) + (targetModifier === "tundra-armor" && targetTerrain.id === "tundra" ? 1 : 0);
    const objectiveCover = targetModifier === "objective-cover" && targetWorldTile.objective ? 1 : 0;
    const formationCover = state.units.some((unit) => unit.side === target.side && unit.hp > 0 && unit.guarded && unit.troopId === "bulwark" && (topologyById.get(unit.tileId)?.neighbors.includes(target.tileId) ?? false)) ? 1 : 0;
    const effectiveArmor = Math.max(0, targetTroop.armor + armorBonus - weapon.armorPiercing);
    const momentum = actor.troopId === "striker" && (movedDistance.get(actor.id) ?? 0) >= 2 ? 1 : 0;
    const bracedShot = actor.troopId === "lancer" && !movedDistance.has(actor.id) ? 1 : 0;
    const openTerrain = (terrainId: TerrainId) => terrainId === "plains" || terrainId === "desert";
    const desertPower = distance >= 3 && openTerrain(actorWorldTile.terrainId) && openTerrain(targetWorldTile.terrainId) && (actorWorldTile.terrainId === "desert" || targetWorldTile.terrainId === "desert") ? 1 : 0;
    const damage = Math.max(1, weapon.power + momentum + bracedShot + desertPower - effectiveArmor - Math.max(targetTerrain.cover, objectiveCover, formationCover));
    const remainingHp = Math.max(0, target.hp - damage);
    const splashEvents: SpherefallEvent[] = [];
    const splashTiles = weapon.id === "arc-mortar" ? new Set(topologyById.get(target.tileId)?.neighbors ?? []) : new Set<TileId>();
    const units = state.units.map((unit) => {
      if (unit.id === target.id) return Object.freeze({ ...unit, hp: remainingHp, guarded: false, jammed: weapon.id === "disruptor" && remainingHp > 0 ? true : unit.jammed });
      if (unit.hp <= 0 || !splashTiles.has(unit.tileId)) return unit;
      const splashArmor = troopById.get(unit.troopId)!.armor + (unit.guarded ? unit.troopId === "bulwark" ? 2 : 1 : 0);
      const splashDamage = Math.max(1, 3 - splashArmor);
      const splashRemainingHp = Math.max(0, unit.hp - splashDamage);
      splashEvents.push(Object.freeze({ type: "attack", side, unitId: actor.id, targetId: unit.id, from: target.tileId, to: unit.tileId, weaponId: weapon.id, damage: splashDamage, remainingHp: splashRemainingHp, splash: true, round: state.round }));
      return Object.freeze({ ...unit, hp: splashRemainingHp, guarded: false });
    });
    state = freezeWithUnits(state, units);
    events.push(Object.freeze({ type: "attack", side, unitId: actor.id, targetId: target.id, from: actor.tileId, to: target.tileId, weaponId: weapon.id, damage, remainingHp, round: state.round }));
    events.push(...splashEvents);
  }
  return Object.freeze({ state, events: Object.freeze(events) });
}

function baselineAiCommands(state: SpherefallState): SpherefallCommand[] {
  const commands: SpherefallCommand[] = [];
  for (const unit of state.units.filter((candidate) => candidate.side === "ai" && candidate.hp > 0).sort((left, right) => left.id.localeCompare(right.id))) {
    if (commands.length >= SPHEREFALL_RULESET.commandPoints) break;
    const objective = state.objectives.find((candidate) => candidate.tileId === unit.tileId && candidate.controller !== "ai");
    if (objective) {
      commands.push({ type: "capture", unitId: unit.id });
      continue;
    }
    const troop = troopById.get(unit.troopId)!;
    const weapon = weaponById.get(troop.weaponId)!;
    const target = state.units
      .filter((candidate) => candidate.side === "player" && candidate.hp > 0)
      .filter((candidate) => {
        const distance = tileDistance(unit.tileId, candidate.tileId);
        return distance >= weapon.minRange && distance <= weapon.maxRange;
      })
      .sort((left, right) => left.hp - right.hp || left.id.localeCompare(right.id))[0];
    if (target) {
      commands.push({ type: "attack", unitId: unit.id, targetId: target.id });
      continue;
    }
    const strategicTargets = [
      ...state.objectives.filter((candidate) => candidate.controller !== "ai").map((candidate) => candidate.tileId),
      ...state.units.filter((candidate) => candidate.side === "player" && candidate.hp > 0).map((candidate) => candidate.tileId),
    ];
    const move = [...legalMoveOptions(state, unit.id)]
      .sort((left, right) => {
        const leftDistance = Math.min(...strategicTargets.map((tileId) => tileDistance(left.tileId, tileId)));
        const rightDistance = Math.min(...strategicTargets.map((tileId) => tileDistance(right.tileId, tileId)));
        return leftDistance - rightDistance || left.cost - right.cost || left.tileId.localeCompare(right.tileId);
      })[0];
    commands.push(move ? { type: "move", unitId: unit.id, to: move.tileId } : { type: "guard", unitId: unit.id });
  }
  return commands;
}

function winnerAfterScoring(state: SpherefallState): Side | "draw" | null {
  const playerAlive = state.units.some((unit) => unit.side === "player" && unit.hp > 0);
  const aiAlive = state.units.some((unit) => unit.side === "ai" && unit.hp > 0);
  if (!playerAlive && !aiAlive) return "draw";
  if (!playerAlive) return "ai";
  if (!aiAlive) return "player";
  if (state.victoryPoints.player >= 24 || state.victoryPoints.ai >= 24) {
    if (state.victoryPoints.player === state.victoryPoints.ai) return "draw";
    return state.victoryPoints.player > state.victoryPoints.ai ? "player" : "ai";
  }
  if (state.round >= SPHEREFALL_RULESET.roundLimit) {
    if (state.victoryPoints.player === state.victoryPoints.ai) return "draw";
    return state.victoryPoints.player > state.victoryPoints.ai ? "player" : "ai";
  }
  return null;
}

export function resolveSpherefallRound(input: SpherefallState, playerCommands: readonly SpherefallCommand[]): Readonly<{ state: SpherefallState; events: readonly SpherefallEvent[] }> {
  if (input.winner) return Object.freeze({ state: input, events: Object.freeze([]) });
  const player = projectSpherefallCommands(input, playerCommands.slice(0, SPHEREFALL_RULESET.commandPoints), "player");
  const ai = projectSpherefallCommands(player.state, baselineAiCommands(player.state), "ai");
  const scoreFor = (side: Side) => ai.state.objectives.reduce((score, objective) => score + (objective.controller === side ? objective.kind === "prime-relay" ? 2 : objective.kind === "uplink" ? 1 : 0 : 0), 0);
  const incomeFor = (side: Side) => 2 + scoreFor(side);
  const supply = Object.freeze({
    player: Math.min(12, ai.state.supply.player + incomeFor("player")),
    ai: Math.min(12, ai.state.supply.ai + incomeFor("ai")),
  });
  const victoryPoints = Object.freeze({
    player: ai.state.victoryPoints.player + scoreFor("player"),
    ai: ai.state.victoryPoints.ai + scoreFor("ai"),
  });
  const units = Object.freeze(ai.state.units.map((unit) => unit.guarded || unit.jammed ? Object.freeze({ ...unit, guarded: false, jammed: false }) : unit));
  const revealedTiles = Object.freeze({ player: Object.freeze([]) as readonly TileId[], ai: Object.freeze([]) as readonly TileId[] });
  const scored = Object.freeze({ ...ai.state, supply, victoryPoints, units, revealedTiles });
  const state = Object.freeze({ ...scored, round: Math.min(SPHEREFALL_RULESET.roundLimit, scored.round + 1), winner: winnerAfterScoring(scored) });
  return Object.freeze({ state, events: Object.freeze([...player.events, ...ai.events]) });
}

export function createSpherefallState(options: Readonly<{ playerClanId: ClanId; aiClanId: ClanId; world?: SpherefallWorld }>): SpherefallState {
  const world = options.world ?? SPHEREFALL_WORLD;
  return Object.freeze({
    ruleset: SPHEREFALL_RULESET,
    world,
    round: 1,
    clans: Object.freeze({ player: options.playerClanId, ai: options.aiClanId }),
    supply: Object.freeze({ player: 0, ai: 0 }),
    victoryPoints: Object.freeze({ player: 0, ai: 0 }),
    units: Object.freeze([...starterUnits(world, "player"), ...starterUnits(world, "ai")]),
    objectives: Object.freeze(world.tiles.flatMap((tile) => tile.objective ? [Object.freeze({ tileId: tile.id, kind: tile.objective.kind, controller: tile.objective.owner })] : [])),
    revealedTiles: Object.freeze({ player: Object.freeze([]), ai: Object.freeze([]) }),
    winner: null,
  });
}
