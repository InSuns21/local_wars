import type { EnemyMemoryEntry, GameState } from '@core/types/state';
import { DEFAULT_SETTINGS, type GameSettings } from '@/app/types';
import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';

export const DEFAULT_SAVE_SLOTS_STORAGE_KEY = 'local_wars_save_slots_v1';

const resolveStorageKey = (storageKey?: string): string => storageKey ?? DEFAULT_SAVE_SLOTS_STORAGE_KEY;

type SlotId = 1 | 2 | 3;

export type SaveSlot = {
  slotId: SlotId;
  updatedAt: string;
  mapId: string;
  state: GameState;
  settings: GameSettings;
};

export type SaveSlotsRecord = Record<'1' | '2' | '3', SaveSlot | null>;

const createEmptySlots = (): SaveSlotsRecord => ({
  '1': null,
  '2': null,
  '3': null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const normalizeSettings = (value: unknown): GameSettings => {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

  return {
    aiDifficulty:
      value.aiDifficulty === 'easy' || value.aiDifficulty === 'normal' || value.aiDifficulty === 'hard' || value.aiDifficulty === 'nightmare'
        ? value.aiDifficulty
        : DEFAULT_SETTINGS.aiDifficulty,
    selectedAiProfile:
      value.selectedAiProfile === 'auto'
      || value.selectedAiProfile === 'adaptive'
      || value.selectedAiProfile === 'balanced'
      || value.selectedAiProfile === 'captain'
      || value.selectedAiProfile === 'hunter'
      || value.selectedAiProfile === 'turtle'
      || value.selectedAiProfile === 'sieger'
      || value.selectedAiProfile === 'drone_swarm'
      || value.selectedAiProfile === 'stealth_strike'
        ? value.selectedAiProfile
        : DEFAULT_SETTINGS.selectedAiProfile,
    humanPlayerSide:
      value.humanPlayerSide === 'P1' || value.humanPlayerSide === 'P2'
        ? value.humanPlayerSide
        : DEFAULT_SETTINGS.humanPlayerSide,
    fogOfWar: typeof value.fogOfWar === 'boolean' ? value.fogOfWar : DEFAULT_SETTINGS.fogOfWar,
    initialFunds: typeof value.initialFunds === 'number' ? value.initialFunds : DEFAULT_SETTINGS.initialFunds,
    incomePerProperty:
      typeof value.incomePerProperty === 'number'
        ? value.incomePerProperty
        : DEFAULT_SETTINGS.incomePerProperty,
    incomeAirport:
      typeof value.incomeAirport === 'number'
        ? value.incomeAirport
        : DEFAULT_SETTINGS.incomeAirport,
    incomePort:
      typeof value.incomePort === 'number'
        ? value.incomePort
        : DEFAULT_SETTINGS.incomePort,
    hpRecoveryCity:
      typeof value.hpRecoveryCity === 'number'
        ? value.hpRecoveryCity
        : DEFAULT_SETTINGS.hpRecoveryCity,
    hpRecoveryFactory:
      typeof value.hpRecoveryFactory === 'number'
        ? value.hpRecoveryFactory
        : DEFAULT_SETTINGS.hpRecoveryFactory,
    hpRecoveryHq:
      typeof value.hpRecoveryHq === 'number'
        ? value.hpRecoveryHq
        : DEFAULT_SETTINGS.hpRecoveryHq,
    maxSupplyCharges:
      typeof value.maxSupplyCharges === 'number'
        ? value.maxSupplyCharges
        : DEFAULT_SETTINGS.maxSupplyCharges,
    enableAirUnits: true,
    enableNavalUnits: true,
    enableFuelSupply:
      typeof value.enableFuelSupply === 'boolean' ? value.enableFuelSupply : DEFAULT_SETTINGS.enableFuelSupply,
    enableAmmoSupply:
      typeof value.enableAmmoSupply === 'boolean' ? value.enableAmmoSupply : DEFAULT_SETTINGS.enableAmmoSupply,
    facilityCaptureCostIncreasePercent:
      typeof value.facilityCaptureCostIncreasePercent === 'number'
        ? value.facilityCaptureCostIncreasePercent
        : DEFAULT_SETTINGS.facilityCaptureCostIncreasePercent,
    showEnemyActionLogs:
      typeof value.showEnemyActionLogs === 'boolean' ? value.showEnemyActionLogs : (DEFAULT_SETTINGS.showEnemyActionLogs ?? false),
    enableSuicideDrones:
      typeof value.enableSuicideDrones === 'boolean' ? value.enableSuicideDrones : DEFAULT_SETTINGS.enableSuicideDrones,
    maxFactoryDronesPerFactory:
      typeof value.maxFactoryDronesPerFactory === 'number' ? value.maxFactoryDronesPerFactory : DEFAULT_SETTINGS.maxFactoryDronesPerFactory,
    droneInterceptionChancePercent:
      typeof value.droneInterceptionChancePercent === 'number' ? value.droneInterceptionChancePercent : DEFAULT_SETTINGS.droneInterceptionChancePercent,
    droneInterceptionMaxPerTurn:
      typeof value.droneInterceptionMaxPerTurn === 'number' ? value.droneInterceptionMaxPerTurn : DEFAULT_SETTINGS.droneInterceptionMaxPerTurn,
    droneAiProductionRatioLimitPercent:
      typeof value.droneAiProductionRatioLimitPercent === 'number' ? value.droneAiProductionRatioLimitPercent : DEFAULT_SETTINGS.droneAiProductionRatioLimitPercent,
    carrierCargoFuelRecoveryPercent:
      typeof value.carrierCargoFuelRecoveryPercent === 'number' ? value.carrierCargoFuelRecoveryPercent : DEFAULT_SETTINGS.carrierCargoFuelRecoveryPercent,
    carrierCargoAmmoRecoveryPercent:
      typeof value.carrierCargoAmmoRecoveryPercent === 'number' ? value.carrierCargoAmmoRecoveryPercent : DEFAULT_SETTINGS.carrierCargoAmmoRecoveryPercent,
    carrierCargoHpRecovery:
      typeof value.carrierCargoHpRecovery === 'number' ? value.carrierCargoHpRecovery : DEFAULT_SETTINGS.carrierCargoHpRecovery,
    carrierCargoHpRecoveryAtPort:
      typeof value.carrierCargoHpRecoveryAtPort === 'number' ? value.carrierCargoHpRecoveryAtPort : DEFAULT_SETTINGS.carrierCargoHpRecoveryAtPort,
  };
};

const inferMapIdFromState = (state: GameState): string => {
  const selected = state.actionLog.find((entry) => entry.action === 'MAP_SELECTED' && entry.detail);
  if (selected?.detail) return selected.detail;
  return 'plains-clash';
};

const normalizeUnit = (unit: GameState['units'][string], maxSupplyCharges: number): GameState['units'][string] => ({
  ...unit,
  supplyCharges: UNIT_DEFINITIONS[unit.type].resupplyTarget
    ? unit.supplyCharges ?? maxSupplyCharges
    : unit.supplyCharges,
  interceptsUsedThisTurn: unit.interceptsUsedThisTurn ?? 0,
  cargo: unit.cargo?.map((cargoUnit) => normalizeUnit(cargoUnit, maxSupplyCharges)),
});

const normalizeEnemyMemory = (value: unknown): GameState['enemyMemory'] => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([unitId, entry]) => {
      if (!isRecord(entry) || !isRecord(entry.position)) return [];
      const x = entry.position.x;
      const y = entry.position.y;
      if (typeof x !== 'number' || typeof y !== 'number') return [];
      if (typeof entry.lastSeenTurn !== 'number' || typeof entry.hpEstimate !== 'number' || typeof entry.confidence !== 'number') return [];
      if (typeof entry.type !== 'string' || !Object.prototype.hasOwnProperty.call(UNIT_DEFINITIONS, entry.type)) return [];

      return [[
        unitId,
        {
          unitId,
          position: { x, y },
          lastSeenTurn: entry.lastSeenTurn,
          type: entry.type as EnemyMemoryEntry['type'],
          hpEstimate: entry.hpEstimate,
          confidence: entry.confidence,
        },
      ]];
    }),
  );
};

