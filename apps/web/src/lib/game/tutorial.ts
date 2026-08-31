export const RULESET = Object.freeze({
  id: "smashdroids-tutorial/1",
  abi: 1,
  geometry: "axial-hex-v1",
  orientation: "pointy-top",
} as const);

export type Side = "player" | "ai";
export type Axial = Readonly<{ q: number; r: number }>;
export type Unit = Readonly<{
  id: string;
  side: Side;
  role: "striker" | "bulwark" | "scout";
  position: Axial;
  health: number;
  guarded: boolean;
}>;
export type Objective = Readonly<{ id: "relay"; position: Axial; controller: Side | null }>;
export type GameState = Readonly<{
  ruleset: typeof RULESET;
  turn: number;
  units: readonly Unit[];
  objectives: readonly Objective[];
  winner: Side | null;
}>;

export type Command =
  | Readonly<{ type: "move"; unitId: string; to: Axial }>
  | Readonly<{ type: "attack"; unitId: string; targetId: string }>
  | Readonly<{ type: "capture"; unitId: string }>
  | Readonly<{ type: "guard"; unitId: string }>
  | Readonly<{ type: "radar"; unitId: string }>;

export type GameEvent = Readonly<{
  type: "move" | "attack" | "capture" | "guard" | "radar" | "rejected" | "victory";
  side: Side;
  unitId?: string;
  targetId?: string;
  objectiveId?: string;
  from?: Axial;
  to?: Axial;
  damage?: number;
  remainingHealth?: number;
  reason?: string;
  turn: number;
}>;

const DIRECTIONS: readonly Axial[] = Object.freeze([
  Object.freeze({ q: 1, r: 0 }), Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }), Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }), Object.freeze({ q: 0, r: 1 }),
]);

export function axialNeighbors(origin: Axial): Axial[] {
  return DIRECTIONS.map(({ q, r }) => ({ q: origin.q + q, r: origin.r + r }));
}

export function isAxialNeighbor(a: Axial, b: Axial): boolean {
  return axialDistance(a, b) === 1;
}

function axialDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
}

function isOnBoard(position: Axial): boolean {
  return axialDistance({ q: 0, r: 0 }, position) <= 3;
}

function deepFreezeState(state: GameState): GameState {
  state.units.forEach((unit) => { Object.freeze(unit.position); Object.freeze(unit); });
  state.objectives.forEach((objective) => { Object.freeze(objective.position); Object.freeze(objective); });
  Object.freeze(state.units);
  Object.freeze(state.objectives);
  return Object.freeze(state);
}

export function createTutorialState(): GameState {
  return deepFreezeState({
    ruleset: RULESET,
    turn: 1,
    winner: null,
    objectives: [{ id: "relay", position: { q: 0, r: 0 }, controller: null }],
    units: [
      { id: "p-striker", side: "player", role: "striker", position: { q: -2, r: 1 }, health: 4, guarded: false },
      { id: "p-bulwark", side: "player", role: "bulwark", position: { q: -2, r: 2 }, health: 6, guarded: false },
      { id: "p-scout", side: "player", role: "scout", position: { q: -2, r: 0 }, health: 3, guarded: false },
      { id: "a-striker", side: "ai", role: "striker", position: { q: 2, r: -1 }, health: 4, guarded: false },
      { id: "a-bulwark", side: "ai", role: "bulwark", position: { q: 2, r: -2 }, health: 6, guarded: false },
      { id: "a-scout", side: "ai", role: "scout", position: { q: 2, r: 0 }, health: 3, guarded: false },
    ],
  });
}

function event(state: GameState, side: Side, values: Omit<GameEvent, "side" | "turn">): GameEvent {
  const from = values.from ? Object.freeze({ ...values.from }) : undefined;
  const to = values.to ? Object.freeze({ ...values.to }) : undefined;
  return Object.freeze({ ...values, ...(from ? { from } : {}), ...(to ? { to } : {}), side, turn: state.turn });
}

