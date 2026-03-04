import { canCounterAttack, computeDamage, executeCombat, forecastCombat, getBaseDamage } from '@core/rules/combat';
import type { UnitState } from '@core/types/unit';

const makeUnit = (overrides: Partial<UnitState>): UnitState => ({
  id: 'u',
  owner: 'P1',
  type: 'TANK',
  hp: 10,
  fuel: 99,
  ammo: 9,
  position: { x: 0, y: 0 },
  moved: false,
  acted: false,
  ...overrides,
});

describe('戦闘ルール', () => {
  it('基礎火力とHP倍率からダメージを算出できる', () => {
    const base = getBaseDamage('TANK', 'TANK');
    expect(base).toBeGreaterThan(0);
    expect(computeDamage(base, 10, 1)).toBeGreaterThan(0);
    expect(computeDamage(base, 0, 1)).toBe(0);
  });

  it('HPが少ないほどダメージが小さくなる', () => {
    const base = getBaseDamage('TANK', 'TANK');
    const fullHpDamage = computeDamage(base, 10, 1);
    const lowHpDamage = computeDamage(base, 2, 1);

    expect(lowHpDamage).toBeLessThan(fullHpDamage);
  });

  it('防御補正や攻撃力差によっては被ダメージ0になる', () => {
    const weakBase = getBaseDamage('INFANTRY', 'TANK');
    const damage = computeDamage(weakBase, 1, 1, 0.8);

    expect(damage).toBe(0);
  });

  it('反撃の有無を含めた戦闘予測を返す', () => {
    const attacker = makeUnit({ type: 'ARTILLERY', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'TANK', position: { x: 0, y: 2 } });

    const forecast = forecastCombat(attacker, defender);
    expect(forecast.defenderToAttacker).toBeNull();

    const adjacentForecast = forecastCombat(
      makeUnit({ type: 'TANK', position: { x: 0, y: 0 } }),
      makeUnit({ owner: 'P2', type: 'TANK', position: { x: 1, y: 0 } }),
    );
    expect(adjacentForecast.defenderToAttacker).not.toBeNull();
  });

  it('固定乱数で戦闘結果を再現できる', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'RECON', position: { x: 1, y: 0 } });
    const rng = () => 0.5;

    const result = executeCombat(attacker, defender, rng);
    expect(result.inflictedToDefender).toBeGreaterThan(0);
    expect(result.attacker.acted).toBe(true);
  });

  it('距離条件で反撃可否を判定する', () => {
    const attacker = makeUnit({ position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', position: { x: 2, y: 0 } });
    expect(canCounterAttack(attacker, defender)).toBe(false);
  });

  it('defenseModifier指定時は攻防どちらにも同じ補正が適用される', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'TANK', position: { x: 1, y: 0 } });

    const base = forecastCombat(attacker, defender, { luckMin: 1, luckMax: 1 });
    const mod = forecastCombat(attacker, defender, { luckMin: 1, luckMax: 1, defenseModifier: 0.8 });

    expect(mod.attackerToDefender.max).toBeLessThan(base.attackerToDefender.max);
    expect(mod.defenderToAttacker?.max ?? 0).toBeLessThan(base.defenderToAttacker?.max ?? 0);
  });

  it('attacker/defender個別補正は共通補正より優先される', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'TANK', position: { x: 1, y: 0 } });

    const onlyGlobal = forecastCombat(attacker, defender, {
      luckMin: 1,
      luckMax: 1,
      defenseModifier: 0.8,
    });

    const overridden = forecastCombat(attacker, defender, {
      luckMin: 1,
      luckMax: 1,
      defenseModifier: 0.8,
      attackerDefenseModifier: 1,
      defenderDefenseModifier: 1,
    });

    expect(overridden.attackerToDefender.max).toBeGreaterThan(onlyGlobal.attackerToDefender.max);
    expect((overridden.defenderToAttacker?.max ?? 0)).toBeGreaterThan((onlyGlobal.defenderToAttacker?.max ?? 0));
  });

  it('防御側が間接ユニットで距離2以上の場合は反撃できない', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'ARTILLERY', position: { x: 2, y: 0 } });

    expect(canCounterAttack(attacker, defender)).toBe(false);
  });

  it('executeCombatでcanCounter=falseなら反撃ダメージは0になる', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'TANK', position: { x: 1, y: 0 } });

    const result = executeCombat(attacker, defender, () => 0.5, { canCounter: false });
    expect(result.inflictedToAttacker).toBe(0);
  });
  it('同条件（同兵種・同HP・近接）では双方の被害が同程度になる', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 }, hp: 10 });
    const defender = makeUnit({ owner: 'P2', type: 'TANK', position: { x: 1, y: 0 }, hp: 10 });

    const result = executeCombat(attacker, defender, () => 0.5);

    expect(result.inflictedToDefender).toBe(result.inflictedToAttacker);
  });
  it('forecastCombatは固定ロール時にexecuteCombatと一致する', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 }, hp: 10 });
    const defender = makeUnit({ owner: 'P2', type: 'TANK', position: { x: 1, y: 0 }, hp: 10 });

    const forecast = forecastCombat(attacker, defender, { luckMin: 1, luckMax: 1 });
    const executed = executeCombat(attacker, defender, () => 0.5);

    expect(forecast.attackerToDefender.min).toBe(executed.inflictedToDefender);
    expect(forecast.attackerToDefender.max).toBe(executed.inflictedToDefender);
    expect(forecast.defenderToAttacker?.min ?? 0).toBe(executed.inflictedToAttacker);
    expect(forecast.defenderToAttacker?.max ?? 0).toBe(executed.inflictedToAttacker);
  });

  it('予測で防御側が撃破され得る場合、反撃予測の最小値は0になる', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 }, hp: 10 });
    const defender = makeUnit({ owner: 'P2', type: 'RECON', position: { x: 1, y: 0 }, hp: 6 });

    const forecast = forecastCombat(attacker, defender);
    expect(forecast.defenderToAttacker).not.toBeNull();
    expect(forecast.defenderToAttacker?.min).toBe(0);
  });
});

