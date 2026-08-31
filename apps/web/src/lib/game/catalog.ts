export const RULESET_ID = "spherefall-op1-v1";
export const RULES_ABI = 2;

export type TerrainId = "ocean" | "plains" | "forest" | "desert" | "highlands" | "tundra";
export type TroopId = "striker" | "bulwark" | "lancer" | "artillery" | "scout" | "hacker";
export type WeaponId = "pulse-carbine" | "scatter-cannon" | "rail-lance" | "arc-mortar" | "arc-smg" | "disruptor";
export type ClanId = "neo-romans" | "germanoids" | "xiren" | "hoshikage" | "solandinos" | "zoryani";

export type TerrainDefinition = Readonly<{
  id: TerrainId;
  name: string;
  moveCost: 1 | 2 | 3;
  cover: 0 | 1 | 2;
  groundPassable: boolean;
  blocksLineOfSight: boolean;
  texture: string;
  effect: string;
}>;

export type WeaponDefinition = Readonly<{
  id: WeaponId;
  name: string;
  minRange: number;
  maxRange: number;
  power: number;
  armorPiercing: number;
  effect: string;
}>;

export type TroopDefinition = Readonly<{
  id: TroopId;
  name: string;
  hp: number;
  armor: number;
  move: number;
  sensor: number;
  supply: number;
  weaponId: WeaponId;
  ability: string;
}>;

export type ClanModifierKind = "objective-cover" | "forest-mobility" | "radar-range" | "opening-mobility" | "highland-mobility" | "tundra-armor";
export type ClanDefinition = Readonly<{
  id: ClanId;
  name: string;
  subtitle: string;
  palette: readonly [string, string, string, string, string];
  emblem: string;
  doctrine: string;
  modifier: Readonly<{ kind: ClanModifierKind; amount: 1 }>;
}>;

const freezeList = <T extends object>(entries: readonly T[]): readonly Readonly<T>[] => Object.freeze(entries.map((entry) => Object.freeze(entry)));

export const TERRAIN = freezeList<TerrainDefinition>([
  { id: "ocean", name: "Abyssal Ocean", moveCost: 3, cover: 0, groundPassable: false, blocksLineOfSight: false, texture: "wave-current", effect: "Ground troops cannot enter; aerial scans cross normally." },
  { id: "plains", name: "Signal Plains", moveCost: 1, cover: 0, groundPassable: true, blocksLineOfSight: false, texture: "grass-contour", effect: "Open movement and clear lines of fire." },
  { id: "forest", name: "Circuit Forest", moveCost: 2, cover: 1, groundPassable: true, blocksLineOfSight: false, texture: "canopy-cluster", effect: "Conceals units beyond two tiles unless radar-revealed." },
  { id: "desert", name: "Glass Desert", moveCost: 1, cover: 0, groundPassable: true, blocksLineOfSight: false, texture: "dune-fracture", effect: "Long-range attacks gain one power when both units occupy open terrain." },
  { id: "highlands", name: "Crown Highlands", moveCost: 2, cover: 2, groundPassable: true, blocksLineOfSight: true, texture: "rock-strata", effect: "Blocks line of sight through the tile; grants strong cover." },
  { id: "tundra", name: "Aurora Tundra", moveCost: 2, cover: 1, groundPassable: true, blocksLineOfSight: false, texture: "ice-fissure", effect: "Sensor range is reduced by one, to a minimum of one." },
]) as readonly TerrainDefinition[];

export const WEAPONS = freezeList<WeaponDefinition>([
  { id: "pulse-carbine", name: "Pulse Carbine", minRange: 1, maxRange: 2, power: 4, armorPiercing: 0, effect: "Striker Momentum adds one power after moving two tiles." },
  { id: "scatter-cannon", name: "Scatter Cannon", minRange: 1, maxRange: 1, power: 5, armorPiercing: 0, effect: "Close-range defensive weapon." },
  { id: "rail-lance", name: "Rail Lance", minRange: 2, maxRange: 3, power: 5, armorPiercing: 2, effect: "Cannot target adjacent units." },
  { id: "arc-mortar", name: "Arc Mortar", minRange: 3, maxRange: 4, power: 6, armorPiercing: 0, effect: "Adjacent units take deterministic armor-reduced splash damage." },
  { id: "arc-smg", name: "Arc SMG", minRange: 1, maxRange: 2, power: 3, armorPiercing: 0, effect: "Fires without a movement penalty." },
  { id: "disruptor", name: "Disruptor", minRange: 1, maxRange: 2, power: 3, armorPiercing: 1, effect: "A surviving target is jammed through its next turn." },
]) as readonly WeaponDefinition[];

