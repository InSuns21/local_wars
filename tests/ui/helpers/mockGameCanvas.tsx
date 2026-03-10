import React, { useMemo } from 'react';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { getCaptureTarget } from '@core/rules/capture';
import { getVisibleEnemyCoordKeys, getVisibleTileCoordKeys } from '@core/rules/visibility';
import type { Coord } from '@core/types/game';
import type { TerrainType } from '@core/types/map';
import type { GameState } from '@core/types/state';
import type { UnitState } from '@core/types/unit';
import { toCoordKey } from '@/utils/coord';

type MockGameCanvasProps = {
  gameState: GameState;
  selectedUnitId: string | null;
  selectedTile: Coord | null;
  previewPath: Coord[];
  moveRangeTiles: Coord[];
  attackRangeTiles: Coord[];
  supplyRangeTiles?: Coord[];
  interceptRangeTiles?: Coord[];
  highlightedTargetUnitId?: string | null;
  zoom?: number;
  onSelectUnit: (unitId: string | null) => void;
  onSelectTile: (coord: Coord) => void;
};

const BASE_TILE_WIDTH = 112;
const BASE_TILE_HEIGHT = 96;

const CAPTURABLE_TERRAINS = new Set<TerrainType>(['HQ', 'FACTORY', 'CITY', 'AIRPORT', 'PORT']);

const getPropertyOwnerVisual = (owner?: 'P1' | 'P2'): 'P1' | 'P2' | 'NEUTRAL' => {
  if (owner === 'P1') return 'P1';
  if (owner === 'P2') return 'P2';
  return 'NEUTRAL';
};

const getTerrainLabel = (terrain: TerrainType | string): string => {
  switch (terrain) {
    case 'HQ':
      return '司令部';
    case 'FACTORY':
      return '工場';
    case 'CITY':
      return '都市';
    case 'FOREST':
      return '森';
    case 'MOUNTAIN':
      return '山';
    case 'ROAD':
      return '道路';
    case 'BRIDGE':
      return '橋';
    case 'RIVER':
      return '川';
    case 'SEA':
      return '海';
    case 'COAST':
      return '海岸';
    case 'AIRPORT':
      return '空港';
    case 'PORT':
      return '港';
    default:
      return '平地';
  }
};

const getTerrainDefenseLabel = (terrain: TerrainType | string): string => {
  switch (terrain) {
    case 'HQ':
    case 'FACTORY':
    case 'CITY':
      return '高め';
    case 'FOREST':
      return 'やや高い';
    case 'ROAD':
    case 'BRIDGE':
    case 'RIVER':
      return '低い';
    case 'COAST':
      return '防御側不利';
    default:
      return '標準';
  }
};

const getTerrainSupplyLabel = (terrain: TerrainType | string): string => {
  switch (terrain) {
    case 'HQ':
    case 'FACTORY':
    case 'CITY':
      return 'あり';
    case 'AIRPORT':
      return '航空補給あり';
    case 'PORT':
      return '海上補給あり';
    default:
      return 'なし';
  }
};

const buildTileTooltip = (terrainType: TerrainType | string, unit: UnitState | undefined, capturePoints?: number): string => {
  const lines = [
    `地形: ${getTerrainLabel(terrainType)}`,
    `防御: ${getTerrainDefenseLabel(terrainType)}`,
    `補給: ${getTerrainSupplyLabel(terrainType)}`,
  ];

  if (CAPTURABLE_TERRAINS.has(terrainType as TerrainType)) {
    const captureTarget = getCaptureTarget(terrainType as TerrainType);
    lines.push(`拠点耐久: ${capturePoints ?? captureTarget}/${captureTarget}`);
  }

  if (unit) {
    const def = UNIT_DEFINITIONS[unit.type];
    const range = def.attackRangeMax > 1 ? `間接(${def.attackRangeMin}-${def.attackRangeMax})` : '直接';
    lines.push(`ユニット: ${def.label}`);
    lines.push(`ID: ${unit.id}`);
    lines.push(`HP: ${unit.hp}`);
    lines.push(`特性: ${def.canCapture ? '占領可能' : '占領不可'} / ${range} / 移動:${def.movementType}`);
  }

  return lines.join('\n');
};

