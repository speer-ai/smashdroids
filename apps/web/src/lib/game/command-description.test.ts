import { describe, expect, it } from "vitest";
import { createTutorialState, projectCommands } from "./tutorial";
import { describeQueuedCommand } from "./command-description";

describe("projected command announcements", () => {
  it("identifies the actor and destination for movement", () => {
    const command = { type: "move" as const, unitId: "p-striker", to: { q: -1, r: 1 } };
    const projected = projectCommands(createTutorialState(), [command], "player").state;
    expect(describeQueuedCommand(command, projected)).toBe("Striker move queued to hex -1, 1");
  });

  it("announces capture location and projected victory", () => {
    const initial = createTutorialState();
    const units = initial.units.map((unit) => unit.id === "p-striker" ? { ...unit, position: { q: 0, r: 0 } } : unit);
    const state = { ...initial, units };
    const command = { type: "capture" as const, unitId: "p-striker" };
    const projected = projectCommands(state, [command], "player").state;
    expect(describeQueuedCommand(command, projected)).toBe("Striker capture queued at hex 0, 0; projected player victory");
  });

  it("announces guard location and projected state", () => {
    const command = { type: "guard" as const, unitId: "p-striker" };
    const projected = projectCommands(createTutorialState(), [command], "player").state;
    expect(describeQueuedCommand(command, projected)).toBe("Striker guard queued at hex -2, 1; projected guard active");
  });

  it("announces radar origin", () => {
    const command = { type: "radar" as const, unitId: "p-striker" };
    const projected = projectCommands(createTutorialState(), [command], "player").state;
    expect(describeQueuedCommand(command, projected)).toBe("Striker radar queued from hex -2, 1");
  });

  it("identifies attack target and projected integrity", () => {
    const initial = createTutorialState();
    const units = initial.units.map((unit) => unit.id === "p-striker" ? { ...unit, position: { q: 0, r: 0 } } : unit.id === "a-scout" ? { ...unit, position: { q: 1, r: 0 } } : unit);
    const state = { ...initial, units };
    const command = { type: "attack" as const, unitId: "p-striker", targetId: "a-scout" };
    const projected = projectCommands(state, [command], "player").state;
    expect(describeQueuedCommand(command, projected)).toBe("Striker attack queued against Scout at hex 1, 0; projected integrity 1");
  });
});
