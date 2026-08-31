import { describe, expect, it } from "vitest";
import { axialNeighbors, createTutorialState, isAxialNeighbor, projectCommands, resolveTurn, RULESET, type Command } from "./tutorial";

describe("operation rules engine", () => {
  it("uses immutable pointy-top axial hex geometry", () => {
    expect(RULESET).toEqual({ id: "smashdroids-tutorial/1", abi: 1, geometry: "axial-hex-v1", orientation: "pointy-top" });
    expect(axialNeighbors({ q: 0, r: 0 })).toHaveLength(6);
    expect(new Set(axialNeighbors({ q: 0, r: 0 }).map((x) => `${x.q},${x.r}`)).size).toBe(6);
    expect(isAxialNeighbor({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(true);
    expect(isAxialNeighbor({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(false);
  });
  it("resolves at most three ordered player commands before deterministic AI", () => {
    const input = createTutorialState();
    const commands: Command[] = [{ type: "radar", unitId: "p-scout" }, { type: "guard", unitId: "p-bulwark" }, { type: "move", unitId: "p-striker", to: { q: -1, r: 1 } }, { type: "radar", unitId: "p-striker" }];
    const first = resolveTurn(input, commands);
    expect(first).toEqual(resolveTurn(input, commands));
    expect(first.events.slice(0, 3).map((e) => e.type)).toEqual(["radar", "guard", "move"]);
    expect(first.events.filter((e) => e.side === "player")).toHaveLength(3);
    expect(first.state.turn).toBe(2);
    expect(input.turn).toBe(1);
    expect(Object.isFrozen(first.state)).toBe(true);
  });
  it("owns deeply immutable move event coordinates", () => {
    const destination = { q: -1, r: 1 };
    const result = resolveTurn(createTutorialState(), [{ type: "move", unitId: "p-striker", to: destination }]);
    const move = result.events.find((event) => event.type === "move");
    expect(move?.to).toEqual({ q: -1, r: 1 });
    expect(Object.isFrozen(move?.to)).toBe(true);
    destination.q = 999;
    expect(move?.to).toEqual({ q: -1, r: 1 });
  });
  it("keeps terminal states absorbing", () => {
    const terminal = { ...createTutorialState(), winner: "player" as const };
    const result = resolveTurn(terminal, []);
    expect(result.state).toEqual(terminal);
    expect(result.events).toEqual([]);
  });
  it("projects chained commands against intermediate state", () => {
    const result = projectCommands(createTutorialState(), [
      { type: "move", unitId: "p-striker", to: { q: -1, r: 1 } },
      { type: "move", unitId: "p-striker", to: { q: 0, r: 1 } },
    ], "player");
    expect(result.events.map((entry) => entry.type)).toEqual(["move", "move"]);
    expect(result.state.units.find((unit) => unit.id === "p-striker")?.position).toEqual({ q: 0, r: 1 });
  });
  it("records authoritative event coordinates and attack outcomes", () => {
    const initial = createTutorialState();
    const units = initial.units.map((unit) => {
      if (unit.id === "p-striker") return { ...unit, position: { q: 0, r: 0 } };
      if (unit.id === "a-scout") return { ...unit, position: { q: 1, r: 0 } };
      return unit;
    });
    const attack = projectCommands({ ...initial, units }, [{ type: "attack", unitId: "p-striker", targetId: "a-scout" }], "player").events[0];
    const guard = projectCommands(initial, [{ type: "guard", unitId: "p-bulwark" }], "player").events[0];
    expect(attack).toMatchObject({ from: { q: 0, r: 0 }, to: { q: 1, r: 0 }, damage: 2, remainingHealth: 1 });
    expect(guard?.to).toEqual({ q: -2, r: 2 });
  });
  it("makes capturing the relay an immediate terminal victory", () => {
    const input = createTutorialState();
    const units = input.units.map((unit) => unit.id === "p-scout" ? { ...unit, position: { q: 0, r: 0 } } : unit);
    const result = resolveTurn({ ...input, units }, [{ type: "capture", unitId: "p-scout" }]);
    expect(result.events.map((event) => event.type)).toEqual(["capture", "victory"]);
    expect(result.state.winner).toBe("player");
    expect(result.events.some((event) => event.side === "ai")).toBe(false);
  });
  it("rejects illegal commands with truthful events", () => {
    const result = resolveTurn(createTutorialState(), [{ type: "move", unitId: "p-striker", to: { q: 3, r: -3 } }, { type: "capture", unitId: "p-scout" }, { type: "radar", unitId: "p-scout" }]);
    expect(result.events.slice(0, 3).map((e) => e.type)).toEqual(["rejected", "rejected", "radar"]);
    expect(result.events[0]?.reason).toBe("illegal-move");
    expect(result.events[1]?.reason).toBe("not-on-objective");
  });
});
