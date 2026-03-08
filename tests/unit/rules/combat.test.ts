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

  it('重戦車は戦車より高火力で正面戦闘に強い', () => {
    expect(getBaseDamage('HEAVY_TANK', 'TANK')).toBeGreaterThan(getBaseDamage('TANK', 'TANK'));
    expect(getBaseDamage('TANK', 'HEAVY_TANK')).toBeLessThan(getBaseDamage('TANK', 'TANK'));
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

  it('防御側が自走砲のとき隣接では反撃できない', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'ARTILLERY', position: { x: 1, y: 0 } });

    expect(canCounterAttack(attacker, defender)).toBe(false);
  });

  it('防御側が自走砲のとき距離2では反撃できる', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const defender = makeUnit({ owner: 'P2', type: 'ARTILLERY', position: { x: 2, y: 0 } });

    expect(canCounterAttack(attacker, defender)).toBe(true);
  });

  it('戦闘機は地上ユニットを攻撃できない', () => {
    expect(getBaseDamage('FIGHTER', 'TANK')).toBe(0);
    expect(getBaseDamage('FIGHTER', 'INFANTRY')).toBe(0);
  });

  it('爆撃機と攻撃機は航空ユニットを攻撃できない', () => {
    expect(getBaseDamage('BOMBER', 'FIGHTER')).toBe(0);
    expect(getBaseDamage('BOMBER', 'ATTACKER')).toBe(0);
    expect(getBaseDamage('ATTACKER', 'FIGHTER')).toBe(0);
    expect(getBaseDamage('ATTACKER', 'BOMBER')).toBe(0);
  });

  it('自走砲は航空ユニットを攻撃できない', () => {
    expect(getBaseDamage('ARTILLERY', 'FIGHTER')).toBe(0);
    expect(getBaseDamage('ARTILLERY', 'BOMBER')).toBe(0);
  });

  it('地対空ミサイル車は航空ユニット専用で対地攻撃できない', () => {
    expect(getBaseDamage('MISSILE_AA', 'FIGHTER')).toBeGreaterThan(0);
    expect(getBaseDamage('MISSILE_AA', 'TANK')).toBe(0);
    expect(getBaseDamage('MISSILE_AA', 'INFANTRY')).toBe(0);
  });

  it('武装した陸上ユニットは自爆ドローンを攻撃できる', () => {
    expect(getBaseDamage('INFANTRY', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('RECON', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('TANK', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('HEAVY_TANK', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('ANTI_TANK', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('ARTILLERY', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('ANTI_AIR', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('FLAK_TANK', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('MISSILE_AA', 'SUICIDE_DRONE')).toBeGreaterThan(0);
    expect(getBaseDamage('COUNTER_DRONE_AA', 'SUICIDE_DRONE')).toBeGreaterThan(0);
  });

  it('港湾ユニット定義の主要な火力関係が入っている', () => {
    expect(getBaseDamage('SUBMARINE', 'BATTLESHIP')).toBeGreaterThan(getBaseDamage('SUBMARINE', 'DESTROYER'));
    expect(getBaseDamage('DESTROYER', 'SUBMARINE')).toBeGreaterThan(getBaseDamage('DESTROYER', 'BATTLESHIP'));
    expect(getBaseDamage('BATTLESHIP', 'INFANTRY')).toBe(100);
    expect(getBaseDamage('BOMBER', 'SUBMARINE')).toBe(0);
    expect(getBaseDamage('FIGHTER', 'CARRIER')).toBeGreaterThan(0);
    expect(getBaseDamage('SUPPLY_SHIP', 'DESTROYER')).toBe(0);
  });

  it('輸送ユニットは攻撃できない', () => {
    expect(getBaseDamage('TRANSPORT_TRUCK', 'INFANTRY')).toBe(0);
    expect(getBaseDamage('TRANSPORT_TRUCK', 'TANK')).toBe(0);
    expect(getBaseDamage('TRANSPORT_HELI', 'INFANTRY')).toBe(0);
    expect(getBaseDamage('TRANSPORT_HELI', 'FIGHTER')).toBe(0);
  });

  it('補給車は主要な対地攻撃ユニットから攻撃対象に取られ、偵察車より脆い', () => {
    expect(getBaseDamage('INFANTRY', 'SUPPLY_TRUCK')).toBeGreaterThan(0);
    expect(getBaseDamage('TANK', 'SUPPLY_TRUCK')).toBeGreaterThan(0);
    expect(getBaseDamage('HEAVY_TANK', 'SUPPLY_TRUCK')).toBeGreaterThan(0);
    expect(getBaseDamage('ANTI_TANK', 'SUPPLY_TRUCK')).toBeGreaterThan(0);
    expect(getBaseDamage('ARTILLERY', 'SUPPLY_TRUCK')).toBeGreaterThan(0);
    expect(getBaseDamage('BOMBER', 'SUPPLY_TRUCK')).toBeGreaterThan(0);
    expect(getBaseDamage('ATTACKER', 'SUPPLY_TRUCK')).toBeGreaterThan(0);
    expect(getBaseDamage('TANK', 'SUPPLY_TRUCK')).toBeGreaterThan(getBaseDamage('TANK', 'RECON'));
    expect(getBaseDamage('HEAVY_TANK', 'SUPPLY_TRUCK')).toBeGreaterThan(getBaseDamage('HEAVY_TANK', 'RECON'));
  });

  it('輸送車は偵察車レベルの防御力になる', () => {
    expect(getBaseDamage('TANK', 'TRANSPORT_TRUCK')).toBe(getBaseDamage('TANK', 'RECON'));
    expect(getBaseDamage('ANTI_TANK', 'TRANSPORT_TRUCK')).toBe(getBaseDamage('ANTI_TANK', 'RECON'));
  });

  it('輸送ヘリは主要な対空攻撃ユニットから攻撃対象に取られ、航空で最も脆い水準になる', () => {
    expect(getBaseDamage('FIGHTER', 'TRANSPORT_HELI')).toBeGreaterThan(getBaseDamage('FIGHTER', 'AIR_TANKER'));
    expect(getBaseDamage('ANTI_AIR', 'TRANSPORT_HELI')).toBeGreaterThan(getBaseDamage('ANTI_AIR', 'AIR_TANKER'));
    expect(getBaseDamage('FLAK_TANK', 'TRANSPORT_HELI')).toBeGreaterThan(getBaseDamage('FLAK_TANK', 'AIR_TANKER'));
    expect(getBaseDamage('MISSILE_AA', 'TRANSPORT_HELI')).toBeGreaterThan(getBaseDamage('MISSILE_AA', 'AIR_TANKER'));
  });

  it('空中補給機は主要な対空攻撃ユニットから攻撃対象に取られ、航空で最も脆い水準になる', () => {
    expect(getBaseDamage('FIGHTER', 'AIR_TANKER')).toBeGreaterThan(0);
    expect(getBaseDamage('ANTI_AIR', 'AIR_TANKER')).toBeGreaterThan(0);
    expect(getBaseDamage('FLAK_TANK', 'AIR_TANKER')).toBeGreaterThan(0);
    expect(getBaseDamage('MISSILE_AA', 'AIR_TANKER')).toBeGreaterThan(0);
    expect(getBaseDamage('FIGHTER', 'AIR_TANKER')).toBeGreaterThan(getBaseDamage('FIGHTER', 'ATTACKER'));
    expect(getBaseDamage('ANTI_AIR', 'AIR_TANKER')).toBeGreaterThan(getBaseDamage('ANTI_AIR', 'ATTACKER'));
    expect(getBaseDamage('FLAK_TANK', 'AIR_TANKER')).toBeGreaterThan(getBaseDamage('FLAK_TANK', 'ATTACKER'));
    expect(getBaseDamage('MISSILE_AA', 'AIR_TANKER')).toBeGreaterThan(getBaseDamage('MISSILE_AA', 'ATTACKER'));
  });

  it('高射砲車は対空に加えて対地攻撃もできる', () => {
    expect(getBaseDamage('FLAK_TANK', 'BOMBER')).toBeGreaterThan(0);
    expect(getBaseDamage('FLAK_TANK', 'INFANTRY')).toBeGreaterThan(0);
    expect(getBaseDamage('FLAK_TANK', 'TANK')).toBeGreaterThan(0);
  });

  it('間接対空ユニットは隣接では反撃できない', () => {
    const attacker = makeUnit({ type: 'TANK', position: { x: 0, y: 0 } });
    const missile = makeUnit({ owner: 'P2', type: 'MISSILE_AA', position: { x: 1, y: 0 } });
    const flak = makeUnit({ owner: 'P2', type: 'FLAK_TANK', position: { x: 1, y: 0 } });

    expect(canCounterAttack(attacker, missile)).toBe(false);
    expect(canCounterAttack(attacker, flak)).toBe(false);
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



