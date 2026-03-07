import type { CombatForecast, CombatResult } from '@core/types/combat';
import type { UnitState, UnitType } from '@core/types/unit';
import { manhattanDistance } from '@/utils/coord';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';

const baseDamageTable: Record<UnitType, Partial<Record<UnitType, number>>> = {
  INFANTRY: { INFANTRY: 55, RECON: 12, TANK: 5, ANTI_TANK: 8, ARTILLERY: 15, ANTI_AIR: 8, FLAK_TANK: 20, MISSILE_AA: 25 },
  RECON: { INFANTRY: 70, RECON: 35, TANK: 6, ANTI_TANK: 10, ARTILLERY: 45, ANTI_AIR: 12, FLAK_TANK: 50, MISSILE_AA: 55 },
  TANK: { INFANTRY: 75, RECON: 80, TANK: 55, ANTI_TANK: 45, ARTILLERY: 70, ANTI_AIR: 65, FLAK_TANK: 75, MISSILE_AA: 80 },
  ANTI_TANK: { INFANTRY: 65, RECON: 75, TANK: 85, ANTI_TANK: 50, ARTILLERY: 70, ANTI_AIR: 60, FLAK_TANK: 85, MISSILE_AA: 90 },
  ARTILLERY: { INFANTRY: 90, RECON: 85, TANK: 70, ANTI_TANK: 80, ARTILLERY: 75, ANTI_AIR: 80, FLAK_TANK: 90, MISSILE_AA: 95 },
  ANTI_AIR: { INFANTRY: 95, RECON: 100, TANK: 25, ANTI_TANK: 45, ARTILLERY: 75, ANTI_AIR: 55, FLAK_TANK: 50, MISSILE_AA: 60, FIGHTER: 65, ATTACKER: 80, BOMBER: 65, STEALTH_BOMBER: 60 },
  FLAK_TANK: { INFANTRY: 65, RECON: 55, TANK: 25, ANTI_TANK: 30, ARTILLERY: 45, ANTI_AIR: 40, FLAK_TANK: 40, MISSILE_AA: 40, FIGHTER: 65, ATTACKER: 80, BOMBER: 60, STEALTH_BOMBER: 70 },
  MISSILE_AA: { FIGHTER: 80, ATTACKER: 100, BOMBER: 90, STEALTH_BOMBER: 90 },
  FIGHTER: { FIGHTER: 65, ATTACKER: 105, BOMBER: 85, STEALTH_BOMBER: 75 },
  BOMBER: { INFANTRY: 110, RECON: 105, TANK: 80, ANTI_TANK: 80, ARTILLERY: 80, ANTI_AIR: 30, FLAK_TANK: 35, MISSILE_AA: 40 },
  ATTACKER: { INFANTRY: 95, RECON: 95, TANK: 60, ANTI_TANK: 60, ARTILLERY: 60, ANTI_AIR: 20, FLAK_TANK: 25, MISSILE_AA: 30 },
  STEALTH_BOMBER: { INFANTRY: 110, RECON: 90, TANK: 75, ANTI_TANK: 70, ARTILLERY: 80, ANTI_AIR: 40, FIGHTER: 30, ATTACKER: 80, BOMBER: 70, STEALTH_BOMBER: 55 },
  DESTROYER: { DESTROYER: 70, LANDER: 90, INFANTRY: 50, TANK: 45, ARTILLERY: 60 },
  LANDER: {},
};

export type CombatOptions = {
  luckMin?: number;
  luckMax?: number;
  defenseModifier?: number;
  attackerDefenseModifier?: number;
  defenderDefenseModifier?: number;
  canCounter?: boolean;
};

const resolveDefenderDefenseModifier = (options: CombatOptions): number =>
  options.defenderDefenseModifier ?? options.defenseModifier ?? 1;

const resolveAttackerDefenseModifier = (options: CombatOptions): number =>
  options.attackerDefenseModifier ?? options.defenseModifier ?? 1;

export const getBaseDamage = (attackerType: UnitType, defenderType: UnitType): number =>
  baseDamageTable[attackerType][defenderType] ?? 0;

