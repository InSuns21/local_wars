import type { ResolvedAiProfile } from '@/app/types';
import { toCoordKey, manhattanDistance } from '@/utils/coord';
import { applyCommand, type CommandDeps } from '@core/engine/commandApplier';
import { applyNightmareWeightMultipliers, type AiProfileWeights } from '@core/engine/aiNightmareTuning';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import { canUnitProduceAtTile } from '@core/rules/facilities';
import { getReachableTiles, findMovePath } from '@core/rules/movement';
import { getTerrainDefenseModifier } from '@core/rules/terrainDefense';
import { getVisibleEnemyUnitIds, getVisibleTileCoordKeys } from '@core/rules/visibility';
import { canDealDamage, forecastCombat } from '@core/rules/combat';
import type { Coord, PlayerId } from '@core/types/game';
import type { EnemyMemoryEntry, GameState } from '@core/types/state';
import type { AiTurnResult, AiTurnSummaryItem, VisibleAiPlaybackEvent } from '@core/types/aiPlayback';
import type { UnitState, UnitType } from '@core/types/unit';

export type AiDifficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

const isAdvancedAiDifficulty = (difficulty: AiDifficulty): boolean => difficulty === 'hard' || difficulty === 'nightmare';
const isNightmareAiDifficulty = (difficulty: AiDifficulty): boolean => difficulty === 'nightmare';

export type AiTurnOptions = {
  difficulty: AiDifficulty;
  deps: CommandDeps;
};

type AttackCandidate = {
  target: UnitState;
  score: number;
};

type MoveCandidate = {
  to: Coord;
  path: Coord[];
  score: number;
};

type ThreatEstimate = {
  attackers: number;
  lethalThreats: number;
  incomingMax: number;
};

type AdaptiveBattleSignals = {
  hqThreat: boolean;
  mainForceLoss: boolean;
  facilityDeficit: boolean;
  droneEscalation: boolean;
  airShift: boolean;
  navalShift: boolean;
};

type StrategicEnemyContact = {
  position: Coord;
  type: UnitType;
  confidence: number;
};

type AiOperationalPlan = {
  primaryObjective: 'capture' | 'hq_push' | 'regroup' | 'defend_hq';
  targetCoord: Coord | null;
  stagingCoord: Coord | null;
  supplyAnchorCoord: Coord | null;
  lowSupplyUnitCount: number;
  frontlineUnitCount: number;
  canPressureHqSoon: boolean;
  desiredCapturerCount: number;
  desiredFrontlineCount: number;
  desiredSupportCount: number;
};

const CAPTURABLE_TERRAINS = new Set(['CITY', 'FACTORY', 'HQ', 'AIRPORT', 'PORT']);
const INDIRECT_SUPPORT_UNITS = new Set<UnitType>(['ARTILLERY', 'FLAK_TANK', 'MISSILE_AA']);
const NAVAL_COMBAT_TYPES = new Set<UnitType>(['DESTROYER', 'SUBMARINE', 'BATTLESHIP', 'CARRIER']);
const LIGHT_TRANSPORTABLE_TYPES = new Set<UnitType>(['INFANTRY', 'RECON', 'ANTI_TANK', 'ARTILLERY', 'ANTI_AIR', 'SUPPLY_TRUCK', 'FLAK_TANK', 'MISSILE_AA']);
const HIGH_VALUE_TYPES = new Set<UnitType>(['HEAVY_TANK', 'BATTLESHIP', 'CARRIER', 'STEALTH_BOMBER', 'BOMBER', 'MISSILE_AA']);
const FRONTLINE_TYPES = new Set<UnitType>(['TANK', 'HEAVY_TANK', 'ANTI_TANK', 'ANTI_AIR', 'DESTROYER']);
const SCOUT_TYPES = new Set<UnitType>(['RECON']);
const INFANTRY_TYPES = new Set<UnitType>(['INFANTRY', 'AIR_DEFENSE_INFANTRY']);
const ARMOR_TYPES = new Set<UnitType>(['TANK', 'HEAVY_TANK', 'ANTI_TANK', 'ANTI_AIR', 'FLAK_TANK', 'MISSILE_AA', 'COUNTER_DRONE_AA']);
const NAVAL_SUPPORT_TYPES = new Set<UnitType>(['SUPPLY_SHIP', 'LANDER']);
const DRONE_STRIKE_TARGETS = new Set<UnitType>(['ARTILLERY', 'MISSILE_AA', 'FLAK_TANK', 'COUNTER_DRONE_AA', 'FIGHTER', 'BOMBER', 'ATTACKER', 'STEALTH_BOMBER', 'CARRIER', 'BATTLESHIP']);
const DRONE_COUNTER_TYPES = new Set<UnitType>(['COUNTER_DRONE_AA', 'ANTI_AIR', 'FLAK_TANK', 'MISSILE_AA', 'FIGHTER']);
const SUBMARINE_COUNTER_TYPES = new Set<UnitType>(['DESTROYER', 'CARRIER', 'ATTACKER', 'BATTLESHIP']);
const STEALTH_COUNTER_TYPES = new Set<UnitType>(['FIGHTER', 'ANTI_AIR', 'FLAK_TANK', 'MISSILE_AA', 'COUNTER_DRONE_AA']);
const MEMORY_MIN_CONFIDENCE = 0.2;
const MEMORY_STRATEGIC_CONFIDENCE = 0.35;
const MEMORY_DECAY_PER_TURN = 0.2;
const HQ_THREAT_DISTANCE = 3;
const AI_PROFILES: Record<ResolvedAiProfile, AiProfileWeights> = {
  balanced: { captureBias: 1, killBias: 1, safetyBias: 1, hqPressureBias: 1, artilleryBias: 1, antiAirBias: 1, droneBias: 1, stealthBias: 1, navalBias: 1, supplyBias: 1, scoutBias: 1 },
  captain: { captureBias: 1.45, killBias: 0.95, safetyBias: 1.05, hqPressureBias: 1.2, artilleryBias: 0.9, antiAirBias: 1, droneBias: 0.9, stealthBias: 0.9, navalBias: 1, supplyBias: 1.1, scoutBias: 1.1 },
  hunter: { captureBias: 0.75, killBias: 1.4, safetyBias: 0.95, hqPressureBias: 1.05, artilleryBias: 1.05, antiAirBias: 1, droneBias: 1.1, stealthBias: 1.05, navalBias: 1, supplyBias: 0.9, scoutBias: 0.95 },
  turtle: { captureBias: 0.8, killBias: 0.95, safetyBias: 1.35, hqPressureBias: 0.75, artilleryBias: 1.05, antiAirBias: 1.2, droneBias: 0.85, stealthBias: 0.85, navalBias: 0.95, supplyBias: 1.2, scoutBias: 0.85 },
  sieger: { captureBias: 0.95, killBias: 1.05, safetyBias: 1.15, hqPressureBias: 0.95, artilleryBias: 1.45, antiAirBias: 1.1, droneBias: 0.85, stealthBias: 0.85, navalBias: 0.9, supplyBias: 1.05, scoutBias: 0.85 },
  drone_swarm: { captureBias: 0.95, killBias: 1.15, safetyBias: 0.9, hqPressureBias: 1, artilleryBias: 0.9, antiAirBias: 1.05, droneBias: 1.6, stealthBias: 0.8, navalBias: 0.9, supplyBias: 0.9, scoutBias: 1 },
  stealth_strike: { captureBias: 0.85, killBias: 1.25, safetyBias: 1.1, hqPressureBias: 0.95, artilleryBias: 0.95, antiAirBias: 1, droneBias: 0.9, stealthBias: 1.6, navalBias: 1.25, supplyBias: 1.2, scoutBias: 1.05 },
};

const getProfileWeights = (profile: ResolvedAiProfile, difficulty: AiDifficulty): AiProfileWeights =>
  applyNightmareWeightMultipliers(AI_PROFILES[profile], profile, difficulty);

const getEnemyPlayer = (playerId: PlayerId): PlayerId => (playerId === 'P1' ? 'P2' : 'P1');

const getAliveUnits = (state: GameState, owner: PlayerId): UnitState[] =>
  Object.values(state.units).filter((u) => u.owner === owner && u.hp > 0);

const getVisibleEnemyUnits = (state: GameState, viewer: PlayerId): UnitState[] => {
  const enemies = getAliveUnits(state, getEnemyPlayer(viewer));
  if (!(state.fogOfWar ?? false)) {
    return enemies;
  }

  const visibleEnemyIds = getVisibleEnemyUnitIds(state, viewer);
  return enemies.filter((unit) => visibleEnemyIds.has(unit.id));
};

const getRememberedEnemyEntries = (
  state: GameState,
  viewer: PlayerId,
  minConfidence = MEMORY_MIN_CONFIDENCE,
): EnemyMemoryEntry[] => {
  if (!(state.fogOfWar ?? false)) {
    return [];
  }

  const visibleEnemyIds = getVisibleEnemyUnitIds(state, viewer);
  return Object.values(state.enemyMemory ?? {}).filter((entry) =>
    entry.confidence >= minConfidence && !visibleEnemyIds.has(entry.unitId),
  );
};

const refreshEnemyMemory = (state: GameState, viewer: PlayerId): GameState => {
  if (!(state.fogOfWar ?? false)) {
    if (!state.enemyMemory || Object.keys(state.enemyMemory).length === 0) {
      return state;
    }
    return {
      ...state,
      enemyMemory: {},
    };
  }

  const enemyPlayer = getEnemyPlayer(viewer);
  const aliveEnemyIds = new Set(getAliveUnits(state, enemyPlayer).map((unit) => unit.id));
  const nextMemory: Record<string, EnemyMemoryEntry> = {};

  for (const [unitId, entry] of Object.entries(state.enemyMemory ?? {})) {
    if (!aliveEnemyIds.has(unitId)) {
      continue;
    }

    const age = Math.max(0, state.turn - entry.lastSeenTurn);
    const confidence = Math.max(0, Math.min(1, 1 - age * MEMORY_DECAY_PER_TURN));
    if (confidence < MEMORY_MIN_CONFIDENCE) {
      continue;
    }

    nextMemory[unitId] = {
      ...entry,
      confidence,
    };
  }

  for (const unit of getVisibleEnemyUnits(state, viewer)) {
    nextMemory[unit.id] = {
      unitId: unit.id,
      position: { ...unit.position },
      lastSeenTurn: state.turn,
      type: unit.type,
      hpEstimate: unit.hp,
      confidence: 1,
    };
  }

  return {
    ...state,
    enemyMemory: nextMemory,
  };
};

const getKnownEnemyUnits = (state: GameState, viewer: PlayerId): UnitState[] =>
  getVisibleEnemyUnits(state, viewer);

const getEstimatedEnemyContacts = (state: GameState, viewer: PlayerId): StrategicEnemyContact[] => {
  const contacts: StrategicEnemyContact[] = getKnownEnemyUnits(state, viewer).map((unit) => ({
    position: unit.position,
    type: unit.type,
    confidence: 1,
  }));

  for (const entry of getRememberedEnemyEntries(state, viewer, MEMORY_STRATEGIC_CONFIDENCE)) {
    contacts.push({
      position: entry.position,
      type: entry.type,
      confidence: entry.confidence,
    });
  }

  return contacts;
};

const emptyUnitCountMap = (): Record<UnitType, number> => ({
  INFANTRY: 0,
  RECON: 0,
  TANK: 0,
  HEAVY_TANK: 0,
  ANTI_TANK: 0,
  ARTILLERY: 0,
  ANTI_AIR: 0,
  FLAK_TANK: 0,
  MISSILE_AA: 0,
  SUPPLY_TRUCK: 0,
  TRANSPORT_TRUCK: 0,
  AIR_DEFENSE_INFANTRY: 0,
  COUNTER_DRONE_AA: 0,
  SUICIDE_DRONE: 0,
  FIGHTER: 0,
  BOMBER: 0,
  ATTACKER: 0,
  STEALTH_BOMBER: 0,
  AIR_TANKER: 0,
  TRANSPORT_HELI: 0,
  CARRIER: 0,
  SUBMARINE: 0,
  BATTLESHIP: 0,
  SUPPLY_SHIP: 0,
  DESTROYER: 0,
  LANDER: 0,
});

const countUnitsByType = (units: Array<Pick<UnitState, 'type'>>): Record<UnitType, number> => {
  const counts = emptyUnitCountMap();
  for (const unit of units) {
    counts[unit.type] += 1;
  }
  return counts;
};

