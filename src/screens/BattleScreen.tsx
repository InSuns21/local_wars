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
import { getVisibleEnemyUnitIds } from "@core/rules/visibility";
import type { Coord } from "@core/types/game";
import type { GameState } from "@core/types/state";
import type { UnitState, UnitType } from "@core/types/unit";
import { toCoordKey } from "@/utils/coord";
import { getUnitTypeLabel } from "@/utils/unitLabel";

export const battleStore = createGameStore(createInitialGameState());

type BattleScreenProps = {
  useStore?: ReturnType<typeof createGameStore>;
  onSaveAndExit?: (state: GameState) => void;
  onExitWithoutSave?: () => void;
  onReturnToTitle?: () => void;
  onOpenTutorial?: () => void;
};

const PRODUCIBLE_UNITS: UnitType[] = [
  "INFANTRY",
  "RECON",
  "TANK",
  "ANTI_TANK",
  "ARTILLERY",
  "ANTI_AIR",
];

const isIncomeProperty = (terrainType: string): boolean =>
  terrainType === "CITY" || terrainType === "FACTORY" || terrainType === "HQ";

const getTurnIncome = (state: GameState, playerId: "P1" | "P2"): number => {
  const owned = Object.values(state.map.tiles).filter(
    (tile) => tile.owner === playerId && isIncomeProperty(tile.terrainType),
  ).length;
  const incomePerProperty = state.incomePerProperty ?? 1000;
  return owned * incomePerProperty;
};

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

