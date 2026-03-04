import type { GameState } from '@core/types/state';
import type { Coord, PlayerId } from '@core/types/game';
import type { GameCommand, CommandResult } from '@core/types/state';
import type { UnitState } from '@core/types/unit';
import { toCoordKey, manhattanDistance } from '@/utils/coord';
import { applyCaptureStep } from '@core/rules/capture';
import { canCounterAttack, executeCombat } from '@core/rules/combat';
import { findMovePath, getEnemyUnits, getPathCost } from '@core/rules/movement';
import { getVisibleEnemyUnitIds } from '@core/rules/visibility';
import { getTerrainDefenseModifier } from '@core/rules/terrainDefense';
import { checkVictory } from '@core/rules/victory';
import { nextTurnState } from './turnEngine';
import { UNIT_DEFINITIONS } from './unitDefinitions';

export type CommandDeps = {
  rng: () => number;
};

export type ApplyCommandResult = {
  state: GameState;
  result: CommandResult;
};

const cloneState = (state: GameState): GameState => ({
  ...state,
  map: {
    ...state.map,
    tiles: { ...state.map.tiles },
  },
  units: Object.fromEntries(Object.entries(state.units).map(([id, unit]) => [id, { ...unit }])),
  players: {
    P1: { ...state.players.P1 },
    P2: { ...state.players.P2 },
  },
  actionLog: [...state.actionLog],
});

const getUnitMove = (state: GameState, unit: UnitState): number => {
  const moveRange = UNIT_DEFINITIONS[unit.type].moveRange;
  if (state.enableFuelSupply ?? true) {
    return Math.min(moveRange, unit.fuel);
  }
  return moveRange;
};

const getUnitAt = (state: GameState, coord: Coord): UnitState | undefined =>
  Object.values(state.units).find(
    (u) => u.hp > 0 && u.position.x === coord.x && u.position.y === coord.y,
  );

const canAttack = (attacker: UnitState, defender: UnitState): boolean => {
  const distance = manhattanDistance(attacker.position, defender.position);
  const definition = UNIT_DEFINITIONS[attacker.type];
  return distance >= definition.attackRangeMin && distance <= definition.attackRangeMax;
};

const getDefenseModifier = (state: GameState, unit: UnitState): number => {
  const tile = state.map.tiles[toCoordKey(unit.position)];
  return getTerrainDefenseModifier(tile?.terrainType, unit.type);
};

const appendLog = (state: GameState, playerId: PlayerId, action: string, detail?: string): void => {
  state.actionLog.push({
    turn: state.turn,
    playerId,
    action,
    detail,
  });
};

const applyVictory = (state: GameState): void => {
  const verdict = checkVictory(state);
  state.winner = verdict.winner;
};

