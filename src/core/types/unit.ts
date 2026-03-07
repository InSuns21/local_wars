import type { Coord, PlayerId, UnitId } from './game';

export type UnitType =
  | 'INFANTRY'
  | 'RECON'
  | 'TANK'
  | 'ANTI_TANK'
  | 'ARTILLERY'
  | 'ANTI_AIR'
  | 'FLAK_TANK'
  | 'MISSILE_AA'
  | 'FIGHTER'
  | 'BOMBER'
  | 'ATTACKER'
  | 'STEALTH_BOMBER'
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
  position: Coord;
  moved: boolean;
  acted: boolean;
  movePointsRemaining?: number;
  lastMovePath?: Coord[];
};

export type UnitDefinition = {
  type: UnitType;
  cost: number;
  movementType: MovementType;
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
};
