import type { Command, GameState } from "./tutorial";

const label = (id: string) => id.replace(/^[pa]-/, "").replace(/(^|-)([a-z])/g, (_, separator: string, letter: string) => `${separator ? " " : ""}${letter.toUpperCase()}`);
const hex = (q: number, r: number) => `hex ${q}, ${r}`;

export function describeQueuedCommand(command: Command, projected: GameState): string {
  const actorName = label(command.unitId);
  const actor = projected.units.find((unit) => unit.id === command.unitId);
  if (command.type === "move") return `${actorName} move queued to ${hex(command.to.q, command.to.r)}`;
  if (command.type === "attack") {
    const target = projected.units.find((unit) => unit.id === command.targetId);
    return `${actorName} attack queued against ${label(command.targetId)}${target ? ` at ${hex(target.position.q, target.position.r)}; projected integrity ${target.health}` : ""}`;
  }
  const position = actor ? hex(actor.position.q, actor.position.r) : "projected hex unavailable";
  if (command.type === "capture") return `${actorName} capture queued at ${position}${projected.winner ? `; projected ${projected.winner} victory` : ""}`;
  if (command.type === "guard") return `${actorName} guard queued at ${position}${actor?.guarded ? "; projected guard active" : ""}`;
  return `${actorName} radar queued from ${position}`;
}
