import React, { useMemo, useState } from 'react';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { getVisibleEnemyCoordKeys, getVisibleTileCoordKeys } from '@core/rules/visibility';
import { getCaptureTarget } from '@core/rules/capture';
import { getFacilityHp, isBombardableTerrain, isOperationalFacility } from '@core/rules/facilities';
import type { TerrainType } from '@core/types/map';
import type { Coord } from '@core/types/game';
import type { GameState } from '@core/types/state';
import type { UnitState } from '@core/types/unit';
import { toCoordKey } from '@/utils/coord';
import { TERRAIN_TEXTURES, UNIT_GLYPH_PATHS, UNIT_ICON_EXTERNAL_PATHS } from './boardArt';
import { BOARD_VISUAL_TOKENS } from './boardVisualTokens';

type GameCanvasProps = {
  gameState: GameState;
  selectedUnitId: string | null;
  selectedTile: Coord | null;
  previewPath: Coord[];
  moveRangeTiles: Coord[];
  attackRangeTiles: Coord[];
  supplyRangeTiles?: Coord[];
  highlightedTargetUnitId?: string | null;
  zoom?: number;
  onSelectUnit: (unitId: string | null) => void;
  onSelectTile: (coord: Coord) => void;
};

const BASE_TILE_WIDTH = 112;
const BASE_TILE_HEIGHT = 96;

const getPropertyOwnerVisual = (owner?: 'P1' | 'P2'): { tag: string; color: string } => {
  if (owner === 'P1') return { tag: 'P1', color: BOARD_VISUAL_TOKENS.friendlyProperty.borderColor };
  if (owner === 'P2') return { tag: 'P2', color: BOARD_VISUAL_TOKENS.enemyProperty.borderColor };
  return { tag: '中立', color: '#6b7280' };
};

const isOwnerVisibleProperty = (terrainType?: TerrainType): boolean =>
  terrainType === 'FACTORY' || terrainType === 'HQ' || terrainType === 'CITY' || terrainType === 'AIRPORT' || terrainType === 'PORT';

const isCapturableProperty = (terrainType?: TerrainType | string): boolean =>
  terrainType === 'FACTORY' || terrainType === 'HQ' || terrainType === 'CITY' || terrainType === 'AIRPORT' || terrainType === 'PORT';

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
    case 'AIRPORT':
      return {
        defense: '標準',
        supply: '航空補給あり',
        mobility: '航空運用拠点',
      };
    case 'PORT':
      return {
        defense: '標準',
        supply: '海上補給あり',
        mobility: '海上運用拠点',
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
  structureHp?: number,
  operational = true,
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
    const captureTarget = getCaptureTarget(terrainType as TerrainType);
    lines.push(`拠点耐久: ${capturePoints ?? captureTarget}/${captureTarget}`);
  }

  if (isBombardableTerrain(terrainType as TerrainType)) {
    const facilityHp = structureHp ?? getCaptureTarget(terrainType as TerrainType);
    lines.push(`施設状態: ${operational ? '稼働中' : '機能停止'}`);
    lines.push(`施設HP: ${facilityHp}`);
  }

  if (unit) {
    lines.push('');
    lines.push(`ユニット: ${UNIT_DEFINITIONS[unit.type].label}`);
    lines.push(`ID: ${unit.id}`);
    lines.push(`HP: ${unit.hp}`);
    lines.push(`特性: ${getUnitTraitsText(unit)}`);
  }

  return lines.join('\n');
};

const failedExternalUnitIcons = new Map<string, number>();

