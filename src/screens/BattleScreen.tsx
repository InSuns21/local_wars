import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  Toolbar,
  Typography,
  NativeSelect,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { BoardLegend } from "@components/board/BoardLegend";
import { createGameStore, type GameStoreState } from "@store/gameStore";
import { GameCanvas } from "@components/board/GameCanvas";
import { createInitialGameState } from "@core/engine/createInitialGameState";
import { UNIT_DEFINITIONS } from "@core/engine/unitDefinitions";
import { getEnemyUnits, getPathCost } from "@core/rules/movement";
import { canDealDamage } from "@core/rules/combat";
import {
  canBombardProperties,
  canUnitProduceAtTile,
  getProductionTypeForTerrain,
  isAirUnitType,
  isBombardableTerrain,
  isDroneUnitType,
  isNavalUnitType,
  isOperationalFacility,
} from "@core/rules/facilities";
import { getVisibleEnemyUnitIds } from "@core/rules/visibility";
import type { Coord } from "@core/types/game";
import type { GameState } from "@core/types/state";
import type { UnitState, UnitType } from "@core/types/unit";
import { manhattanDistance, toCoordKey } from "@/utils/coord";

export const battleStore = createGameStore(createInitialGameState());

type BattleScreenProps = {
  useStore?: ReturnType<typeof createGameStore>;
  onSaveAndExit?: (state: GameState) => void;
  onExitWithoutSave?: () => void;
  onReturnToTitle?: () => void;
  onOpenTutorial?: () => void;
};

const PRODUCIBLE_UNITS_BY_SITE: Record<"GROUND" | "AIR" | "NAVAL", UnitType[]> = {
  GROUND: ["INFANTRY", "RECON", "TANK", "HEAVY_TANK", "ANTI_TANK", "ARTILLERY", "ANTI_AIR", "FLAK_TANK", "MISSILE_AA", "SUPPLY_TRUCK", "TRANSPORT_TRUCK", "AIR_DEFENSE_INFANTRY", "COUNTER_DRONE_AA", "SUICIDE_DRONE"],
  AIR: ["FIGHTER", "BOMBER", "ATTACKER", "STEALTH_BOMBER", "AIR_TANKER", "TRANSPORT_HELI"],
  NAVAL: ["DESTROYER", "LANDER"],
};

const BOARD_ZOOM_OPTIONS = [
  { value: 1, label: "100%" },
  { value: 0.85, label: "85%" },
  { value: 0.7, label: "70%" },
] as const;

const DRONE_FOCUSED_MAP_IDS = new Set([
  "drone-factory-front",
  "interceptor-belt",
  "industrial-drone-raid",
]);

const getIncomeForTile = (state: GameState, terrainType: string): number => {
  if (terrainType === "CITY" || terrainType === "FACTORY" || terrainType === "HQ") {
    return state.incomePerProperty ?? 1000;
  }
  if (terrainType === "AIRPORT") {
    return state.incomeAirport ?? 1000;
  }
  if (terrainType === "PORT") {
    return state.incomePort ?? 1000;
  }
  return 0;
};

const getTurnIncome = (state: GameState, playerId: "P1" | "P2"): number =>
  Object.values(state.map.tiles)
    .filter((tile) => tile.owner === playerId && isOperationalFacility(tile))
    .reduce((total, tile) => total + getIncomeForTile(state, tile.terrainType), 0);

const getAttackRangeFrom = (
  state: GameState,
  unit: UnitState,
  origin: Coord,
): Coord[] => {
  const def = UNIT_DEFINITIONS[unit.type];
  const coords: Coord[] = [];

  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      const dist = Math.abs(origin.x - x) + Math.abs(origin.y - y);
      if (dist >= def.attackRangeMin && dist <= def.attackRangeMax) {
        coords.push({ x, y });
      }
    }
  }

  return coords;
};

const getActionLabel = (action: GameState["actionLog"][number]["action"]): string => {
  switch (action) {
    case "MOVE_UNIT":
      return "移動";
    case "ATTACK":
      return "攻撃";
    case "ATTACK_TILE":
      return "施設爆撃";
    case "CAPTURE":
      return "占領";
    case "SUPPLY":
      return "補給";
    case "LOAD":
      return "搭載";
    case "UNLOAD":
      return "降車";
    case "PRODUCE_UNIT":
      return "生産";
    case "END_TURN":
      return "ターン終了";
    case "AIR_FUEL_DEPLETION":
      return "燃料切れ";
    case "FOG_ENCOUNTER":
      return "遭遇戦";
    case "DRONE_INTERCEPT":
      return "迎撃";
    default:
      return action;
  }
};

const formatActionLogEntry = (
  entry: GameState["actionLog"][number],
  humanSide: "P1" | "P2",
): string => {
  const playerLabel = entry.playerId === humanSide ? "自軍" : "敵軍";
  const base = `T${entry.turn} ${playerLabel} ${getActionLabel(entry.action)}`;
  if (!entry.detail) return base;
  return `${base} | ${entry.detail}`;
};

const shouldShowActionLogEntry = (
  entry: GameState["actionLog"][number],
  humanSide: "P1" | "P2",
  showEnemyLogs: boolean,
): boolean => {
  if (showEnemyLogs || entry.playerId === humanSide) {
    return true;
  }

  switch (entry.action) {
    case "ATTACK":
    case "FOG_ENCOUNTER":
      return entry.detail?.includes(`${humanSide}_`) ?? false;
    case "CAPTURE":
      return entry.detail?.includes(`owner=${humanSide}`) ?? false;
    case "ATTACK_TILE":
      return true;
    case "DRONE_INTERCEPT":
      return entry.detail?.includes(`${humanSide}_`) ?? false;
    default:
      return false;
  }
};

