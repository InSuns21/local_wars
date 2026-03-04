import type { Coord, PlayerId, UnitId } from './game';

export type UnitType =
  | 'INFANTRY'
  | 'RECON'
  | 'TANK'
  | 'ANTI_TANK'
  | 'ARTILLERY'
  | 'ANTI_AIR'
  | 'FIGHTER'
  | 'BOMBER'
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
  // 移動後に残っている移動余裕（同ターン中の追撃可否判定に利用）
  movePointsRemaining?: number;
  // 直近の移動経路（開始マスを除いた通過座標列）
  lastMovePath?: Coord[];
};

export type UnitDefinition = {
  type: UnitType;
  cost: number;
  movementType: MovementType;
  moveRange: number;
  maxFuel: number;
  maxAmmo: number;
  canCapture: boolean;
  attackRangeMin: number;
  attackRangeMax: number;
};