const applyMoveCommand = (
  state: GameState,
  command: Extract<GameCommand, { type: 'MOVE_UNIT' }>,
  deps: CommandDeps,
): CommandResult => {
  const unit = state.units[command.unitId];
  if (!unit) return { ok: false, reason: 'ユニットが存在しません。' };
  if (unit.owner !== state.currentPlayerId) return { ok: false, reason: '自軍ユニットのみ操作できます。' };
  if (unit.moved) return { ok: false, reason: 'このユニットは既に移動済みです。' };

  const enemyUnits = getEnemyUnits(state.units, unit.owner);
  const moveInput = {
    map: state.map,
    unit,
    enemyUnits,
    maxMove: getUnitMove(state, unit),
  };

  const resolvedPath = command.path ?? findMovePath(moveInput, command.to);
  if (!resolvedPath || resolvedPath.length === 0) {
    return { ok: false, reason: '移動経路を確定できません。' };
  }

  const last = resolvedPath[resolvedPath.length - 1];
  if (last.x !== command.to.x || last.y !== command.to.y) {
    return { ok: false, reason: '移動経路の終点が移動先と一致しません。' };
  }

  const pathCost = getPathCost(moveInput, resolvedPath);
  if (pathCost === null) {
    return { ok: false, reason: '不正な移動経路です。' };
  }

  const shouldConsumeFuel = state.enableFuelSupply ?? true;
  if (shouldConsumeFuel && unit.fuel < pathCost) {
    return { ok: false, reason: '燃料が不足しています。' };
  }

  const isFogEnabled = state.fogOfWar ?? false;
  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;
  const visibleEnemyIds = isFogEnabled ? getVisibleEnemyUnitIds(state, unit.owner) : new Set<string>();
  const movedPath: Coord[] = [];
  let currentPosition: Coord = { ...unit.position };

  for (const step of resolvedPath) {
    const blockingUnit = getUnitAt(state, step);
    if (!blockingUnit) {
      movedPath.push({ ...step });
      currentPosition = { ...step };
      continue;
    }

    if (blockingUnit.owner === unit.owner) {
      const isDestination = step.x === command.to.x && step.y === command.to.y;
      if (isDestination) {
        return { ok: false, reason: '移動先に味方ユニットがいます。' };
      }
      movedPath.push({ ...step });
      currentPosition = { ...step };
      continue;
    }

    const isHiddenEncounter = isFogEnabled && !visibleEnemyIds.has(blockingUnit.id);
    if (!isHiddenEncounter) {
      const isDestination = step.x === command.to.x && step.y === command.to.y;
      return {
        ok: false,
        reason: isDestination
          ? '移動先にユニットがいます。'
          : '移動経路上に敵ユニットがいます。',
      };
    }

    // FoW遭遇戦: 不可視敵と接触した時点で移動を中断し、移動側は先制できない。
    const movedCost = getPathCost(moveInput, movedPath) ?? 0;
    const defender: UnitState = {
      ...unit,
      position: { ...currentPosition },
      moved: true,
      acted: true,
      movePointsRemaining: Math.max(0, getUnitMove(state, unit) - movedCost),
      lastMovePath: [...movedPath],
    };
    const attacker: UnitState = { ...blockingUnit };

    const defenderCanCounter =
      canCounterAttack(attacker, defender) && (!shouldConsumeAmmo || defender.ammo > 0);

    const enemyBeforeHp = attacker.hp;
    const friendlyBeforeHp = defender.hp;

    const encounter = executeCombat(attacker, defender, deps.rng, {
      canCounter: defenderCanCounter,
      defenderDefenseModifier: getDefenseModifier(state, defender),
      attackerDefenseModifier: getDefenseModifier(state, attacker),
    });

    state.units[blockingUnit.id] = {
      ...encounter.attacker,
      moved: blockingUnit.moved,
      acted: blockingUnit.acted,
    };
    state.units[unit.id] = {
      ...encounter.defender,
      position: { ...currentPosition },
      moved: true,
      acted: true,
      movePointsRemaining: Math.max(0, getUnitMove(state, unit) - movedCost),
      lastMovePath: [...movedPath],
    };

    if (shouldConsumeAmmo) {
      if (state.units[blockingUnit.id]) {
        state.units[blockingUnit.id].ammo = Math.max(0, state.units[blockingUnit.id].ammo - 1);
      }
      if (defenderCanCounter && state.units[unit.id]) {
        state.units[unit.id].ammo = Math.max(0, state.units[unit.id].ammo - 1);
      }
    }

    if (shouldConsumeFuel && state.units[unit.id]) {
      state.units[unit.id].fuel = Math.max(0, state.units[unit.id].fuel - movedCost);
    }

    if (state.units[unit.id] && state.units[unit.id].hp <= 0) {
      delete state.units[unit.id];
    }
    if (state.units[blockingUnit.id] && state.units[blockingUnit.id].hp <= 0) {
      delete state.units[blockingUnit.id];
    }

    appendLog(
      state,
      state.currentPlayerId,
      'FOG_ENCOUNTER',
      `${unit.id} vs ${blockingUnit.id} @ ${step.x},${step.y} stop=${currentPosition.x},${currentPosition.y} ` +
        `味方HP:${friendlyBeforeHp}->${encounter.defender.hp} 敵HP:${enemyBeforeHp}->${encounter.attacker.hp}`,
    );
    applyVictory(state);
    return { ok: true };
  }

  unit.position = { ...command.to };
  unit.moved = true;
  unit.lastMovePath = [...resolvedPath];
  unit.movePointsRemaining = Math.max(0, getUnitMove(state, unit) - pathCost);
  if (shouldConsumeFuel) {
    unit.fuel -= pathCost;
  }

  appendLog(
    state,
    state.currentPlayerId,
    'MOVE_UNIT',
    `${unit.id} -> ${command.to.x},${command.to.y} route=${resolvedPath.map((c) => `${c.x},${c.y}`).join('>')}`,
  );
  applyVictory(state);
  return { ok: true };
};

