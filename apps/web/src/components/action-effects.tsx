import type { GameEvent } from "../lib/game/tutorial";

const name = (value: string | undefined) => value?.replace(/^[pa]-/, "") ?? "unknown unit";
const hex = (event: GameEvent) => event.to ? `hex ${event.to.q}, ${event.to.r}` : "its position";

export function describeGameEvent(event: GameEvent): string {
  if (event.type === "move") return `${event.side} ${name(event.unitId)} moved to ${hex(event)}.`;
  if (event.type === "attack") return `${event.side} ${name(event.unitId)} attacked ${name(event.targetId)} at ${hex(event)} for ${event.damage ?? 0} damage; ${event.remainingHealth ?? 0} integrity remains.`;
  if (event.type === "capture") return `${event.side} ${name(event.unitId)} captured ${event.objectiveId ?? "the objective"} at ${hex(event)}.`;
  if (event.type === "guard") return `${event.side} ${name(event.unitId)} guarded at ${hex(event)}.`;
  if (event.type === "radar") return `${event.side} ${name(event.unitId)} scanned from ${hex(event)}.`;
  if (event.type === "victory") return `${event.side} victory confirmed.`;
  return `${event.side} ${name(event.unitId)} command rejected: ${(event.reason ?? "unknown reason").replaceAll("-", " ")}.`;
}

export function ActionEffects({ events }: { events: readonly GameEvent[] }) {
  return (
    <ol className="event-stream" aria-live="polite" aria-label="Resolved command events">
      {events.slice(-7).map((event, index) => (
        <li key={`${event.turn}-${index}-${event.type}`} className={`log-${event.type}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{event.side}</strong>
          {describeGameEvent(event)}
        </li>
      ))}
    </ol>
  );
}