const normalizeState = (state: GameState, settings: GameSettings): GameState => ({
  ...state,
  humanPlayerSide: state.humanPlayerSide ?? settings.humanPlayerSide,
  aiDifficulty: state.aiDifficulty ?? settings.aiDifficulty,
  selectedAiProfile: state.selectedAiProfile ?? settings.selectedAiProfile ?? DEFAULT_SETTINGS.selectedAiProfile,
  resolvedAiProfile: state.resolvedAiProfile,
  enemyMemory: normalizeEnemyMemory(state.enemyMemory),
  incomePerProperty: state.incomePerProperty ?? settings.incomePerProperty,
  incomeAirport: state.incomeAirport ?? settings.incomeAirport,
  incomePort: state.incomePort ?? settings.incomePort,
  hpRecoveryCity: state.hpRecoveryCity ?? settings.hpRecoveryCity,
  hpRecoveryFactory: state.hpRecoveryFactory ?? settings.hpRecoveryFactory,
  hpRecoveryHq: state.hpRecoveryHq ?? settings.hpRecoveryHq,
  maxSupplyCharges: state.maxSupplyCharges ?? settings.maxSupplyCharges,
  units: Object.fromEntries(
    Object.entries(state.units).map(([id, unit]) => [id, normalizeUnit(unit, state.maxSupplyCharges ?? settings.maxSupplyCharges)]),
  ),
  facilityCaptureCostIncreasePercent:
    state.facilityCaptureCostIncreasePercent ?? settings.facilityCaptureCostIncreasePercent ?? DEFAULT_SETTINGS.facilityCaptureCostIncreasePercent,
  showEnemyActionLogs: state.showEnemyActionLogs ?? (settings.showEnemyActionLogs ?? false),
  enableSuicideDrones: state.enableSuicideDrones ?? settings.enableSuicideDrones,
  maxFactoryDronesPerFactory: state.maxFactoryDronesPerFactory ?? settings.maxFactoryDronesPerFactory,
  droneInterceptionChancePercent: state.droneInterceptionChancePercent ?? settings.droneInterceptionChancePercent,
  droneInterceptionMaxPerTurn: state.droneInterceptionMaxPerTurn ?? settings.droneInterceptionMaxPerTurn,
  droneAiProductionRatioLimitPercent: state.droneAiProductionRatioLimitPercent ?? settings.droneAiProductionRatioLimitPercent,
  carrierCargoFuelRecoveryPercent: state.carrierCargoFuelRecoveryPercent ?? settings.carrierCargoFuelRecoveryPercent,
  carrierCargoAmmoRecoveryPercent: state.carrierCargoAmmoRecoveryPercent ?? settings.carrierCargoAmmoRecoveryPercent,
  carrierCargoHpRecovery: state.carrierCargoHpRecovery ?? settings.carrierCargoHpRecovery,
  carrierCargoHpRecoveryAtPort: state.carrierCargoHpRecoveryAtPort ?? settings.carrierCargoHpRecoveryAtPort,
  factoryProductionState: state.factoryProductionState ?? {},
});