const applyAttackCommand = (
  state: GameState,
  command: Extract<GameCommand, { type: 'ATTACK' }>,
  deps: CommandDeps,
): CommandResult => {
  const attacker = state.units[command.attackerId];
  const defender = state.units[command.defenderId];

  if (!attacker || !defender) return { ok: false, reason: '攻撃対象が不正です。' };
  if (attacker.owner !== state.currentPlayerId) return { ok: false, reason: '自軍ユニットのみ攻撃できます。' };
  if (defender.owner === attacker.owner) return { ok: false, reason: '味方は攻撃できません。' };
  if (attacker.acted) return { ok: false, reason: 'このユニットは既に行動済みです。' };

  const remainingMove = attacker.movePointsRemaining ?? (attacker.moved ? 0 : UNIT_DEFINITIONS[attacker.type].moveRange);
  if (attacker.moved && remainingMove < 1) {
    return { ok: false, reason: '移動余裕がないため攻撃できません。' };
  }

  if (!canAttack(attacker, defender)) return { ok: false, reason: '射程外です。' };

  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;
  if (shouldConsumeAmmo && attacker.ammo <= 0) {
    return { ok: false, reason: '弾薬が不足しています。' };
  }

  const defenderCanCounter = canCounterAttack(attacker, defender) && (!shouldConsumeAmmo || defender.ammo > 0);

  const defenderDefenseModifier = getDefenseModifier(state, defender);
  const attackerDefenseModifier = getDefenseModifier(state, attacker);
  const attackerBeforeHp = attacker.hp;
  const defenderBeforeHp = defender.hp;

  const result = executeCombat(attacker, defender, deps.rng, {
    canCounter: defenderCanCounter,
    defenderDefenseModifier,
    attackerDefenseModifier,
  });

  state.units[command.attackerId] = result.attacker;
  state.units[command.defenderId] = result.defender;

  if (shouldConsumeAmmo) {
    state.units[command.attackerId].ammo = Math.max(0, state.units[command.attackerId].ammo - 1);
    if (defenderCanCounter && state.units[command.defenderId]) {
      state.units[command.defenderId].ammo = Math.max(0, state.units[command.defenderId].ammo - 1);
    }
  }

  if (state.units[command.attackerId] && state.units[command.attackerId].hp <= 0) {
    delete state.units[command.attackerId];
  }
  if (state.units[command.defenderId] && state.units[command.defenderId].hp <= 0) {
    delete state.units[command.defenderId];
  }

  appendLog(
    state,
    state.currentPlayerId,
    'ATTACK',
    `${command.attackerId} -> ${command.defenderId} ` +
      `味方HP:${attackerBeforeHp}->${result.attacker.hp} 敵HP:${defenderBeforeHp}->${result.defender.hp} ` +
      `被害:${result.inflictedToDefender}/${result.inflictedToAttacker}`,
  );
  applyVictory(state);
  return { ok: true };
};