const getEstimatedEnemyCounts = (state: GameState, viewer: PlayerId): Record<UnitType, number> => {
  const counts = countUnitsByType(getKnownEnemyUnits(state, viewer));
  for (const entry of getRememberedEnemyEntries(state, viewer, MEMORY_STRATEGIC_CONFIDENCE)) {
    counts[entry.type] += 1;
  }
  return counts;
};

const isTileOccupied = (state: GameState, coord: Coord): boolean =>
  Object.values(state.units).some((u) => u.hp > 0 && u.position.x === coord.x && u.position.y === coord.y);

const isFriendlyResupplyTile = (state: GameState, unit: UnitState, coord: Coord): boolean => {
  const tile = state.map.tiles[toCoordKey(coord)];
  if (!tile || tile.owner !== unit.owner) return false;
  const movementType = UNIT_DEFINITIONS[unit.type].movementType;
  if (movementType === 'AIR') return tile.terrainType === 'AIRPORT';
  if (movementType === 'NAVAL') return tile.terrainType === 'PORT';
  return tile.terrainType === 'CITY' || tile.terrainType === 'FACTORY' || tile.terrainType === 'HQ';
};

const isLowOnSupply = (state: GameState, unit: UnitState): boolean => {
  const def = UNIT_DEFINITIONS[unit.type];
  const fuelThreshold = def.movementType === 'AIR' || def.movementType === 'NAVAL' ? 0.4 : 0.25;
  const ammoThreshold = def.maxAmmo > 0 ? Math.max(1, Math.floor(def.maxAmmo * 0.25)) : 0;
  const fuelLow = (state.enableFuelSupply ?? true) && unit.fuel <= Math.ceil(def.maxFuel * fuelThreshold);
  const ammoLow = (state.enableAmmoSupply ?? true) && def.maxAmmo > 0 && unit.ammo <= ammoThreshold;
  return fuelLow || ammoLow;
};

const getEnemyHqCoord = (state: GameState, aiPlayer: PlayerId): Coord | null => {
  const enemy = getEnemyPlayer(aiPlayer);
  const hq = Object.values(state.map.tiles).find((tile) => tile.terrainType === 'HQ' && tile.owner === enemy);
  return hq ? hq.coord : null;
};

const getOwnHqCoord = (state: GameState, aiPlayer: PlayerId): Coord | null => {
  const hq = Object.values(state.map.tiles).find((tile) => tile.terrainType === 'HQ' && tile.owner === aiPlayer);
  return hq ? hq.coord : null;
};

const getPropertyCount = (state: GameState, owner: PlayerId): number =>
  Object.values(state.map.tiles).filter((tile) => CAPTURABLE_TERRAINS.has(tile.terrainType) && tile.owner === owner).length;

const canCaptureNow = (state: GameState, unit: UnitState): boolean => {
  if (!UNIT_DEFINITIONS[unit.type].canCapture) return false;
  const key = toCoordKey(unit.position);
  const tile = state.map.tiles[key];
  if (!tile) return false;
  if (!CAPTURABLE_TERRAINS.has(tile.terrainType)) return false;
  return tile.owner !== unit.owner;
};

const getNearestRemoteCaptureTargetDistance = (state: GameState, aiPlayer: PlayerId): number | null => {
  const capturers = getAliveUnits(state, aiPlayer).filter((unit) => UNIT_DEFINITIONS[unit.type].canCapture);
  if (capturers.length === 0) return null;

  const targets = Object.values(state.map.tiles).filter((tile) => CAPTURABLE_TERRAINS.has(tile.terrainType) && tile.owner !== aiPlayer);
  if (targets.length === 0) return null;

  let best: number | null = null;
  for (const unit of capturers) {
    for (const tile of targets) {
      const turns = Math.ceil(manhattanDistance(unit.position, tile.coord) / Math.max(1, UNIT_DEFINITIONS[unit.type].moveRange));
      if (turns >= 3 && (best === null || turns < best)) {
        best = turns;
      }
    }
  }

  return best;
};

const shouldProduceTransport = (state: GameState, aiPlayer: PlayerId, terrainType: string): UnitType | null => {
  const enemyCounts = getEstimatedEnemyCounts(state, aiPlayer);
  const enemyAirCount = enemyCounts.FIGHTER + enemyCounts.BOMBER + enemyCounts.ATTACKER + enemyCounts.STEALTH_BOMBER + enemyCounts.AIR_TANKER + enemyCounts.TRANSPORT_HELI;
  if (enemyAirCount > 0) return null;

  const remoteTurns = getNearestRemoteCaptureTargetDistance(state, aiPlayer);
  if (remoteTurns === null) return null;

  if (terrainType === 'AIRPORT' && state.players[aiPlayer].funds >= UNIT_DEFINITIONS.TRANSPORT_HELI.cost) {
    return 'TRANSPORT_HELI';
  }

  const hasCargoCandidate = getAliveUnits(state, aiPlayer).some((unit) => LIGHT_TRANSPORTABLE_TYPES.has(unit.type));
  if (terrainType === 'FACTORY' && hasCargoCandidate && state.players[aiPlayer].funds >= UNIT_DEFINITIONS.TRANSPORT_TRUCK.cost) {
    return 'TRANSPORT_TRUCK';
  }

  return null;
};

const getAttackableEnemies = (state: GameState, unit: UnitState): UnitState[] => {
  const def = UNIT_DEFINITIONS[unit.type];
  const enemies = getKnownEnemyUnits(state, unit.owner);
  return enemies.filter((enemy) => {
    const distance = manhattanDistance(unit.position, enemy.position);
    return distance >= def.attackRangeMin && distance <= def.attackRangeMax && canDealDamage(unit.type, enemy.type);
  });
};

const getDefenseModifierAt = (state: GameState, unit: UnitState, coord: Coord): number =>
  getTerrainDefenseModifier(state.map.tiles[toCoordKey(coord)]?.terrainType, unit.type);

const getValidResolvedProfiles = (state: GameState): ResolvedAiProfile[] => {
  const hasAirport = Object.values(state.map.tiles).some((tile) => tile.terrainType === 'AIRPORT');
  const hasPort = Object.values(state.map.tiles).some((tile) => tile.terrainType === 'PORT');

  return (Object.keys(AI_PROFILES) as ResolvedAiProfile[]).filter((profile) => {
    if (profile === 'drone_swarm' && !(state.enableSuicideDrones ?? false)) {
      return false;
    }
    if (profile === 'stealth_strike' && !hasAirport && !hasPort) {
      return false;
    }
    return true;
  });
};

const pickRandomProfile = (profiles: ResolvedAiProfile[], rng: () => number): ResolvedAiProfile =>
  profiles[Math.min(profiles.length - 1, Math.floor(rng() * profiles.length))] ?? 'balanced';

const getAdaptiveBattleSignals = (state: GameState, aiPlayer: PlayerId): AdaptiveBattleSignals => {
  const enemyCounts = getEstimatedEnemyCounts(state, aiPlayer);
  const enemyContacts = getEstimatedEnemyContacts(state, aiPlayer);
  const ownUnits = getAliveUnits(state, aiPlayer);
  const enemyPlayer = getEnemyPlayer(aiPlayer);
  const ownHq = getOwnHqCoord(state, aiPlayer);

  const ownHighValueCount = ownUnits.filter((unit) => HIGH_VALUE_TYPES.has(unit.type)).length;
  const ownFrontlineCount = ownUnits.filter((unit) => FRONTLINE_TYPES.has(unit.type)).length;
  const ownMajorForce = ownHighValueCount + ownFrontlineCount;
  const enemyHighValueCount = Array.from(HIGH_VALUE_TYPES).reduce((sum, type) => sum + enemyCounts[type], 0);
  const enemyFrontlineCount = Array.from(FRONTLINE_TYPES).reduce((sum, type) => sum + enemyCounts[type], 0);
  const ownPropertyCount = getPropertyCount(state, aiPlayer);
  const enemyPropertyCount = getPropertyCount(state, enemyPlayer);
  const enemyAirCount = enemyCounts.FIGHTER + enemyCounts.BOMBER + enemyCounts.ATTACKER + enemyCounts.STEALTH_BOMBER + enemyCounts.AIR_TANKER + enemyCounts.TRANSPORT_HELI;
  const enemyNavalCount = enemyCounts.DESTROYER + enemyCounts.SUBMARINE + enemyCounts.BATTLESHIP + enemyCounts.CARRIER + enemyCounts.SUPPLY_SHIP + enemyCounts.LANDER;
  const ownDronePresence = ownUnits.some((unit) => unit.type === 'SUICIDE_DRONE' || unit.type === 'COUNTER_DRONE_AA');

  const hqThreat = Boolean(
    ownHq && enemyContacts.some((contact) =>
      contact.confidence >= 0.5
      && UNIT_DEFINITIONS[contact.type].canCapture
      && manhattanDistance(contact.position, ownHq) <= HQ_THREAT_DISTANCE,
    ),
  );

  return {
    hqThreat,
    mainForceLoss: (ownHighValueCount === 0 && enemyHighValueCount > 0)
      || (ownMajorForce > 0 && ownMajorForce + 2 <= enemyHighValueCount + enemyFrontlineCount),
    facilityDeficit: enemyPropertyCount >= ownPropertyCount + 3,
    droneEscalation: (state.enableSuicideDrones ?? false) && (enemyCounts.SUICIDE_DRONE > 0 || ownDronePresence),
    airShift: mapHasAirport(state) && enemyAirCount >= 2,
    navalShift: mapHasSea(state) && enemyNavalCount >= 2,
  };
};

const pickWeightedProfile = (
  profiles: Array<{ profile: ResolvedAiProfile; weight: number }>,
  rng: () => number,
): ResolvedAiProfile => {
  const totalWeight = profiles.reduce((sum, profile) => sum + profile.weight, 0);
  if (totalWeight <= 0) {
    return profiles[0]?.profile ?? 'balanced';
  }

  let roll = rng() * totalWeight;
  for (const profile of profiles) {
    roll -= profile.weight;
    if (roll <= 0) {
      return profile.profile;
    }
  }

  return profiles[profiles.length - 1]?.profile ?? 'balanced';
};

const pickAdaptiveProfile = (
  validProfiles: ResolvedAiProfile[],
  state: GameState,
  aiPlayer: PlayerId,
  rng: () => number,
): ResolvedAiProfile => {
  const signals = getAdaptiveBattleSignals(state, aiPlayer);
  const hasSignals = Object.values(signals).some(Boolean);

  const weightedProfiles = validProfiles.map((profile) => {
    let weight = 1;

    if (state.resolvedAiProfile === profile) {
      weight += 0.75;
    }

    if (signals.hqThreat) {
      if (profile === 'turtle') weight += 6;
      if (profile === 'balanced') weight += 2;
      if (profile === 'captain') weight += 1;
    }

    if (signals.mainForceLoss) {
      if (profile === 'turtle') weight += 4;
      if (profile === 'balanced') weight += 2;
      if (profile === 'captain') weight += 1;
    }

    if (signals.facilityDeficit) {
      if (profile === 'captain') weight += 5;
      if (profile === 'balanced') weight += 2;
      if (profile === 'turtle') weight += 1;
    }

    if (signals.droneEscalation) {
      if (profile === 'drone_swarm') weight += 6;
      if (profile === 'turtle') weight += 1;
      if (profile === 'balanced') weight += 1;
    }

    if (signals.airShift || signals.navalShift) {
      if (profile === 'stealth_strike') weight += 5;
      if (profile === 'balanced') weight += 1;
    }

    if (!hasSignals) {
      if (profile === 'balanced') weight += 2;
      if (state.resolvedAiProfile === profile) weight += 1.5;
    }

    return { profile, weight: Math.max(0.2, weight) };
  });

  return pickWeightedProfile(weightedProfiles, rng);
};

const shouldRerollAdaptive = (state: GameState, aiPlayer: PlayerId): boolean => {
  if (state.turn === 1 || state.turn % 4 === 0) {
    return true;
  }

  return Object.values(getAdaptiveBattleSignals(state, aiPlayer)).some(Boolean);
};

export const resolveAiProfile = (
  state: GameState,
  rng: () => number,
): ResolvedAiProfile => {
  const validProfiles = getValidResolvedProfiles(state);
  const selected = state.selectedAiProfile ?? 'auto';
  const aiPlayer = state.currentPlayerId;

  if (selected !== 'auto' && selected !== 'adaptive') {
    return validProfiles.includes(selected) ? selected : 'balanced';
  }

  if (selected === 'adaptive') {
    if (state.resolvedAiProfile && validProfiles.includes(state.resolvedAiProfile) && !shouldRerollAdaptive(state, aiPlayer)) {
      return state.resolvedAiProfile;
    }
    return pickAdaptiveProfile(validProfiles, state, aiPlayer, rng);
  }

  if (state.resolvedAiProfile && validProfiles.includes(state.resolvedAiProfile)) {
    return state.resolvedAiProfile;
  }

  return pickRandomProfile(validProfiles, rng);
};