const UnitIcon: React.FC<{ unit: UnitState; viewerPlayerId: 'P1' | 'P2'; size: number }> = ({ unit, viewerPlayerId, size }) => {
  const isFriendly = unit.owner === viewerPlayerId;
  const ring = isFriendly ? BOARD_VISUAL_TOKENS.friendlyUnit.borderColor : BOARD_VISUAL_TOKENS.enemyUnit.borderColor;
  const fill = isFriendly ? '#1e40af' : '#9f1239';
  const paths = UNIT_GLYPH_PATHS[unit.type] ?? UNIT_GLYPH_PATHS.INFANTRY;
  const externalIconPaths = UNIT_ICON_EXTERNAL_PATHS[unit.type];
  const [externalIconIndex, setExternalIconIndex] = useState<number>(() => failedExternalUnitIcons.get(unit.type) ?? 0);
  const externalIconPath = externalIconPaths[externalIconIndex];
  const externalFailed = externalIconIndex >= externalIconPaths.length;

  const fallbackSvg = (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" data-testid={`unit-icon-${unit.type}`}>
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
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );

  if (externalFailed) return fallbackSvg;

  return (
    <div
      aria-hidden="true"
      data-testid={`unit-icon-${unit.type}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2.5px solid ${ring}`,
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 62%), ${fill}`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      <img
        src={externalIconPath}
        alt=""
        draggable={false}
        onError={() => {
          const nextIndex = externalIconIndex + 1;
          failedExternalUnitIcons.set(unit.type, nextIndex);
          setExternalIconIndex(nextIndex);
        }}
        style={{
          width: `${Math.max(60, Math.round(size * 0.9))}%`,
          height: `${Math.max(60, Math.round(size * 0.9))}%`,
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
};

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  selectedUnitId,
  selectedTile,
  previewPath,
  moveRangeTiles,
  attackRangeTiles,
  supplyRangeTiles = [],
  highlightedTargetUnitId,
  zoom = 1,
  onSelectUnit,
  onSelectTile,
}) => {
  const viewerPlayerId = gameState.humanPlayerSide ?? gameState.currentPlayerId;
  const tileWidth = Math.round(BASE_TILE_WIDTH * zoom);
  const tileHeight = Math.round(BASE_TILE_HEIGHT * zoom);
  const tileFontSize = Math.max(10, Math.round(12 * zoom));
  const badgeFontSize = Math.max(9, Math.round(10 * zoom));
  const unitBadgeInset = Math.max(3, Math.round(4 * zoom));
  const hpMinWidth = Math.max(30, Math.round(34 * zoom));
  const propertyMinWidth = Math.max(40, Math.round(44 * zoom));
  const previewMarkerSize = Math.max(10, Math.round(12 * zoom));
  const previewMarkerBorderWidth = Math.max(1, Math.round(2 * zoom));
  const unitIconSize = Math.max(30, Math.round(42 * zoom));
  const unitIconTopInset = Math.max(1, Math.round(2 * zoom));
  const terrainLabelTopInset = Math.max(40, Math.round(46 * zoom));

  const tileStyle: React.CSSProperties = {
    width: tileWidth,
    height: tileHeight,
    border: '1px solid #cbd5e1',
    fontSize: tileFontSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const visibleEnemyCoordKeys = useMemo(
    () => getVisibleEnemyCoordKeys(gameState, viewerPlayerId),
    [gameState, viewerPlayerId],
  );

  const visibleTileCoordKeys = useMemo(
    () => getVisibleTileCoordKeys(gameState, viewerPlayerId),
    [gameState, viewerPlayerId],
  );

  const unitByCoordKey = useMemo(() => {
    const entries = Object.values(gameState.units)
      .filter((unit) => unit.hp > 0)
      .filter((unit) => {
        if (unit.owner === viewerPlayerId) return true;
        return visibleEnemyCoordKeys.has(toCoordKey(unit.position));
      })
      .map((unit) => [toCoordKey(unit.position), unit] as const);
    return new Map(entries);
  }, [gameState.fogOfWar, gameState.units, viewerPlayerId, visibleEnemyCoordKeys]);

  const selectedUnit = selectedUnitId ? gameState.units[selectedUnitId] ?? null : null;
  const previewKeys = new Set(previewPath.map((coord) => toCoordKey(coord)));
  const moveKeys = new Set(moveRangeTiles.map((coord) => toCoordKey(coord)));
  const attackKeys = new Set(attackRangeTiles.map((coord) => toCoordKey(coord)));
  const supplyKeys = new Set(supplyRangeTiles.map((coord) => toCoordKey(coord)));

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
      <div
        data-testid="game-board-grid"
        data-board-zoom={zoom.toFixed(2)}
        style={{ display: 'inline-block', border: '1px solid #64748b', padding: 6, background: '#f8fafc' }}
      >
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
              const isAttackTarget = Boolean(unit && highlightedTargetUnitId === unit.id);

              const isClickable = Boolean(unit) || (!selectedUnit ? false : (isMoveReachable || isAttackRange || isSelectedTile));

              const propertyVisual = isVisible && isOwnerVisibleProperty(tile?.terrainType)
                ? getPropertyOwnerVisual(tile?.owner)
                : null;

              const overlayColor = isSelectedUnit
                ? BOARD_VISUAL_TOKENS.selectedUnit.overlay
                : isSelectedTile
                  ? BOARD_VISUAL_TOKENS.selectedTile.overlay
                  : isAttackTarget
                    ? BOARD_VISUAL_TOKENS.attackTarget.overlay
                    : isPreview
                      ? BOARD_VISUAL_TOKENS.previewPath.overlay
                      : isMoveReachable
                        ? BOARD_VISUAL_TOKENS.moveReachable.overlay
                        : isAttackRange
                          ? BOARD_VISUAL_TOKENS.attackRange.overlay
                          : 'rgba(255,255,255,0.06)';
              const ownerBadge = unit
                ? unit.owner === viewerPlayerId
                  ? '味'
                  : '敵'
                : null;
              const unitHpLabel = isVisible && unit ? 'HP ' + unit.hp : null;
              const propertyDurabilityLabel =
                isVisible && isCapturableProperty(tile?.terrainType)
                  ? '耐久 ' + (tile?.capturePoints ?? getCaptureTarget(tile?.terrainType ?? 'CITY'))
                  : null;
              const facilityStatusLabel =
                isVisible && tile && isBombardableTerrain(tile.terrainType) && !isOperationalFacility(tile)
                  ? '停止'
                  : null;

              const routeOutline = isSelectedUnit
                ? BOARD_VISUAL_TOKENS.selectedUnit.outline
                : isSelectedTile
                  ? BOARD_VISUAL_TOKENS.selectedTile.outline
                  : isAttackTarget
                    ? BOARD_VISUAL_TOKENS.attackTarget.outline
                    : isPreview
                      ? BOARD_VISUAL_TOKENS.previewPath.outline
                      : isMoveReachable
                        ? BOARD_VISUAL_TOKENS.moveReachable.outline
                        : undefined;

              const isSupplyRange = supplyKeys.has(key);
              const tooltipText = buildTileTooltip(
                terrainType,
                isVisible ? unit : undefined,
                coord,
                tile?.capturePoints,
                getFacilityHp(tile),
                isOperationalFacility(tile),
              );
              const ownerBadgeToken = ownerBadge === '味'
                ? BOARD_VISUAL_TOKENS.friendlyUnit
                : BOARD_VISUAL_TOKENS.enemyUnit;

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
                    borderStyle: isMoveReachable && !isPreview && !isSelectedTile ? BOARD_VISUAL_TOKENS.moveReachable.borderStyle : 'solid',
                    boxShadow: isSupplyRange && !routeOutline ? '0 0 0 2px rgba(22,163,74,0.45)' : routeOutline,
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
                  data-attack-target={isAttackTarget ? 'true' : 'false'}
                  data-move-reachable={isMoveReachable ? 'true' : 'false'}
                  data-preview-path={isPreview ? 'true' : 'false'}
                  data-supply-range={isSupplyRange ? 'true' : 'false'}
                  data-property-owner={propertyVisual ? propertyVisual.tag : 'NONE'}
                  data-fog-hidden={isVisible ? 'false' : 'true'}
                  data-unit-hp={unitHpLabel ?? 'NONE'}
                  data-property-durability={propertyDurabilityLabel ?? 'NONE'}
                  aria-label={'タイル ' + x + ',' + y}
                >
                  {isVisible && unit ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: unitIconTopInset,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <UnitIcon unit={unit} viewerPlayerId={viewerPlayerId} size={unitIconSize} />
                    </span>
                  ) : null}
                  <span
                    style={{
                      position: 'absolute',
                      top: terrainLabelTopInset,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '1px 4px',
                      borderRadius: 4,
                      background: 'rgba(248,250,252,0.78)',
                      border: '1px solid rgba(15,23,42,0.35)',
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                      textShadow:
                        '-1px 0 rgba(248,250,252,0.9), 0 1px rgba(248,250,252,0.9), 1px 0 rgba(248,250,252,0.9), 0 -1px rgba(248,250,252,0.9)',
                    }}
                  >
                    {terrainVisual.short}
                    {isVisible && propertyVisual ? `(${propertyVisual.tag})` : ''}
                  </span>
                  {isPreview ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: previewMarkerSize,
                        height: previewMarkerSize,
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: BOARD_VISUAL_TOKENS.previewPath.markerBg,
                        border: `${previewMarkerBorderWidth}px solid ${BOARD_VISUAL_TOKENS.previewPath.markerBorder}`,
                        boxShadow: '0 0 0 1px rgba(15,23,42,0.18)',
                      }}
                    />
                  ) : null}
                  {unitHpLabel ? (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: unitBadgeInset,
                        right: unitBadgeInset,
                        minWidth: hpMinWidth,
                        textAlign: 'center',
                        fontSize: badgeFontSize,
                        fontWeight: 800,
                        padding: `${Math.max(1, Math.round(zoom))}px ${Math.max(3, Math.round(4 * zoom))}px`,
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
                        bottom: unitBadgeInset,
                        left: unitBadgeInset,
                        minWidth: propertyMinWidth,
                        textAlign: 'center',
                        fontSize: badgeFontSize,
                        fontWeight: 800,
                        padding: `${Math.max(1, Math.round(zoom))}px ${Math.max(3, Math.round(4 * zoom))}px`,
                        borderRadius: 3,
                        background: '#f8fafc',
                        color: '#1f2937',
                        border: '1px solid #94a3b8',
                      }}
                    >
                      {propertyDurabilityLabel}
                    </span>
                  ) : null}
                  {isAttackTarget ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: Math.max(3, Math.round(3 * zoom)),
                        left: Math.max(3, Math.round(3 * zoom)),
                        fontSize: badgeFontSize,
                        fontWeight: 800,
                        padding: `${Math.max(1, Math.round(zoom))}px ${Math.max(2, Math.round(3 * zoom))}px`,
                        borderRadius: 3,
                        background: BOARD_VISUAL_TOKENS.attackTarget.badgeBg,
                        color: BOARD_VISUAL_TOKENS.attackTarget.badgeColor,
                        border: `1px solid ${BOARD_VISUAL_TOKENS.attackTarget.borderColor}`,
                      }}
                    >
                      標的
                    </span>
                  ) : null}
                  {facilityStatusLabel ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: Math.max(3, Math.round(3 * zoom)),
                        left: Math.max(3, Math.round(3 * zoom)),
                        fontSize: badgeFontSize,
                        fontWeight: 800,
                        padding: `${Math.max(1, Math.round(zoom))}px ${Math.max(2, Math.round(3 * zoom))}px`,
                        borderRadius: 3,
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #ef4444',
                      }}
                    >
                      {facilityStatusLabel}
                    </span>
                  ) : null}
                  {ownerBadge && isVisible ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: Math.max(3, Math.round(3 * zoom)),
                        right: Math.max(3, Math.round(3 * zoom)),
                        fontSize: badgeFontSize,
                        fontWeight: 800,
                        padding: `${Math.max(1, Math.round(zoom))}px ${Math.max(2, Math.round(3 * zoom))}px`,
                        borderRadius: 3,
                        background: ownerBadgeToken.badgeBg,
                        color: ownerBadgeToken.badgeColor,
                        border: `1px solid ${ownerBadgeToken.borderColor}`,
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
