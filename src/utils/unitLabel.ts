import type { UnitType } from '@core/types/unit';

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  INFANTRY: '歩兵',
  RECON: '偵察車',
  TANK: '戦車',
  ANTI_TANK: '対戦車',
  ARTILLERY: '自走砲',
  ANTI_AIR: '対空車',
  FIGHTER: '戦闘機',
  BOMBER: '爆撃機',
  ATTACKER: '攻撃機',
  STEALTH_BOMBER: 'ステルス爆撃機',
  DESTROYER: '駆逐艦',
  LANDER: '揚陸艦',
};

export const getUnitTypeLabel = (type: UnitType): string => UNIT_TYPE_LABELS[type];