const estimateIncomingThreat = (state: GameState, unit: UnitState, coord: Coord): ThreatEstimate => {
  const enemies = getKnownEnemyUnits(state, unit.owner);
  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;

  const defenderAtCoord: UnitState = { ...unit, position: coord };
  const defenderDefenseModifier = getDefenseModifierAt(state, defenderAtCoord, coord);

  let attackers = 0;
  let lethalThreats = 0;
  let incomingMax = 0;

  for (const enemy of enemies) {
    if (shouldConsumeAmmo && enemy.ammo <= 0) continue;

    const def = UNIT_DEFINITIONS[enemy.type];
    const distance = manhattanDistance(enemy.position, coord);
    if (distance < def.attackRangeMin || distance > def.attackRangeMax) continue;

    const forecast = forecastCombat(enemy, defenderAtCoord, {
      canCounter: false,
      defenderDefenseModifier,
    });
    const damage = forecast.attackerToDefender.max;
    attackers += 1;
    incomingMax += damage;
    if (damage >= unit.hp) {
      lethalThreats += 1;
    }
  }

  return { attackers, lethalThreats, incomingMax };
};

const getNearbyAllies = (state: GameState, unit: UnitState, coord: Coord): UnitState[] =>
  getAliveUnits(state, unit.owner).filter((ally) => ally.id !== unit.id && manhattanDistance(ally.position, coord) <= 2);

const getUnitsNeedingSupply = (state: GameState, owner: PlayerId, resupplyTarget: 'GROUND' | 'AIR' | 'NAVAL'): UnitState[] =>
  getAliveUnits(state, owner).filter((unit) => {
    const movementType = UNIT_DEFINITIONS[unit.type].movementType;
    const matches = resupplyTarget === 'GROUND'
      ? movementType !== 'AIR' && movementType !== 'NAVAL'
      : resupplyTarget === 'AIR'
        ? movementType === 'AIR'
        : movementType === 'NAVAL';
    return matches && isLowOnSupply(state, unit);
  });

const getOwnedFacilityCoords = (state: GameState, owner: PlayerId, terrainTypes: string[]): Coord[] =>
  Object.values(state.map.tiles)
    .filter((tile) => tile.owner === owner && terrainTypes.includes(tile.terrainType))
    .map((tile) => tile.coord);

const getCapturableTargetCoords = (state: GameState, owner: PlayerId): Coord[] =>
  Object.values(state.map.tiles)
    .filter((tile) => CAPTURABLE_TERRAINS.has(tile.terrainType) && tile.owner !== owner)
    .map((tile) => tile.coord);

const getNearestCoord = (from: Coord, coords: Coord[]): Coord | null => {
  if (coords.length === 0) {
    return null;
  }

  return coords.reduce((best, coord) =>
    manhattanDistance(from, coord) < manhattanDistance(from, best) ? coord : best,
  );
};

const getNearestCoordDistance = (from: Coord, coords: Coord[]): number | null => {
  if (coords.length === 0) {
    return null;
  }
  return Math.min(...coords.map((coord) => manhattanDistance(from, coord)));
};

const getEnemyTypePressure = (
  state: GameState,
  viewer: PlayerId,
  coord: Coord,
  threatTypes: Set<UnitType>,
  radius: number,
): number => getKnownEnemyUnits(state, viewer).filter(
  (enemy) => threatTypes.has(enemy.type) && manhattanDistance(coord, enemy.position) <= radius,
).length;

const buildOperationalPlan = (
  state: GameState,
  aiPlayer: PlayerId,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
): AiOperationalPlan => {
  const ownUnits = getAliveUnits(state, aiPlayer);
  const ownHq = getOwnHqCoord(state, aiPlayer);
  const enemyHq = getEnemyHqCoord(state, aiPlayer);
  const capturableTargets = getCapturableTargetCoords(state, aiPlayer);
  const capturers = ownUnits.filter((unit) => UNIT_DEFINITIONS[unit.type].canCapture);
  const frontlineUnits = ownUnits.filter((unit) => FRONTLINE_TYPES.has(unit.type) || HIGH_VALUE_TYPES.has(unit.type));
  const lowSupplyUnits = ownUnits.filter((unit) => isLowOnSupply(state, unit));
  const supplyAnchors = getOwnedFacilityCoords(state, aiPlayer, ['HQ', 'CITY', 'FACTORY', 'AIRPORT', 'PORT']);
  const averageFrontlinePos = frontlineUnits.length === 0
    ? ownHq
    : {
      x: Math.round(frontlineUnits.reduce((sum, unit) => sum + unit.position.x, 0) / frontlineUnits.length),
      y: Math.round(frontlineUnits.reduce((sum, unit) => sum + unit.position.y, 0) / frontlineUnits.length),
    };
  const supplyAnchorCoord = averageFrontlinePos ? getNearestCoord(averageFrontlinePos, supplyAnchors) : ownHq;
  const stagingCoord = enemyHq && supplyAnchorCoord
    ? {
      x: Math.round((enemyHq.x + supplyAnchorCoord.x) / 2),
      y: Math.round((enemyHq.y + supplyAnchorCoord.y) / 2),
    }
    : enemyHq ?? supplyAnchorCoord;
  const nearestCapturableToHq = enemyHq ? getNearestCoord(enemyHq, capturableTargets) : null;
  const desiredCapturerCount = Math.max(2, Math.min(6, capturableTargets.length === 0 ? 2 : Math.ceil(capturableTargets.length / 2)));
  const desiredFrontlineCount = enemyHq
    ? (difficulty === 'nightmare' ? 4 : 3)
    : 2;
  const desiredSupportCount = lowSupplyUnits.length > 0 || (enemyHq && frontlineUnits.length >= 3) ? 1 : 0;
  const canPressureHqSoon = Boolean(
    enemyHq
    && frontlineUnits.length >= desiredFrontlineCount - 1
    && capturers.length >= Math.max(1, Math.min(2, desiredCapturerCount - 1))
    && frontlineUnits.some((unit) => manhattanDistance(unit.position, enemyHq) <= 7)
    && lowSupplyUnits.length <= Math.max(1, Math.floor(ownUnits.length / 4)),
  );

  let primaryObjective: AiOperationalPlan['primaryObjective'] = 'capture';
  if (ownHq && getAdaptiveBattleSignals(state, aiPlayer).hqThreat) {
    primaryObjective = 'defend_hq';
  } else if (lowSupplyUnits.length >= Math.max(2, Math.ceil(ownUnits.length / 3))) {
    primaryObjective = 'regroup';
  } else if (canPressureHqSoon || (profile === 'captain' && enemyHq && capturableTargets.length <= 2)) {
    primaryObjective = 'hq_push';
  }

  const targetCoord =
    primaryObjective === 'defend_hq' ? ownHq
      : primaryObjective === 'hq_push' ? enemyHq
        : nearestCapturableToHq ?? getNearestCoord(averageFrontlinePos ?? ownHq ?? { x: 0, y: 0 }, capturableTargets);

  return {
    primaryObjective,
    targetCoord,
    stagingCoord,
    supplyAnchorCoord,
    lowSupplyUnitCount: lowSupplyUnits.length,
    frontlineUnitCount: frontlineUnits.length,
    canPressureHqSoon,
    desiredCapturerCount,
    desiredFrontlineCount,
    desiredSupportCount,
  };
};

const scoreHardForwardPlan = (
  state: GameState,
  unit: UnitState,
  coord: Coord,
  enemyHq: Coord | null,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
  attackTarget: UnitState | null,
  threat: ThreatEstimate,
  nearbyAllies: UnitState[],
): number => {
  const weights = getProfileWeights(profile, difficulty);
  let score = 0;

  if (attackTarget) {
    const attackScore = scoreAttackTarget(state, { ...unit, position: coord }, attackTarget, 'normal', profile);
    score += Math.max(0, attackScore) * 0.18;
    if (threat.attackers === 0) {
      score += 4 * weights.killBias;
    }
  }

  if (enemyHq) {
    const hqDistance = manhattanDistance(coord, enemyHq);
    if (hqDistance <= 4) {
      score += (5 - hqDistance) * 2 * weights.hqPressureBias;
    }
  }

  score += Math.min(3, nearbyAllies.length) * 1.5;

  if (HIGH_VALUE_TYPES.has(unit.type) && threat.attackers > 0 && !attackTarget) {
    score -= 6 * weights.safetyBias;
  }

  if (isLowOnSupply(state, unit) && !isFriendlyResupplyTile(state, unit, coord) && UNIT_DEFINITIONS[unit.type].resupplyTarget) {
    score -= 6 * weights.supplyBias;
  }

  return score;
};

const scoreAttackTarget = (
  state: GameState,
  attacker: UnitState,
  target: UnitState,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
): number => {
  const weights = getProfileWeights(profile, difficulty);
  const forecast = forecastCombat(attacker, target);
  const damage = forecast.attackerToDefender.max;
  const retaliation = forecast.defenderToAttacker?.max ?? 0;

  if (difficulty === 'easy') {
    return damage * 10 - target.hp;
  }

  const attackerCost = UNIT_DEFINITIONS[attacker.type].cost;
  const targetCost = UNIT_DEFINITIONS[target.type].cost;
  const attackPosition = attacker.position;
  const postAttackThreat = estimateIncomingThreat(
    {
      ...state,
      units: {
        ...state.units,
        [target.id]: damage >= target.hp ? { ...target, hp: 0 } : { ...target, hp: Math.max(1, target.hp - damage) },
      },
    },
    attacker,
    attackPosition,
  );

  let score = 0;
  score += damage * (4 + targetCost / 2000) * weights.killBias;
  score -= retaliation * (2 + attackerCost / 2500) * weights.safetyBias;

  if (damage >= target.hp) {
    score += (20 + targetCost / 450) * weights.killBias;
  }

  if (damage === 0) {
    score -= 25;
  }

  if (INDIRECT_SUPPORT_UNITS.has(target.type)) {
    score += 8 * weights.killBias;
  }

  if (HIGH_VALUE_TYPES.has(target.type) || targetCost >= 12000) {
    score += 10 * weights.killBias;
  }

  if (UNIT_DEFINITIONS[target.type].movementType === 'AIR') {
    score += 6 * weights.antiAirBias;
  }

  if (target.type === 'SUICIDE_DRONE') {
    score += 8 * weights.antiAirBias;
  }

  const targetTile = state.map.tiles[toCoordKey(target.position)];

  if (attacker.type === 'SUICIDE_DRONE') {
    if (DRONE_STRIKE_TARGETS.has(target.type) || HIGH_VALUE_TYPES.has(target.type) || UNIT_DEFINITIONS[target.type].movementType === 'AIR') {
      score += 18 * weights.droneBias;
    }
    if (target.type === 'INFANTRY' && targetCost < attackerCost) {
      score -= 18 * weights.droneBias;
    }
    score -= getEnemyTypePressure(state, attacker.owner, target.position, DRONE_COUNTER_TYPES, 2) * 6 * weights.safetyBias;
  }

  if (attacker.type === 'COUNTER_DRONE_AA' && (target.type === 'SUICIDE_DRONE' || UNIT_DEFINITIONS[target.type].movementType === 'AIR')) {
    score += 12 * weights.antiAirBias;
    score += 8 * weights.droneBias;
  }

  if (NAVAL_COMBAT_TYPES.has(attacker.type)) {
    if (NAVAL_COMBAT_TYPES.has(target.type) || NAVAL_SUPPORT_TYPES.has(target.type)) {
      score += 8 * weights.navalBias;
    }
    if (attacker.type === 'DESTROYER' && target.type === 'SUBMARINE') {
      score += 12 * weights.navalBias;
    }
    if (attacker.type === 'BATTLESHIP' && targetTile && CAPTURABLE_TERRAINS.has(targetTile.terrainType)) {
      score += 5 * weights.navalBias;
    }
  }

  if (attacker.type === 'SUBMARINE') {
    if (NAVAL_COMBAT_TYPES.has(target.type) || HIGH_VALUE_TYPES.has(target.type)) {
      score += 10 * weights.navalBias;
    }
    score -= getEnemyTypePressure(state, attacker.owner, target.position, SUBMARINE_COUNTER_TYPES, 3) * 8 * weights.safetyBias;
    if (isLowOnSupply(state, attacker) && !isFriendlyResupplyTile(state, attacker, attackPosition)) {
      score -= 18 * weights.stealthBias;
    }
  }

  if (attacker.type === 'STEALTH_BOMBER') {
    if (HIGH_VALUE_TYPES.has(target.type) || INDIRECT_SUPPORT_UNITS.has(target.type) || NAVAL_COMBAT_TYPES.has(target.type)) {
      score += 12 * weights.stealthBias;
    }
    score -= getEnemyTypePressure(state, attacker.owner, target.position, STEALTH_COUNTER_TYPES, 3) * 8 * weights.safetyBias;
    if (isLowOnSupply(state, attacker) && !isFriendlyResupplyTile(state, attacker, attackPosition)) {
      score -= 20 * weights.stealthBias;
    }
  }

  if (target.type === 'INFANTRY' && targetTile && CAPTURABLE_TERRAINS.has(targetTile.terrainType) && targetTile.owner === attacker.owner) {
    score += 14 * weights.captureBias;
  }

  if (attacker.type === 'INFANTRY' && canCaptureNow(state, attacker) && damage < target.hp) {
    score -= 10 * weights.captureBias;
  }

  if (isAdvancedAiDifficulty(difficulty)) {
    const safetyScale = isNightmareAiDifficulty(difficulty) ? 1.4 : 1;
    const rewardScale = isNightmareAiDifficulty(difficulty) ? 1.25 : 1;
    if (retaliation >= attacker.hp && attackerCost > targetCost) {
      score -= 16 * safetyScale * weights.safetyBias;
    }
    score -= postAttackThreat.incomingMax * 1.8 * safetyScale * weights.safetyBias;
    score -= postAttackThreat.attackers * 5 * safetyScale * weights.safetyBias;
    score -= postAttackThreat.lethalThreats * 22 * safetyScale * weights.safetyBias;
    if (attackerCost > targetCost && postAttackThreat.attackers >= 2) {
      score -= 14 * safetyScale * weights.safetyBias;
    }
    if (damage < target.hp && postAttackThreat.attackers > 0) {
      score -= 8 * safetyScale * weights.safetyBias;
    }
    if (damage >= target.hp && postAttackThreat.attackers === 0) {
      score += 6 * rewardScale * weights.killBias;
    }
    if (isNightmareAiDifficulty(difficulty) && targetCost < attackerCost && postAttackThreat.attackers > 0) {
      score -= 10 * weights.safetyBias;
    }
  }

  return score;
};