const applyCaptureCommand = (state: GameState, command: Extract<GameCommand, { type: 'CAPTURE' }>): CommandResult => {
  const unit = state.units[command.unitId];
  if (!unit) return { ok: false, reason: 'ユニットが存在しません。' };
  if (unit.owner !== state.currentPlayerId) return { ok: false, reason: '自軍ユニットのみ占領できます。' };
  if (unit.acted) return { ok: false, reason: 'このユニットは既に行動済みです。' };

  const tileKey = toCoordKey(unit.position);
  const tile = state.map.tiles[tileKey];
  if (!tile) return { ok: false, reason: 'タイルが存在しません。' };

  const next = applyCaptureStep(unit, tile);
  if (next.tile === tile && !next.completed) {
    return { ok: false, reason: 'このユニットは占領できません。' };
  }

  state.map.tiles[tileKey] = next.tile;
  state.units[command.unitId] = { ...unit, acted: true };
  appendLog(state, state.currentPlayerId, 'CAPTURE', `${command.unitId} @ ${tileKey}`);
  applyVictory(state);
  return { ok: true };
};

const applyProduceUnitCommand = (
  state: GameState,
  command: Extract<GameCommand, { type: 'PRODUCE_UNIT' }>,
): CommandResult => {
  if (command.playerId !== state.currentPlayerId) {
    return { ok: false, reason: '現在の手番プレイヤーのみ生産できます。' };
  }

  const tileKey = toCoordKey(command.factoryCoord);
  const tile = state.map.tiles[tileKey];
  if (!tile || tile.terrainType !== 'FACTORY') {
    return { ok: false, reason: '工場タイルでのみ生産できます。' };
  }

  if (tile.owner !== command.playerId) {
    return { ok: false, reason: '自軍工場でのみ生産できます。' };
  }

  if (getUnitAt(state, command.factoryCoord)) {
    return { ok: false, reason: '工場にユニットがいるため生産できません。' };
  }

  const def = UNIT_DEFINITIONS[command.unitType];
  if (state.players[command.playerId].funds < def.cost) {
    return { ok: false, reason: '資金が不足しています。' };
  }

  const unitId = `${command.playerId}_${command.unitType}_${state.turn}_${Object.keys(state.units).length + 1}`;
  state.players[command.playerId].funds -= def.cost;
  state.units[unitId] = {
    id: unitId,
    owner: command.playerId,
    type: command.unitType,
    hp: 10,
    fuel: def.maxFuel,
    ammo: def.maxAmmo,
    position: { ...command.factoryCoord },
    moved: true,
    acted: true,
    lastMovePath: [],
  };

  appendLog(state, state.currentPlayerId, 'PRODUCE_UNIT', `${command.unitType} @ ${tileKey}`);
  applyVictory(state);
  return { ok: true };
};

export const applyCommand = (
  prevState: GameState,
  command: GameCommand,
  deps: CommandDeps,
): ApplyCommandResult => {
  if (prevState.winner) {
    return {
      state: prevState,
      result: { ok: false, reason: '既に勝敗が確定しています。' },
    };
  }

  if (command.type === 'UNDO') {
    return {
      state: prevState,
      result: { ok: false, reason: 'UNDOはストア層で処理します。' },
    };
  }

  const state = cloneState(prevState);
  let result: CommandResult;

  switch (command.type) {
    case 'MOVE_UNIT':
      result = applyMoveCommand(state, command, deps);
      break;
    case 'ATTACK':
      result = applyAttackCommand(state, command, deps);
      break;
    case 'CAPTURE':
      result = applyCaptureCommand(state, command);
      break;
    case 'PRODUCE_UNIT':
      result = applyProduceUnitCommand(state, command);
      break;
    case 'END_TURN':
      appendLog(state, state.currentPlayerId, 'END_TURN');
      return { state: nextTurnState(state), result: { ok: true } };
    default:
      result = { ok: false, reason: '未対応コマンドです。' };
      break;
  }

  if (!result.ok) {
    return { state: prevState, result };
  }

  return { state, result };
};












