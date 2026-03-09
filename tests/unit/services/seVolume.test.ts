import '@testing-library/jest-dom';
import { DEFAULT_SE_VOLUME, SE_VOLUME_STORAGE_KEY, loadSeVolume, saveSeVolume } from '@/services/seVolume';

describe('seVolume', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('保存値がない時は既定値を返す', () => {
    expect(loadSeVolume()).toBe(DEFAULT_SE_VOLUME);
  });

  it('0-100へ丸めて保存する', () => {
    expect(saveSeVolume(123)).toBe(100);
    expect(localStorage.getItem(SE_VOLUME_STORAGE_KEY)).toBe('100');
    expect(saveSeVolume(-5)).toBe(0);
    expect(localStorage.getItem(SE_VOLUME_STORAGE_KEY)).toBe('0');
  });
});