const chooseAttackCandidate = (
  candidates: AttackCandidate[],
  difficulty: AiDifficulty,
  rng: () => number,
): UnitState | null => {
  if (candidates.length === 0) return null;
  candidates.sort((left, right) => right.score - left.score);
  if (difficulty === 'nightmare' || candidates.length === 1) {
    return candidates[0]?.target ?? null;
  }

  if (difficulty !== 'hard') {
    return candidates[0]?.target ?? null;
  }

  const bestScore = candidates[0].score;
  const nearBest = candidates.filter((candidate) => bestScore - candidate.score <= 4);
  const totalWeight = nearBest.reduce((sum, candidate) => sum + Math.max(1, candidate.score - bestScore + 5), 0);
  let roll = rng() * totalWeight;

  for (const candidate of nearBest) {
    roll -= Math.max(1, candidate.score - bestScore + 5);
    if (roll <= 0) return candidate.target;
  }

  return nearBest[0]?.target ?? candidates[0]?.target ?? null;
};

const selectBestAttackTarget = (
  state: GameState,
  unit: UnitState,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
  rng: () => number,
): UnitState | null => {
  const shouldConsumeAmmo = state.enableAmmoSupply ?? true;
  if (shouldConsumeAmmo && unit.ammo <= 0) return null;

  const targets = getAttackableEnemies(state, unit);
  const scoredTargets = targets.map((target) => ({
    target,
    score: scoreAttackTarget(state, unit, target, difficulty, profile),
  }));

  if (isAdvancedAiDifficulty(difficulty) && scoredTargets.length > 0 && scoredTargets.every((candidate) => candidate.score <= 0)) {
    return null;
  }

  return chooseAttackCandidate(scoredTargets, difficulty, rng);
};

