import React, { useMemo } from 'react';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { getVisibleEnemyCoordKeys, getVisibleTileCoordKeys } from '@core/rules/visibility';
import type { TerrainType } from '@core/types/map';
import type { Coord } from '@core/types/game';
import type { GameState } from '@core/types/state';
import type { UnitState } from '@core/types/unit';
import { toCoordKey } from '@/utils/coord';
import { getUnitTypeLabel } from '@/utils/unitLabel';
import { TERRAIN_TEXTURES, UNIT_GLYPH_PATHS } from './boardArt';

type GameCanvasProps = {
  gameState: GameState;
  selectedUnitId: string | null;
  selectedTile: Coord | null;
  previewPath: Coord[];
  moveRangeTiles: Coord[];
  attackRangeTiles: Coord[];
  onSelectUnit: (unitId: string | null) => void;
  onSelectTile: (coord: Coord) => void;
};

const TILE_WIDTH = 112;
const TILE_HEIGHT = 96;

const tileStyle: React.CSSProperties = {
  width: TILE_WIDTH,
  height: TILE_HEIGHT,
  border: '1px solid #cbd5e1',
  fontSize: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const getPropertyOwnerVisual = (owner?: 'P1' | 'P2'): { tag: string; color: string } => {
  if (owner === 'P1') return { tag: 'P1', color: '#2563eb' };
  if (owner === 'P2') return { tag: 'P2', color: '#dc2626' };
  return { tag: 'NEUTRAL', color: '#6b7280' };
};

const isOwnerVisibleProperty = (terrainType?: TerrainType): boolean =>
  terrainType === 'FACTORY' || terrainType === 'HQ' || terrainType === 'CITY';

const isCapturableProperty = (terrainType?: TerrainType | string): boolean =>
  terrainType === 'FACTORY' || terrainType === 'HQ' || terrainType === 'CITY';

const getTerrainVisual = (terrain: TerrainType | string): { short: string; bg: string; fg: string } => {
  switch (terrain) {
    case 'HQ':
      return { short: 'HQ', bg: '#fde68a', fg: '#7c2d12' };
    case 'FACTORY':
      return { short: '工', bg: '#e2e8f0', fg: '#0f172a' };
    case 'CITY':
      return { short: '都', bg: '#ddd6fe', fg: '#4c1d95' };
    case 'FOREST':
      return { short: '森', bg: '#86efac', fg: '#14532d' };
    case 'MOUNTAIN':
      return { short: '山', bg: '#d6d3d1', fg: '#44403c' };
    case 'ROAD':
      return { short: '道', bg: '#e5e7eb', fg: '#111827' };
    case 'BRIDGE':
      return { short: '橋', bg: '#f5f5f4', fg: '#111827' };
    case 'RIVER':
      return { short: '川', bg: '#93c5fd', fg: '#1e3a8a' };
    case 'SEA':
      return { short: '海', bg: '#60a5fa', fg: '#172554' };
    case 'AIRPORT':
      return { short: '空', bg: '#bae6fd', fg: '#0c4a6e' };
    case 'PORT':
      return { short: '港', bg: '#a5f3fc', fg: '#164e63' };
    default:
      return { short: '平', bg: '#d9f99d', fg: '#365314' };
  }
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
    case 'AIRPORT':
      return '空港';
    case 'PORT':
      return '港';
    default:
      return '平地';
  }
};

const getTerrainTraits = (terrain: TerrainType | string): {
  defense: string;
  supply: string;
  mobility: string;
} => {
  switch (terrain) {
    case 'HQ':
    case 'FACTORY':
    case 'CITY':
      return {
        defense: '高め',
        supply: 'あり',
        mobility: '標準',
      };
    case 'FOREST':
      return {
        defense: 'やや高い',
        supply: 'なし',
        mobility: '悪い',
      };
    case 'MOUNTAIN':
      return {
        defense: '歩兵は高い',
        supply: 'なし',
        mobility: '歩兵以外ほぼ不可',
      };
    case 'ROAD':
    case 'BRIDGE':
      return {
        defense: '低い',
        supply: 'なし',
        mobility: '良い',
      };
    case 'RIVER':
      return {
        defense: '低い',
        supply: 'なし',
        mobility: '悪い',
      };
    case 'SEA':
      return {
        defense: '標準',
        supply: 'なし',
        mobility: '海上ユニット向け',
      };
    case 'AIRPORT':
      return {
        defense: '標準',
        supply: 'なし',
        mobility: '航空運用拠点',
      };
    case 'PORT':
      return {
        defense: '標準',
        supply: 'なし',
        mobility: '海上運用拠点',
      };
    default:
      return {
        defense: '標準',
        supply: 'なし',
        mobility: '標準',
      };
  }
};

