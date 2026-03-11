import type { GameState } from '@core/types/state';
import type { Coord, PlayerId } from '@core/types/game';
import type { GameCommand, CommandResult } from '@core/types/state';
import type { UnitState } from '@core/types/unit';
import { toCoordKey, manhattanDistance } from '@/utils/coord';
import { applyCaptureStep } from '@core/rules/capture';
import { canCounterAttack, canDealDamage, computeBombardDamage, executeCombat } from '@core/rules/combat';
import { findMovePath, getEnemyUnits, getPathCost } from '@core/rules/movement';
import { getVisibleEnemyUnitIds } from '@core/rules/visibility';
import { getTerrainDefenseModifier } from '@core/rules/terrainDefense';
import { checkVictory } from '@core/rules/victory';
import {
  applyFacilityDestruction,
  canBombardProperties,
  canUnitProduceAtTile,
  canTransportUnitTypeCarry,
  getBaseStructureHp,
  getFacilityHp,
  getResupplyTarget,
  getTransportCapacity,
  isAirUnitType,
  isBombardableTerrain,
  isDroneUnitType,
  isFacilityTargetInRange,
  isOperationalFacility,
  isNavalUnitType,
  isSupportUnitType,
  isTransportUnitType,
} from '@core/rules/facilities';
import { nextTurnState } from './turnEngine';
import { UNIT_DEFINITIONS } from './unitDefinitions';

export type CommandDeps = {
  rng: () => number;
};

export type ApplyCommandResult = {
  state: GameState;
  result: CommandResult;
};

const cloneUnit = (unit: UnitState): UnitState => ({
  ...unit,
  position: { ...unit.position },
  lastMovePath: unit.lastMovePath ? unit.lastMovePath.map((coord) => ({ ...coord })) : unit.lastMovePath,
  cargo: unit.cargo?.map(cloneUnit),
});

