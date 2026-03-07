import type { CombatForecast, CombatResult } from '@core/types/combat';
import type { UnitState, UnitType } from '@core/types/unit';
import { manhattanDistance } from '@/utils/coord';
import { getBaseDamage, UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';

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

export { getBaseDamage };
export type { UnitType };

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

export const canDealDamage = (attackerType: UnitType, defenderType: UnitType): boolean =>
  getBaseDamage(attackerType, defenderType) > 0;

export const canCounterAttack = (attacker: UnitState, defender: UnitState): boolean => {
  const distance = manhattanDistance(attacker.position, defender.position);
  const defenderDef = UNIT_DEFINITIONS[defender.type];
  return (
    distance >= defenderDef.attackRangeMin
    && distance <= defenderDef.attackRangeMax
    && canDealDamage(defender.type, attacker.type)
  );
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
  const baseDamage = getBaseDamage(attacker.type, defender.type);
  const damageToDefender = computeDamage(
    baseDamage,
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