const getUnitTraitsText = (unit: UnitState): string => {
  const def = UNIT_DEFINITIONS[unit.type];
  const traits: string[] = [];

  traits.push(def.canCapture ? '占領可能' : '占領不可');
  traits.push(def.attackRangeMax > 1 ? `間接(${def.attackRangeMin}-${def.attackRangeMax})` : '直接');
  traits.push(`移動:${def.movementType}`);

  return traits.join(' / ');
};

const buildTileTooltip = (
  terrainType: TerrainType | string,
  unit: UnitState | undefined,
  coord: Coord,
  capturePoints?: number,
): string => {
  const terrain = getTerrainTraits(terrainType);
  const lines = [
    `座標: ${coord.x},${coord.y}`,
    `地形: ${getTerrainLabel(terrainType)}`,
    `防御: ${terrain.defense}`,
    `補給: ${terrain.supply}`,
    `移動ボーナス: ${terrain.mobility}`,
  ];

  if (isCapturableProperty(terrainType)) {
    lines.push(`拠点耐久: ${capturePoints ?? 20}/20`);
  }

  if (unit) {
    lines.push('');
    lines.push(`ユニット: ${getUnitTypeLabel(unit.type)}`);
    lines.push(`ID: ${unit.id}`);
    lines.push(`HP: ${unit.hp}`);
    lines.push(`特性: ${getUnitTraitsText(unit)}`);
  }

  return lines.join('\n');
};

