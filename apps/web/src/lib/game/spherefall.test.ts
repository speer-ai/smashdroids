import { describe, expect, it } from "vitest";
import { SPHERE_TOPOLOGY } from "../world/sphere";
import { TROOPS } from "./catalog";
import { createSpherefallState, expireTemporaryEffects, legalMoveOptions, projectSpherefallCommands, resolveSpherefallRound, spherefallObservation } from "./spherefall";
import { shortestTilePath } from "./world";

describe("Spherefall deterministic reducer", () => {
  it("creates six living units per side with immutable canonical state", () => {
    const state = createSpherefallState({ playerClanId: "neo-romans", aiClanId: "germanoids" });
    expect(state.units.filter((unit) => unit.side === "player" && unit.hp > 0)).toHaveLength(6);
    expect(state.units.filter((unit) => unit.side === "ai" && unit.hp > 0)).toHaveLength(6);
    expect(state.units.filter((unit) => unit.side === "player").map((unit) => unit.troopId)).toEqual(TROOPS.map((troop) => troop.id));
    expect(state.ruleset.tileCount).toBe(92);
    expect(state.ruleset.commandPoints).toBe(4);
    expect(state.ruleset.roundLimit).toBe(10);
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.units)).toBe(true);
  });

  it("projects legal movement sequentially without mutating input", () => {
    const state = createSpherefallState({ playerClanId: "hoshikage", aiClanId: "zoryani" });
    const actor = state.units.find((unit) => unit.side === "player")!;
    const option = legalMoveOptions(state, actor.id)[0]!;
    const projected = projectSpherefallCommands(state, [{ type: "move", unitId: actor.id, to: option.tileId }], "player");
    expect(projected.events[0]).toMatchObject({ type: "move", unitId: actor.id, to: option.tileId });
    expect(projected.state.units.find((unit) => unit.id === actor.id)?.tileId).toBe(option.tileId);
    expect(state.units.find((unit) => unit.id === actor.id)?.tileId).toBe(actor.tileId);
    expect(Object.isFrozen(projected.events[0]?.path)).toBe(true);
  });

  it("reserves Move-then-Capture for Hacker Rapid Override", () => {
    const base = createSpherefallState({ playerClanId: "xiren", aiClanId: "zoryani" });
    const objective = base.objectives.find((candidate) => candidate.controller === null)!;
    const start = SPHERE_TOPOLOGY.tiles.find((tile) => tile.id === objective.tileId)!.neighbors.find((tileId) => base.world.tiles.find((tile) => tile.id === tileId)?.terrainId !== "ocean")!;
    const run = (troopId: "striker" | "hacker") => {
      const troop = TROOPS.find((candidate) => candidate.id === troopId)!;
      const state = Object.freeze({ ...base, units: Object.freeze([Object.freeze({ id: `p-${troopId}`, side: "player" as const, troopId, tileId: start, hp: troop.hp, guarded: false, jammed: false })]) });
      return projectSpherefallCommands(state, [
        { type: "move", unitId: `p-${troopId}`, to: objective.tileId },
        { type: "capture", unitId: `p-${troopId}` },
      ], "player");
    };
    expect(run("striker").events[1]).toMatchObject({ type: "rejected", reason: "rapid-override-required" });
    expect(run("hacker").state.objectives.find((candidate) => candidate.tileId === objective.tileId)?.controller).toBe("player");
  });

  it("bounds round commands and resolves deterministic AI, economy, and round progression", () => {
    const state = createSpherefallState({ playerClanId: "solandinos", aiClanId: "xiren" });
    const actor = state.units.find((unit) => unit.side === "player")!;
    const commands = Array.from({ length: 8 }, () => ({ type: "guard" as const, unitId: actor.id }));
    const first = resolveSpherefallRound(state, commands);
    const second = resolveSpherefallRound(state, commands);
    expect(first).toEqual(second);
    expect(first.state.round).toBe(2);
    const playerEvents = first.events.filter((event) => event.side === "player");
    expect(playerEvents.filter((event) => event.type !== "rejected")).toHaveLength(4);
    expect(playerEvents.filter((event) => event.reason === "command-limit-exceeded")).toHaveLength(4);
    expect(first.state.supply.player).toBeGreaterThanOrEqual(2);
    expect(Object.isFrozen(first.state)).toBe(true);
  });

  it("terminates on round ten without producing an impossible round eleven", () => {
    const base = createSpherefallState({ playerClanId: "neo-romans", aiClanId: "zoryani" });
    const state = Object.freeze({ ...base, round: 10, victoryPoints: Object.freeze({ player: 5, ai: 2 }) });
    const resolved = resolveSpherefallRound(state, [{ type: "guard", unitId: "p-striker" }]);
    expect(resolved.state.round).toBe(10);
    expect(resolved.state.winner).toBe("player");
  });

  it("rejects attacks against enemies outside sensor or Radar visibility", () => {
    const base = createSpherefallState({ playerClanId: "xiren", aiClanId: "germanoids" });
    const plains = base.world.tiles.filter((tile) => tile.terrainId === "plains");
    const pair = plains.flatMap((from) => plains.map((to) => ({ from: from.id, to: to.id, path: shortestTilePath(base.world, from.id, to.id) }))).find((candidate) => candidate.path.length === 4)!;
    const units = Object.freeze([
      Object.freeze({ id: "p-lancer", side: "player" as const, troopId: "lancer" as const, tileId: pair.from, hp: 8, guarded: false, jammed: false }),
      Object.freeze({ id: "a-scout", side: "ai" as const, troopId: "scout" as const, tileId: pair.to, hp: 6, guarded: false, jammed: false }),
    ]);
    const hidden = Object.freeze({ ...base, units, revealedTiles: Object.freeze({ player: Object.freeze([]), ai: Object.freeze([]) }) });
    expect(projectSpherefallCommands(hidden, [{ type: "attack", unitId: "p-lancer", targetId: "a-scout" }], "player").events[0]).toMatchObject({ type: "rejected", reason: "target-hidden" });
    const revealed = Object.freeze({ ...hidden, revealedTiles: Object.freeze({ ...hidden.revealedTiles, player: Object.freeze([pair.to]) }) });
    expect(projectSpherefallCommands(revealed, [{ type: "attack", unitId: "p-lancer", targetId: "a-scout" }], "player").events[0]).toMatchObject({ type: "attack", targetId: "a-scout" });
  });

  it("previews commands from private observation without exposing hidden occupancy", () => {
    const base = createSpherefallState({ playerClanId: "xiren", aiClanId: "germanoids" });
    const from = base.world.tiles[0]!.id;
    const target = base.world.tiles.find((tile) => shortestTilePath(base.world, from, tile.id).length === 4)!.id;
    const world = Object.freeze({ ...base.world, tiles: Object.freeze(base.world.tiles.map((tile) => Object.freeze({ ...tile, terrainId: "plains" as const }))) });
    const units = Object.freeze([
      Object.freeze({ id: "p-striker", side: "player" as const, troopId: "striker" as const, tileId: from, hp: 8, guarded: false, jammed: false }),
      Object.freeze({ id: "a-scout", side: "ai" as const, troopId: "scout" as const, tileId: target, hp: 6, guarded: false, jammed: false }),
    ]);
    const hidden = Object.freeze({ ...base, world, units, revealedTiles: Object.freeze({ player: Object.freeze([]), ai: Object.freeze([]) }) });
    const observation = spherefallObservation(hidden, "player");
    expect(observation.units.map((unit) => unit.id)).toEqual(["p-striker"]);
    expect(legalMoveOptions(observation, "p-striker").some((candidate) => candidate.tileId === target)).toBe(true);
    expect(projectSpherefallCommands(observation, [{ type: "move", unitId: "p-striker", to: target }], "player").state.units[0]!.tileId).toBe(target);
    const authoritative = projectSpherefallCommands(hidden, [{ type: "move", unitId: "p-striker", to: target }], "player");
    expect(authoritative.events[0]).toMatchObject({ type: "rejected", reason: "illegal-move" });
    expect(authoritative.state.units[0]!.tileId).toBe(from);
  });

  it("accumulates Striker Momentum across multiple moves in one command set", () => {
    const base = createSpherefallState({ playerClanId: "solandinos", aiClanId: "germanoids" });
    const world = Object.freeze({ ...base.world, tiles: Object.freeze(base.world.tiles.map((tile) => Object.freeze({ ...tile, terrainId: "plains" as const }))) });
    const path = shortestTilePath(world, world.tiles[0]!.id, world.tiles.find((tile) => shortestTilePath(world, world.tiles[0]!.id, tile.id).length === 4)!.id);
    const units = (strikerTile: typeof path[number]) => Object.freeze([
      Object.freeze({ id: "p-striker", side: "player" as const, troopId: "striker" as const, tileId: strikerTile, hp: 8, guarded: false, jammed: false }),
      Object.freeze({ id: "a-scout", side: "ai" as const, troopId: "scout" as const, tileId: path[3]!, hp: 6, guarded: false, jammed: false }),
    ]);
    const moving = Object.freeze({ ...base, world, units: units(path[0]!) });
    const moved = projectSpherefallCommands(moving, [
      { type: "move", unitId: "p-striker", to: path[1]! },
      { type: "move", unitId: "p-striker", to: path[2]! },
      { type: "attack", unitId: "p-striker", targetId: "a-scout" },
    ], "player");
    const stationary = projectSpherefallCommands(Object.freeze({ ...base, world, units: units(path[2]!) }), [{ type: "attack", unitId: "p-striker", targetId: "a-scout" }], "player");
    expect(moved.events[2]).toMatchObject({ type: "attack", damage: (stationary.events[0]?.damage ?? 0) + 1 });
  });

  it("expires pre-existing temporary effects while preserving effects created during the phase", () => {
    const base = createSpherefallState({ playerClanId: "neo-romans", aiClanId: "zoryani" });
    const before = Object.freeze({ ...base, units: Object.freeze([
      Object.freeze({ ...base.units[0]!, guarded: true, jammed: true }),
      Object.freeze({ ...base.units[6]!, guarded: false, jammed: false }),
    ]) });
    const after = Object.freeze({ ...before, units: Object.freeze([
      before.units[0]!,
      Object.freeze({ ...before.units[1]!, guarded: true, jammed: true }),
    ]) });
    const expired = expireTemporaryEffects(before, after);
    expect(expired.units[0]).toMatchObject({ guarded: false, jammed: false });
    expect(expired.units[1]).toMatchObject({ guarded: true, jammed: true });
  });

  it("plans each AI command against the projected intermediate state", () => {
    const base = createSpherefallState({ playerClanId: "neo-romans", aiClanId: "germanoids" });
    const target = base.world.tiles[0]!.id;
    const attackers = SPHERE_TOPOLOGY.tiles.find((tile) => tile.id === target)!.neighbors.slice(0, 2);
    const world = Object.freeze({ ...base.world, tiles: Object.freeze(base.world.tiles.map((tile) => Object.freeze({ ...tile, terrainId: "plains" as const }))) });
    const state = Object.freeze({ ...base, world, units: Object.freeze([
      Object.freeze({ id: "p-scout", side: "player" as const, troopId: "scout" as const, tileId: target, hp: 1, guarded: false, jammed: false }),
      Object.freeze({ id: "a-striker-1", side: "ai" as const, troopId: "striker" as const, tileId: attackers[0]!, hp: 8, guarded: false, jammed: false }),
      Object.freeze({ id: "a-striker-2", side: "ai" as const, troopId: "striker" as const, tileId: attackers[1]!, hp: 8, guarded: false, jammed: false }),
    ]) });
    const resolved = resolveSpherefallRound(state, []);
    expect(resolved.events.filter((event) => event.side === "ai" && event.type === "attack" && event.targetId === "p-scout")).toHaveLength(1);
    expect(resolved.events.filter((event) => event.side === "ai" && event.type === "rejected")).toHaveLength(0);
  });

  it("rejects malformed and over-limit commands at the shared reducer boundary", () => {
    const state = createSpherefallState({ playerClanId: "xiren", aiClanId: "zoryani" });
    const actor = state.units.find((unit) => unit.side === "player")!;
    const malformed = projectSpherefallCommands(state, [{ type: "deploy", troopId: "bogus", to: "bogus" }] as never, "player");
    expect(malformed.events[0]).toMatchObject({ type: "rejected", reason: "invalid-command" });
    expect(projectSpherefallCommands(state, null as never, "player").events[0]).toMatchObject({ type: "rejected", reason: "invalid-command" });
    const overflow = projectSpherefallCommands(state, Array.from({ length: 5 }, () => ({ type: "guard", unitId: actor.id })), "player");
    expect(overflow.events).toHaveLength(5);
    expect(overflow.events[4]).toMatchObject({ type: "rejected", reason: "command-limit-exceeded" });
  });
});