const evaluateMoveScore = (
  state: GameState,
  unit: UnitState,
  to: Coord,
  enemies: UnitState[],
  enemyHq: Coord | null,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
  plan: AiOperationalPlan,
  rng: () => number,
): number => {
  const weights = getProfileWeights(profile, difficulty);
  const tile = state.map.tiles[toCoordKey(to)];
  const movedUnit: UnitState = { ...unit, position: to };
  const nearestEnemyDist = enemies.length > 0 ? Math.min(...enemies.map((enemy) => manhattanDistance(to, enemy.position))) : 6;
  const hqDist = enemyHq ? manhattanDistance(to, enemyHq) : 0;
  const threat = estimateIncomingThreat(state, unit, to);
  const terrainDefense = getDefenseModifierAt(state, movedUnit, to);
  const nearbyAllies = getNearbyAllies(state, unit, to);
  const ownHq = getOwnHqCoord(state, unit.owner);
  const ownedAirports = getOwnedFacilityCoords(state, unit.owner, ['AIRPORT']);
  const ownedPorts = getOwnedFacilityCoords(state, unit.owner, ['PORT']);
  const ownedCoreFacilities = getOwnedFacilityCoords(state, unit.owner, ['HQ', 'FACTORY', 'AIRPORT']);
  const capturableTargets = getCapturableTargetCoords(state, unit.owner);
  const nearestCapturableDist = getNearestCoordDistance(to, capturableTargets);
  const currentCapturableDist = getNearestCoordDistance(unit.position, capturableTargets);
  const planTargetDistance = plan.targetCoord ? manhattanDistance(to, plan.targetCoord) : null;
  const currentPlanTargetDistance = plan.targetCoord ? manhattanDistance(unit.position, plan.targetCoord) : null;
  const supplyAnchorDistance = plan.supplyAnchorCoord ? manhattanDistance(to, plan.supplyAnchorCoord) : null;
  const stagingDistance = plan.stagingCoord ? manhattanDistance(to, plan.stagingCoord) : null;

  let score = 0;

  if (UNIT_DEFINITIONS[unit.type].canCapture) {
    if (tile && CAPTURABLE_TERRAINS.has(tile.terrainType) && tile.owner !== unit.owner) {
      score += 24 * weights.captureBias;
    }
    if (nearestCapturableDist !== null) {
      score -= nearestCapturableDist * ((state.fogOfWar ?? false) ? 3.2 : 1.6) * weights.captureBias;
      if ((state.fogOfWar ?? false) && currentCapturableDist !== null && nearestCapturableDist < currentCapturableDist) {
        score += (currentCapturableDist - nearestCapturableDist) * 6 * weights.captureBias;
      }
    }
    score -= hqDist * 1.1 * weights.hqPressureBias;
  }

  if (plan.primaryObjective === 'hq_push' && planTargetDistance !== null) {
    score -= planTargetDistance * 2.4 * weights.hqPressureBias;
    if (currentPlanTargetDistance !== null && planTargetDistance < currentPlanTargetDistance) {
      score += (currentPlanTargetDistance - planTargetDistance) * 4.5 * weights.hqPressureBias;
    }
    if (FRONTLINE_TYPES.has(unit.type) || HIGH_VALUE_TYPES.has(unit.type)) {
      score += (currentPlanTargetDistance !== null ? Math.max(0, currentPlanTargetDistance - planTargetDistance) : 0) * 6 * weights.hqPressureBias;
      if (enemyHq && manhattanDistance(to, enemyHq) <= 5) {
        score += (6 - manhattanDistance(to, enemyHq)) * 3.5 * weights.hqPressureBias;
      }
    }
    if (!UNIT_DEFINITIONS[unit.type].canCapture && stagingDistance !== null) {
      score -= stagingDistance * 0.9 * weights.hqPressureBias;
    }
  }

  if (plan.primaryObjective === 'regroup' && supplyAnchorDistance !== null) {
    score -= supplyAnchorDistance * 2.2 * weights.supplyBias;
    if (isFriendlyResupplyTile(state, unit, to)) {
      score += 10 * weights.supplyBias;
    }
  }

  if (plan.primaryObjective === 'defend_hq' && ownHq) {
    score -= manhattanDistance(to, ownHq) * 2.6 * weights.safetyBias;
  }

  const resupplyTarget = UNIT_DEFINITIONS[unit.type].resupplyTarget;
  if (INDIRECT_SUPPORT_UNITS.has(unit.type)) {
    if (nearestEnemyDist >= 2 && nearestEnemyDist <= 4) score += 12 * weights.artilleryBias;
    if (nearestEnemyDist === 1) score -= 20 * weights.safetyBias;
    if (nearbyAllies.some((ally) => FRONTLINE_TYPES.has(ally.type))) score += 6 * weights.artilleryBias;
  } else if (resupplyTarget) {
    const needyAllies = getUnitsNeedingSupply(state, unit.owner, resupplyTarget);
    if (needyAllies.length > 0) {
      const nearestNeedy = Math.min(...needyAllies.map((ally) => manhattanDistance(to, ally.position)));
      score -= nearestNeedy * 2.5 * weights.supplyBias;
      if (needyAllies.some((ally) => manhattanDistance(to, ally.position) === 1)) {
        score += 10 * weights.supplyBias;
      }
    }
    if (isFriendlyResupplyTile(state, unit, to) && (unit.supplyCharges ?? 0) <= 1) {
      score += 8 * weights.supplyBias;
    }

    if (plan.supplyAnchorCoord) {
      const anchorDistance = manhattanDistance(to, plan.supplyAnchorCoord);
      const currentAnchorDistance = manhattanDistance(unit.position, plan.supplyAnchorCoord);
      if (plan.primaryObjective === 'hq_push') {
        const supportGoal = plan.stagingCoord ?? plan.targetCoord;
        if (supportGoal) {
          const goalDistance = manhattanDistance(to, supportGoal);
          score -= goalDistance * 1.2 * weights.supplyBias;
        }
        const routeLength = plan.targetCoord ? manhattanDistance(plan.supplyAnchorCoord, plan.targetCoord) : 0;
        if (routeLength > 0) {
          const idealAdvance = Math.max(1, Math.floor(routeLength * 0.45));
          score -= Math.abs(anchorDistance - idealAdvance) * 1.6 * weights.supplyBias;
          const overextendedThreshold = idealAdvance + 2;
          score -= Math.max(0, anchorDistance - overextendedThreshold) * 7.5 * weights.supplyBias;
          if (currentAnchorDistance > overextendedThreshold) {
            if (anchorDistance < currentAnchorDistance) {
              score += (currentAnchorDistance - anchorDistance) * 5.5 * weights.supplyBias;
            } else if (anchorDistance > currentAnchorDistance) {
              score -= (anchorDistance - currentAnchorDistance) * 4.5 * weights.supplyBias;
            }
          }
        } else {
          score -= anchorDistance * 1.5 * weights.supplyBias;
        }
      } else if (plan.primaryObjective === 'regroup') {
        score -= anchorDistance * 2.6 * weights.supplyBias;
        if (anchorDistance <= 1) {
          score += 8 * weights.supplyBias;
        }
      }
    }
  } else {
    if (nearestEnemyDist === 1) score += 6 * weights.killBias;
    score -= Math.abs(nearestEnemyDist - 1) * 1.5;
  }

  if (terrainDefense < 1) {
    score += ((1 - terrainDefense) * 14) * weights.safetyBias;
  }

  if (tile?.owner === unit.owner && CAPTURABLE_TERRAINS.has(tile.terrainType)) {
    score += 3 * weights.safetyBias;
  }

  if (UNIT_DEFINITIONS[unit.type].movementType !== 'AIR' && tile?.terrainType === 'ROAD') {
    score += 1.5 * weights.scoutBias;
  }

  if (tile) {
    if (INFANTRY_TYPES.has(unit.type) || UNIT_DEFINITIONS[unit.type].canCapture) {
      if (tile.terrainType === 'CITY') score += 4 * weights.captureBias;
      if (tile.terrainType === 'FOREST' || tile.terrainType === 'MOUNTAIN') score += 3 * weights.safetyBias;
      if (tile.terrainType === 'HQ' || tile.terrainType === 'FACTORY') score += 2 * weights.captureBias;
    }

    if (ARMOR_TYPES.has(unit.type)) {
      if (tile.terrainType === 'PLAIN') score += 2.5 * weights.killBias;
      if (tile.terrainType === 'ROAD') score += 2 * weights.killBias;
      if (tile.terrainType === 'FOREST' || tile.terrainType === 'MOUNTAIN') score -= 2 * weights.safetyBias;
    }

    if (INDIRECT_SUPPORT_UNITS.has(unit.type)) {
      if (tile.terrainType === 'CITY' || tile.terrainType === 'FOREST') score += 3 * weights.artilleryBias;
    }

    if (SCOUT_TYPES.has(unit.type) && (tile.terrainType === 'ROAD' || tile.terrainType === 'PLAIN')) {
      score += 3 * weights.scoutBias;
    }

    if (UNIT_DEFINITIONS[unit.type].movementType === 'AIR' && tile.terrainType === 'AIRPORT') {
      score += 4 * weights.stealthBias;
    }

    if (UNIT_DEFINITIONS[unit.type].movementType === 'NAVAL') {
      if (tile.terrainType === 'SEA' || tile.terrainType === 'COAST') score += 2 * weights.navalBias;
      if (tile.terrainType === 'PORT') score += 5 * weights.navalBias;
    }
  }

  if (HIGH_VALUE_TYPES.has(unit.type) && threat.lethalThreats > 0) {
    score -= 16 * weights.safetyBias;
  }

  if (unit.hp <= 3) {
    score -= threat.incomingMax * 1.6 * weights.safetyBias;
    if (isFriendlyResupplyTile(state, unit, to)) {
      score += 12 * weights.safetyBias;
    }
  }

  if (isLowOnSupply(state, unit)) {
    if (isFriendlyResupplyTile(state, unit, to)) {
      score += 16 * weights.supplyBias;
    } else if (UNIT_DEFINITIONS[unit.type].resupplyTarget) {
      score -= 4 * weights.supplyBias;
    }
  }

  if (state.fogOfWar ?? false) {
    const visibleTilesBefore = getVisibleEnemyUnitIds(state, unit.owner).size;
    const simulatedState: GameState = {
      ...state,
      units: {
        ...state.units,
        [unit.id]: movedUnit,
      },
    };
    const visibleTilesAfter = getVisibleEnemyUnitIds(simulatedState, unit.owner).size;
    score += (visibleTilesAfter - visibleTilesBefore) * 2 * weights.scoutBias;

    const rememberedEnemies = getRememberedEnemyEntries(state, unit.owner);
    if (rememberedEnemies.length > 0) {
      const rememberedDistances = rememberedEnemies.map((entry) => ({
        entry,
        distance: manhattanDistance(to, entry.position),
      }));
      const nearestRememberedDist = Math.min(...rememberedDistances.map(({ distance }) => distance));
      const rememberedRisk = rememberedDistances.reduce((sum, { entry, distance }) => {
        const proximity = Math.max(0, 5 - Math.min(5, distance));
        const targetBias = HIGH_VALUE_TYPES.has(entry.type)
          ? 1.4
          : UNIT_DEFINITIONS[entry.type].canCapture
            ? 1.2
            : 1;
        return sum + proximity * entry.confidence * targetBias;
      }, 0);

      if (SCOUT_TYPES.has(unit.type)) {
        score -= nearestRememberedDist * 2 * weights.scoutBias;
        score += rememberedDistances.filter(({ distance }) => distance <= 3).length * 3 * weights.scoutBias;
      } else {
        score -= rememberedRisk * 1.4 * weights.safetyBias;
        if (nearestRememberedDist <= 3 && !nearbyAllies.some((ally) => SCOUT_TYPES.has(ally.type))) {
          score -= 4 * weights.safetyBias;
        }
      }

      if (tile && (tile.terrainType === 'FOREST' || tile.terrainType === 'CITY' || tile.terrainType === 'MOUNTAIN')) {
        score -= rememberedDistances.filter(({ distance }) => distance <= 2).length * 1.5 * weights.safetyBias;
      }
    }

    if (nearestCapturableDist !== null && (!UNIT_DEFINITIONS[unit.type].canCapture || enemies.length === 0)) {
      const supportBias = SCOUT_TYPES.has(unit.type) ? weights.scoutBias : weights.captureBias;
      score -= nearestCapturableDist * (SCOUT_TYPES.has(unit.type) ? 2.2 : 1.2) * supportBias;
      if (currentCapturableDist !== null && nearestCapturableDist < currentCapturableDist) {
        score += (currentCapturableDist - nearestCapturableDist) * (SCOUT_TYPES.has(unit.type) ? 4.5 : 2.5) * supportBias;
      }
    }
  }

  const attackEvaluationDifficulty: AiDifficulty = difficulty === 'easy' ? 'easy' : difficulty;
  const attackTarget = selectBestAttackTarget(state, movedUnit, attackEvaluationDifficulty, profile, rng);
  if (attackTarget) {
    const attackPreview = Math.max(0, scoreAttackTarget(state, movedUnit, attackTarget, attackEvaluationDifficulty, profile));
    score += attackPreview * (isNightmareAiDifficulty(difficulty) ? 0.42 : 0.35) + 5;
  }

  score -= threat.incomingMax * 2.4 * weights.safetyBias;
  score -= threat.lethalThreats * 20 * weights.safetyBias;
  score -= threat.attackers * 3;

  if (profile === 'captain' && nearbyAllies.some((ally) => FRONTLINE_TYPES.has(ally.type)) && UNIT_DEFINITIONS[unit.type].canCapture) {
    score += 5;
  }
  if (profile === 'sieger' && nearbyAllies.some((ally) => INDIRECT_SUPPORT_UNITS.has(ally.type)) && FRONTLINE_TYPES.has(unit.type)) {
    score += 5;
  }
  if (profile === 'turtle' && tile?.owner === unit.owner && CAPTURABLE_TERRAINS.has(tile.terrainType)) {
    score += 6;
  }

  if (UNIT_DEFINITIONS[unit.type].movementType === 'NAVAL') {
    const nearbyNavalAllies = nearbyAllies.filter((ally) => UNIT_DEFINITIONS[ally.type].movementType === 'NAVAL');
    if (nearbyNavalAllies.length > 0) {
      score += Math.min(2, nearbyNavalAllies.length) * 3 * weights.navalBias;
    }
    if (enemyHq && hqDist <= 6) {
      score += (7 - hqDist) * weights.navalBias;
    }
  }

  if (profile === 'drone_swarm') {
    if (unit.type === 'SUICIDE_DRONE') {
      const strikeTargets = enemies.filter(
        (enemy) => DRONE_STRIKE_TARGETS.has(enemy.type) || HIGH_VALUE_TYPES.has(enemy.type) || UNIT_DEFINITIONS[enemy.type].movementType === 'AIR',
      );
      const nearestStrikeTarget = strikeTargets.length > 0
        ? Math.min(...strikeTargets.map((enemy) => manhattanDistance(to, enemy.position)))
        : null;
      if (nearestStrikeTarget !== null) {
        score -= nearestStrikeTarget * 3 * weights.droneBias;
      }
      score -= getEnemyTypePressure(state, unit.owner, to, DRONE_COUNTER_TYPES, 3) * 9 * weights.safetyBias;
      if (nearbyAllies.some((ally) => FRONTLINE_TYPES.has(ally.type) || ally.type === 'COUNTER_DRONE_AA')) {
        score += 5 * weights.droneBias;
      }
    }

    if (unit.type === 'COUNTER_DRONE_AA') {
      const droneThreats = enemies.filter(
        (enemy) => enemy.type === 'SUICIDE_DRONE' || UNIT_DEFINITIONS[enemy.type].movementType === 'AIR',
      );
      const nearestDroneThreat = droneThreats.length > 0
        ? Math.min(...droneThreats.map((enemy) => manhattanDistance(to, enemy.position)))
        : null;
      const nearestCoreDistance = getNearestCoordDistance(to, ownedCoreFacilities);
      if (nearestDroneThreat !== null) {
        score -= nearestDroneThreat * 2.4 * weights.antiAirBias;
      }
      if (nearestCoreDistance !== null) {
        score -= nearestCoreDistance * 1.8 * weights.antiAirBias;
      }
      if (ownHq && manhattanDistance(to, ownHq) <= 2) {
        score += 8 * weights.antiAirBias;
      }
      if (nearbyAllies.some((ally) => ally.type === 'SUICIDE_DRONE' || HIGH_VALUE_TYPES.has(ally.type))) {
        score += 4 * weights.antiAirBias;
      }
    }
  }

  if (profile === 'stealth_strike' || unit.type === 'STEALTH_BOMBER' || unit.type === 'SUBMARINE') {
    if (unit.type === 'STEALTH_BOMBER') {
      const nearestAirport = getNearestCoordDistance(to, ownedAirports);
      const highValueGroundTargets = enemies.filter(
        (enemy) => UNIT_DEFINITIONS[enemy.type].movementType !== 'AIR' && (HIGH_VALUE_TYPES.has(enemy.type) || UNIT_DEFINITIONS[enemy.type].cost >= 10000),
      );
      const nearestGroundTarget = highValueGroundTargets.length > 0
        ? Math.min(...highValueGroundTargets.map((enemy) => manhattanDistance(to, enemy.position)))
        : null;
      score -= getEnemyTypePressure(state, unit.owner, to, STEALTH_COUNTER_TYPES, 3) * 8 * weights.safetyBias;
      if (isLowOnSupply(state, unit)) {
        if (nearestAirport !== null) {
          score -= nearestAirport * 4 * weights.supplyBias;
        }
        if (!isFriendlyResupplyTile(state, unit, to)) {
          score -= 12 * weights.supplyBias;
        }
      } else if (nearestGroundTarget !== null) {
        score -= nearestGroundTarget * 2.5 * weights.stealthBias;
      }
    }

    if (unit.type === 'SUBMARINE') {
      const nearestPort = getNearestCoordDistance(to, ownedPorts);
      const navalTargets = enemies.filter((enemy) => NAVAL_COMBAT_TYPES.has(enemy.type) || enemy.type === 'SUPPLY_SHIP');
      const nearestNavalTarget = navalTargets.length > 0
        ? Math.min(...navalTargets.map((enemy) => manhattanDistance(to, enemy.position)))
        : null;
      score -= getEnemyTypePressure(state, unit.owner, to, SUBMARINE_COUNTER_TYPES, 3) * 9 * weights.safetyBias;
      if (isLowOnSupply(state, unit)) {
        if (nearestPort !== null) {
          score -= nearestPort * 4 * weights.supplyBias;
        }
        if (!isFriendlyResupplyTile(state, unit, to)) {
          score -= 10 * weights.supplyBias;
        }
      } else if (nearestNavalTarget !== null) {
        score -= nearestNavalTarget * 2.5 * weights.navalBias;
      }
    }

    if ((unit.type === 'STEALTH_BOMBER' || unit.type === 'SUBMARINE') && isFriendlyResupplyTile(state, unit, to)) {
      score += 10 * weights.stealthBias;
    }
  }

  if (isAdvancedAiDifficulty(difficulty)) {
    score += scoreHardForwardPlan(state, unit, to, enemyHq, difficulty, profile, attackTarget, threat, nearbyAllies);
    if (isNightmareAiDifficulty(difficulty)) {
      score -= threat.incomingMax * 0.9 * weights.safetyBias;
      score -= threat.attackers * 2.5 * weights.safetyBias;
      if (enemyHq && hqDist <= 6) {
        score += (7 - hqDist) * 1.8 * weights.hqPressureBias;
      }
      if (tile?.owner === unit.owner && CAPTURABLE_TERRAINS.has(tile.terrainType)) {
        score += 3 * weights.safetyBias;
      }
    }
  }

  if (tile?.owner === unit.owner && tile.terrainType === 'FACTORY' && unit.type !== 'INFANTRY') {
    score -= 2;
  }
  if ((state.fogOfWar ?? false) && tile?.owner === unit.owner && tile.terrainType === 'FACTORY' && capturableTargets.length > 0) {
    score -= UNIT_DEFINITIONS[unit.type].canCapture ? 8 * weights.captureBias : 5 * weights.scoutBias;
  }

  if (plan.primaryObjective === 'hq_push' && plan.lowSupplyUnitCount > 0 && UNIT_DEFINITIONS[unit.type].resupplyTarget && supplyAnchorDistance !== null) {
    score -= supplyAnchorDistance * 1.8 * weights.supplyBias;
  }

  return score;
};

const chooseMoveCandidate = (
  candidates: MoveCandidate[],
  difficulty: AiDifficulty,
  rng: () => number,
): MoveCandidate | null => {
  if (candidates.length === 0) return null;
  candidates.sort((left, right) => right.score - left.score);
  if (difficulty === 'nightmare' || candidates.length === 1) {
    return candidates[0] ?? null;
  }

  if (difficulty !== 'hard') {
    return candidates[0] ?? null;
  }

  const bestScore = candidates[0].score;
  const nearBest = candidates.filter((candidate) => bestScore - candidate.score <= 4).slice(0, 3);
  const totalWeight = nearBest.reduce((sum, candidate) => sum + Math.max(1, candidate.score - bestScore + 5), 0);
  let roll = rng() * totalWeight;

  for (const candidate of nearBest) {
    roll -= Math.max(1, candidate.score - bestScore + 5);
    if (roll <= 0) return candidate;
  }

  return nearBest[0] ?? candidates[0] ?? null;
};