const UnitIcon: React.FC<{ unit: UnitState; currentPlayerId: 'P1' | 'P2' }> = ({ unit, currentPlayerId }) => {
  const isFriendly = unit.owner === currentPlayerId;
  const ring = isFriendly ? '#16a34a' : '#dc2626';
  const fill = isFriendly ? '#1e40af' : '#9f1239';
  const paths = UNIT_GLYPH_PATHS[unit.type] ?? UNIT_GLYPH_PATHS.INFANTRY;

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" data-testid={`unit-icon-${unit.type}`}>
      <defs>
        <radialGradient id={`unit-core-${unit.id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={fill} stroke={ring} strokeWidth="2.5" />
      <circle cx="12" cy="12" r="9" fill={`url(#unit-core-${unit.id})`} />
      {paths.map((d, idx) => (
        <path
          key={`${unit.type}-${idx}`}
          d={d}
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth="0.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  selectedUnitId,
  selectedTile,
  previewPath,
  moveRangeTiles,
  attackRangeTiles,
  onSelectUnit,
  onSelectTile,
}) => {
  const visibleEnemyCoordKeys = useMemo(
    () => getVisibleEnemyCoordKeys(gameState, gameState.currentPlayerId),
    [gameState],
  );

  const visibleTileCoordKeys = useMemo(
    () => getVisibleTileCoordKeys(gameState, gameState.currentPlayerId),
    [gameState],
  );

  const unitByCoordKey = useMemo(() => {
    const entries = Object.values(gameState.units)
      .filter((unit) => unit.hp > 0)
      .filter((unit) => {
        if (!gameState.fogOfWar) return true;
        if (unit.owner === gameState.currentPlayerId) return true;
        return visibleEnemyCoordKeys.has(toCoordKey(unit.position));
      })
      .map((unit) => [toCoordKey(unit.position), unit] as const);
    return new Map(entries);
  }, [gameState.currentPlayerId, gameState.fogOfWar, gameState.units, visibleEnemyCoordKeys]);

  const selectedUnit = selectedUnitId ? gameState.units[selectedUnitId] ?? null : null;
  const previewKeys = new Set(previewPath.map((coord) => toCoordKey(coord)));
  const moveKeys = new Set(moveRangeTiles.map((coord) => toCoordKey(coord)));
  const attackKeys = new Set(attackRangeTiles.map((coord) => toCoordKey(coord)));

  const rows: number[] = [];
  for (let y = 0; y < gameState.map.height; y += 1) rows.push(y);

  const cols: number[] = [];
  for (let x = 0; x < gameState.map.width; x += 1) cols.push(x);

  const handleTileClick = (coord: Coord): void => {
    const unit = unitByCoordKey.get(toCoordKey(coord));
    if (unit) {
      onSelectUnit(selectedUnitId === unit.id ? null : unit.id);
      return;
    }
    onSelectTile(coord);
  };

  return (
    <section aria-label="ゲーム盤面">
      <p style={{ margin: '0 0 6px', color: '#334155', fontSize: 12, fontWeight: 700 }}>盤面</p>
      <div style={{ display: 'inline-block', border: '1px solid #64748b', padding: 6, background: '#f8fafc' }}>
        {rows.map((y) => (
          <div key={`row-${y}`} style={{ display: 'flex' }}>
            {cols.map((x) => {
              const coord = { x, y };
              const key = toCoordKey(coord);
              const tile = gameState.map.tiles[key];
              const unit = unitByCoordKey.get(key);
              const terrainType = tile?.terrainType ?? 'PLAIN';
              const terrainVisual = getTerrainVisual(terrainType);

              const isVisible = !gameState.fogOfWar || visibleTileCoordKeys.has(key);
              const isSelectedTile = selectedTile?.x === x && selectedTile.y === y;
              const isSelectedUnit = selectedUnit?.position.x === x && selectedUnit.position.y === y;
              const isPreview = previewKeys.has(key);
              const isMoveReachable = moveKeys.has(key);
              const isAttackRange = attackKeys.has(key);

              const isClickable = Boolean(unit) || (!selectedUnit ? false : isMoveReachable);

              const propertyVisual = isVisible && isOwnerVisibleProperty(tile?.terrainType)
                ? getPropertyOwnerVisual(tile?.owner)
                : null;

              const overlayColor = isSelectedUnit
                ? 'rgba(110,231,183,0.58)'
                : isSelectedTile
                  ? 'rgba(253,230,138,0.62)'
                  : isPreview
                    ? 'rgba(147,197,253,0.5)'
                    : isMoveReachable
                      ? 'rgba(191,219,254,0.42)'
                      : isAttackRange
                        ? 'rgba(252,165,165,0.5)'
                        : 'rgba(255,255,255,0.06)';              const ownerBadge = unit
                ? unit.owner === gameState.currentPlayerId
                  ? '味'
                  : '敵'
                : null;
              const unitHpLabel = isVisible && unit ? 'HP ' + unit.hp : null;
              const propertyDurabilityLabel =
                isVisible && isCapturableProperty(tile?.terrainType)
                  ? '耐久 ' + (tile?.capturePoints ?? 20)
                  : null;

              const routeOutline = isSelectedTile
                ? 'inset 0 0 0 3px #d97706'
                : isPreview
                  ? 'inset 0 0 0 3px #1d4ed8'
                  : isMoveReachable
                    ? 'inset 0 0 0 2px #2563eb'
                    : undefined;

              const tooltipText = buildTileTooltip(terrainType, isVisible ? unit : undefined, coord, tile?.capturePoints);

              return (
                <button
                  key={key}
                  type="button"
                  title={tooltipText}
                  onClick={() => handleTileClick(coord)}
                  style={{
                    ...tileStyle,
                    backgroundColor: terrainVisual.bg,
                    backgroundImage: `linear-gradient(${overlayColor}, ${overlayColor}), url(${TERRAIN_TEXTURES[(terrainType as TerrainType)] ?? TERRAIN_TEXTURES.PLAIN})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderColor: propertyVisual ? propertyVisual.color : '#64748b',
                    borderWidth: propertyVisual ? 3 : 1,
                    borderStyle: isMoveReachable && !isPreview && !isSelectedTile ? 'dashed' : 'solid',
                    boxShadow: routeOutline,
                    cursor: isClickable ? 'pointer' : 'not-allowed',
                    flexDirection: 'column',
                    gap: 3,
                    position: 'relative',
                    color: terrainVisual.fg,
                    fontWeight: 700,
                    filter: isVisible ? 'none' : 'brightness(0.7) saturate(0.7)',
                  }}
                  disabled={!isClickable}
                  data-attack-range={isAttackRange ? 'true' : 'false'}
                  data-move-reachable={isMoveReachable ? 'true' : 'false'}
                  data-property-owner={propertyVisual ? propertyVisual.tag : 'NONE'}
                  data-fog-hidden={isVisible ? 'false' : 'true'}
                  data-unit-hp={unitHpLabel ?? 'NONE'}
                  data-property-durability={propertyDurabilityLabel ?? 'NONE'}
                  aria-label={'タイル ' + x + ',' + y}
                >
                  {isVisible && unit ? <UnitIcon unit={unit} currentPlayerId={gameState.currentPlayerId} /> : null}
                  <span style={{ textShadow: '0 0 1px #fff' }}>
                    {terrainVisual.short}
                    {isVisible && propertyVisual ? `(${propertyVisual.tag})` : ''}
                  </span>
                  {unitHpLabel ? (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        minWidth: 34,
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 4px',
                        borderRadius: 3,
                        background: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid #334155',
                      }}
                    >
                      {unitHpLabel}
                    </span>
                  ) : null}
                  {propertyDurabilityLabel ? (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        minWidth: 44,
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 4px',
                        borderRadius: 3,
                        background: '#f8fafc',
                        color: '#1f2937',
                        border: '1px solid #94a3b8',
                      }}
                    >
                      {propertyDurabilityLabel}
                    </span>
                  ) : null}
                  {ownerBadge && isVisible ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '1px 3px',
                        borderRadius: 3,
                        background: ownerBadge === '味' ? '#dcfce7' : '#fee2e2',
                        color: ownerBadge === '味' ? '#166534' : '#991b1b',
                        border: `1px solid ${ownerBadge === '味' ? '#16a34a' : '#ef4444'}`,
                      }}
                    >
                      {ownerBadge}
                    </span>
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
