const formatActionLogEntry = (
  entry: GameState["actionLog"][number],
): string => {
  const base = `T${entry.turn} ${entry.playerId} ${entry.action}`;
  if (!entry.detail) return base;
  return `${base} | ${entry.detail}`;
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
  const [produceUnitType, setProduceUnitType] = useState<UnitType>("INFANTRY");
  const [selectedFactoryKey, setSelectedFactoryKey] = useState<string>("");
  const [lastResult, setLastResult] = useState<string>("未実行");
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

  const aliveUnitByTile = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of Object.values(gameState.units)) {
      if (unit.hp <= 0) continue;
      map.set(toCoordKey(unit.position), unit.id);
    }
    return map;
  }, [gameState.units]);

  const availableFactories = useMemo(() => {
    return Object.values(gameState.map.tiles)
      .filter(
        (tile) =>
          tile.terrainType === "FACTORY" &&
          tile.owner === gameState.currentPlayerId,
      )
      .filter((tile) => !aliveUnitByTile.has(toCoordKey(tile.coord)))
      .map((tile) => tile.coord);
  }, [aliveUnitByTile, gameState.currentPlayerId, gameState.map.tiles]);

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
    if (selectedUnit.acted) return [];

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
      visibleEnemyUnits.filter((u) =>
        attackRangeKeys.has(toCoordKey(u.position)),
      ),
    [attackRangeKeys, visibleEnemyUnits],
  );

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
  const canProduce = Boolean(
    !isGameOver && selectedFactoryKey && currentPlayerFunds >= selectedUnitCost,
  );

  const attackForecast = useMemo(() => {
    if (!selectedUnitId || !targetUnitId) return null;
    return simulateCombat(selectedUnitId, targetUnitId);
  }, [selectedUnitId, simulateCombat, targetUnitId]);

  const attackForecastText = useMemo(() => {
    if (!attackForecast) return "なし";

    const defenderRange = attackForecast.defenderToAttacker
      ? `${attackForecast.defenderToAttacker.min}-${attackForecast.defenderToAttacker.max}`
      : "0(反撃なし)";

    return `与ダメージ ${attackForecast.attackerToDefender.min}-${attackForecast.attackerToDefender.max} / 被ダメージ ${defenderRange}`;
  }, [attackForecast]);

  const recentActionLogs = useMemo(() => {
    const showEnemyLogs = gameState.showEnemyActionLogs ?? false;
    const filtered = showEnemyLogs
      ? gameState.actionLog
      : gameState.actionLog.filter((entry) => entry.playerId === humanSide);
    return [...filtered].reverse();
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
  const handleProduce = (): void => {
    if (isGameOver) {
      setLastResult(
        "失敗: 既に勝敗が確定しています。",
      );
      return;
    }
    if (!selectedFactoryKey) {
      setLastResult(
        "失敗: 生産可能な工場がありません。",
      );
      return;
    }

    const [x, y] = selectedFactoryKey.split(",").map(Number);
    const result = dispatchCommand({
      type: "PRODUCE_UNIT",
      playerId: gameState.currentPlayerId,
      factoryCoord: { x, y },
      unitType: produceUnitType,
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
      <AppBar position="static" color="inherit" elevation={1} sx={{ mb: 1.5 }}>
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
        <Paper variant="outlined" sx={{ p: 1.25, mb: 1.5 }}>
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
            md: "minmax(0, 1fr) 240px",
          },
          gap: 1.5,
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
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">ID</Typography>
                    <Typography>{selectedUnit.id}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="caption" color="text.secondary">種類</Typography>
                    <Typography>{getUnitTypeLabel(selectedUnit.type)}</Typography>
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
                <Button type="button" variant="contained" color="secondary" onClick={handleAttack} disabled={!canIssueAttack}>攻撃実行</Button>
                <Button type="button" variant="outlined" onClick={handleCapture} disabled={!canCaptureSelectedUnit}>占領実行</Button>
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
                    <Typography variant="body2" color="text.secondary">工場: 選択可能な工場なし</Typography>
                  </Box>
                ) : (
                  <FormControl>
                    <InputLabel variant="standard" htmlFor="factory-select">工場</InputLabel>
                    <NativeSelect
                      inputProps={{ id: "factory-select" }}
                      value={selectedFactoryKey}
                      onChange={(e) => setSelectedFactoryKey(e.target.value)}
                      disabled={isGameOver}
                    >
                      {availableFactories.map((coord) => {
                        const key = toCoordKey(coord);
                        return <option key={key} value={key}>{coord.x},{coord.y}</option>;
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
                    {PRODUCIBLE_UNITS.map((type) => (
                      <option key={type} value={type}>{`${getUnitTypeLabel(type)} (${UNIT_DEFINITIONS[type].cost})`}</option>
                    ))}
                  </NativeSelect>
                </FormControl>

                <Typography>必要資金: {selectedUnitCost}</Typography>
                <Typography>現在手番の資金: {currentPlayerFunds}</Typography>

                <Button type="button" variant="contained" onClick={handleProduce} disabled={!canProduce}>生産実行</Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Box>

        <Box sx={{ overflowY: "auto", pr: 0.5, minHeight: 0, height: "100%" }}>
          <BoardLegend />
          <Paper variant="outlined" sx={{ p: 1.5, minHeight: 640 }}>
            <GameCanvas
              gameState={gameState}
              selectedUnitId={selectedUnitId}
              selectedTile={selectedTile}
              previewPath={previewPath}
              moveRangeTiles={moveRangeTiles}
              attackRangeTiles={attackRangeTiles}
              highlightedTargetUnitId={canIssueAttack ? targetUnitId || null : null}
              onSelectUnit={isGameOver ? () => {} : selectUnit}
              onSelectTile={handleSelectTile}
            />
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
          sx={{ p: 1.25, overflowY: "auto", minHeight: 0, height: "100%" }}
        >
          <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
            {"経過ログ"}
          </Typography>
          {recentActionLogs.length === 0 && (
            <Typography variant="body2">
              {"ログなし"}
            </Typography>
          )}
          {recentActionLogs.length > 0 && (
            <Stack spacing={0.75}>
              {recentActionLogs.map((entry, idx) => (
                <Paper
                  key={`log-${entry.turn}-${entry.playerId}-${entry.action}-${idx}`}
                  variant="outlined"
                  sx={{ p: 0.75 }}
                >
                  <Typography
                    variant="caption"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {formatActionLogEntry(entry)}
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








