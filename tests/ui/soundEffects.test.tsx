import '@testing-library/jest-dom/vitest';

describe('soundEffects', () => {
  const originalAudioContext = window.AudioContext;
  const originalAudio = window.Audio;

  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: originalAudioContext,
    });
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: originalAudio,
    });
    vi.resetModules();
  });

  it('音声ファイルが使えるときはファイル再生を優先する', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const clonePlay = vi.fn().mockResolvedValue(undefined);
    const cloneNode = vi.fn(function cloneAudioNode() {
      return {
        volume: 1,
        currentTime: 0,
        play: clonePlay,
      };
    });
    const audioCtor = vi.fn(function FakeAudio(this: Record<string, unknown>, _src: string) {
      return {
        preload: 'none',
        volume: 1,
        currentTime: 0,
        play,
        cloneNode,
      };
    });

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: audioCtor,
    });

    const { playSoundEffect, resetSoundEffectsForTest, setSoundEffectsVolume, getMoveSoundEffectId } = await import('@/services/soundEffects');
    resetSoundEffectsForTest();
    setSoundEffectsVolume(70);

    playSoundEffect('confirm');

    expect(audioCtor).toHaveBeenCalledWith('./audio/se/confirm.mp3');
    expect(cloneNode).toHaveBeenCalledWith(true);
    expect(clonePlay).toHaveBeenCalled();
    expect(getMoveSoundEffectId('AIR')).toBe('move-confirm-air');
    expect(getMoveSoundEffectId('NAVAL')).toBe('move-confirm-naval');
  });

  it('音声ファイルが使えないときは AudioContext の仮音へフォールバックする', async () => {
    const oscillatorStart = vi.fn();
    const oscillatorStop = vi.fn();
    const oscillatorConnect = vi.fn();
    const gainConnect = vi.fn();
    const frequencySetValueAtTime = vi.fn();
    const gainSetValueAtTime = vi.fn();
    const gainExponentialRampToValueAtTime = vi.fn();

    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = 'running';
      destination = {} as AudioDestinationNode;
      createOscillator = vi.fn(() => ({
        type: 'sine',
        frequency: { setValueAtTime: frequencySetValueAtTime },
        connect: oscillatorConnect,
        start: oscillatorStart,
        stop: oscillatorStop,
      }));
      createGain = vi.fn(() => ({
        gain: {
          setValueAtTime: gainSetValueAtTime,
          exponentialRampToValueAtTime: gainExponentialRampToValueAtTime,
        },
        connect: gainConnect,
      }));
      resume = vi.fn().mockResolvedValue(undefined);
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const { playSoundEffect, resetSoundEffectsForTest, setSoundEffectsVolume } = await import('@/services/soundEffects');
    resetSoundEffectsForTest();
    setSoundEffectsVolume(70);

    playSoundEffect('confirm');

    expect(oscillatorStart).toHaveBeenCalled();
    expect(oscillatorStop).toHaveBeenCalled();
    expect(gainSetValueAtTime).toHaveBeenCalled();
    expect(gainExponentialRampToValueAtTime).toHaveBeenCalled();
  });

  it('音量0なら AudioContext も Audio も使わずに何もしない', async () => {
    const createOscillator = vi.fn();
    const audioCtor = vi.fn();

    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = 'running';
      destination = {} as AudioDestinationNode;
      createOscillator = createOscillator;
      createGain = vi.fn();
      resume = vi.fn().mockResolvedValue(undefined);
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext,
    });
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: audioCtor,
    });

    const { playSoundEffect, resetSoundEffectsForTest, setSoundEffectsVolume } = await import('@/services/soundEffects');
    resetSoundEffectsForTest();
    setSoundEffectsVolume(0);

    playSoundEffect('error');

    expect(audioCtor).not.toHaveBeenCalled();
    expect(createOscillator).not.toHaveBeenCalled();
  });
});