export const GameCanvas: React.FC<MockGameCanvasProps> = ({
  gameState,
  selectedUnitId,
  selectedTile,
  previewPath,
  moveRangeTiles,
  attackRangeTiles,
  supplyRangeTiles = [],
  interceptRangeTiles = [],
  highlightedTargetUnitId,
  zoom = 1,
  onSelectUnit,
  onSelectTile,
}) => {
  const tileWidth = Math.round(BASE_TILE_WIDTH * zoom);
  const tileHeight = Math.round(BASE_TILE_HEIGHT * zoom);
  const visibleEnemyCoordKeys = useMemo(
    () => (gameState.fogOfWar ? getVisibleEnemyCoordKeys(gameState, gameState.currentPlayerId) : null),
    [gameState],
  );
  const visibleTileCoordKeys = useMemo(
    () => (gameState.fogOfWar ? getVisibleTileCoordKeys(gameState, gameState.currentPlayerId) : null),
    [gameState],
  );
  const unitByCoordKey = useMemo(() => {
    const entries = Object.values(gameState.units)
      .filter((unit) => unit.hp > 0)
      .filter((unit) => {
        if (!gameState.fogOfWar) return true;
        if (unit.owner === gameState.currentPlayerId) return true;
        return visibleEnemyCoordKeys?.has(toCoordKey(unit.position)) ?? false;
      })
      .map((unit) => [toCoordKey(unit.position), unit] as const);
    return new Map(entries);
  }, [gameState, visibleEnemyCoordKeys]);

  const previewKeys = new Set(previewPath.map((coord) => toCoordKey(coord)));
  const moveKeys = new Set(moveRangeTiles.map((coord) => toCoordKey(coord)));
  const attackKeys = new Set(attackRangeTiles.map((coord) => toCoordKey(coord)));
  const supplyKeys = new Set(supplyRangeTiles.map((coord) => toCoordKey(coord)));
  const interceptKeys = new Set(interceptRangeTiles.map((coord) => toCoordKey(coord)));
  const selectedUnit = selectedUnitId ? gameState.units[selectedUnitId] ?? null : null;

  const handleTileClick = (coord: Coord): void => {
    const unit = unitByCoordKey.get(toCoordKey(coord));
    if (unit) {
      onSelectUnit(selectedUnitId === unit.id ? null : unit.id);
      return;
    }
    onSelectTile(coord);
  };

  const rows = Array.from({ length: gameState.map.height }, (_, y) => y);
  const cols = Array.from({ length: gameState.map.width }, (_, x) => x);

  return (
    <section aria-label="ゲーム盤面">
      <div data-testid="game-board-grid" data-board-zoom={zoom.toFixed(2)}>
        {rows.map((y) => (
          <div key={`row-${y}`} style={{ display: 'flex' }}>
            {cols.map((x) => {
              const coord = { x, y };
              const key = toCoordKey(coord);
              const tile = gameState.map.tiles[key];
              const unit = unitByCoordKey.get(key);
              const terrainType = tile?.terrainType ?? 'PLAIN';
              const isVisible = !gameState.fogOfWar || (visibleTileCoordKeys?.has(key) ?? false);
              const isSelectedTile = selectedTile?.x === x && selectedTile?.y === y;
              const isSelectedUnit = selectedUnit?.position.x === x && selectedUnit?.position.y === y;
              const isPreview = previewKeys.has(key);
              const isMoveReachable = moveKeys.has(key);
              const isAttackRange = attackKeys.has(key);
              const isAttackTarget = Boolean(unit && highlightedTargetUnitId === unit.id);
              const isSupplyRange = supplyKeys.has(key);
              const isInterceptRange = interceptKeys.has(key);
              const overlayKinds = [
                isMoveReachable ? 'move' : null,
                isAttackRange ? 'attack' : null,
                isInterceptRange ? 'intercept' : null,
                isPreview ? 'preview' : null,
                isSelectedTile ? 'selected-tile' : null,
                isSelectedUnit ? 'selected-unit' : null,
                isAttackTarget ? 'attack-target' : null,
                isSupplyRange ? 'supply' : null,
              ].filter((kind): kind is string => Boolean(kind));
              const isClickable = Boolean(unit) || (!selectedUnit ? false : isMoveReachable || isAttackRange || isSelectedTile);
              const propertyOwner = isVisible && CAPTURABLE_TERRAINS.has(terrainType as TerrainType)
                ? getPropertyOwnerVisual(tile?.owner)
                : 'NONE';
              const unitHpLabel = isVisible && unit ? `HP ${unit.hp}` : 'NONE';
              const propertyDurabilityLabel = isVisible && CAPTURABLE_TERRAINS.has(terrainType as TerrainType)
                ? `耐久 ${tile?.capturePoints ?? getCaptureTarget(terrainType as TerrainType)}`
                : 'NONE';
              const tooltipText = buildTileTooltip(terrainType, isVisible ? unit : undefined, tile?.capturePoints);
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`タイル ${x},${y}`}
                  title={tooltipText}
                  onClick={() => handleTileClick(coord)}
                  disabled={!isClickable}
                  data-attack-range={isAttackRange ? 'true' : 'false'}
                  data-attack-target={isAttackTarget ? 'true' : 'false'}
                  data-move-reachable={isMoveReachable ? 'true' : 'false'}
                  data-preview-path={isPreview ? 'true' : 'false'}
                  data-supply-range={isSupplyRange ? 'true' : 'false'}
                  data-intercept-range={isInterceptRange ? 'true' : 'false'}
                  data-property-owner={propertyOwner}
                  data-fog-hidden={isVisible ? 'false' : 'true'}
                  data-overlay-kinds={overlayKinds.join(',') || 'none'}
                  data-overlay-layer-count={String([
                    isMoveReachable,
                    isAttackRange,
                    isInterceptRange,
                    isPreview,
                    isSelectedTile,
                    isSelectedUnit,
                    isAttackTarget,
                  ].filter(Boolean).length)}
                  data-outline-layer-count={String([
                    isMoveReachable,
                    isInterceptRange,
                    isPreview,
                    isSelectedTile,
                    isSelectedUnit,
                    isAttackTarget,
                    isSupplyRange,
                  ].filter(Boolean).length)}
                  data-unit-hp={unitHpLabel}
                  data-property-durability={propertyDurabilityLabel}
                  style={{
                    width: `${tileWidth}px`,
                    height: `${tileHeight}px`,
                    borderStyle: isMoveReachable && !isPreview && !isSelectedTile ? 'dashed' : 'solid',
                    borderWidth: '1px',
                    borderColor: isSelectedUnit ? '#2563eb' : isSupplyRange ? '#16a34a' : isInterceptRange ? '#0284c7' : '#64748b',
                    position: 'relative',
                  }}
                >
                  {isVisible && unit ? <span data-testid={`unit-icon-${unit.type}`}>{unit.type}</span> : null}
                  {unitHpLabel !== 'NONE' ? (
                    <span style={{ position: 'absolute', right: '4px', bottom: '4px' }}>{unitHpLabel}</span>
                  ) : null}
                  {propertyDurabilityLabel !== 'NONE' ? (
                    <span style={{ position: 'absolute', left: '4px', bottom: '4px' }}>{propertyDurabilityLabel}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};
