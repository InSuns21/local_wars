import type { UnitState } from './unit';

export type DamageRange = {
  min: number;
  max: number;
};

export type CombatForecast = {
  attackerToDefender: DamageRange;
  defenderToAttacker: DamageRange | null;
};

export type CombatResult = {
  attacker: UnitState;
  defender: UnitState;
  inflictedToDefender: number;
  inflictedToAttacker: number;
};