const chooseSupportRetreatCandidate = (
  state: GameState,
  unit: UnitState,
  candidates: MoveCandidate[],
  plan: AiOperationalPlan,
): MoveCandidate | null => {
  const resupplyTarget = UNIT_DEFINITIONS[unit.type].resupplyTarget;
  if (!resupplyTarget || plan.primaryObjective !== 'hq_push' || !plan.supplyAnchorCoord || !plan.targetCoord) {
    return null;
  }

  const currentAnchorDistance = manhattanDistance(unit.position, plan.supplyAnchorCoord);
  const routeLength = manhattanDistance(plan.supplyAnchorCoord, plan.targetCoord);
  const idealAdvance = Math.max(1, Math.floor(routeLength * 0.45));
  const overextendedThreshold = idealAdvance + 2;
  if (currentAnchorDistance <= overextendedThreshold) {
    return null;
  }

  const adjacentNeedyAllies = getUnitsNeedingSupply(state, unit.owner, resupplyTarget)
    .filter((ally) => ally.id !== unit.id)
    .some((ally) => manhattanDistance(unit.position, ally.position) === 1);
  if (adjacentNeedyAllies) {
    return null;
  }

  const retreatCandidates = candidates
    .filter((candidate) => manhattanDistance(candidate.to, plan.supplyAnchorCoord!) < currentAnchorDistance)
    .sort((left, right) => {
      const leftDistance = manhattanDistance(left.to, plan.supplyAnchorCoord!);
      const rightDistance = manhattanDistance(right.to, plan.supplyAnchorCoord!);
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      return right.score - left.score;
    });

  return retreatCandidates[0] ?? null;
};

const selectBestMove = (
  state: GameState,
  unit: UnitState,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
  plan: AiOperationalPlan,
  rng: () => number,
): { to: Coord; path: Coord[] } | null => {
  const enemies = getKnownEnemyUnits(state, unit.owner);
  const maxMove = (state.enableFuelSupply ?? true)
    ? Math.min(UNIT_DEFINITIONS[unit.type].moveRange, unit.fuel)
    : UNIT_DEFINITIONS[unit.type].moveRange;

  const reachable = getReachableTiles({ map: state.map, unit, enemyUnits: enemies, maxMove }).filter((coord) => !isTileOccupied(state, coord));
  if (reachable.length === 0) return null;

  const enemyHq = getEnemyHqCoord(state, unit.owner);

  if (difficulty === 'easy') {
    const candidates: MoveCandidate[] = [];
    for (const to of reachable) {
      const path = findMovePath({ map: state.map, unit, enemyUnits: enemies, maxMove }, to);
      if (!path || path.length === 0) continue;
      const nearestEnemyDist = enemies.length > 0 ? Math.min(...enemies.map((enemy) => manhattanDistance(to, enemy.position))) : 0;
      const hqDist = enemyHq ? manhattanDistance(to, enemyHq) : 0;
      candidates.push({ to, path, score: -nearestEnemyDist * 3 - hqDist });
    }
    const best = chooseMoveCandidate(candidates, difficulty, rng);
    return best ? { to: best.to, path: best.path } : null;
  }

  const stayScore = evaluateMoveScore(state, unit, unit.position, enemies, enemyHq, difficulty, profile, plan, rng);
  const candidates: MoveCandidate[] = [];
  for (const to of reachable) {
    const path = findMovePath({ map: state.map, unit, enemyUnits: enemies, maxMove }, to);
    if (!path || path.length === 0) continue;
    candidates.push({
      to,
      path,
      score: evaluateMoveScore(state, unit, to, enemies, enemyHq, difficulty, profile, plan, rng),
    });
  }

  const forcedRetreat = chooseSupportRetreatCandidate(state, unit, candidates, plan);
  if (forcedRetreat) {
    return { to: forcedRetreat.to, path: forcedRetreat.path };
  }

  const best = chooseMoveCandidate(candidates, difficulty, rng);
  if (!best || best.score <= stayScore + 0.5) {
    return null;
  }

  return { to: best.to, path: best.path };
};


const getDroneFactoryOpenSlots = (state: GameState, coord: Coord): number => {
  const slots = [{ ...coord }, { x: coord.x, y: coord.y - 1 }, { x: coord.x + 1, y: coord.y }, { x: coord.x, y: coord.y + 1 }, { x: coord.x - 1, y: coord.y }];

  return slots.filter((slot) => slot.x >= 0 && slot.x < state.map.width && slot.y >= 0 && slot.y < state.map.height && !isTileOccupied(state, slot)).length;
};

const mapHasAirport = (state: GameState): boolean =>
  Object.values(state.map.tiles).some((tile) => tile.terrainType === 'AIRPORT');

const mapHasSea = (state: GameState): boolean =>
  Object.values(state.map.tiles).some((tile) => tile.terrainType === 'SEA');

const getOwnedPorts = (state: GameState, aiPlayer: PlayerId): Coord[] =>
  Object.values(state.map.tiles).filter((tile) => tile.terrainType === 'PORT' && tile.owner === aiPlayer).map((tile) => tile.coord);

const getCapturableCoastalTargets = (state: GameState, aiPlayer: PlayerId): Coord[] =>
  Object.values(state.map.tiles)
    .filter((tile) => {
      if (!CAPTURABLE_TERRAINS.has(tile.terrainType) || tile.owner === aiPlayer) return false;
      const adjacent = [{ x: tile.coord.x, y: tile.coord.y - 1 }, { x: tile.coord.x + 1, y: tile.coord.y }, { x: tile.coord.x, y: tile.coord.y + 1 }, { x: tile.coord.x - 1, y: tile.coord.y }];
      return adjacent.some((coord) => {
        const adjacentTile = state.map.tiles[toCoordKey(coord)];
        return adjacentTile?.terrainType === 'SEA' || adjacentTile?.terrainType === 'COAST' || adjacentTile?.terrainType === 'PORT';
      });
    })
    .map((tile) => tile.coord);

const selectNormalProductionUnit = (
  state: GameState,
  aiPlayer: PlayerId,
  profile: ResolvedAiProfile,
  difficulty: AiDifficulty,
  plan: AiOperationalPlan,
): UnitType | null => {
  const weights = getProfileWeights(profile, difficulty);
  const canAfford = (type: UnitType): boolean => state.players[aiPlayer].funds >= UNIT_DEFINITIONS[type].cost;

  const own = getAliveUnits(state, aiPlayer);
  const ownCounts = countUnitsByType(own);
  const enemyCounts = getEstimatedEnemyCounts(state, aiPlayer);
  const supportUnits = ownCounts.SUPPLY_TRUCK + ownCounts.AIR_TANKER + ownCounts.SUPPLY_SHIP;
  const lowSupplyUnits = own.filter((unit) => isLowOnSupply(state, unit)).length;

  const capturableCount = Object.values(state.map.tiles).filter((tile) => CAPTURABLE_TERRAINS.has(tile.terrainType) && tile.owner !== aiPlayer).length;
  const ownCapturers = ownCounts.INFANTRY + ownCounts.AIR_DEFENSE_INFANTRY;
  if (plan.primaryObjective === 'hq_push') {
    if (plan.lowSupplyUnitCount > 0 && supportUnits < plan.desiredSupportCount && canAfford('SUPPLY_TRUCK') && profile !== 'hunter') {
      return 'SUPPLY_TRUCK';
    }
    if (plan.frontlineUnitCount < plan.desiredFrontlineCount && canAfford('TANK')) {
      return 'TANK';
    }
    if (ownCapturers < plan.desiredCapturerCount && canAfford('INFANTRY')) {
      return 'INFANTRY';
    }
  }
  const targetInfantry = Math.max(2, Math.min(7, Math.round(capturableCount * weights.captureBias)));
  if (canAfford('INFANTRY') && ownCounts.INFANTRY < targetInfantry) return 'INFANTRY';
  if ((state.fogOfWar ?? false) && capturableCount > 0 && ownCapturers < Math.max(2, Math.ceil(targetInfantry * 0.6)) && canAfford('INFANTRY')) {
    return 'INFANTRY';
  }

  const enemyAirCount = enemyCounts.FIGHTER + enemyCounts.BOMBER + enemyCounts.ATTACKER + enemyCounts.STEALTH_BOMBER + enemyCounts.AIR_TANKER + enemyCounts.TRANSPORT_HELI;
  if (enemyAirCount > 0) {
    if ((state.enableSuicideDrones ?? false) && canAfford('COUNTER_DRONE_AA') && ownCounts.COUNTER_DRONE_AA < Math.max(1, Math.ceil(enemyCounts.SUICIDE_DRONE / 2))) {
      return 'COUNTER_DRONE_AA';
    }
    if (canAfford('MISSILE_AA') && ownCounts.MISSILE_AA < Math.max(1, Math.floor(enemyAirCount / 2))) return 'MISSILE_AA';
    if (canAfford('ANTI_AIR') && ownCounts.ANTI_AIR < Math.max(1, Math.ceil(enemyAirCount / 2 * weights.antiAirBias))) return 'ANTI_AIR';
    if (canAfford('FLAK_TANK') && ownCounts.FLAK_TANK < 1) return 'FLAK_TANK';
  }

  if (profile === 'drone_swarm' && (state.enableSuicideDrones ?? false)) {
    const droneThreat = enemyCounts.SUICIDE_DRONE + enemyAirCount;
    const desiredCounterDrone = droneThreat > 0 ? Math.max(1, Math.ceil(droneThreat / 2)) : 0;
    if (desiredCounterDrone > 0 && canAfford('COUNTER_DRONE_AA') && ownCounts.COUNTER_DRONE_AA < desiredCounterDrone) {
      return 'COUNTER_DRONE_AA';
    }
  }

  if (difficulty === 'nightmare' && (state.fogOfWar ?? false) && ownCounts.RECON === 0 && canAfford('RECON')) {
    return 'RECON';
  }
  if (lowSupplyUnits >= (difficulty === 'nightmare' ? 1 : 2) && supportUnits === 0 && canAfford('SUPPLY_TRUCK') && profile !== 'hunter') {
    return 'SUPPLY_TRUCK';
  }

  const enemyArmorCount = enemyCounts.TANK + enemyCounts.HEAVY_TANK + enemyCounts.ANTI_TANK + enemyCounts.ARTILLERY + enemyCounts.ANTI_AIR + enemyCounts.FLAK_TANK + enemyCounts.MISSILE_AA;
  const ownAntiArmor = ownCounts.TANK + ownCounts.HEAVY_TANK + ownCounts.ANTI_TANK + ownCounts.ARTILLERY + ownCounts.FLAK_TANK;
  if (enemyArmorCount > ownAntiArmor && canAfford('ANTI_TANK')) return 'ANTI_TANK';

  const ownFrontline = ownCounts.TANK + ownCounts.HEAVY_TANK + ownCounts.ANTI_TANK + ownCounts.RECON + ownCounts.ANTI_AIR;
  if ((profile === 'sieger' || profile === 'turtle') && ownFrontline >= 1 && ownCounts.ARTILLERY < Math.max(1, Math.floor(ownFrontline / 2)) && canAfford('ARTILLERY')) {
    return 'ARTILLERY';
  }

  if (profile === 'hunter' && canAfford('TANK')) return 'TANK';
  if (profile === 'captain' && canAfford('RECON') && ownCounts.RECON === 0) return 'RECON';
  if (profile === 'turtle' && canAfford('MISSILE_AA') && ownCounts.MISSILE_AA === 0 && (mapHasAirport(state) || (state.enableSuicideDrones ?? false))) return 'MISSILE_AA';

  const candidates: UnitType[] = ['HEAVY_TANK', 'TANK', 'ANTI_TANK', 'RECON', 'INFANTRY', 'ARTILLERY', 'FLAK_TANK', 'MISSILE_AA', 'AIR_DEFENSE_INFANTRY', 'SUPPLY_TRUCK'];
  for (const type of candidates) {
    if (canAfford(type)) return type;
  }

  return null;
};

