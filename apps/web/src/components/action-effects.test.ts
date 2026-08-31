import { describe, expect, it } from "vitest";
import { describeGameEvent } from "./action-effects";

describe("resolved event announcements", () => {
  it("announces move destinations and complete attack outcomes", () => {
    expect(describeGameEvent({ turn: 1, side: "player", type: "move", unitId: "p-scout", to: { q: 0, r: 1 } })).toContain("hex 0, 1");
    expect(describeGameEvent({ turn: 1, side: "player", type: "attack", unitId: "p-striker", targetId: "a-scout", to: { q: 1, r: 0 }, damage: 3, remainingHealth: 2 })).toContain("for 3 damage; 2 integrity remains");
  });
});
