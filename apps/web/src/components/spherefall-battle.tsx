"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { CLANS, TERRAIN, TROOPS, type ClanId, type TerrainId, type TroopId } from "../lib/game/catalog";
import {
  SPHEREFALL_RULESET,
  createSpherefallState,
  legalMoveOptions,
  projectSpherefallCommands,
  resolveSpherefallRound,
  spherefallObservation,
  visibleTileIds,
  type SpherefallCommand,
  type SpherefallEvent,
  type SpherefallState,
} from "../lib/game/spherefall";
import { projectGlobeTiles, type GlobeRotation } from "../lib/world/globe";
import { SPHERE_TOPOLOGY, type TileId } from "../lib/world/sphere";

const TOKEN_ROLE: Readonly<Record<TroopId, "scout" | "line" | "striker" | "heavy" | "support" | "commander">> = {
  scout: "scout",
  striker: "line",
  lancer: "striker",
  bulwark: "heavy",
  artillery: "support",
  hacker: "commander",
};

function terrainAsset(terrainId: TerrainId) {
  return `/assets/terrain/${terrainId}-gpt.png`;
}

function tokenAsset(clanId: ClanId, role: string) {
  return `/assets/factions/tokens/${clanId}/${role}.png`;
}

function polygonPath(points: readonly { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${(point.x + 350).toFixed(2)},${(point.y + 350).toFixed(2)}`).join(" ") + " Z";
}

function eventLabel(event: SpherefallEvent) {
  if (event.type === "rejected") return `${event.unitId}: ${event.reason?.replaceAll("-", " ")}`;
  if (event.type === "attack") return `${event.unitId} hit ${event.targetId} for ${event.damage}`;
  if (event.type === "deploy") return `${event.troopId} reinforcement deployed`;
  if (event.type === "radar") return `${event.unitId} revealed ${event.revealedCount} tiles`;
  return `${event.unitId} ${event.type}`;
}

function ClanDraft({ onSelect }: Readonly<{ onSelect: (clanId: ClanId) => void }>) {
  return (
    <section className="clan-draft" aria-labelledby="clan-draft-title">
      <div className="clan-draft-copy">
        <p className="eyebrow">SPHEREFALL / FACTION UPLINK</p>
        <h1 id="clan-draft-title">Choose your faction.</h1>
        <p>Six machine cultures. Six strategic doctrines. One world with no edges.</p>
      </div>
      <div className="clan-grid">
        {CLANS.map((clan) => (
          <button className="clan-card" key={clan.id} onClick={() => onSelect(clan.id)}>
            <Image src={`/assets/factions/${clan.id}-key-art-gpt.png`} alt={`${clan.name} faction droids`} width={1024} height={1024} priority={clan.id === "neo-romans"} />
            <span className="clan-card-shade" />
            <span className="clan-card-copy">
              <strong>{clan.name}</strong>
              <span>{clan.subtitle}</span>
              <small>{clan.doctrine}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SpherefallBattle() {
  const [game, setGame] = useState<SpherefallState | null>(null);
  const [commands, setCommands] = useState<SpherefallCommand[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [rotation, setRotation] = useState<GlobeRotation>({ yaw: -0.35, pitch: -0.12 });
  const [zoom, setZoom] = useState(1);
  const [events, setEvents] = useState<readonly SpherefallEvent[]>([]);
  const drag = useRef<{ pointerId: number; x: number; y: number; yaw: number; pitch: number; distance: number } | null>(null);

  const planningState = useMemo(() => game ? spherefallObservation(game, "player") : null, [game]);
  const projectedResult = useMemo(() => planningState ? projectSpherefallCommands(planningState, commands, "player") : null, [planningState, commands]);
  const view = projectedResult?.state ?? game;
  const tiles = useMemo(() => projectGlobeTiles(SPHERE_TOPOLOGY, rotation, 292 * zoom), [rotation, zoom]);
  const worldById = useMemo(() => new Map(view?.world.tiles.map((tile) => [tile.id, tile]) ?? []), [view]);
  const visible = useMemo(() => new Set(game ? visibleTileIds(game, "player") : []), [game]);
  const observedUnits = useMemo(() => Object.freeze([
    ...(view?.units.filter((unit) => unit.hp > 0 && unit.side === "player") ?? []),
    ...(game?.units.filter((unit) => unit.hp > 0 && unit.side === "ai" && visible.has(unit.tileId)) ?? []),
  ]), [view, game, visible]);
  const legalMoves = useMemo(() => {
    if (!view || !selectedUnitId) return new Map<TileId, ReturnType<typeof legalMoveOptions>[number]>();
    const observation = Object.freeze({ ...view, units: observedUnits });
    return new Map(legalMoveOptions(observation, selectedUnitId).map((option) => [option.tileId, option]));
  }, [view, observedUnits, selectedUnitId]);
  const unitByTile = useMemo(() => new Map(observedUnits.map((unit) => [unit.tileId, unit])), [observedUnits]);
  const objectiveByTile = useMemo(() => new Map(view?.objectives.map((objective) => [objective.tileId, objective]) ?? []), [view]);

  const beginOperation = (clanId: ClanId) => {
    const index = CLANS.findIndex((clan) => clan.id === clanId);
    const aiClanId = CLANS[(index + 3) % CLANS.length]!.id;
    setGame(createSpherefallState({ playerClanId: clanId, aiClanId }));
    setCommands([]);
    setEvents([]);
    setSelectedUnitId(null);
  };

  if (!game || !view) return <ClanDraft onSelect={beginOperation} />;

  const playerClan = CLANS.find((clan) => clan.id === view.clans.player)!;
  const aiClan = CLANS.find((clan) => clan.id === view.clans.ai)!;
  const selectedUnit = selectedUnitId ? view.units.find((unit) => unit.id === selectedUnitId && unit.hp > 0) : undefined;
  const selectedTroop = selectedUnit ? TROOPS.find((troop) => troop.id === selectedUnit.troopId) : undefined;

  const tileLabel = (tileId: TileId) => {
    const worldTile = worldById.get(tileId);
    const terrain = TERRAIN.find((candidate) => candidate.id === worldTile?.terrainId);
    const unit = unitByTile.get(tileId);
    const objective = objectiveByTile.get(tileId);
    const unitVisible = unit?.side !== "ai" || visible.has(tileId);
    const troop = unitVisible && unit ? TROOPS.find((candidate) => candidate.id === unit.troopId) : undefined;
    return [
      tileId,
      terrain?.name,
      objective ? `${objective.controller ?? "neutral"} ${objective.kind}` : undefined,
      troop && unit ? `${unit.side} ${troop.name}, ${unit.hp} health` : undefined,
      unit?.id === selectedUnitId ? "selected" : undefined,
      legalMoves.has(tileId) ? "legal move" : undefined,
    ].filter(Boolean).join(", ");
  };

  const enqueue = (command: SpherefallCommand) => {
    setCommands((current) => current.length >= SPHEREFALL_RULESET.commandPoints ? current : [...current, command]);
  };

  const chooseTile = (tileId: TileId) => {
    if ((drag.current?.distance ?? 0) > 6) return;
    const occupant = unitByTile.get(tileId);
    if (occupant?.side === "player") {
      setSelectedUnitId(occupant.id);
      return;
    }
    if (!selectedUnit) return;
    if (occupant?.side === "ai") {
      enqueue({ type: "attack", unitId: selectedUnit.id, targetId: occupant.id });
      return;
    }
    if (legalMoves.has(tileId)) enqueue({ type: "move", unitId: selectedUnit.id, to: tileId });
  };

  const executeRound = () => {
    const resolved = resolveSpherefallRound(game, commands);
    setGame(resolved.state);
    setEvents(resolved.events);
    setCommands([]);
    setSelectedUnitId(null);
  };

  const deploy = (troopId: TroopId) => {
    const headquarters = view.objectives.find((objective) => objective.kind === "headquarters" && objective.controller === "player");
    const neighbors = headquarters ? SPHERE_TOPOLOGY.tiles.find((tile) => tile.id === headquarters.tileId)?.neighbors ?? [] : [];
    const destination = neighbors.find((tileId) => !unitByTile.has(tileId) && worldById.get(tileId)?.terrainId !== "ocean");
    if (destination) enqueue({ type: "deploy", troopId, to: destination });
  };

  const rotateWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 0.25 : 0.1;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "Home"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft") setRotation((current) => ({ ...current, yaw: current.yaw - amount }));
    if (event.key === "ArrowRight") setRotation((current) => ({ ...current, yaw: current.yaw + amount }));
    if (event.key === "ArrowUp") setRotation((current) => ({ ...current, pitch: Math.max(-1.2, current.pitch - amount) }));
    if (event.key === "ArrowDown") setRotation((current) => ({ ...current, pitch: Math.min(1.2, current.pitch + amount) }));
    if (event.key === "+") setZoom((current) => Math.min(1.18, current + 0.06));
    if (event.key === "-") setZoom((current) => Math.max(0.82, current - 0.06));
    if (event.key === "Home") { setRotation({ yaw: -0.35, pitch: -0.12 }); setZoom(1); }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, yaw: rotation.yaw, pitch: rotation.pitch, distance: 0 };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current.distance = Math.hypot(dx, dy);
    setRotation({ yaw: drag.current.yaw + dx * 0.007, pitch: Math.max(-1.2, Math.min(1.2, drag.current.pitch - dy * 0.007)) });
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { drag.current = null; }, 0);
  };

  return (
    <section className="spherefall-shell">
      <header className="spherefall-status">
        <div><span>ROUND</span><strong>{view.round}/10</strong></div>
        <div><span>{playerClan.name.toUpperCase()}</span><strong>{view.victoryPoints.player} VP · {view.supply.player} SUPPLY</strong></div>
        <div className="spherefall-versus">VS</div>
        <div><span>{aiClan.name.toUpperCase()}</span><strong>{view.victoryPoints.ai} VP · {view.supply.ai} SUPPLY</strong></div>
        <div><span>COMMANDS</span><strong>{commands.length}/{SPHEREFALL_RULESET.commandPoints}</strong></div>
      </header>

      <div className="spherefall-layout">
        <aside className="spherefall-panel faction-panel">
          <Image src={`/assets/factions/${playerClan.id}-key-art-gpt.png`} alt="" width={1024} height={1024} />
          <div className="panel-overlay">
            <p className="eyebrow">YOUR FACTION</p>
            <h2>{playerClan.name}</h2>
            <p>{playerClan.subtitle}</p>
            <small>{playerClan.doctrine}</small>
          </div>
        </aside>

        <div className="globe-stage">
          <div
            className="spherefall-globe"
            role="region"
            tabIndex={0}
            aria-label="Rotatable spherical battlefield"
            aria-describedby="globe-help"
            onKeyDown={rotateWithKeyboard}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <p id="globe-help" className="sr-only">Drag or use arrow keys to rotate. Select a friendly unit, then a highlighted destination or enemy target.</p>
            <svg viewBox="0 0 700 700" aria-hidden="true">
              <defs>
                {TERRAIN.map((terrain) => {
                  const terrainId = terrain.id;
                  return <pattern id={`terrain-${terrainId}`} key={terrainId} patternUnits="objectBoundingBox" width="1" height="1"><image href={terrainAsset(terrainId)} width="1" height="1" preserveAspectRatio="xMidYMid slice" /></pattern>;
                })}
                <radialGradient id="sphere-shade"><stop offset="55%" stopColor="#11304c" stopOpacity="0" /><stop offset="100%" stopColor="#020712" stopOpacity=".9" /></radialGradient>
              </defs>
              <circle className="globe-atmosphere" cx="350" cy="350" r={298 * zoom} />
              {tiles.map((tile) => {
                const worldTile = worldById.get(tile.id)!;
                const unit = unitByTile.get(tile.id);
                const objective = objectiveByTile.get(tile.id);
                const selected = unit?.id === selectedUnitId;
                const legal = legalMoves.has(tile.id);
                const foggedEnemy = unit?.side === "ai" && !visible.has(tile.id);
                const x = 350 + tile.center.x * 292 * zoom;
                const y = 350 - tile.center.y * 292 * zoom;
                const size = Math.max(24, 43 * (0.72 + tile.depth * 0.28)) * zoom;
                return (
                  <g key={tile.id} className={`sphere-tile ${selected ? "is-selected" : ""} ${legal ? "is-legal" : ""}`} onClick={() => chooseTile(tile.id)}>
                    <path d={polygonPath(tile.polygon)} fill={`url(#terrain-${worldTile.terrainId})`}><title>{worldTile.terrainId}, {tile.sides}-sided tile {tile.id}</title></path>
                    {objective && <g className={`objective-marker owner-${objective.controller ?? "neutral"}`}><circle cx={x} cy={y} r={8 * zoom} /><text x={x} y={y + 3}>{objective.kind === "prime-relay" ? "R" : objective.kind === "headquarters" ? "H" : "U"}</text></g>}
                    {unit && !foggedEnemy && <image className={`unit-token side-${unit.side}`} href={tokenAsset(view.clans[unit.side], TOKEN_ROLE[unit.troopId])} x={x - size / 2} y={y - size / 2} width={size} height={size} />}
                  </g>
                );
              })}
              <circle className="sphere-shade" cx="350" cy="350" r={298 * zoom} fill="url(#sphere-shade)" />
            </svg>
            {tiles.map((tile) => (
              <button
                type="button"
                key={`focus-${tile.id}`}
                className="globe-focus-tile"
                style={{ left: `${50 + tile.center.x * 41.72 * zoom}%`, top: `${50 - tile.center.y * 41.72 * zoom}%` }}
                aria-label={tileLabel(tile.id)}
                onClick={() => chooseTile(tile.id)}
              />
            ))}
          </div>
          <div className="globe-controls" aria-label="Globe controls">
            <button onClick={() => setRotation((current) => ({ ...current, yaw: current.yaw - 0.18 }))} aria-label="Rotate globe left">←</button>
            <button onClick={() => setRotation({ yaw: -0.35, pitch: -0.12 })}>CENTER</button>
            <button onClick={() => setRotation((current) => ({ ...current, yaw: current.yaw + 0.18 }))} aria-label="Rotate globe right">→</button>
            <button onClick={() => setZoom((current) => Math.min(1.18, current + 0.06))} aria-label="Zoom in">＋</button>
            <button onClick={() => setZoom((current) => Math.max(0.82, current - 0.06))} aria-label="Zoom out">−</button>
          </div>
        </div>

        <aside className="spherefall-panel command-panel">
          <p className="eyebrow">COMMAND STAFF</p>
          {selectedUnit && selectedTroop ? (
            <div className="unit-readout">
              <Image src={tokenAsset(view.clans.player, TOKEN_ROLE[selectedUnit.troopId])} alt={`${selectedTroop.name} droid`} width={512} height={512} />
              <h2>{selectedTroop.name}</h2>
              <p>HP {selectedUnit.hp}/{selectedTroop.hp} · MOVE {selectedTroop.move} · SENSOR {selectedTroop.sensor}</p>
              <small>{selectedTroop.ability}</small>
              <div className="command-actions">
                <button onClick={() => enqueue({ type: "guard", unitId: selectedUnit.id })}>GUARD</button>
                <button onClick={() => enqueue({ type: "radar", unitId: selectedUnit.id })}>RADAR</button>
                <button onClick={() => enqueue({ type: "capture", unitId: selectedUnit.id })}>CAPTURE</button>
              </div>
            </div>
          ) : <p className="selection-hint">Select a friendly troop tile to issue orders.</p>}
          <div className="reinforcement-dock">
            <h3>REINFORCEMENTS</h3>
            <div>{TROOPS.map((troop) => <button key={troop.id} disabled={view.supply.player < troop.supply} onClick={() => deploy(troop.id)} title={`${troop.name}: ${troop.supply} supply`}>{troop.name.slice(0, 3).toUpperCase()} <small>{troop.supply}</small></button>)}</div>
          </div>
        </aside>
      </div>

      <footer className="command-queue">
        <div className="queue-list" aria-live="polite">
          <span>ORDERED COMMAND QUEUE</span>
          {commands.length === 0 ? <em>Awaiting orders</em> : commands.map((command, index) => <button key={`${command.type}-${index}`} onClick={() => setCommands((current) => current.filter((_, item) => item !== index))}><b>{index + 1}</b> {command.type.toUpperCase()} ×</button>)}
        </div>
        <button className="execute-button" onClick={executeRound} disabled={commands.length === 0 || Boolean(view.winner)}>EXECUTE TURN <span>▶</span></button>
      </footer>
      <div className="event-strip" aria-live="polite">{events.slice(-4).map((event, index) => <span key={`${event.type}-${index}`}>{eventLabel(event)}</span>)}</div>
      {view.winner && <div className="victory-overlay"><p>OPERATION COMPLETE</p><h2>{view.winner === "draw" ? "DRAW" : `${view.winner.toUpperCase()} VICTORY`}</h2><button onClick={() => setGame(null)}>NEW OPERATION</button></div>}
    </section>
  );
}