const selectDroneProductionUnitForTile = (
  state: GameState,
  aiPlayer: PlayerId,
  coord: Coord,
  profile: ResolvedAiProfile,
): UnitType | null => {
  if (!(state.enableSuicideDrones ?? false)) return null;
  const tile = state.map.tiles[toCoordKey(coord)];
  if (!tile || tile.terrainType !== 'FACTORY') return null;
  if (state.players[aiPlayer].funds < UNIT_DEFINITIONS.SUICIDE_DRONE.cost) return null;
  if (getDroneFactoryOpenSlots(state, coord) < (profile === 'drone_swarm' ? 1 : 2)) return null;

  const activeDrones = getAliveUnits(state, aiPlayer).filter((unit) => unit.type === 'SUICIDE_DRONE').length;
  const totalUnits = getAliveUnits(state, aiPlayer).length;
  const ratioLimit = Math.max(0, Math.min(100, state.droneAiProductionRatioLimitPercent ?? 50));
  const profileRatioLimit = profile === 'drone_swarm' ? Math.min(100, ratioLimit + 20) : ratioLimit;
  if (totalUnits > 0 && (activeDrones / totalUnits) * 100 >= profileRatioLimit) return null;

  const enemyContacts = getEstimatedEnemyContacts(state, aiPlayer);
  const enemyHighValue = enemyContacts.some((contact) => UNIT_DEFINITIONS[contact.type].cost >= 7000 || UNIT_DEFINITIONS[contact.type].movementType === 'AIR');
  if (!enemyHighValue && profile !== 'drone_swarm') return null;
  return 'SUICIDE_DRONE';
};

const selectNavalProductionUnit = (state: GameState, aiPlayer: PlayerId, profile: ResolvedAiProfile): UnitType | null => {
  if (!mapHasSea(state)) return null;
  const canAfford = (type: UnitType): boolean => state.players[aiPlayer].funds >= UNIT_DEFINITIONS[type].cost;

  const own = getAliveUnits(state, aiPlayer);
  const ownCounts = countUnitsByType(own);
  const enemyCounts = getEstimatedEnemyCounts(state, aiPlayer);
  const ownedPorts = getOwnedPorts(state, aiPlayer);
  const coastalTargets = getCapturableCoastalTargets(state, aiPlayer);
  const transportableCargoCount = own.filter((unit) => (UNIT_DEFINITIONS.LANDER.cargoUnitTypes ?? []).includes(unit.type)).length;
  const enemyAirCount = enemyCounts.FIGHTER + enemyCounts.BOMBER + enemyCounts.ATTACKER + enemyCounts.STEALTH_BOMBER + enemyCounts.AIR_TANKER + enemyCounts.TRANSPORT_HELI;
  const ownNavalCombatCount = Array.from(NAVAL_COMBAT_TYPES).reduce((sum, type) => sum + ownCounts[type], 0);
  const enemyNavalCombatCount = Array.from(NAVAL_COMBAT_TYPES).reduce((sum, type) => sum + enemyCounts[type], 0);

  if (ownedPorts.length === 0) return null;
  if (profile === 'stealth_strike' && canAfford('SUBMARINE') && ownCounts.SUBMARINE === 0) return 'SUBMARINE';
  if (ownCounts.DESTROYER === 0 && canAfford('DESTROYER')) return 'DESTROYER';
  if (coastalTargets.length > 0 && transportableCargoCount > 0 && ownCounts.LANDER === 0 && canAfford('LANDER')) return 'LANDER';
  if (enemyAirCount > 0 && ownCounts.CARRIER === 0 && canAfford('CARRIER')) return 'CARRIER';
  if (ownNavalCombatCount >= 2 && ownCounts.SUPPLY_SHIP === 0 && canAfford('SUPPLY_SHIP') && profile !== 'hunter') return 'SUPPLY_SHIP';
  if (enemyNavalCombatCount > ownNavalCombatCount && canAfford('DESTROYER')) return 'DESTROYER';
  if (profile === 'stealth_strike' && canAfford('SUBMARINE')) return 'SUBMARINE';
  if (coastalTargets.length > 0 && transportableCargoCount > ownCounts.LANDER && canAfford('LANDER')) return 'LANDER';
  return null;
};

const selectAiProductionUnitForTile = (
  state: GameState,
  aiPlayer: PlayerId,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
  plan: AiOperationalPlan,
  coord: Coord,
): UnitType | null => {
  const tile = state.map.tiles[toCoordKey(coord)];
  if (!tile) return null;

  const easyPriorities: UnitType[] = tile.terrainType === 'AIRPORT'
    ? ['FIGHTER', 'ATTACKER', 'TRANSPORT_HELI']
    : tile.terrainType === 'PORT'
      ? ['DESTROYER', 'LANDER', 'SUPPLY_SHIP']
      : ['INFANTRY', 'TANK', 'RECON', 'TRANSPORT_TRUCK'];

  if (difficulty === 'easy') {
    return easyPriorities.find((unitType) => canUnitProduceAtTile(unitType, tile) && state.players[aiPlayer].funds >= UNIT_DEFINITIONS[unitType].cost) ?? null;
  }

  const droneCandidate = selectDroneProductionUnitForTile(state, aiPlayer, coord, profile);
  if (droneCandidate) return droneCandidate;

  if (tile.terrainType === 'AIRPORT') {
    const enemyCounts = getEstimatedEnemyCounts(state, aiPlayer);
    const enemyContacts = getEstimatedEnemyContacts(state, aiPlayer);
    const enemyAir = enemyCounts.FIGHTER + enemyCounts.BOMBER + enemyCounts.ATTACKER + enemyCounts.STEALTH_BOMBER + enemyCounts.AIR_TANKER + enemyCounts.TRANSPORT_HELI;
    const enemyHighValueGround = enemyContacts.some((contact) => UNIT_DEFINITIONS[contact.type].cost >= 10000 && UNIT_DEFINITIONS[contact.type].movementType !== 'AIR');
    if (enemyAir > 0 && state.players[aiPlayer].funds >= UNIT_DEFINITIONS.FIGHTER.cost) return 'FIGHTER';
    if (profile === 'stealth_strike' && enemyHighValueGround && state.players[aiPlayer].funds >= UNIT_DEFINITIONS.STEALTH_BOMBER.cost) return 'STEALTH_BOMBER';
    if (profile === 'stealth_strike' && state.players[aiPlayer].funds >= UNIT_DEFINITIONS.AIR_TANKER.cost) {
      const ownAir = getAliveUnits(state, aiPlayer).filter((unit) => UNIT_DEFINITIONS[unit.type].movementType === 'AIR').length;
      const ownTanker = getAliveUnits(state, aiPlayer).filter((unit) => unit.type === 'AIR_TANKER').length;
      if (ownAir >= 2 && ownTanker === 0) return 'AIR_TANKER';
    }
    const transportType = shouldProduceTransport(state, aiPlayer, tile.terrainType);
    if (transportType) return transportType;
    if (state.players[aiPlayer].funds >= UNIT_DEFINITIONS.ATTACKER.cost) return 'ATTACKER';
    if (state.players[aiPlayer].funds >= UNIT_DEFINITIONS.BOMBER.cost) return 'BOMBER';
    return null;
  }

  if (tile.terrainType === 'PORT') {
    return selectNavalProductionUnit(state, aiPlayer, profile);
  }

  return shouldProduceTransport(state, aiPlayer, tile.terrainType) ?? selectNormalProductionUnit(state, aiPlayer, profile, difficulty, plan);
};

const produceForAi = (
  state: GameState,
  aiPlayer: PlayerId,
  difficulty: AiDifficulty,
  profile: ResolvedAiProfile,
  plan: AiOperationalPlan,
  deps: CommandDeps,
): GameState => {
  let working = state;
  const productionSites = Object.values(working.map.tiles)
    .filter((tile) => tile.owner === aiPlayer && (tile.terrainType === 'FACTORY' || tile.terrainType === 'AIRPORT' || tile.terrainType === 'PORT'))
    .map((tile) => tile.coord);

  for (const coord of productionSites) {
    const affordable = selectAiProductionUnitForTile(working, aiPlayer, difficulty, profile, plan, coord);
    if (!affordable) continue;

    const applied = applyCommand(working, {
      type: 'PRODUCE_UNIT',
      playerId: aiPlayer,
      factoryCoord: coord,
      unitType: affordable,
    }, deps);

    if (applied.result.ok) {
      working = refreshEnemyMemory(applied.state, aiPlayer);
    }
  }

  return working;
};
const tryCapture = (working: GameState, unitId: string, deps: CommandDeps): GameState => {
  const unit = working.units[unitId];
  if (!unit || unit.acted || !canCaptureNow(working, unit)) return working;
  const captureApplied = applyCommand(working, { type: 'CAPTURE', unitId: unit.id }, deps);
  return captureApplied.result.ok ? refreshEnemyMemory(captureApplied.state, unit.owner) : working;
};

const trySupply = (working: GameState, unitId: string, deps: CommandDeps): GameState => {
  const unit = working.units[unitId];
  if (!unit || unit.acted || !UNIT_DEFINITIONS[unit.type].resupplyTarget) return working;
  const supplyApplied = applyCommand(working, { type: 'SUPPLY', unitId: unit.id }, deps);
  return supplyApplied.result.ok ? refreshEnemyMemory(supplyApplied.state, unit.owner) : working;
};

const shouldDelaySupplyUntilAfterMove = (
  unit: UnitState,
  plan: AiOperationalPlan,
): boolean => {
  if (!UNIT_DEFINITIONS[unit.type].resupplyTarget || !plan.supplyAnchorCoord) {
    return false;
  }

  if (plan.primaryObjective === 'hq_push') {
    const anchorDistance = manhattanDistance(unit.position, plan.supplyAnchorCoord);
    const stagingDistance = plan.stagingCoord ? manhattanDistance(unit.position, plan.stagingCoord) : null;
    return anchorDistance > 1 && (stagingDistance == null || stagingDistance > 1);
  }

  if (plan.primaryObjective === 'regroup') {
    return manhattanDistance(unit.position, plan.supplyAnchorCoord) > 0;
  }

  return false;
};

const cloneGameState = (state: GameState): GameState => JSON.parse(JSON.stringify(state)) as GameState;

const getPlaybackViewer = (state: GameState): PlayerId => state.humanPlayerSide ?? getEnemyPlayer(state.currentPlayerId);

const getOwnerLabel = (viewer: PlayerId, owner: PlayerId): string => (owner === viewer ? '自軍' : '敵軍');

const createPlaybackEvent = (
  type: VisibleAiPlaybackEvent['type'],
  summary: string,
  displayState: GameState,
  focusCoord?: Coord,
  unitId?: string,
  durationMs = 700,
): VisibleAiPlaybackEvent => ({
  type,
  summary,
  displayState: cloneGameState(displayState),
  focusCoord,
  unitId,
  durationMs,
});

const getVisiblePlaybackTileKeys = (before: GameState, after: GameState, viewer: PlayerId): Set<string> => {
  const visibleTileKeys = new Set<string>(getVisibleTileCoordKeys(before, viewer));
  for (const key of getVisibleTileCoordKeys(after, viewer)) {
    visibleTileKeys.add(key);
  }
  return visibleTileKeys;
};

const buildMovePlaybackState = (
  after: GameState,
  unitId: string,
  position: Coord,
  traversedPath: Coord[],
): GameState | null => {
  const displayState = cloneGameState(after);
  const movedUnit = displayState.units[unitId];
  if (!movedUnit) {
    return null;
  }

  movedUnit.position = { ...position };
  movedUnit.lastMovePath = traversedPath.map((coord) => ({ ...coord }));

  return displayState;
};

const collectMovePlaybackEvents = (
  before: GameState,
  after: GameState,
  unitId: string,
): VisibleAiPlaybackEvent[] => {
  const viewer = getPlaybackViewer(before);
  const beforeUnit = before.units[unitId];
  const afterUnit = after.units[unitId];
  if (!beforeUnit || !afterUnit) return [];

  const path = afterUnit.lastMovePath ?? [];
  if (path.length === 0) return [];

  const visibleTileKeys = getVisiblePlaybackTileKeys(before, after, viewer);
  const startedVisible = visibleTileKeys.has(toCoordKey(beforeUnit.position));
  const stepEntries = path
    .map((coord, index) => ({ coord, index }))
    .filter(({ coord, index }) => visibleTileKeys.has(toCoordKey(coord)) || (startedVisible && index === 0));

  if (stepEntries.length === 0) return [];

  const events: VisibleAiPlaybackEvent[] = [];
  stepEntries.forEach(({ coord, index }, stepIndex) => {
    const displayState = buildMovePlaybackState(after, unitId, coord, path.slice(0, index + 1));
    if (!displayState) {
      return;
    }

    events.push(
      createPlaybackEvent(
        'move',
        `${getOwnerLabel(viewer, afterUnit.owner)}${UNIT_DEFINITIONS[afterUnit.type].label}が移動`,
        displayState,
        coord,
        unitId,
        stepIndex === stepEntries.length - 1 ? 320 : 240,
      ),
    );
  });

  return events;
};