export const TROOPS = freezeList<TroopDefinition>([
  { id: "striker", name: "Striker", hp: 7, armor: 1, move: 3, sensor: 2, supply: 3, weaponId: "pulse-carbine", ability: "Momentum: +1 power after moving at least two tiles." },
  { id: "bulwark", name: "Bulwark", hp: 10, armor: 2, move: 2, sensor: 2, supply: 4, weaponId: "scatter-cannon", ability: "Anchor: Guard grants +2 armor and adjacent allies gain cover." },
  { id: "lancer", name: "Lancer", hp: 8, armor: 1, move: 3, sensor: 2, supply: 4, weaponId: "rail-lance", ability: "Braced Shot: +1 power if the unit did not move this turn." },
  { id: "artillery", name: "Artillery", hp: 6, armor: 0, move: 2, sensor: 2, supply: 5, weaponId: "arc-mortar", ability: "Indirect Fire: shoots over Highlands and applies friendly-fire splash." },
  { id: "scout", name: "Scout", hp: 6, armor: 0, move: 4, sensor: 3, supply: 3, weaponId: "arc-smg", ability: "Wide Sweep: Radar reaches radius four." },
  { id: "hacker", name: "Hacker", hp: 7, armor: 1, move: 3, sensor: 3, supply: 4, weaponId: "disruptor", ability: "Rapid Override: may Move then Capture in the same turn." },
]) as readonly TroopDefinition[];

function clan(definition: Omit<ClanDefinition, "palette" | "modifier"> & { palette: [string, string, string, string, string]; modifier: { kind: ClanModifierKind; amount: 1 } }): ClanDefinition {
  return Object.freeze({ ...definition, palette: Object.freeze(definition.palette), modifier: Object.freeze(definition.modifier) });
}

export const CLANS: readonly ClanDefinition[] = Object.freeze([
  clan({ id: "neo-romans", name: "Neo Romans", subtitle: "Aureate Cohort", palette: ["#6E2532", "#E8DDC6", "#B78A42", "#292A2E", "#78E4E8"], emblem: "Orbital Arch", doctrine: "Formation control and civic fortification.", modifier: { kind: "objective-cover", amount: 1 } }),
  clan({ id: "germanoids", name: "Germanoids", subtitle: "Forgewood Union", palette: ["#34383B", "#234C43", "#B46F45", "#C7C1B4", "#B8E66A"], emblem: "Dovetail Hex", doctrine: "Repairable modules and methodical forest pressure.", modifier: { kind: "forest-mobility", amount: 1 } }),
  clan({ id: "xiren", name: "XiRen", subtitle: "Celestial Weave", palette: ["#176B61", "#A9CDB8", "#202A2C", "#E7E4D5", "#F2B84B"], emblem: "Circuit Cloud", doctrine: "Redirection, decoys, and predictive sensor control.", modifier: { kind: "radar-range", amount: 1 } }),
  clan({ id: "hoshikage", name: "Hoshikage", subtitle: "Folded Circuit", palette: ["#232A59", "#E9E3D5", "#3C8C88", "#25272A", "#FF725E"], emblem: "Folded Pentad", doctrine: "Transformation, timing, and burst maneuver.", modifier: { kind: "opening-mobility", amount: 1 } }),
  clan({ id: "solandinos", name: "Solandinos", subtitle: "Sunriver Concord", palette: ["#A84F35", "#2C9A9A", "#264B83", "#D6B878", "#F5D547"], emblem: "Sunriver Step", doctrine: "Momentum, energy sharing, and elevation mastery.", modifier: { kind: "highland-mobility", amount: 1 } }),
  clan({ id: "zoryani", name: "Zoryani", subtitle: "Aurora Foundry", palette: ["#182B49", "#B8C6CB", "#E49B3D", "#685D91", "#7DF2E4"], emblem: "Aurora Lozenge", doctrine: "Stored-energy retaliation and resilient advance.", modifier: { kind: "tundra-armor", amount: 1 } }),
]);

export const CATALOG_CANONICAL_JSON = JSON.stringify({ rulesetId: RULESET_ID, rulesAbi: RULES_ABI, terrain: TERRAIN, weapons: WEAPONS, troops: TROOPS, clans: CLANS });
export const CATALOG_DIGEST = "f0e2e7ae27da7e54b722e9bbe7519a8c113b85a2b17cdccccb53ee39b4db6c6a";