const normalizeSlot = (slotId: SlotId, value: unknown): SaveSlot | null => {
  if (!isRecord(value) || !isRecord(value.state)) {
    return null;
  }

  const settings = normalizeSettings(value.settings);
  const state = normalizeState(value.state as GameState, settings);
  const mapId = typeof value.mapId === 'string' && value.mapId.length > 0
    ? value.mapId
    : inferMapIdFromState(state);

  return {
    slotId,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date(0).toISOString(),
    mapId,
    settings,
    state,
  };
};

const normalizeSlots = (value: unknown): SaveSlotsRecord => {
  if (!isRecord(value)) return createEmptySlots();

  return {
    '1': normalizeSlot(1, value['1']),
    '2': normalizeSlot(2, value['2']),
    '3': normalizeSlot(3, value['3']),
  };
};

export const getAllSaveSlots = (storageKey?: string): SaveSlotsRecord => {
  const raw = localStorage.getItem(resolveStorageKey(storageKey));
  if (!raw) return createEmptySlots();

  try {
    return normalizeSlots(JSON.parse(raw));
  } catch {
    return createEmptySlots();
  }
};

export const upsertSaveSlot = (slotId: SlotId, data: Omit<SaveSlot, 'slotId' | 'updatedAt'>, storageKey?: string): void => {
  const slots = getAllSaveSlots(storageKey);
  slots[String(slotId) as keyof SaveSlotsRecord] = {
    slotId,
    updatedAt: new Date().toISOString(),
    ...data,
  };
  localStorage.setItem(resolveStorageKey(storageKey), JSON.stringify(slots));
};

export const deleteSaveSlot = (slotId: SlotId, storageKey?: string): void => {
  const slots = getAllSaveSlots(storageKey);
  slots[String(slotId) as keyof SaveSlotsRecord] = null;
  localStorage.setItem(resolveStorageKey(storageKey), JSON.stringify(slots));
};

export const getSaveSlot = (slotId: SlotId, storageKey?: string): SaveSlot | null => {
  const slots = getAllSaveSlots(storageKey);
  return slots[String(slotId) as keyof SaveSlotsRecord];
};

export const findFirstEmptySlot = (storageKey?: string): SlotId | null => {
  const slots = getAllSaveSlots(storageKey);
  if (!slots['1']) return 1;
  if (!slots['2']) return 2;
  if (!slots['3']) return 3;
  return null;
};