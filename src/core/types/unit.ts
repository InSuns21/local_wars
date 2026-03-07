import type { Coord, PlayerId, UnitId } from './game';

export type UnitType =
  | 'INFANTRY'
  | 'RECON'
  | 'TANK'
  | 'HEAVY_TANK'
  | 'ANTI_TANK'
  | 'ARTILLERY'
  | 'ANTI_AIR'
  | 'FLAK_TANK'
  | 'MISSILE_AA'
  | 'SUPPLY_TRUCK'
  | 'TRANSPORT_TRUCK'
  | 'AIR_DEFENSE_INFANTRY'
  | 'COUNTER_DRONE_AA'
  | 'SUICIDE_DRONE'
  | 'FIGHTER'
  | 'BOMBER'
  | 'ATTACKER'
  | 'STEALTH_BOMBER'
  | 'AIR_TANKER'
  | 'TRANSPORT_HELI'
  | 'DESTROYER'
  | 'LANDER';

export type MovementType = 'FOOT' | 'TREAD' | 'WHEEL' | 'AIR' | 'NAVAL';

export type UnitState = {
  id: UnitId;
  owner: PlayerId;
  type: UnitType;
  hp: number;
  fuel: number;
  ammo: number;
  supplyCharges?: number;
  cargo?: UnitState[];
  loadedThisTurn?: boolean;
  unloadedThisTurn?: boolean;
  interceptsUsedThisTurn?: number;
  originFactoryCoord?: Coord;
  position: Coord;
  moved: boolean;
  acted: boolean;
  movePointsRemaining?: number;
  lastMovePath?: Coord[];
};

export type UnitDefinition = {
  type: UnitType;
  label: string;
  cost: number;
  movementType: MovementType;
  unitCategory?: 'STANDARD' | 'DRONE';
  moveRange: number;
  maxFuel: number;
  maxAmmo: number;
  visionRange: number;
  canCapture: boolean;
  attackRangeMin: number;
  attackRangeMax: number;
  canBombardProperties?: boolean;
  isStealth?: boolean;
  turnEndFuelCost?: number;
  resupplyTarget?: 'GROUND' | 'AIR';
  transportMode?: 'GROUND' | 'AIR';
  cargoCapacity?: number;
  cargoUnitTypes?: UnitType[];
  canUnloadAfterMove?: boolean;
  interceptRange?: number;
};
