import { describe, expect, it } from "vitest";
import { createSphericalTopology, SPHERE_TOPOLOGY } from "./sphere";

describe("frequency-3 spherical topology", () => {
  it("forms the canonical immutable 92-cell geodesic dual", () => {
    expect(SPHERE_TOPOLOGY.frequency).toBe(3);
    expect(SPHERE_TOPOLOGY.tiles).toHaveLength(92);
    expect(SPHERE_TOPOLOGY.triangles).toHaveLength(180);
    expect(SPHERE_TOPOLOGY.edges).toHaveLength(270);
    expect(SPHERE_TOPOLOGY.tiles.filter((tile) => tile.sides === 5)).toHaveLength(12);
    expect(SPHERE_TOPOLOGY.tiles.filter((tile) => tile.sides === 6)).toHaveLength(80);
    expect(92 - 270 + 180).toBe(2);
    expect(Object.isFrozen(SPHERE_TOPOLOGY)).toBe(true);
    expect(Object.isFrozen(SPHERE_TOPOLOGY.tiles[0]?.neighbors)).toBe(true);
  });

  it("has stable IDs and symmetric adjacency", () => {
    const again = createSphericalTopology(3);
    expect(again.tiles.map((tile) => tile.id)).toEqual(SPHERE_TOPOLOGY.tiles.map((tile) => tile.id));
    for (const tile of SPHERE_TOPOLOGY.tiles) {
      for (const neighbor of tile.neighbors) {
        expect(SPHERE_TOPOLOGY.tiles.find((candidate) => candidate.id === neighbor)?.neighbors).toContain(tile.id);
      }
      expect(Math.hypot(tile.center.x, tile.center.y, tile.center.z)).toBeCloseTo(1, 10);
    }
  });
});
