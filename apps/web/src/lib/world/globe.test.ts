import { describe, expect, it } from "vitest";
import { projectGlobeTiles, rotateVector } from "./globe";
import { SPHERE_TOPOLOGY } from "./sphere";

describe("globe projection", () => {
  it("rotates vectors deterministically without changing magnitude", () => {
    const result = rotateVector({ x: 1, y: 0, z: 0 }, { yaw: Math.PI / 2, pitch: 0 });
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(-1, 10);
    expect(Math.hypot(result.x, result.y, result.z)).toBeCloseTo(1, 10);
  });

  it("returns a stable immutable visible hemisphere projection", () => {
    const first = projectGlobeTiles(SPHERE_TOPOLOGY, { yaw: 0.2, pitch: -0.1 }, 292);
    const second = projectGlobeTiles(SPHERE_TOPOLOGY, { yaw: 0.2, pitch: -0.1 }, 292);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(40);
    expect(first.length).toBeLessThan(92);
    expect(first.every((tile) => tile.depth > -0.12 && tile.polygon.length === tile.sides)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0]?.polygon)).toBe(true);
  });
});
