export const SE_VOLUME_STORAGE_KEY = 'local_wars_se_volume_v1';
export const DEFAULT_SE_VOLUME = 0;

const clampVolume = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const loadSeVolume = (): number => {
  const raw = localStorage.getItem(SE_VOLUME_STORAGE_KEY);
  if (raw === null) return DEFAULT_SE_VOLUME;

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return DEFAULT_SE_VOLUME;
  return clampVolume(parsed);
};

export const saveSeVolume = (value: number): number => {
  const normalized = clampVolume(value);
  localStorage.setItem(SE_VOLUME_STORAGE_KEY, String(normalized));
  return normalized;
};