export const computeDamage = (
  baseDamage: number,
  attackerHp: number,
  luckFactor: number,
  defenseModifier = 1,
): number => {
  const hpScale = Math.max(attackerHp, 0) / 10;
  const raw = baseDamage * hpScale * luckFactor * defenseModifier;
  const normalized = Math.floor(raw / 10);
  return Math.max(0, Math.min(10, normalized));
};

export const canCounterAttack = (attacker: UnitState, defender: UnitState): boolean => {
  const distance = manhattanDistance(attacker.position, defender.position);
  const defenderDef = UNIT_DEFINITIONS[defender.type];
  return distance >= defenderDef.attackRangeMin && distance <= defenderDef.attackRangeMax;
};

export const forecastCombat = (
  attacker: UnitState,
  defender: UnitState,
  options: CombatOptions = {},
): CombatForecast => {
  const luckMin = options.luckMin ?? 0.95;
  const luckMax = options.luckMax ?? 1.05;
  const defenderDefenseModifier = resolveDefenderDefenseModifier(options);
  const attackerDefenseModifier = resolveAttackerDefenseModifier(options);

  const baseAD = getBaseDamage(attacker.type, defender.type);
  const attackerSamples = [
    computeDamage(baseAD, attacker.hp, luckMin, defenderDefenseModifier),
    computeDamage(baseAD, attacker.hp, luckMax, defenderDefenseModifier),
  ];
  const minAD = Math.min(...attackerSamples);
  const maxAD = Math.max(...attackerSamples);

  if (options.canCounter === false || !canCounterAttack(attacker, defender)) {
    return {
      attackerToDefender: { min: minAD, max: maxAD },
      defenderToAttacker: null,
    };
  }

  const baseDA = getBaseDamage(defender.type, attacker.type);
  const counterSamples = [luckMin, luckMax].map((luck) => {
    const damageToDefender = computeDamage(baseAD, attacker.hp, luck, defenderDefenseModifier);
    if (damageToDefender >= defender.hp) {
      return 0;
    }
    return computeDamage(baseDA, defender.hp, luck, attackerDefenseModifier);
  });

  return {
    attackerToDefender: { min: minAD, max: maxAD },
    defenderToAttacker: {
      min: Math.min(...counterSamples),
      max: Math.max(...counterSamples),
    },
  };
};

export const executeCombat = (
  attacker: UnitState,
  defender: UnitState,
  rng: () => number,
  options: CombatOptions = {},
): CombatResult => {
  const defenderDefenseModifier = resolveDefenderDefenseModifier(options);
  const attackerDefenseModifier = resolveAttackerDefenseModifier(options);
  const luckRoll = 0.95 + rng() * 0.1;
  const damageToDefender = computeDamage(
    getBaseDamage(attacker.type, defender.type),
    attacker.hp,
    luckRoll,
    defenderDefenseModifier,
  );

  const nextDefenderHp = Math.max(0, defender.hp - damageToDefender);

  let damageToAttacker = 0;
  if (nextDefenderHp > 0 && canCounterAttack(attacker, defender) && options.canCounter !== false) {
    damageToAttacker = computeDamage(
      getBaseDamage(defender.type, attacker.type),
      defender.hp,
      luckRoll,
      attackerDefenseModifier,
    );
  }

  return {
    attacker: { ...attacker, hp: Math.max(0, attacker.hp - damageToAttacker), acted: true },
    defender: { ...defender, hp: nextDefenderHp },
    inflictedToDefender: damageToDefender,
    inflictedToAttacker: damageToAttacker,
  };
};

const bombardPowerTable: Partial<Record<UnitType, number>> = {
  BOMBER: 9,
  ATTACKER: 6,
  STEALTH_BOMBER: 10,
};

export const computeBombardDamage = (attacker: UnitState): number => {
  const basePower = bombardPowerTable[attacker.type] ?? 0;
  if (basePower <= 0) {
    return 0;
  }
  return Math.max(1, Math.floor((basePower * Math.max(attacker.hp, 0)) / 10));
};