function applyCommand(state: GameState, command: Command, side: Side): { state: GameState; event: GameEvent } {
  const actor = state.units.find((unit) => unit.id === command.unitId && unit.side === side && unit.health > 0);
  if (!actor) return { state, event: event(state, side, { type: "rejected", unitId: command.unitId, reason: "unit-unavailable" }) };

  if (command.type === "move") {
    const occupied = state.units.some((unit) => unit.health > 0 && unit.position.q === command.to.q && unit.position.r === command.to.r);
    if (!isAxialNeighbor(actor.position, command.to) || !isOnBoard(command.to) || occupied) {
      return { state, event: event(state, side, { type: "rejected", unitId: actor.id, reason: "illegal-move" }) };
    }
    const units = state.units.map((unit) => unit.id === actor.id ? { ...unit, guarded: false, position: { ...command.to } } : unit);
    return { state: { ...state, units }, event: event(state, side, { type: "move", unitId: actor.id, from: actor.position, to: command.to }) };
  }

  if (command.type === "attack") {
    const target = state.units.find((unit) => unit.id === command.targetId && unit.side !== side && unit.health > 0);
    if (!target || !isAxialNeighbor(actor.position, target.position)) {
      return { state, event: event(state, side, { type: "rejected", unitId: actor.id, reason: "illegal-attack" }) };
    }
    const damage = target.guarded ? 1 : 2;
    const remainingHealth = Math.max(0, target.health - damage);
    const units = state.units.map((unit) => unit.id === target.id ? { ...unit, health: remainingHealth, guarded: false } : unit);
    return { state: { ...state, units }, event: event(state, side, { type: "attack", unitId: actor.id, targetId: target.id, from: actor.position, to: target.position, damage, remainingHealth }) };
  }

  if (command.type === "capture") {
    const objective = state.objectives.find((item) => item.position.q === actor.position.q && item.position.r === actor.position.r);
    if (!objective) return { state, event: event(state, side, { type: "rejected", unitId: actor.id, reason: "not-on-objective" }) };
    const objectives = state.objectives.map((item) => item.id === objective.id ? { ...item, controller: side } : item);
    return { state: { ...state, objectives }, event: event(state, side, { type: "capture", unitId: actor.id, objectiveId: objective.id, to: actor.position }) };
  }

  if (command.type === "guard") {
    const units = state.units.map((unit) => unit.id === actor.id ? { ...unit, guarded: true } : unit);
    return { state: { ...state, units }, event: event(state, side, { type: "guard", unitId: actor.id, to: actor.position }) };
  }

  return { state, event: event(state, side, { type: "radar", unitId: actor.id, to: actor.position }) };
}

function baselineCommands(state: GameState): Command[] {
  const occupied = new Set(state.units.filter((unit) => unit.health > 0).map((unit) => `${unit.position.q},${unit.position.r}`));
  const players = state.units.filter((unit) => unit.side === "player" && unit.health > 0);
  return state.units.filter((unit) => unit.side === "ai" && unit.health > 0).map((unit): Command => {
    const adjacent = players.filter((target) => isAxialNeighbor(unit.position, target.position)).sort((a, b) => a.id.localeCompare(b.id))[0];
    if (adjacent) return { type: "attack", unitId: unit.id, targetId: adjacent.id };
    const destination = axialNeighbors(unit.position)
      .filter((position) => isOnBoard(position) && !occupied.has(`${position.q},${position.r}`))
      .sort((a, b) => {
        const ad = Math.min(...players.map((player) => axialDistance(a, player.position)));
        const bd = Math.min(...players.map((player) => axialDistance(b, player.position)));
        return ad - bd || a.q - b.q || a.r - b.r;
      })[0];
    return destination ? { type: "move", unitId: unit.id, to: destination } : { type: "guard", unitId: unit.id };
  });
}

function winningSide(state: GameState): Side | null {
  const objectiveWinner = state.objectives.find((objective) => objective.controller)?.controller ?? null;
  if (objectiveWinner) return objectiveWinner;
  const playerAlive = state.units.some((unit) => unit.side === "player" && unit.health > 0);
  const aiAlive = state.units.some((unit) => unit.side === "ai" && unit.health > 0);
  if (!aiAlive) return "player";
  if (!playerAlive) return "ai";
  return null;
}

export function projectCommands(input: GameState, commands: readonly Command[], side: Side): Readonly<{ state: GameState; events: readonly GameEvent[] }> {
  if (input.winner) return Object.freeze({ state: input, events: Object.freeze([]) });
  let state: GameState = {
    ...input,
    units: input.units.map((unit) => ({ ...unit, position: { ...unit.position } })),
    objectives: input.objectives.map((objective) => ({ ...objective, position: { ...objective.position } })),
  };
  const events: GameEvent[] = [];
  let winner: Side | null = null;
  for (const command of commands) {
    const resolved = applyCommand(state, command, side);
    state = resolved.state;
    events.push(resolved.event);
    winner = winningSide(state);
    if (winner) break;
  }
  return Object.freeze({ state: deepFreezeState({ ...state, winner }), events: Object.freeze(events) });
}

export function resolveTurn(input: GameState, playerCommands: readonly Command[]): Readonly<{ state: GameState; events: readonly GameEvent[] }> {
  if (input.winner) return Object.freeze({ state: input, events: Object.freeze([]) });
  const projected = projectCommands(input, playerCommands.slice(0, 3), "player");
  let state = projected.state;
  const events: GameEvent[] = [...projected.events];
  let winner: Side | null = state.winner;
  if (!winner) {
    for (const command of baselineCommands(state)) {
      const resolved = applyCommand(state, command, "ai");
      state = resolved.state;
      events.push(resolved.event);
      winner = winningSide(state);
      if (winner) break;
    }
  }
  if (winner) events.push(event(state, winner, { type: "victory" }));
  state = deepFreezeState({ ...state, winner, turn: state.turn + 1 });
  return Object.freeze({ state, events: Object.freeze(events) });
}
