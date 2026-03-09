import '@testing-library/jest-dom';

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
    jest.resetModules();
  });

  it('音声ファイルが使えるときはファイル再生を優先する', async () => {
    const play = jest.fn().mockResolvedValue(undefined);
    const clonePlay = jest.fn().mockResolvedValue(undefined);
    const cloneNode = jest.fn(() => ({
      volume: 1,
      currentTime: 0,
      play: clonePlay,
    }));
    const audioCtor = jest.fn(() => ({
      preload: 'none',
      volume: 1,
      currentTime: 0,
      play,
      cloneNode,
    }));

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
    const oscillatorStart = jest.fn();
    const oscillatorStop = jest.fn();
    const oscillatorConnect = jest.fn();
    const gainConnect = jest.fn();
    const frequencySetValueAtTime = jest.fn();
    const gainSetValueAtTime = jest.fn();
    const gainExponentialRampToValueAtTime = jest.fn();

    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = 'running';
      destination = {} as AudioDestinationNode;
      createOscillator = jest.fn(() => ({
        type: 'sine',
        frequency: { setValueAtTime: frequencySetValueAtTime },
        connect: oscillatorConnect,
        start: oscillatorStart,
        stop: oscillatorStop,
      }));
      createGain = jest.fn(() => ({
        gain: {
          setValueAtTime: gainSetValueAtTime,
          exponentialRampToValueAtTime: gainExponentialRampToValueAtTime,
        },
        connect: gainConnect,
      }));
      resume = jest.fn().mockResolvedValue(undefined);
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
    const createOscillator = jest.fn();
    const audioCtor = jest.fn();

    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = 'running';
      destination = {} as AudioDestinationNode;
      createOscillator = createOscillator;
      createGain = jest.fn();
      resume = jest.fn().mockResolvedValue(undefined);
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