const collectSpottedPlaybackEvents = (
  before: GameState,
  after: GameState,
): VisibleAiPlaybackEvent[] => {
  if (!(after.fogOfWar ?? false)) {
    return [];
  }

  const viewer = getPlaybackViewer(before);
  const beforeVisibleEnemyIds = getVisibleEnemyUnitIds(before, viewer);
  const afterVisibleEnemyIds = getVisibleEnemyUnitIds(after, viewer);
  const events: VisibleAiPlaybackEvent[] = [];

  for (const unitId of afterVisibleEnemyIds) {
    if (beforeVisibleEnemyIds.has(unitId)) {
      continue;
    }

    const unit = after.units[unitId];
    if (!unit) {
      continue;
    }

    events.push(
      createPlaybackEvent(
        'spotted',
        `新たに敵${UNIT_DEFINITIONS[unit.type].label}を視認`,
        after,
        unit.position,
        unitId,
        900,
      ),
    );
  }

  return events;
};

const appendTurnStartSummary = (
  items: AiTurnSummaryItem[],
  seenMessages: Set<string>,
  message: string,
  focusCoord?: Coord,
): void => {
  if (items.length >= 5 || seenMessages.has(message)) {
    return;
  }

  items.push(focusCoord ? { message, focusCoord } : { message });
  seenMessages.add(message);
};

const getHqThreatSummaryItem = (state: GameState, viewer: PlayerId): AiTurnSummaryItem | null => {
  const hqTile = Object.values(state.map.tiles).find((tile) => tile.owner === viewer && tile.terrainType === 'HQ');
  if (!hqTile) {
    return null;
  }

  const visibleEnemyIds = getVisibleEnemyUnitIds(state, viewer);
  const threateningEnemy = Object.values(state.units)
    .filter((unit) => unit.hp > 0 && visibleEnemyIds.has(unit.id))
    .find((unit) => manhattanDistance(unit.position, hqTile.coord) <= HQ_THREAT_DISTANCE);

  if (!threateningEnemy) {
    return null;
  }

  return {
    message: `HQ周辺に敵${UNIT_DEFINITIONS[threateningEnemy.type].label}が接近`,
    focusCoord: threateningEnemy.position,
  };
};

const buildTurnStartSummary = (
  before: GameState,
  after: GameState,
  playbackEvents: VisibleAiPlaybackEvent[],
): AiTurnSummaryItem[] => {
  const viewer = getPlaybackViewer(before);
  const items: AiTurnSummaryItem[] = [];
  const seenMessages = new Set<string>();
  const hqThreat = getHqThreatSummaryItem(after, viewer);

  if (hqThreat) {
    appendTurnStartSummary(items, seenMessages, hqThreat.message, hqThreat.focusCoord);
  }

  for (const type of ['property_changed', 'damage_report', 'spotted'] as const) {
    for (const event of playbackEvents.filter((candidate) => candidate.type === type)) {
      appendTurnStartSummary(items, seenMessages, event.summary, event.focusCoord);
    }
  }

  return items;
};

const collectAttackPlaybackEvents = (
  before: GameState,
  after: GameState,
  attackerId: string,
  defenderId: string,
): VisibleAiPlaybackEvent[] => {
  const viewer = getPlaybackViewer(before);
  const beforeVisibleTiles = getVisibleTileCoordKeys(before, viewer);
  const afterVisibleTiles = getVisibleTileCoordKeys(after, viewer);
  const beforeAttacker = before.units[attackerId];
  const beforeDefender = before.units[defenderId];
  const afterAttacker = after.units[attackerId];
  const afterDefender = after.units[defenderId];
  const attacker = afterAttacker ?? beforeAttacker;
  const defender = afterDefender ?? beforeDefender;
  if (!attacker || !defender) return [];

  const attackVisible = [beforeAttacker?.position, beforeDefender?.position, afterAttacker?.position, afterDefender?.position]
    .filter((coord): coord is Coord => Boolean(coord))
    .some((coord) => beforeVisibleTiles.has(toCoordKey(coord)) || afterVisibleTiles.has(toCoordKey(coord)));

  const events: VisibleAiPlaybackEvent[] = [];
  if (attackVisible) {
    events.push(
      createPlaybackEvent(
        'attack',
        `${getOwnerLabel(viewer, attacker.owner)}${UNIT_DEFINITIONS[attacker.type].label}が${getOwnerLabel(viewer, defender.owner)}${UNIT_DEFINITIONS[defender.type].label}を攻撃`,
        after,
        afterDefender?.position ?? beforeDefender?.position,
        attackerId,
        800,
      ),
    );
  }

  for (const [unitId, beforeUnit] of Object.entries(before.units)) {
    if (beforeUnit.owner !== viewer) continue;
    const afterUnit = after.units[unitId];
    const afterHp = afterUnit?.hp ?? 0;
    if (afterHp >= beforeUnit.hp) continue;
    const lostHp = beforeUnit.hp - afterHp;
    events.push(
      createPlaybackEvent(
        'damage_report',
        afterHp > 0 ? `自軍${UNIT_DEFINITIONS[beforeUnit.type].label}が${lostHp}ダメージ` : `自軍${UNIT_DEFINITIONS[beforeUnit.type].label}が撃破された`,
        after,
        afterUnit?.position ?? beforeUnit.position,
        unitId,
        900,
      ),
    );
  }

  return events;
};

const collectCapturePlaybackEvents = (
  before: GameState,
  after: GameState,
  unitId: string,
): VisibleAiPlaybackEvent[] => {
  const viewer = getPlaybackViewer(before);
  const unit = after.units[unitId] ?? before.units[unitId];
  if (!unit) return [];

  const coord = unit.position;
  const coordKey = toCoordKey(coord);
  const beforeTile = before.map.tiles[coordKey];
  const afterTile = after.map.tiles[coordKey];
  if (!beforeTile || !afterTile) return [];

  const beforeVisibleTiles = getVisibleTileCoordKeys(before, viewer);
  const afterVisibleTiles = getVisibleTileCoordKeys(after, viewer);
  const visible =
    beforeVisibleTiles.has(coordKey)
    || afterVisibleTiles.has(coordKey)
    || beforeTile.owner === viewer
    || afterTile.owner === viewer;

  if (!visible) return [];

  const terrainLabel = afterTile.terrainType;
  const events: VisibleAiPlaybackEvent[] = [];
  if (beforeTile.capturePoints !== afterTile.capturePoints || beforeTile.owner !== afterTile.owner) {
    events.push(
      createPlaybackEvent(
        'capture',
        `${getOwnerLabel(viewer, unit.owner)}${UNIT_DEFINITIONS[unit.type].label}が${terrainLabel}を占領中`,
        after,
        coord,
        unitId,
        850,
      ),
    );
  }

  if (beforeTile.owner !== afterTile.owner) {
    events.push(
      createPlaybackEvent(
        'property_changed',
        afterTile.owner === viewer ? `${terrainLabel}を奪還` : `${terrainLabel}が敵軍の支配下に入った`,
        after,
        coord,
        unitId,
        900,
      ),
    );
  }

  return events;
};

export const runAiTurnWithPlayback = (state: GameState, options: AiTurnOptions): AiTurnResult => {
  if (state.winner) {
    return { finalState: state, playbackEvents: [], turnStartSummary: [] };
  }

  const aiPlayer = state.currentPlayerId;
  const initialState = refreshEnemyMemory(state, aiPlayer);
  const resolvedProfile = resolveAiProfile(initialState, options.deps.rng);
  const operationalPlan = buildOperationalPlan(initialState, aiPlayer, options.difficulty, resolvedProfile);
  const playbackEvents: VisibleAiPlaybackEvent[] = [];
  let working: GameState = {
    ...initialState,
    resolvedAiProfile: resolvedProfile,
  };

  const unitOrder = getAliveUnits(working, aiPlayer).map((u) => u.id);

  for (const unitId of unitOrder) {
    if (working.winner) break;

    const unit = working.units[unitId];
    if (!unit || unit.owner !== aiPlayer || unit.hp <= 0) continue;

    const captured = tryCapture(working, unitId, options.deps);
    if (captured !== working) {
      playbackEvents.push(...collectCapturePlaybackEvents(working, captured, unitId));
      playbackEvents.push(...collectSpottedPlaybackEvents(working, captured));
      working = captured;
      continue;
    }

    const readyUnit = working.units[unitId];
    if (!readyUnit || readyUnit.owner !== aiPlayer || readyUnit.hp <= 0) continue;

    const firstAttackTarget = selectBestAttackTarget(working, readyUnit, options.difficulty, resolvedProfile, options.deps.rng);
    if (firstAttackTarget) {
      const attackApplied = applyCommand(working, { type: 'ATTACK', attackerId: readyUnit.id, defenderId: firstAttackTarget.id }, options.deps);
      if (attackApplied.result.ok) {
        const nextState = refreshEnemyMemory(attackApplied.state, aiPlayer);
        playbackEvents.push(...collectSpottedPlaybackEvents(working, nextState));
        playbackEvents.push(...collectAttackPlaybackEvents(working, nextState, readyUnit.id, firstAttackTarget.id));
        working = nextState;
        continue;
      }
    }

    if (options.difficulty !== 'easy' && !shouldDelaySupplyUntilAfterMove(readyUnit, operationalPlan)) {
      const supplied = trySupply(working, unitId, options.deps);
      if (supplied !== working) {
        working = supplied;
        continue;
      }
    }

    const movable = working.units[unitId];
    if (!movable || movable.moved) continue;

    const move = selectBestMove(working, movable, options.difficulty, resolvedProfile, operationalPlan, options.deps.rng);
    if (move) {
      const moveApplied = applyCommand(working, { type: 'MOVE_UNIT', unitId: movable.id, to: move.to, path: move.path }, options.deps);
      if (moveApplied.result.ok) {
        const nextState = refreshEnemyMemory(moveApplied.state, aiPlayer);
        playbackEvents.push(...collectMovePlaybackEvents(working, nextState, movable.id));
        playbackEvents.push(...collectSpottedPlaybackEvents(working, nextState));
        working = nextState;
      }
    }

    const movedUnit = working.units[unitId];
    if (!movedUnit || movedUnit.hp <= 0) continue;

    const capturedAfterMove = tryCapture(working, unitId, options.deps);
    if (capturedAfterMove !== working) {
      playbackEvents.push(...collectCapturePlaybackEvents(working, capturedAfterMove, unitId));
      playbackEvents.push(...collectSpottedPlaybackEvents(working, capturedAfterMove));
      working = capturedAfterMove;
      continue;
    }

    const postCaptureUnit = working.units[unitId];
    if (!postCaptureUnit || postCaptureUnit.hp <= 0) continue;

    if (!postCaptureUnit.acted) {
      const attackTarget = selectBestAttackTarget(working, postCaptureUnit, options.difficulty, resolvedProfile, options.deps.rng);
      if (attackTarget) {
        const attackApplied = applyCommand(working, { type: 'ATTACK', attackerId: postCaptureUnit.id, defenderId: attackTarget.id }, options.deps);
        if (attackApplied.result.ok) {
          const nextState = refreshEnemyMemory(attackApplied.state, aiPlayer);
          playbackEvents.push(...collectSpottedPlaybackEvents(working, nextState));
          playbackEvents.push(...collectAttackPlaybackEvents(working, nextState, postCaptureUnit.id, attackTarget.id));
          working = nextState;
          continue;
        }
      }
    }

    if (options.difficulty !== 'easy') {
      const suppliedAfterMove = trySupply(working, unitId, options.deps);
      if (suppliedAfterMove !== working) {
        working = suppliedAfterMove;
        continue;
      }
    }
  }

  if (!working.winner) {
    const producedState = produceForAi(working, aiPlayer, options.difficulty, resolvedProfile, operationalPlan, options.deps);
    playbackEvents.push(...collectSpottedPlaybackEvents(working, producedState));
    working = producedState;
  }

  if (!working.winner) {
    working = refreshEnemyMemory(working, aiPlayer);
    const ended = applyCommand(working, { type: 'END_TURN' }, options.deps);
    if (ended.result.ok) {
      working = {
        ...ended.state,
        enemyMemory: working.enemyMemory ?? {},
      };
    }
  }

  return {
    finalState: working,
    playbackEvents,
    turnStartSummary: buildTurnStartSummary(initialState, working, playbackEvents),
  };
};

export const runAiTurn = (state: GameState, options: AiTurnOptions): GameState =>
  runAiTurnWithPlayback(state, options).finalState;
