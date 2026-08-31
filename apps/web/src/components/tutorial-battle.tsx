"use client";

import { useMemo, useRef, useState } from "react";
import { ActionEffects } from "./action-effects";
import { describeQueuedCommand } from "../lib/game/command-description";
import {
  createTutorialState,
  projectCommands,
  resolveTurn,
  type Axial,
  type Command,
  type GameEvent,
  type Unit,
} from "../lib/game/tutorial";

const tiles: Axial[] = Array.from({ length: 7 }, (_, qIndex) => qIndex - 3).flatMap((q) =>
  Array.from({ length: 7 }, (_, rIndex) => rIndex - 3)
    .filter((r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 3)
    .map((r) => ({ q, r })),
);
const tileKeys = new Set(tiles.map(({ q, r }) => `${q},${r}`));
const roleGlyph: Record<Unit["role"], string> = { striker: "S", bulwark: "B", scout: "R" };

function keyFor(position: Axial) { return `${position.q},${position.r}`; }
function samePosition(a: Axial | undefined, b: Axial) { return Boolean(a && a.q === b.q && a.r === b.r); }

function positionStyle(position: Axial): React.CSSProperties {
  return {
    "--hex-x": `${50 + position.q * 12.7}%`,
    "--hex-y": `${50 + (position.r + position.q / 2) * 14.7}%`,
  } as React.CSSProperties;
}

function effectStyle(event: GameEvent, index: number): React.CSSProperties {
  if (!event.to) return {};
  const style = { ...positionStyle(event.to), "--event-delay": `${index * 120}ms` } as React.CSSProperties;
  if (event.type === "move" && event.from) {
    const dx = event.to.q - event.from.q;
    const dy = (event.to.r + event.to.q / 2) - (event.from.r + event.from.q / 2);
    Object.assign(style, { "--move-angle": `${Math.atan2(dy, dx) * 180 / Math.PI}deg` });
  }
  return style;
}

export function TutorialBattle() {
  const [state, setState] = useState(createTutorialState);
  const [selectedId, setSelectedId] = useState<string | null>("p-striker");
  const [focusedKey, setFocusedKey] = useState("-2,1");
  const [commands, setCommands] = useState<Command[]>([]);
  const [events, setEvents] = useState<readonly GameEvent[]>([]);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const projection = useMemo(() => projectCommands(state, commands, "player"), [state, commands]);
  const planningState = projection.state;
  const living = useMemo(() => planningState.units.filter((unit) => unit.health > 0), [planningState]);
  const selected = living.find((unit) => unit.id === selectedId);

  function isLegal(command: Command) {
    return projectCommands(planningState, [command], "player").events[0]?.type !== "rejected";
  }

  function queue(command: Command) {
    if (commands.length < 3 && !planningState.winner && isLegal(command)) setCommands((current) => [...current, command]);
  }

  function commandForTile(position: Axial): Command | null {
    if (!selected || commands.length >= 3 || planningState.winner) return null;
    const occupant = living.find((unit) => samePosition(unit.position, position));
    if (occupant?.side === "ai") {
      const command: Command = { type: "attack", unitId: selected.id, targetId: occupant.id };
      return isLegal(command) ? command : null;
    }
    if (!occupant) {
      const command: Command = { type: "move", unitId: selected.id, to: position };
      return isLegal(command) ? command : null;
    }
    return null;
  }

  function chooseTile(position: Axial) {
    const occupant = living.find((unit) => samePosition(unit.position, position));
    if (occupant?.side === "player") return setSelectedId(occupant.id);
    const command = commandForTile(position);
    if (command) queue(command);
  }

  function moveFocus(position: Axial, key: string) {
    const vectors: Record<string, Axial> = {
      ArrowRight: { q: 1, r: 0 }, ArrowLeft: { q: -1, r: 0 },
      ArrowUp: { q: 0, r: -1 }, ArrowDown: { q: 0, r: 1 },
    };
    const vector = vectors[key];
    if (!vector) return;
    const next = { q: position.q + vector.q, r: position.r + vector.r };
    const nextKey = keyFor(next);
    if (!tileKeys.has(nextKey)) return;
    setFocusedKey(nextKey);
    requestAnimationFrame(() => tileRefs.current.get(nextKey)?.focus());
  }

  function endTurn() {
    const result = resolveTurn(state, commands);
    setState(result.state);
    setEvents(result.events);
    setCommands([]);
    if (!result.state.units.some((unit) => unit.id === selectedId && unit.health > 0)) {
      setSelectedId(result.state.units.find((unit) => unit.side === "player" && unit.health > 0)?.id ?? null);
    }
  }

  const captureCommand: Command | null = selected ? { type: "capture", unitId: selected.id } : null;
  const captureEnabled = Boolean(captureCommand && commands.length < 3 && !planningState.winner && isLegal(captureCommand));
  const latestCommand = commands.at(-1);
  const queueAnnouncement = latestCommand
    ? `${describeQueuedCommand(latestCommand, planningState)}; ${commands.length} of 3 commands queued.`
    : "Command queue empty.";

  return (
    <section className="battle-layout">
      <div className="battle-copy">
        <p className="kicker">OPERATION / ACID RELAY</p>
        <h1>{state.winner ? `${state.winner} victory` : <>TURN {String(state.turn).padStart(2, "0")}<br /><span>TAKE THE RELAY.</span></>}</h1>
        <p>Choose a friendly droid, then select an available adjacent destination or hostile. Use arrow keys to inspect the hex field. Every queued command is validated against the projected field.</p>
        <div className="unit-readout"><span>ACTIVE</span><strong>{selected?.role.toUpperCase() ?? "NONE"}</strong><small>{selected ? `${selected.health} integrity / ${selected.id}` : "select a surviving unit"}</small></div>
        <div className="action-bank" aria-label="Droid commands">
          <button onClick={() => selected && queue({ type: "guard", unitId: selected.id })} disabled={!selected || commands.length >= 3 || Boolean(planningState.winner)}>Guard</button>
          <button onClick={() => selected && queue({ type: "radar", unitId: selected.id })} disabled={!selected || commands.length >= 3 || Boolean(planningState.winner)}>Radar</button>
          <button onClick={() => captureCommand && queue(captureCommand)} disabled={!captureEnabled}>Capture</button>
        </div>
      </div>

      <div className="battle-board-wrap">
        <div className="board-frame"><span>AXIAL FIELD / R3</span><span>NORTH // 000</span></div>
        <div className="hex-board" role="toolbar" aria-label="Operation battlefield" aria-describedby="board-help">
          <p id="board-help" className="sr-only">Use arrow keys to move between hex buttons. Press Enter or Space to select a friendly droid or queue an available move or attack.</p>
          {tiles.map((tile) => {
            const unit = living.find((item) => samePosition(item.position, tile));
            const objective = tile.q === 0 && tile.r === 0;
            const selectedTile = unit?.id === selectedId;
            const focusedTile = focusedKey === keyFor(tile);
            const command = commandForTile(tile);
            const available = Boolean(unit?.side === "player" || command);
            return <button
              key={keyFor(tile)}
              ref={(node) => { if (node) tileRefs.current.set(keyFor(tile), node); else tileRefs.current.delete(keyFor(tile)); }}
              tabIndex={focusedTile ? 0 : -1}
              className={`hex-tile ${objective ? "objective" : ""} ${unit ? `occupied ${unit.side}` : ""} ${selectedTile ? "selected" : ""} ${available ? "legal" : "unavailable"}`}
              style={positionStyle(tile)}
              aria-label={`Hex ${tile.q}, ${tile.r}${unit ? `: ${unit.side} ${unit.role}, ${unit.health} integrity` : objective ? ": relay objective" : ": empty"}; ${available ? "available" : "unavailable"}`}
              aria-pressed={selectedTile}
              aria-disabled={!available}
              onFocus={() => setFocusedKey(keyFor(tile))}
              onKeyDown={(event) => { if (event.key.startsWith("Arrow")) { event.preventDefault(); moveFocus(tile, event.key); } }}
              onClick={() => chooseTile(tile)}
            >
              <svg viewBox="0 0 100 116" aria-hidden="true"><polygon points="50,2 98,29 98,87 50,114 2,87 2,29" /></svg>
              {objective && <i>◎</i>}
              {unit && <span className="droid"><b>{roleGlyph[unit.role]}</b><small>{unit.health}</small></span>}
            </button>;
          })}
          {events.map((event, index) => event.to && !["rejected", "victory"].includes(event.type) ? (
            <span
              aria-hidden="true"
              key={`${event.turn}-${index}-${event.type}-${event.unitId ?? event.side}`}
              className={`action-vfx ${event.type === "move" ? "effect-move" : `effect-${event.type}`}`}
              style={effectStyle(event, index)}
            />
          ) : null)}
        </div>
      </div>

      <aside className="command-rail">
        <div className="rail-heading"><span>COMMAND SET</span><b>{commands.length} / 3</b></div>
        <p className="sr-only" role="status" aria-live="polite">{queueAnnouncement}</p>
        <ol className="command-stack">
          {commands.map((command, index) => <li key={`${command.unitId}-${index}`}><span>0{index + 1}</span><strong>{command.type}</strong><small>{command.unitId.replace("p-", "")}</small></li>)}
          {Array.from({ length: 3 - commands.length }, (_, index) => <li className="empty" key={index}><span>0{commands.length + index + 1}</span><em>AWAITING ORDER</em></li>)}
        </ol>
        <button className="end-turn" onClick={endTurn} disabled={Boolean(state.winner)}>End Turn <b>→</b></button>
        <ActionEffects events={events} />
        <p className="rules-id">OPERATION-01<br />ABI 1 · AXIAL-HEX-V1</p>
      </aside>
    </section>
  );
}
