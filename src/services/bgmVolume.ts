export const BGM_VOLUME_STORAGE_KEY = 'local_wars_bgm_volume_v1';
export const DEFAULT_BGM_VOLUME = 0;

const clampVolume = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const loadBgmVolume = (): number => {
  const raw = localStorage.getItem(BGM_VOLUME_STORAGE_KEY);
  if (raw === null) return DEFAULT_BGM_VOLUME;

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return DEFAULT_BGM_VOLUME;
  return clampVolume(parsed);
};

export const saveBgmVolume = (value: number): number => {
  const normalized = clampVolume(value);
  localStorage.setItem(BGM_VOLUME_STORAGE_KEY, String(normalized));
  return normalized;
};