const getVictoryReasonLabel = (
  reason: GameState["victoryReason"],
): string => {
  switch (reason) {
    case "HQ_CAPTURE":
      return "司令部占領";
    case "ANNIHILATION":
      return "敵軍全滅";
    case "VP_LIMIT":
      return "VP上限到達";
    default:
      return "不明";
  }
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  useStore = battleStore,
  onSaveAndExit,
  onExitWithoutSave,
  onReturnToTitle,
  onOpenTutorial,
}) => {
  const gameState = useStore((s: GameStoreState) => s.gameState);
  const selectedUnitId = useStore((s: GameStoreState) => s.selectedUnitId);
  const selectedTile = useStore((s: GameStoreState) => s.selectedTile);
  const selectUnit = useStore((s: GameStoreState) => s.selectUnit);
  const selectTile = useStore((s: GameStoreState) => s.selectTile);
  const dispatchCommand = useStore((s: GameStoreState) => s.dispatchCommand);
  const buildMovePath = useStore((s: GameStoreState) => s.buildMovePath);
  const getMoveRange = useStore((s: GameStoreState) => s.getMoveRange);
  const simulateCombat = useStore((s: GameStoreState) => s.simulateCombat);
  const endTurn = useStore((s: GameStoreState) => s.endTurn);
  const undo = useStore((s: GameStoreState) => s.undo);

  const selectedUnit = selectedUnitId
    ? gameState.units[selectedUnitId] ?? null
    : null;
  const canControlSelectedUnit = Boolean(
    selectedUnit && selectedUnit.owner === gameState.currentPlayerId,
  );

  const [targetUnitId, setTargetUnitId] = useState<string>("");
  const [loadCargoUnitId, setLoadCargoUnitId] = useState<string>("");
  const [unloadCargoUnitId, setUnloadCargoUnitId] = useState<string>("");
  const [produceUnitType, setProduceUnitType] = useState<UnitType>("INFANTRY");
  const [selectedFactoryKey, setSelectedFactoryKey] = useState<string>("");
  const [lastResult, setLastResult] = useState<string>("未実行");
  const [boardZoom, setBoardZoom] = useState<number>(1);
  const [showOtherMenu, setShowOtherMenu] = useState<boolean>(false);
  const [showGameExitMenu, setShowGameExitMenu] = useState<boolean>(false);
  const [showHelpMenu, setShowHelpMenu] = useState<boolean>(false);

  const isGameOver = gameState.winner !== null;
  const humanSide = gameState.humanPlayerSide ?? "P1";
  const resultLabel =
    gameState.winner === null
      ? null
      : gameState.winner === humanSide
      ? "勝利"
      : "敗北";
  const victoryReasonLabel = getVictoryReasonLabel(
    gameState.victoryReason ?? null,
  );

  const humanFunds = gameState.players[humanSide].funds;
  const humanIncome = getTurnIncome(gameState, humanSide);
  const currentPlayerFunds = gameState.players[gameState.currentPlayerId].funds;
  const selectedUnitCost = UNIT_DEFINITIONS[produceUnitType].cost;
  const isDroneFocusedMap = DRONE_FOCUSED_MAP_IDS.has(gameState.mapId ?? "");

  const aliveUnitByTile = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of Object.values(gameState.units)) {
      if (unit.hp <= 0) continue;
      map.set(toCoordKey(unit.position), unit.id);
    }
    return map;
  }, [gameState.units]);

  const availableFactories = useMemo(() => {
    const terrainPriority = (terrainType?: string): number => {
      if (isDroneFocusedMap && (gameState.enableSuicideDrones ?? false)) {
        if (terrainType === "FACTORY") return 0;
        if (terrainType === "AIRPORT") return 1;
        if (terrainType === "PORT") return 2;
      }
      return 0;
    };

    return Object.values(gameState.map.tiles)
      .filter(
        (tile) =>
          (tile.terrainType === "FACTORY" || tile.terrainType === "AIRPORT" || tile.terrainType === "PORT") &&
          tile.owner === gameState.currentPlayerId &&
          isOperationalFacility(tile),
      )
      .sort((left, right) => {
        const priorityDiff = terrainPriority(left.terrainType) - terrainPriority(right.terrainType);
        if (priorityDiff !== 0) return priorityDiff;
        if (left.coord.y !== right.coord.y) return left.coord.y - right.coord.y;
        return left.coord.x - right.coord.x;
      })
      .map((tile) => tile.coord);
  }, [gameState.currentPlayerId, gameState.enableSuicideDrones, gameState.map.tiles, isDroneFocusedMap]);

  const moveRangeTiles = useMemo(() => {
    if (
      !selectedUnitId ||
      !selectedUnit ||
      !canControlSelectedUnit ||
      selectedUnit.moved ||
      selectedUnit.acted
    ) {
      return [];
    }
    return getMoveRange(selectedUnitId);
  }, [canControlSelectedUnit, getMoveRange, selectedUnit, selectedUnitId]);

  const previewPath = useMemo(() => {
    if (!selectedUnitId || !selectedTile || !canControlSelectedUnit) return [];
    const path = buildMovePath(selectedUnitId, selectedTile);
    return path ?? [];
  }, [buildMovePath, canControlSelectedUnit, selectedTile, selectedUnitId]);

  const attackRangeTiles = useMemo(() => {
    if (!selectedUnitId || !selectedUnit || !canControlSelectedUnit) return [];
    if (selectedUnit.acted || UNIT_DEFINITIONS[selectedUnit.type].resupplyTarget) return [];

    const shouldConsumeFuel = gameState.enableFuelSupply ?? true;
    const maxMove = shouldConsumeFuel
      ? Math.min(
          UNIT_DEFINITIONS[selectedUnit.type].moveRange,
          selectedUnit.fuel,
        )
      : UNIT_DEFINITIONS[selectedUnit.type].moveRange;

    if (selectedTile && !selectedUnit.moved) {
      const path = buildMovePath(selectedUnitId, selectedTile);
      if (!path) return [];

      const pathCost = getPathCost(
        {
          map: gameState.map,
          unit: selectedUnit,
          enemyUnits: getEnemyUnits(gameState.units, selectedUnit.owner),
          maxMove,
        },
        path,
      );
      if (pathCost === null) return [];

      const remaining = Math.max(0, maxMove - pathCost);
      if (remaining < 1) return [];

      return getAttackRangeFrom(gameState, selectedUnit, selectedTile);
    }

    if (selectedUnit.moved) {
      const remaining = selectedUnit.movePointsRemaining ?? 0;
      if (remaining < 1) return [];
    }

    return getAttackRangeFrom(gameState, selectedUnit, selectedUnit.position);
  }, [
    buildMovePath,
    canControlSelectedUnit,
    gameState,
    selectedTile,
    selectedUnit,
    selectedUnitId,
  ]);

  const visibleEnemyUnits = useMemo(() => {
    if (!selectedUnit) return [];
    const visibleEnemyIds = getVisibleEnemyUnitIds(
      gameState,
      selectedUnit.owner,
    );
    return Object.values(gameState.units).filter(
      (u) => visibleEnemyIds.has(u.id) && u.hp > 0,
    );
  }, [gameState, selectedUnit]);

  const attackRangeKeys = useMemo(
    () => new Set(attackRangeTiles.map((coord) => toCoordKey(coord))),
    [attackRangeTiles],
  );

  const attackableEnemyUnits = useMemo(
    () =>
      visibleEnemyUnits.filter(
        (u) => attackRangeKeys.has(toCoordKey(u.position)) && selectedUnit && canDealDamage(selectedUnit.type, u.type),
      ),
    [attackRangeKeys, selectedUnit, visibleEnemyUnits],
  );

  const loadableAdjacentUnits = useMemo(() => {
    if (!selectedUnit || !canControlSelectedUnit || selectedUnit.acted) {
      return [];
    }
    const definition = UNIT_DEFINITIONS[selectedUnit.type];
    if (!definition.transportMode) {
      return [];
    }
    const capacity = definition.cargoCapacity ?? 0;
    if ((selectedUnit.cargo?.length ?? 0) >= capacity) {
      return [];
    }

    const adjacentOffsets = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];

    return adjacentOffsets
      .map((offset) => gameState.units[aliveUnitByTile.get(toCoordKey({ x: selectedUnit.position.x + offset.x, y: selectedUnit.position.y + offset.y })) ?? ""])
      .filter((unit): unit is UnitState => Boolean(unit && unit.owner === selectedUnit.owner && unit.id !== selectedUnit.id))
      .filter((unit) => !UNIT_DEFINITIONS[unit.type].transportMode)
      .filter((unit) => (definition.cargoUnitTypes ?? []).includes(unit.type));
  }, [aliveUnitByTile, canControlSelectedUnit, gameState.units, selectedUnit]);

  const unloadCandidateTiles = useMemo(() => {
    if (!selectedUnit || !canControlSelectedUnit || selectedUnit.acted || !unloadCargoUnitId) {
      return [];
    }
    const cargoUnit = (selectedUnit.cargo ?? []).find((unit) => unit.id === unloadCargoUnitId);
    if (!cargoUnit) {
      return [];
    }

    const adjacentOffsets = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];

    return adjacentOffsets
      .map((offset) => ({ x: selectedUnit.position.x + offset.x, y: selectedUnit.position.y + offset.y }))
      .filter((coord) => coord.x >= 0 && coord.x < gameState.map.width && coord.y >= 0 && coord.y < gameState.map.height)
      .filter((coord) => !aliveUnitByTile.has(toCoordKey(coord)))
      .filter((coord) => {
        const tile = gameState.map.tiles[toCoordKey(coord)];
        if (!tile) {
          return false;
        }
        if (selectedUnit.type === "TRANSPORT_HELI") {
          return cargoUnit.type === "INFANTRY" && tile.terrainType !== "SEA";
        }
        const pathCost = getPathCost(
          {
            map: gameState.map,
            unit: { ...cargoUnit, position: { ...selectedUnit.position } },
            enemyUnits: [],
            maxMove: 1,
          },
          [coord],
        );
        return pathCost !== null;
      });
  }, [aliveUnitByTile, canControlSelectedUnit, gameState.map, selectedUnit, unloadCargoUnitId]);

  const supplyRangeTiles = useMemo(() => {
    if (!selectedUnit || !canControlSelectedUnit || selectedUnit.acted) {
      return [];
    }

    const resupplyTarget = UNIT_DEFINITIONS[selectedUnit.type].resupplyTarget;
    if (!resupplyTarget) {
      return [];
    }

    const adjacentOffsets = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];

    return adjacentOffsets
      .map((offset) => ({ x: selectedUnit.position.x + offset.x, y: selectedUnit.position.y + offset.y }))
      .filter((coord) => coord.x >= 0 && coord.x < gameState.map.width && coord.y >= 0 && coord.y < gameState.map.height)
      .filter((coord) => {
        const target = gameState.units[aliveUnitByTile.get(toCoordKey(coord)) ?? ''];
        if (!target || target.owner !== selectedUnit.owner || target.id === selectedUnit.id) {
          return false;
        }
        if (resupplyTarget === 'AIR') {
          return isAirUnitType(target.type) && !isDroneUnitType(target.type);
        }
        return !isAirUnitType(target.type) && !isNavalUnitType(target.type);
      });
  }, [aliveUnitByTile, canControlSelectedUnit, gameState.map.height, gameState.map.width, gameState.units, selectedUnit]);

  const interceptRangeTiles = useMemo(() => {
    if (!selectedUnit || !canControlSelectedUnit || selectedUnit.type !== "COUNTER_DRONE_AA") {
      return [];
    }

    const interceptRange = UNIT_DEFINITIONS[selectedUnit.type].interceptRange ?? 0;
    if (interceptRange <= 0) {
      return [];
    }

    const coords: Coord[] = [];
    for (let y = 0; y < gameState.map.height; y += 1) {
      for (let x = 0; x < gameState.map.width; x += 1) {
        const coord = { x, y };
        const distance = manhattanDistance(selectedUnit.position, coord);
        if (distance >= 1 && distance <= interceptRange) {
          coords.push(coord);
        }
      }
    }
    return coords;
  }, [canControlSelectedUnit, gameState.map.height, gameState.map.width, selectedUnit]);

  const canIssueAttack = Boolean(
    canControlSelectedUnit &&
      !isGameOver &&
      attackableEnemyUnits.length > 0 &&
      !selectedUnit?.acted,
  );
  const canMoveSelectedUnit = Boolean(
    canControlSelectedUnit &&
      !isGameOver &&
      selectedUnit &&
      !selectedUnit.moved &&
      !selectedUnit.acted,
  );
  const canCaptureSelectedUnit = Boolean(
    canControlSelectedUnit &&
      !isGameOver &&
      selectedUnit &&
      !selectedUnit.acted &&
      UNIT_DEFINITIONS[selectedUnit.type].canCapture,
  );
  const effectiveFactoryKey = useMemo(
    () => selectedFactoryKey || (availableFactories[0] ? toCoordKey(availableFactories[0]) : ''),
    [availableFactories, selectedFactoryKey],
  );
  const selectedProductionTile = useMemo(
    () => (effectiveFactoryKey ? gameState.map.tiles[effectiveFactoryKey] : undefined),
    [effectiveFactoryKey, gameState.map.tiles],
  );

  const producibleUnitTypes = useMemo(() => {
    if (!selectedProductionTile) {
      return PRODUCIBLE_UNITS_BY_SITE.GROUND;
    }
    const productionType = getProductionTypeForTerrain(selectedProductionTile.terrainType);
    if (!productionType) {
      return PRODUCIBLE_UNITS_BY_SITE.GROUND;
    }
    return PRODUCIBLE_UNITS_BY_SITE[productionType].filter((type) => {
      if ((type === "SUICIDE_DRONE" || type === "COUNTER_DRONE_AA") && !(gameState.enableSuicideDrones ?? false)) {
        return false;
      }
      return true;
    });
  }, [gameState.enableSuicideDrones, selectedProductionTile]);

  const showLoadUnloadControls = Boolean(
    canControlSelectedUnit && selectedUnit && UNIT_DEFINITIONS[selectedUnit.type].transportMode,
  );

  const canIssueLoad = Boolean(
    canControlSelectedUnit &&
      !isGameOver &&
      selectedUnit &&
      !selectedUnit.acted &&
      !selectedUnit.loadedThisTurn &&
      loadableAdjacentUnits.length > 0,
  );

  const canIssueUnload = Boolean(
    canControlSelectedUnit &&
      !isGameOver &&
      selectedUnit &&
      !selectedUnit.acted &&
      !selectedUnit.unloadedThisTurn &&
      unloadCargoUnitId &&
      unloadCandidateTiles.length > 0,
  );

  const showSupplyControl = Boolean(
    canControlSelectedUnit && selectedUnit && UNIT_DEFINITIONS[selectedUnit.type].resupplyTarget,
  );

  const canIssueSupply = Boolean(
    canControlSelectedUnit &&
      !isGameOver &&
      selectedUnit &&
      !selectedUnit.acted &&
      UNIT_DEFINITIONS[selectedUnit.type].resupplyTarget &&
      (selectedUnit.supplyCharges ?? 0) > 0 &&
      supplyRangeTiles.length > 0,
  );

  const showBombardControl = Boolean(
    canControlSelectedUnit && selectedUnit && canBombardProperties(selectedUnit.type),
  );

  const canIssueBombard = Boolean(
    canControlSelectedUnit &&
      !isGameOver &&
      selectedUnit &&
      !selectedUnit.acted &&
      selectedTile &&
      canBombardProperties(selectedUnit.type) &&
      (() => {
        const distance = Math.abs(selectedUnit.position.x - selectedTile.x) + Math.abs(selectedUnit.position.y - selectedTile.y);
        const definition = UNIT_DEFINITIONS[selectedUnit.type];
        return distance >= definition.attackRangeMin && distance <= definition.attackRangeMax;
      })() &&
      isBombardableTerrain(gameState.map.tiles[toCoordKey(selectedTile)]?.terrainType ?? "PLAIN") &&
      !gameState.units[aliveUnitByTile.get(toCoordKey(selectedTile)) ?? ""] &&
      isOperationalFacility(gameState.map.tiles[toCoordKey(selectedTile)]),
  );

  const showCaptureControl = Boolean(
    canControlSelectedUnit && selectedUnit && UNIT_DEFINITIONS[selectedUnit.type].canCapture,
  );

  const selectedFactoryDroneCount = useMemo(() => {
    if (!effectiveFactoryKey) {
      return 0;
    }
    const [x, y] = effectiveFactoryKey.split(",").map(Number);
    return Object.values(gameState.units).filter(
      (unit) => unit.hp > 0 && isDroneUnitType(unit.type) && unit.originFactoryCoord?.x === x && unit.originFactoryCoord?.y === y,
    ).length;
  }, [effectiveFactoryKey, gameState.units]);

  const maxFactoryDronesPerFactory = Math.min(5, Math.max(1, gameState.maxFactoryDronesPerFactory ?? 3));

  const factoryProductionRecord = useMemo(
    () => (effectiveFactoryKey ? gameState.factoryProductionState?.[effectiveFactoryKey] ?? {} : {}),
    [effectiveFactoryKey, gameState.factoryProductionState],
  );

  const canProduce = Boolean(
    !isGameOver &&
      effectiveFactoryKey &&
      selectedProductionTile &&
      canUnitProduceAtTile(produceUnitType, selectedProductionTile) &&
      currentPlayerFunds >= selectedUnitCost,
  );

  const droneProductionCost = UNIT_DEFINITIONS.SUICIDE_DRONE.cost;
  const canShowDroneProductionPanel = Boolean(
    selectedProductionTile?.terrainType === "FACTORY" && (gameState.enableSuicideDrones ?? false),
  );
  const canProduceDrone = Boolean(
    !isGameOver &&
      effectiveFactoryKey &&
      selectedProductionTile?.terrainType === "FACTORY" &&
      (gameState.enableSuicideDrones ?? false) &&
      currentPlayerFunds >= droneProductionCost,
  );

  const attackForecast = useMemo(() => {
    if (!selectedUnitId || !targetUnitId) return null;

    const projectedAttackerPosition =
      selectedTile && selectedUnit && !selectedUnit.moved ? selectedTile : undefined;

    return simulateCombat(selectedUnitId, targetUnitId, projectedAttackerPosition);
  }, [selectedTile, selectedUnit, selectedUnitId, simulateCombat, targetUnitId]);

  const attackForecastText = useMemo(() => {
    if (!attackForecast) return "なし";

    const defenderRange = attackForecast.defenderToAttacker
      ? `${attackForecast.defenderToAttacker.min}-${attackForecast.defenderToAttacker.max}`
      : "0(反撃なし)";

    return `与ダメージ ${attackForecast.attackerToDefender.min}-${attackForecast.attackerToDefender.max} / 被ダメージ ${defenderRange}`;
  }, [attackForecast]);

  const recentActionLogs = useMemo(() => {
    const showEnemyLogs = gameState.showEnemyActionLogs ?? false;
    return gameState.actionLog
      .filter((entry) => shouldShowActionLogEntry(entry, humanSide, showEnemyLogs))
      .reverse();
  }, [gameState.actionLog, gameState.showEnemyActionLogs, humanSide]);

  useEffect(() => {
    if (attackableEnemyUnits.length === 0) {
      setTargetUnitId("");
      return;
    }
    if (!attackableEnemyUnits.some((u) => u.id === targetUnitId)) {
      setTargetUnitId(attackableEnemyUnits[0].id);
    }
  }, [attackableEnemyUnits, targetUnitId]);

  useEffect(() => {
    if (loadableAdjacentUnits.length === 0) {
      setLoadCargoUnitId("");
      return;
    }
    if (!loadableAdjacentUnits.some((unit) => unit.id === loadCargoUnitId)) {
      setLoadCargoUnitId(loadableAdjacentUnits[0].id);
    }
  }, [loadCargoUnitId, loadableAdjacentUnits]);

  useEffect(() => {
    const cargoUnits = selectedUnit?.cargo ?? [];
    if (cargoUnits.length === 0) {
      setUnloadCargoUnitId("");
      return;
    }
    if (!cargoUnits.some((unit) => unit.id === unloadCargoUnitId)) {
      setUnloadCargoUnitId(cargoUnits[0].id);
    }
  }, [selectedUnit, unloadCargoUnitId]);

  useEffect(() => {
    if (producibleUnitTypes.length === 0) {
      return;
    }
    if (!producibleUnitTypes.includes(produceUnitType)) {
      setProduceUnitType(producibleUnitTypes[0]);
    }
  }, [producibleUnitTypes, produceUnitType]);

  useEffect(() => {
    if (availableFactories.length === 0) {
      setSelectedFactoryKey("");
      return;
    }
    if (
      !availableFactories.some(
        (coord) => toCoordKey(coord) === selectedFactoryKey,
      )
    ) {
      setSelectedFactoryKey(toCoordKey(availableFactories[0]));
    }
  }, [availableFactories, selectedFactoryKey]);

  useEffect(() => {
    selectTile(null);
    setLastResult("未実行");
  }, [selectTile, selectedUnitId]);

  const setCommandResult = (ok: boolean, reason?: string): void => {
    if (ok) {
      setLastResult("成功");
      return;
    }
    setLastResult(
      `失敗: ${reason ?? "不明な理由"}`,
    );
  };

  const closeOtherMenus = (): void => {
    setShowOtherMenu(false);
    setShowGameExitMenu(false);
    setShowHelpMenu(false);
  };

  const handleSelectTile = (coord: Coord): void => {
    if (isGameOver) return;
    selectTile(coord);
  };

  const handleMove = (): void => {
    if (isGameOver) {
      setLastResult(
        "失敗: 既に勝敗が確定しています。",
      );
      return;
    }
    if (!selectedUnitId) {
      setLastResult(
        "失敗: 操作ユニットを選択してください。",
      );
      return;
    }
    if (!canControlSelectedUnit) {
      setLastResult(
        "失敗: 敵ユニットは操作できません。",
      );
      return;
    }
    if (!selectedTile) {
      setLastResult(
        "失敗: 盤面をクリックして移動先を指定してください。",
      );
      return;
    }

    const path = buildMovePath(selectedUnitId, selectedTile);
    const result = dispatchCommand({
      type: "MOVE_UNIT",
      unitId: selectedUnitId,
      to: selectedTile,
      path: path ?? undefined,
    });
    setCommandResult(result.ok, result.reason);
    if (result.ok) {
      selectTile(null);
    }
  };

  const handleAttack = (): void => {
    if (isGameOver) {
      setLastResult(
        "失敗: 既に勝敗が確定しています。",
      );
      return;
    }
    if (!selectedUnitId) {
      setLastResult(
        "失敗: 操作ユニットを選択してください。",
      );
      return;
    }
    if (!canControlSelectedUnit) {
      setLastResult(
        "失敗: 敵ユニットは操作できません。",
      );
      return;
    }
    if (!targetUnitId) {
      setLastResult(
        "失敗: 攻撃対象を選択してください。",
      );
      return;
    }

    if (selectedTile && selectedUnit && !selectedUnit.moved) {
      const path = buildMovePath(selectedUnitId, selectedTile);
      const moveResult = dispatchCommand({
        type: "MOVE_UNIT",
        unitId: selectedUnitId,
        to: selectedTile,
        path: path ?? undefined,
      });

      if (!moveResult.ok) {
        setCommandResult(false, moveResult.reason);
        return;
      }

      const movedState = useStore.getState().gameState;
      const movedUnit = movedState.units[selectedUnitId];
      const targetAfterMove = movedState.units[targetUnitId];
      const reachedPlannedTile = Boolean(
        movedUnit &&
          movedUnit.position.x === selectedTile.x &&
          movedUnit.position.y === selectedTile.y,
      );

      selectTile(null);

      if (!reachedPlannedTile) {
        setLastResult("成功: 移動中に遭遇戦が発生したため、攻撃はキャンセルされました。");
        return;
      }

      if (!targetAfterMove) {
        setLastResult("成功: 移動は完了しましたが、攻撃対象が消失したため攻撃はキャンセルされました。");
        return;
      }

      const attackAfterMoveResult = dispatchCommand({
        type: "ATTACK",
        attackerId: selectedUnitId,
        defenderId: targetUnitId,
      });

      if (attackAfterMoveResult.ok) {
        setLastResult("成功: 移動後に攻撃しました。");
        return;
      }

      setCommandResult(false, attackAfterMoveResult.reason);
      return;
    }

    const result = dispatchCommand({
      type: "ATTACK",
      attackerId: selectedUnitId,
      defenderId: targetUnitId,
    });
    setCommandResult(result.ok, result.reason);
  };
  const handleCapture = (): void => {
    if (isGameOver) {
      setLastResult(
        "失敗: 既に勝敗が確定しています。",
      );
      return;
    }
    if (!selectedUnitId) {
      setLastResult(
        "失敗: 操作ユニットを選択してください。",
      );
      return;
    }
    if (!canControlSelectedUnit) {
      setLastResult(
        "失敗: 敵ユニットは操作できません。",
      );
      return;
    }

    if (selectedTile && selectedUnit && !selectedUnit.moved) {
      const path = buildMovePath(selectedUnitId, selectedTile);
      const moveResult = dispatchCommand({
        type: "MOVE_UNIT",
        unitId: selectedUnitId,
        to: selectedTile,
        path: path ?? undefined,
      });

      if (!moveResult.ok) {
        setCommandResult(false, moveResult.reason);
        return;
      }

      const movedState = useStore.getState().gameState;
      const movedUnit = movedState.units[selectedUnitId];
      const reachedPlannedTile = Boolean(
        movedUnit &&
          movedUnit.position.x === selectedTile.x &&
          movedUnit.position.y === selectedTile.y,
      );

      selectTile(null);

      if (!reachedPlannedTile) {
        setLastResult("成功: 移動中に遭遇戦が発生したため、占領はキャンセルされました。");
        return;
      }

      const captureAfterMoveResult = dispatchCommand({ type: "CAPTURE", unitId: selectedUnitId });

      if (captureAfterMoveResult.ok) {
        setLastResult("成功: 移動後に占領しました。");
        return;
      }

      setCommandResult(false, captureAfterMoveResult.reason);
      return;
    }

    const result = dispatchCommand({ type: "CAPTURE", unitId: selectedUnitId });
    setCommandResult(result.ok, result.reason);
  };
  const handleLoad = (): void => {
    if (isGameOver) {
      setLastResult("失敗: 既に勝敗が確定しています。");
      return;
    }
    if (!selectedUnitId || !loadCargoUnitId) {
      setLastResult("失敗: 搭載対象を選択してください。");
      return;
    }

    const result = dispatchCommand({ type: "LOAD", transportUnitId: selectedUnitId, cargoUnitId: loadCargoUnitId });
    setCommandResult(result.ok, result.reason);
  };

  const handleUnload = (): void => {
    if (isGameOver) {
      setLastResult("失敗: 既に勝敗が確定しています。");
      return;
    }
    if (!selectedUnitId || !unloadCargoUnitId) {
      setLastResult("失敗: 降車ユニットを選択してください。");
      return;
    }
    if (!selectedTile) {
      setLastResult("失敗: 降車先タイルを選択してください。");
      return;
    }

    const result = dispatchCommand({ type: "UNLOAD", transportUnitId: selectedUnitId, cargoUnitId: unloadCargoUnitId, to: selectedTile });
    setCommandResult(result.ok, result.reason);
  };

  const handleSupply = (): void => {
    if (isGameOver) {
      setLastResult("失敗: 既に勝敗が確定しています。");
      return;
    }
    if (!selectedUnitId) {
      setLastResult("失敗: 操作ユニットを選択してください。");
      return;
    }
    if (!canControlSelectedUnit) {
      setLastResult("失敗: 敵ユニットは操作できません。");
      return;
    }

    const result = dispatchCommand({ type: "SUPPLY", unitId: selectedUnitId });
    setCommandResult(result.ok, result.reason);
  };

  const handleBombard = (): void => {
    if (isGameOver) {
      setLastResult(
        "失敗: 既に勝敗が確定しています。",
      );
      return;
    }
    if (!selectedUnitId) {
      setLastResult(
        "失敗: 操作ユニットを選択してください。",
      );
      return;
    }
    if (!canControlSelectedUnit) {
      setLastResult(
        "失敗: 敵ユニットは操作できません。",
      );
      return;
    }
    if (!selectedTile) {
      setLastResult(
        "失敗: 爆撃対象の施設タイルを選択してください。",
      );
      return;
    }

    const result = dispatchCommand({
      type: "ATTACK_TILE",
      attackerId: selectedUnitId,
      target: selectedTile,
    });
    setCommandResult(result.ok, result.reason);
  };

  const handleProduce = (unitType: UnitType = produceUnitType): void => {
    if (isGameOver) {
      setLastResult(
        "失敗: 既に勝敗が確定しています。",
      );
      return;
    }
    if (!effectiveFactoryKey) {
      setLastResult(
        "失敗: 生産可能な拠点がありません。",
      );
      return;
    }

    const [x, y] = effectiveFactoryKey.split(",").map(Number);
    const result = dispatchCommand({
      type: "PRODUCE_UNIT",
      playerId: gameState.currentPlayerId,
      factoryCoord: { x, y },
      unitType,
    });
    setCommandResult(result.ok, result.reason);
  };

  return (
    <Box
      component="main"
      sx={{
        width: "96vw",
        maxWidth: "none",
        mx: "auto",
        height: "calc(100vh - 16px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar position="static" color="inherit" elevation={1} sx={{ mb: 1 }}>
        <Toolbar sx={{ gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h1" component="h1" sx={{ fontSize: 30, mr: 1 }}>
            LOCAL WARS
          </Typography>
          <Typography>
            {"ターン"}: {gameState.turn}
          </Typography>
          <Typography>
            {"手番"}: {gameState.currentPlayerId}
          </Typography>
          <Typography>
            {"自軍資金"}: {humanFunds}
          </Typography>
          <Typography>
            {"自軍収入"}: +{humanIncome}/{"ターン"}
          </Typography>

          <Button
            type="button"
            variant="contained"
            onClick={() => endTurn()}
            disabled={isGameOver}
          >
            {"ターン終了"}
          </Button>
          <Button type="button" variant="outlined" onClick={() => undo()}>
            {"行動を取り消す"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            onClick={() => setShowOtherMenu((prev) => !prev)}
          >
            {"その他"}
          </Button>
        </Toolbar>
      </AppBar>

      {showOtherMenu && (
        <Paper variant="outlined" sx={{ p: 1, mb: 1 }}>
          <Stack spacing={0.5}>
            <Button
              type="button"
              variant="text"
              onClick={() => setShowGameExitMenu((prev) => !prev)}
              sx={{ justifyContent: "space-between" }}
            >
              {"ゲーム終了"}
            </Button>
            {showGameExitMenu && (
              <Stack spacing={0.5} sx={{ pl: 2 }}>
                <Button
                  type="button"
                  size="small"
                  onClick={() => {
                    closeOtherMenus();
                    onSaveAndExit?.(gameState);
                  }}
                >
                  {"保存して終了"}
                </Button>
                <Button
                  type="button"
                  size="small"
                  color="warning"
                  onClick={() => {
                    closeOtherMenus();
                    onExitWithoutSave?.();
                  }}
                >
                  {"保存しないで終了"}
                </Button>
              </Stack>
            )}

            <Button
              type="button"
              variant="text"
              onClick={() => setShowHelpMenu((prev) => !prev)}
              sx={{ justifyContent: "space-between" }}
            >
              {"ヘルプ"}
            </Button>
            {showHelpMenu && (
              <Stack spacing={0.5} sx={{ pl: 2 }}>
                <Button
                  type="button"
                  size="small"
                  onClick={() => {
                    closeOtherMenus();
                    onOpenTutorial?.();
                  }}
                >
                  {"チュートリアル"}
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "360px minmax(0, 1fr)" },
          gridTemplateRows: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1fr) 176px",
          },
          gap: 1,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            overflowY: "auto",
            pr: 0.5,
            minHeight: 0,
            height: "100%",
            gridRow: { xs: "auto", md: "1 / span 2" },
          }}
        >
          <Accordion defaultExpanded disableGutters component="section" aria-label="ユニット情報">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography component="h2" variant="h6">ユニット情報</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {!selectedUnit && <Typography variant="body2">ユニット未選択</Typography>}
              {selectedUnit && (
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, minWidth: 0 }}>
                  <Paper variant="outlined" sx={{ p: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">ID</Typography>
                    <Typography sx={{ overflowWrap: "anywhere", wordBreak: "break-word", lineHeight: 1.25 }}>
                      {selectedUnit.id}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">種類</Typography>
                    <Typography>{UNIT_DEFINITIONS[selectedUnit.type].label}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">HP</Typography>
                    <Typography>{selectedUnit.hp}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">燃料</Typography>
                    <Typography>{selectedUnit.fuel}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">弾薬</Typography>
                    <Typography>{selectedUnit.ammo}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">座標</Typography>
                    <Typography>{selectedUnit.position.x},{selectedUnit.position.y}</Typography>
                  </Paper>
                  {UNIT_DEFINITIONS[selectedUnit.type].resupplyTarget && (
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" color="text.secondary">補給回数</Typography>
                      <Typography>{`${selectedUnit.supplyCharges ?? 0}/${gameState.maxSupplyCharges ?? 4}`}</Typography>
                    </Paper>
                  )}
                  {UNIT_DEFINITIONS[selectedUnit.type].transportMode && (
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" color="text.secondary">搭載数</Typography>
                      <Typography>{`${selectedUnit.cargo?.length ?? 0}/${UNIT_DEFINITIONS[selectedUnit.type].cargoCapacity ?? 0}`}</Typography>
                    </Paper>
                  )}
                  {UNIT_DEFINITIONS[selectedUnit.type].transportMode && (
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" color="text.secondary">搭載/降車回数</Typography>
                      <Typography>{`${selectedUnit.loadedThisTurn ? 1 : 0}/1 ・ ${selectedUnit.unloadedThisTurn ? 1 : 0}/1`}</Typography>
                    </Paper>
                  )}
                  {UNIT_DEFINITIONS[selectedUnit.type].transportMode && (
                    <Paper variant="outlined" sx={{ p: 1, gridColumn: "1 / -1", minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">搭載中ユニット</Typography>
                      <Typography sx={{ overflowWrap: "anywhere", wordBreak: "break-word", lineHeight: 1.25 }}>
                        {selectedUnit.cargo && selectedUnit.cargo.length > 0 ? selectedUnit.cargo.map((unit) => `${UNIT_DEFINITIONS[unit.type].label}(${unit.id})`).join(" / ") : "なし"}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded disableGutters component="section" aria-label="実行コマンド">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography component="h2" variant="h6">実行コマンド</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>選択移動先:{selectedTile ? ` ${selectedTile.x},${selectedTile.y}` : " 未選択"}</Typography>
              <Typography sx={{ mb: 1 }}>経路プレビュー:{previewPath.length > 0 ? ` ${previewPath.map((c) => `${c.x},${c.y}`).join(" -> ")}` : " なし"}</Typography>

              <Stack spacing={1}>
                <Button type="button" variant="contained" onClick={handleMove} disabled={!canMoveSelectedUnit}>移動実行</Button>

                <FormControl>
                  <InputLabel shrink variant="standard" htmlFor="target-unit">攻撃対象</InputLabel>
                  <NativeSelect
                    inputProps={{ id: "target-unit" }}
                    value={targetUnitId}
                    onChange={(e) => setTargetUnitId(e.target.value)}
                    disabled={!canIssueAttack}
                  >
                    {attackableEnemyUnits.length === 0 && <option value="">選択可能な敵なし</option>}
                    {attackableEnemyUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.id}</option>
                    ))}
                  </NativeSelect>
                </FormControl>

                <Typography variant="body2">
                  攻撃予測: {attackForecastText}
                </Typography>
                {showLoadUnloadControls && (
                  <>
                    <FormControl>
                      <InputLabel shrink variant="standard" htmlFor="load-cargo-unit">搭載対象</InputLabel>
                      <NativeSelect
                        inputProps={{ id: "load-cargo-unit" }}
                        value={loadCargoUnitId}
                        onChange={(e) => setLoadCargoUnitId(e.target.value)}
                        disabled={!canIssueLoad}
                      >
                        {loadableAdjacentUnits.length === 0 && <option value="">搭載可能な味方なし</option>}
                        {loadableAdjacentUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>{`${UNIT_DEFINITIONS[unit.type].label} (${unit.id})`}</option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <FormControl>
                      <InputLabel shrink variant="standard" htmlFor="unload-cargo-unit">降車対象</InputLabel>
                      <NativeSelect
                        inputProps={{ id: "unload-cargo-unit" }}
                        value={unloadCargoUnitId}
                        onChange={(e) => setUnloadCargoUnitId(e.target.value)}
                        disabled={(selectedUnit?.cargo?.length ?? 0) === 0}
                      >
                        {(selectedUnit?.cargo?.length ?? 0) === 0 && <option value="">搭載ユニットなし</option>}
                        {(selectedUnit?.cargo ?? []).map((unit) => (
                          <option key={unit.id} value={unit.id}>{`${UNIT_DEFINITIONS[unit.type].label} (${unit.id})`}</option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    <Typography variant="body2">
                      搭載回数: {selectedUnit?.loadedThisTurn ? '使用済み' : '未使用'} / 降車回数: {selectedUnit?.unloadedThisTurn ? '使用済み' : '未使用'}
                    </Typography>
                    <Typography variant="body2">
                      降車候補: {unloadCandidateTiles.length > 0 ? unloadCandidateTiles.map((coord) => `${coord.x},${coord.y}`).join(' / ') : 'なし'}
                    </Typography>
                  </>
                )}
                {showSupplyControl && (
                  <Typography variant="body2">
                    補給対象: {supplyRangeTiles.length > 0 ? supplyRangeTiles.map((coord) => `${coord.x},${coord.y}`).join(' / ') : 'なし'}
                  </Typography>
                )}
                <Button type="button" variant="contained" color="secondary" onClick={handleAttack} disabled={!canIssueAttack}>攻撃実行</Button>
                {showLoadUnloadControls && <Button type="button" variant="outlined" onClick={handleLoad} disabled={!canIssueLoad}>搭載実行</Button>}
                {showLoadUnloadControls && <Button type="button" variant="outlined" onClick={handleUnload} disabled={!canIssueUnload}>降車実行</Button>}
                {showSupplyControl && <Button type="button" variant="outlined" color="success" onClick={handleSupply} disabled={!canIssueSupply}>補給実行</Button>}
                {showBombardControl && <Button type="button" variant="outlined" color="warning" onClick={handleBombard} disabled={!canIssueBombard}>施設爆撃</Button>}
                {showCaptureControl && <Button type="button" variant="outlined" onClick={handleCapture} disabled={!canCaptureSelectedUnit}>占領実行</Button>}
                <Typography>最終コマンド: {lastResult}</Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Accordion defaultExpanded disableGutters component="section" aria-label="生産UI">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography component="h2" variant="h6">生産UI</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1}>
                {availableFactories.length === 0 ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary">生産拠点: 選択可能な拠点なし</Typography>
                  </Box>
                ) : (
                  <FormControl>
                    <InputLabel variant="standard" htmlFor="factory-select">生産拠点</InputLabel>
                    <NativeSelect
                      inputProps={{ id: "factory-select" }}
                      value={effectiveFactoryKey}
                      onChange={(e) => setSelectedFactoryKey(e.target.value)}
                      disabled={isGameOver}
                    >
                      {availableFactories.map((coord) => {
                        const key = toCoordKey(coord);
                        const tile = gameState.map.tiles[key];
                        return <option key={key} value={key}>{`${coord.x},${coord.y} (${tile?.terrainType ?? "PLAIN"})`}</option>;
                      })}
                    </NativeSelect>
                  </FormControl>
                )}

                <FormControl>
                  <InputLabel variant="standard" htmlFor="produce-unit-type">ユニット</InputLabel>
                  <NativeSelect
                    inputProps={{ id: "produce-unit-type" }}
                    value={produceUnitType}
                    onChange={(e) => setProduceUnitType(e.target.value as UnitType)}
                    disabled={isGameOver}
                  >
                    {producibleUnitTypes.map((type) => (
                      <option key={type} value={type}>{`${UNIT_DEFINITIONS[type].label} (${UNIT_DEFINITIONS[type].cost})`}</option>
                    ))}
                  </NativeSelect>
                </FormControl>

                <Typography variant="body2" color="text.secondary">
                  {selectedProductionTile
                    ? `拠点種別: ${selectedProductionTile.terrainType}${selectedProductionTile.terrainType === "AIRPORT" ? " / 航空ユニットを生産・補給" : ""}${selectedProductionTile.terrainType === "FACTORY" && (gameState.enableSuicideDrones ?? false) ? " / ドローンは工場周辺5マスへ自動配置" : ""}`
                    : "拠点種別: 未選択"}
                </Typography>
                <Typography>必要資金: {selectedUnitCost}</Typography>
                <Typography>現在手番の資金: {currentPlayerFunds}</Typography>
                {canShowDroneProductionPanel && (
                  <Paper variant="outlined" sx={{ p: 1, bgcolor: "grey.50" }}>
                    <Stack spacing={0.75}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        ドローン枠 {selectedFactoryDroneCount}/{maxFactoryDronesPerFactory}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {factoryProductionRecord.normalProduced ? "通常生産済み / " : ""}
                        {(factoryProductionRecord.droneProducedCount ?? 0) > 0
                          ? `ドローン生産回数: ${factoryProductionRecord.droneProducedCount}`
                          : "このターンのドローン生産回数: 0"}
                      </Typography>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => handleProduce("SUICIDE_DRONE")}
                        disabled={!canProduceDrone}
                      >
                        ドローン生産
                      </Button>
                    </Stack>
                  </Paper>
                )}

                <Button type="button" variant="contained" onClick={() => handleProduce()} disabled={!canProduce}>{produceUnitType === "SUICIDE_DRONE" && (gameState.enableSuicideDrones ?? false) ? "ドローン生産" : "生産実行"}</Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>

        <Box
          data-testid="battle-board-panel"
          sx={{
            overflow: "hidden",
            pr: 0.5,
            minHeight: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <BoardLegend />
          </Box>
          <Paper variant="outlined" sx={{ p: 1, minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={0.75}
              alignItems={{ xs: "stretch", sm: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h6">盤面表示</Typography>
                <Typography variant="caption" color="text.secondary">
                  ズーム切替とスクロールで盤面を確認できます。
                </Typography>
              </Box>
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel variant="standard" htmlFor="board-zoom">盤面ズーム</InputLabel>
                <NativeSelect
                  inputProps={{ id: "board-zoom" }}
                  value={String(boardZoom)}
                  onChange={(e) => setBoardZoom(Number(e.target.value))}
                >
                  {BOARD_ZOOM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </FormControl>
            </Stack>
            <Box
              data-testid="battle-board-viewport"
              sx={{
                overflow: "auto",
                minHeight: 0,
                flex: 1,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                p: 0.75,
                bgcolor: "grey.50",
              }}
            >
              <GameCanvas
                gameState={gameState}
                selectedUnitId={selectedUnitId}
                selectedTile={selectedTile}
                previewPath={previewPath}
                moveRangeTiles={moveRangeTiles}
                attackRangeTiles={attackRangeTiles}
                supplyRangeTiles={supplyRangeTiles}
                interceptRangeTiles={interceptRangeTiles}
                highlightedTargetUnitId={canIssueAttack ? targetUnitId || null : null}
                zoom={boardZoom}
                onSelectUnit={isGameOver ? () => {} : selectUnit}
                onSelectTile={handleSelectTile}
              />
            </Box>
          </Paper>

          <Dialog
            open={Boolean(isGameOver && resultLabel)}
            aria-label={"対局結果"}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>{"対局結果"}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1}>
                <Typography>
                  {"勝敗"}: {resultLabel}
                </Typography>
                <Typography>
                  {"勝利条件"}: {victoryReasonLabel}
                </Typography>
                <Typography>
                  {"勝者"}: {gameState.winner}
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button
                type="button"
                variant="contained"
                onClick={() => onReturnToTitle?.()}
              >
                {"タイトルへ戻る"}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
        <Paper
          component="section"
          aria-label={"経過ログ"}
          variant="outlined"
          sx={{ p: 0.875, overflowY: "auto", minHeight: 0, height: "100%" }}
        >
          <Typography component="h2" variant="subtitle1" sx={{ mb: 0.75 }}>
            {"経過ログ"}
          </Typography>
          {recentActionLogs.length === 0 && (
            <Typography variant="body2">
              {"ログなし"}
            </Typography>
          )}
          {recentActionLogs.length > 0 && (
            <Stack spacing={0.5}>
              {recentActionLogs.map((entry, idx) => (
                <Paper
                  key={`log-${entry.turn}-${entry.playerId}-${entry.action}-${idx}`}
                  variant="outlined"
                  sx={{ p: 0.5 }}
                >
                  <Typography
                    variant="caption"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {formatActionLogEntry(entry, humanSide)}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
};