const cloneState = (state: GameState): GameState => ({
  ...state,
  map: {
    ...state.map,
    tiles: { ...state.map.tiles },
  },
  units: Object.fromEntries(Object.entries(state.units).map(([id, unit]) => [id, cloneUnit(unit)])),
  players: {
    P1: { ...state.players.P1 },
    P2: { ...state.players.P2 },
  },
  factoryProductionState: Object.fromEntries(
    Object.entries(state.factoryProductionState ?? {}).map(([key, value]) => [key, { ...value }]),
  ),
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

const getAdjacentCoords = (coord: Coord): Coord[] => [
  { x: coord.x, y: coord.y - 1 },
  { x: coord.x + 1, y: coord.y },
  { x: coord.x, y: coord.y + 1 },
  { x: coord.x - 1, y: coord.y },
];

const getDroneProductionSlots = (factoryCoord: Coord): Coord[] => [
  { ...factoryCoord },
  { x: factoryCoord.x, y: factoryCoord.y - 1 },
  { x: factoryCoord.x + 1, y: factoryCoord.y },
  { x: factoryCoord.x, y: factoryCoord.y + 1 },
  { x: factoryCoord.x - 1, y: factoryCoord.y },
];

const getFactoryProductionRecord = (state: GameState, factoryKey: string): { normalProduced?: boolean; droneProducedCount?: number } =>
  state.factoryProductionState?.[factoryKey] ?? {};

const countActiveFactoryDrones = (state: GameState, factoryCoord: Coord): number =>
  Object.values(state.units).filter((unit) => unit.hp > 0 && isDroneUnitType(unit.type)
    && unit.originFactoryCoord?.x === factoryCoord.x
    && unit.originFactoryCoord?.y === factoryCoord.y).length;

const getDroneAutoDeployCoord = (state: GameState, factoryCoord: Coord): Coord | null => {
  const slots = getDroneProductionSlots(factoryCoord);
  for (const coord of slots) {
    if (coord.x < 0 || coord.x >= state.map.width || coord.y < 0 || coord.y >= state.map.height) {
      continue;
    }
    const tile = state.map.tiles[toCoordKey(coord)];
    if (!tile) {
      continue;
    }
    if (tile.terrainType === 'HQ') {
      continue;
    }
    if (getUnitAt(state, coord)) {
      continue;
    }
    return coord;
  }
  return null;
};

const markFactoryProduction = (state: GameState, factoryKey: string, mode: 'normal' | 'drone'): void => {
  const current = getFactoryProductionRecord(state, factoryKey);
  state.factoryProductionState = {
    ...(state.factoryProductionState ?? {}),
    [factoryKey]: mode === 'normal'
      ? { ...current, normalProduced: true }
      : { ...current, droneProducedCount: (current.droneProducedCount ?? 0) + 1 },
  };
};

const getSupplyTargets = (state: GameState, unit: UnitState): UnitState[] => {
  const resupplyTarget = getResupplyTarget(unit.type);
  if (!resupplyTarget) {
    return [];
  }

  return getAdjacentCoords(unit.position)
    .map((coord) => getUnitAt(state, coord))
    .filter((target): target is UnitState => Boolean(target && target.owner === unit.owner && target.id !== unit.id))
    .filter((target) => {
      if (resupplyTarget === 'AIR') {
        return isAirUnitType(target.type) && !isDroneUnitType(target.type);
      }
      if (resupplyTarget === 'NAVAL') {
        return isNavalUnitType(target.type);
      }
      return !isAirUnitType(target.type) && !isNavalUnitType(target.type);
    });
};

const getTerrainPassability = (state: GameState, unit: UnitState, coord: Coord): boolean => {
  const occupied = getUnitAt(state, coord);
  if (occupied) {
    return false;
  }
  const pathCost = getPathCost(
    {
      map: state.map,
      unit: { ...unit, position: { ...unit.position } },
      enemyUnits: [],
      maxMove: 1,
    },
    [coord],
  );
  return pathCost !== null;
};

const getLoadTargets = (state: GameState, transport: UnitState): UnitState[] => {
  if (!isTransportUnitType(transport.type)) {
    return [];
  }

  const capacity = getTransportCapacity(transport.type);
  if ((transport.cargo?.length ?? 0) >= capacity) {
    return [];
  }

  if (transport.type === 'CARRIER') {
    const currentTile = state.map.tiles[toCoordKey(transport.position)];
    const hasFriendlyOperationalPortAccess = (currentTile?.terrainType === 'PORT' && currentTile.owner === transport.owner && isOperationalFacility(currentTile))
      || getAdjacentCoords(transport.position).some((coord) => {
        const tile = state.map.tiles[toCoordKey(coord)];
        return tile?.terrainType === 'PORT' && tile.owner === transport.owner && isOperationalFacility(tile);
      });
    if (!hasFriendlyOperationalPortAccess) {
      return [];
    }
  }

  return getAdjacentCoords(transport.position)
    .map((coord) => getUnitAt(state, coord))
    .filter((target): target is UnitState => Boolean(target && target.owner === transport.owner && target.id !== transport.id))
    .filter((target) => target.hp > 0)
    .filter((target) => !wasUnloadedFromCargoThisTurn(target))
    .filter((target) => !isTransportUnitType(target.type))
    .filter((target) => canTransportUnitTypeCarry(transport.type, target.type));
};

const getUnloadCoords = (state: GameState, transport: UnitState, cargoUnit: UnitState | null): Coord[] => {
  if (!cargoUnit || wasLoadedIntoCargoThisTurn(cargoUnit)) {
    return [];
  }

  const transportTile = state.map.tiles[toCoordKey(transport.position)];

  return getAdjacentCoords(transport.position).filter((coord) => {
    const tile = state.map.tiles[toCoordKey(coord)];
    if (!tile) {
      return false;
    }

    if (cargoUnit.type === 'INFANTRY' && transport.type === 'TRANSPORT_HELI' && tile.terrainType === 'SEA') {
      return false;
    }

    if (transport.type === 'LANDER') {
      if (transportTile?.terrainType === 'PORT') {
        return getTerrainPassability(state, { ...cargoUnit, position: { ...transport.position } }, coord);
      }
      if (tile.terrainType !== 'COAST' && tile.terrainType !== 'PORT') {
        return false;
      }
    }

    return getTerrainPassability(state, { ...cargoUnit, position: { ...transport.position } }, coord);
  });
};

const deleteUnitWithCargo = (state: GameState, unitId: string): void => {
  const unit = state.units[unitId];
  if (!unit) {
    return;
  }
  delete state.units[unitId];
};

const getLoadsUsedThisTurn = (transport: UnitState): number => transport.loadsUsedThisTurn ?? (transport.loadedThisTurn ? 1 : 0);
const getUnloadsUsedThisTurn = (transport: UnitState): number => transport.unloadsUsedThisTurn ?? (transport.unloadedThisTurn ? 1 : 0);
const wasLoadedIntoCargoThisTurn = (unit: UnitState | null | undefined): boolean => Boolean(unit?.loadedIntoCargoThisTurn);
const wasUnloadedFromCargoThisTurn = (unit: UnitState | null | undefined): boolean => Boolean(unit?.unloadedFromCargoThisTurn);

const getVisibleEnemyCoordKeys = (state: GameState, unit: UnitState): Set<string> => {
  const visibleEnemyIds = (state.fogOfWar ?? false)
    ? getVisibleEnemyUnitIds(state, unit.owner)
    : new Set(
        Object.values(state.units)
          .filter((other) => other.owner !== unit.owner && other.hp > 0)
          .map((other) => other.id),
      );

  return new Set(
    Object.values(state.units)
      .filter((other) => visibleEnemyIds.has(other.id) && other.hp > 0)
      .map((other) => toCoordKey(other.position)),
  );
};

const applyVictory = (state: GameState): void => {
  const verdict = checkVictory(state);
  state.winner = verdict.winner;
  state.victoryReason = verdict.reason;
};

const resolveDroneInterception = (
  state: GameState,
  movingUnitId: string,
  previousCoord: Coord,
  nextCoord: Coord,
  deps: CommandDeps,
): boolean => {
  const movingUnit = state.units[movingUnitId];
  if (!movingUnit || !isDroneUnitType(movingUnit.type)) {
    return false;
  }

  const interceptionLimit = Math.max(0, state.droneInterceptionMaxPerTurn ?? 2);
  const interceptionChance = Math.max(0, Math.min(100, state.droneInterceptionChancePercent ?? 70)) / 100;
  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;

  const candidates = Object.values(state.units)
    .filter((unit) => unit.hp > 0 && unit.owner !== movingUnit.owner && unit.type === 'COUNTER_DRONE_AA')
    .filter((unit) => (unit.interceptsUsedThisTurn ?? 0) < interceptionLimit)
    .filter((unit) => !shouldConsumeAmmo || unit.ammo > 0)
    .filter((unit) => {
      const range = UNIT_DEFINITIONS[unit.type].interceptRange ?? 0;
      return manhattanDistance(previousCoord, unit.position) > range && manhattanDistance(nextCoord, unit.position) <= range;
    })
    .sort((left, right) => manhattanDistance(nextCoord, left.position) - manhattanDistance(nextCoord, right.position));

  for (const interceptor of candidates) {
    state.units[interceptor.id] = {
      ...interceptor,
      ammo: shouldConsumeAmmo ? Math.max(0, interceptor.ammo - 1) : interceptor.ammo,
      interceptsUsedThisTurn: (interceptor.interceptsUsedThisTurn ?? 0) + 1,
    };

    const succeeded = deps.rng() < interceptionChance;
    appendLog(
      state,
      interceptor.owner,
      'DRONE_INTERCEPT',
      `${interceptor.id} -> ${movingUnit.id} @ ${nextCoord.x},${nextCoord.y} ${succeeded ? '迎撃成功' : '迎撃失敗'} 残迎撃回数:${Math.max(0, interceptionLimit - ((interceptor.interceptsUsedThisTurn ?? 0) + 1))}`,
    );

    if (succeeded) {
      deleteUnitWithCargo(state, movingUnit.id);
      return true;
    }
  }

  return false;
};

const resolveDroneSelfDestructAfterCombat = (
  state: GameState,
  attackerId: string,
  defenderId: string,
  defenderCountered: boolean,
): void => {
  const attacker = state.units[attackerId];
  const defender = state.units[defenderId];

  if (attacker && isDroneUnitType(attacker.type)) {
    deleteUnitWithCargo(state, attackerId);
  }
  if (defender && defenderCountered && isDroneUnitType(defender.type)) {
    deleteUnitWithCargo(state, defenderId);
  }
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

  const findResolvedPath = (): { path: Coord[] | null; reason?: string } => {
    const visibleEnemyCoordKeys = getVisibleEnemyCoordKeys(state, unit);

    if (command.path) {
      if (command.path.length === 0) {
        return { path: null, reason: '移動経路を確定できません。' };
      }

      const lastStep = command.path[command.path.length - 1];
      if (!lastStep || lastStep.x !== command.to.x || lastStep.y !== command.to.y) {
        return { path: null, reason: '移動経路の終点が移動先と一致しません。' };
      }

      const directCost = getPathCost(moveInput, command.path);
      if (directCost === null) {
        return { path: null, reason: '不正な移動経路です。' };
      }

      const intersectsVisibleEnemy = command.path.some((step) => visibleEnemyCoordKeys.has(toCoordKey(step)));
      if (!intersectsVisibleEnemy) {
        return { path: command.path };
      }

      return { path: findMovePath({ ...moveInput, blockedCoordKeys: visibleEnemyCoordKeys }, command.to) };
    }

    const preferredPath = findMovePath(moveInput, command.to);
    if (preferredPath && !preferredPath.some((step) => visibleEnemyCoordKeys.has(toCoordKey(step)))) {
      return { path: preferredPath };
    }

    return { path: findMovePath({ ...moveInput, blockedCoordKeys: visibleEnemyCoordKeys }, command.to) };
  };

  const { path: resolvedPath, reason: resolvedPathError } = findResolvedPath();
  if (!resolvedPath || resolvedPath.length === 0) {
    return { ok: false, reason: resolvedPathError ?? '移動経路を確定できません。' };
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
    if (resolveDroneInterception(state, unit.id, currentPosition, step, deps)) {
      appendLog(
        state,
        state.currentPlayerId,
        'MOVE_UNIT',
        `${unit.id} -> ${step.x},${step.y} route=${[...movedPath, { ...step }].map((c) => `${c.x},${c.y}`).join('>')} 迎撃で中断`,
      );
      applyVictory(state);
      return { ok: true };
    }

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

    resolveDroneSelfDestructAfterCombat(state, blockingUnit.id, unit.id, defenderCanCounter);

    if (state.units[unit.id] && state.units[unit.id].hp <= 0) {
      deleteUnitWithCargo(state, unit.id);
    }
    if (state.units[blockingUnit.id] && state.units[blockingUnit.id].hp <= 0) {
      deleteUnitWithCargo(state, blockingUnit.id);
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
  if (!canDealDamage(attacker.type, defender.type)) {
    return { ok: false, reason: 'このユニットはその対象を攻撃できません。' };
  }

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

  resolveDroneSelfDestructAfterCombat(state, command.attackerId, command.defenderId, defenderCanCounter);

  if (state.units[command.attackerId] && state.units[command.attackerId].hp <= 0) {
    deleteUnitWithCargo(state, command.attackerId);
  }
  if (state.units[command.defenderId] && state.units[command.defenderId].hp <= 0) {
    deleteUnitWithCargo(state, command.defenderId);
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

const applyAttackTileCommand = (
  state: GameState,
  command: Extract<GameCommand, { type: 'ATTACK_TILE' }>,
): CommandResult => {
  const attacker = state.units[command.attackerId];
  if (!attacker) return { ok: false, reason: '攻撃ユニットが存在しません。' };
  if (attacker.owner !== state.currentPlayerId) return { ok: false, reason: '自軍ユニットのみ攻撃できます。' };
  if (attacker.acted) return { ok: false, reason: 'このユニットは既に行動済みです。' };
  if (!canBombardProperties(attacker.type)) {
    return { ok: false, reason: 'このユニットは施設爆撃できません。' };
  }

  const remainingMove = attacker.movePointsRemaining ?? (attacker.moved ? 0 : UNIT_DEFINITIONS[attacker.type].moveRange);
  if (attacker.moved && remainingMove < 1) {
    return { ok: false, reason: '移動余裕がないため攻撃できません。' };
  }

  const tileKey = toCoordKey(command.target);
  const tile = state.map.tiles[tileKey];
  if (!tile || !isBombardableTerrain(tile.terrainType)) {
    return { ok: false, reason: '爆撃可能な施設がありません。' };
  }
  if (!isOperationalFacility(tile)) {
    return { ok: false, reason: 'この施設は既に機能停止しています。' };
  }
  if (getUnitAt(state, command.target)) {
    return { ok: false, reason: 'ユニットがいるタイルは施設爆撃できません。' };
  }

  const distance = manhattanDistance(attacker.position, command.target);
  if (!isFacilityTargetInRange(UNIT_DEFINITIONS[attacker.type], distance)) {
    return { ok: false, reason: '射程外です。' };
  }

  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;
  if (shouldConsumeAmmo && attacker.ammo <= 0) {
    return { ok: false, reason: '弾薬が不足しています。' };
  }

  const structureHp = getFacilityHp(tile) ?? getBaseStructureHp(tile.terrainType);
  if (structureHp === undefined) {
    return { ok: false, reason: 'この施設は爆撃できません。' };
  }

  const damage = computeBombardDamage(attacker);
  const nextHp = Math.max(0, structureHp - damage);

  state.units[command.attackerId] = {
    ...attacker,
    acted: true,
    ammo: shouldConsumeAmmo ? Math.max(0, attacker.ammo - 1) : attacker.ammo,
  };

  state.map.tiles[tileKey] = nextHp <= 0
    ? applyFacilityDestruction(tile, state)
    : {
        ...tile,
        structureHp: nextHp,
        operational: true,
      };

  const nextTile = state.map.tiles[tileKey];
  appendLog(
    state,
    state.currentPlayerId,
    'ATTACK_TILE',
    `${command.attackerId} -> ${tile.terrainType}@${tileKey} 施設HP:${structureHp}->${nextTile.structureHp ?? structureHp}`,
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

  const previousOwner = tile.owner ?? 'NEUTRAL';
  state.map.tiles[tileKey] = next.tile;
  state.units[command.unitId] = { ...unit, acted: true };
  appendLog(
    state,
    state.currentPlayerId,
    'CAPTURE',
    `${command.unitId} @ ${tileKey} terrain=${tile.terrainType} owner=${previousOwner}`,
  );
  applyVictory(state);
  return { ok: true };
};

const applySupplyCommand = (
  state: GameState,
  command: Extract<GameCommand, { type: 'SUPPLY' }>,
): CommandResult => {
  const unit = state.units[command.unitId];
  if (!unit) return { ok: false, reason: 'ユニットが存在しません。' };
  if (unit.owner !== state.currentPlayerId) return { ok: false, reason: '自軍ユニットのみ補給できます。' };
  if (unit.acted) return { ok: false, reason: 'このユニットは既に行動済みです。' };
  if (!isSupportUnitType(unit.type)) return { ok: false, reason: 'このユニットは補給できません。' };
  if ((unit.supplyCharges ?? 0) <= 0) return { ok: false, reason: '補給回数が残っていません。' };

  const targets = getSupplyTargets(state, unit);
  if (targets.length === 0) return { ok: false, reason: '補給対象が隣接していません。' };

  for (const target of targets) {
    state.units[target.id] = {
      ...target,
      fuel: UNIT_DEFINITIONS[target.type].maxFuel,
      ammo: UNIT_DEFINITIONS[target.type].maxAmmo,
    };
  }

  state.units[unit.id] = {
    ...unit,
    acted: true,
    supplyCharges: Math.max(0, (unit.supplyCharges ?? 0) - 1),
  };

  appendLog(
    state,
    state.currentPlayerId,
    'SUPPLY',
    `${unit.id} -> ${targets.map((target) => target.id).join(', ')}`,
  );
  applyVictory(state);
  return { ok: true };
};

const applyLoadCommand = (
  state: GameState,
  command: Extract<GameCommand, { type: 'LOAD' }>,
): CommandResult => {
  const transport = state.units[command.transportUnitId];
  const cargoUnit = state.units[command.cargoUnitId];

  if (!transport || !cargoUnit) return { ok: false, reason: '搭載対象が不正です。' };
  if (transport.owner !== state.currentPlayerId || cargoUnit.owner !== state.currentPlayerId) {
    return { ok: false, reason: '自軍ユニットのみ搭載できます。' };
  }
  if (transport.acted) return { ok: false, reason: 'この輸送ユニットは既に行動済みです。' };
  if (!isTransportUnitType(transport.type)) return { ok: false, reason: '輸送ユニットではありません。' };
  const loadActionLimit = getTransportCapacity(transport.type);
  if (getLoadsUsedThisTurn(transport) >= loadActionLimit) return { ok: false, reason: `搭載は1ターンに${loadActionLimit}回までです。` };
  if (manhattanDistance(transport.position, cargoUnit.position) !== 1) {
    return { ok: false, reason: '搭載対象は隣接している必要があります。' };
  }

  const loadTargets = getLoadTargets(state, transport);
  if (!loadTargets.some((target) => target.id === cargoUnit.id)) {
    return { ok: false, reason: 'そのユニットは搭載できません。' };
  }

  state.units[transport.id] = {
    ...transport,
    loadedThisTurn: true,
    loadsUsedThisTurn: getLoadsUsedThisTurn(transport) + 1,
    cargo: [...(transport.cargo ?? []), cloneUnit({ ...cargoUnit, moved: true, acted: true, loadedIntoCargoThisTurn: true, unloadedFromCargoThisTurn: false, lastMovePath: [] })],
  };
  delete state.units[cargoUnit.id];

  appendLog(state, state.currentPlayerId, 'LOAD', `${transport.id} <= ${cargoUnit.id}`);
  applyVictory(state);
  return { ok: true };
};

const applyUnloadCommand = (
  state: GameState,
  command: Extract<GameCommand, { type: 'UNLOAD' }>,
): CommandResult => {
  const transport = state.units[command.transportUnitId];
  if (!transport) return { ok: false, reason: '輸送ユニットが存在しません。' };
  if (transport.owner !== state.currentPlayerId) return { ok: false, reason: '自軍ユニットのみ降車できます。' };
  if (!isTransportUnitType(transport.type)) return { ok: false, reason: '輸送ユニットではありません。' };
  if (transport.acted) return { ok: false, reason: 'この輸送ユニットは既に行動済みです。' };
  const unloadActionLimit = getTransportCapacity(transport.type);
  if (getUnloadsUsedThisTurn(transport) >= unloadActionLimit) return { ok: false, reason: `降車は1ターンに${unloadActionLimit}回までです。` };

  const cargoIndex = (transport.cargo ?? []).findIndex((cargoUnit) => cargoUnit.id === command.cargoUnitId);
  if (cargoIndex < 0) return { ok: false, reason: '搭載ユニットが見つかりません。' };

  const cargoUnit = transport.cargo?.[cargoIndex] ?? null;
  if (wasLoadedIntoCargoThisTurn(cargoUnit)) return { ok: false, reason: 'このターンに搭載したユニットは降車できません。' };
  const unloadCoords = getUnloadCoords(state, transport, cargoUnit);
  if (!unloadCoords.some((coord) => coord.x === command.to.x && coord.y === command.to.y)) {
    return { ok: false, reason: 'そのタイルには降車できません。' };
  }

  const remainingCargo = [...(transport.cargo ?? [])];
  remainingCargo.splice(cargoIndex, 1);
  state.units[transport.id] = {
    ...transport,
    unloadedThisTurn: true,
    unloadsUsedThisTurn: getUnloadsUsedThisTurn(transport) + 1,
    cargo: remainingCargo,
  };
  state.units[cargoUnit!.id] = {
    ...cloneUnit(cargoUnit!),
    position: { ...command.to },
    moved: true,
    acted: true,
    loadedIntoCargoThisTurn: false,
    unloadedFromCargoThisTurn: true,
    movePointsRemaining: 0,
    lastMovePath: [],
  };

  appendLog(state, state.currentPlayerId, 'UNLOAD', `${transport.id} => ${cargoUnit!.id} @ ${command.to.x},${command.to.y}`);
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
  if (!tile) {
    return { ok: false, reason: '生産拠点タイルでのみ生産できます。' };
  }

  if (tile.owner !== command.playerId) {
    return { ok: false, reason: '自軍生産拠点でのみ生産できます。' };
  }

  if (!canUnitProduceAtTile(command.unitType, tile)) {
    return { ok: false, reason: 'この拠点ではそのユニットを生産できません。' };
  }

  if ((command.unitType === 'SUICIDE_DRONE' || command.unitType === 'COUNTER_DRONE_AA') && !(state.enableSuicideDrones ?? false)) {
    return { ok: false, reason: 'ドローン戦設定が無効です。' };
  }

  const def = UNIT_DEFINITIONS[command.unitType];
  if (state.players[command.playerId].funds < def.cost) {
    return { ok: false, reason: '資金が不足しています。' };
  }

  const factoryRecord = getFactoryProductionRecord(state, tileKey);
  const isDroneProduction = isDroneUnitType(command.unitType);

  if (isDroneProduction && factoryRecord.normalProduced) {
    return { ok: false, reason: 'この工場では今ターン通常ユニットを生産済みです。' };
  }
  if (!isDroneProduction && (factoryRecord.droneProducedCount ?? 0) > 0) {
    return { ok: false, reason: 'この工場では今ターン既にドローンを生産済みです。' };
  }

  let deployCoord = { ...command.factoryCoord };
  if (isDroneProduction) {
    const maxFactoryDrones = Math.min(5, Math.max(1, state.maxFactoryDronesPerFactory ?? 3));
    if (countActiveFactoryDrones(state, command.factoryCoord) >= maxFactoryDrones) {
      return { ok: false, reason: `この工場のドローン上限${maxFactoryDrones}機に達しています。` };
    }
    const autoDeployCoord = getDroneAutoDeployCoord(state, command.factoryCoord);
    if (!autoDeployCoord) {
      return { ok: false, reason: '工場周辺5マスが埋まっているため生産できません。' };
    }
    deployCoord = autoDeployCoord;
  } else if (getUnitAt(state, command.factoryCoord)) {
    return { ok: false, reason: '生産拠点にユニットがいるため生産できません。' };
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
    supplyCharges: def.resupplyTarget ? (state.maxSupplyCharges ?? 4) : undefined,
    cargo: undefined,
    loadedThisTurn: false,
    unloadedThisTurn: false,
    loadedIntoCargoThisTurn: false,
    unloadedFromCargoThisTurn: false,
    loadsUsedThisTurn: 0,
    unloadsUsedThisTurn: 0,
    interceptsUsedThisTurn: 0,
    originFactoryCoord: isDroneProduction ? { ...command.factoryCoord } : undefined,
    position: deployCoord,
    moved: true,
    acted: true,
    lastMovePath: [],
  };
  markFactoryProduction(state, tileKey, isDroneProduction ? 'drone' : 'normal');

  appendLog(state, state.currentPlayerId, 'PRODUCE_UNIT', `${command.unitType} @ ${tileKey}${isDroneProduction ? ` -> ${deployCoord.x},${deployCoord.y}` : ''}`);
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
    case 'ATTACK_TILE':
      result = applyAttackTileCommand(state, command);
      break;
    case 'CAPTURE':
      result = applyCaptureCommand(state, command);
      break;
    case 'SUPPLY':
      result = applySupplyCommand(state, command);
      break;
    case 'LOAD':
      result = applyLoadCommand(state, command);
      break;
    case 'UNLOAD':
      result = applyUnloadCommand(state, command);
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
