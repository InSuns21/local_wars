import type { MovementType } from '@core/types/unit';

export type SoundEffectId =
  | 'confirm'
  | 'cancel'
  | 'error'
  | 'unit-select'
  | 'move-confirm-foot'
  | 'move-confirm-tread'
  | 'move-confirm-wheel'
  | 'move-confirm-air'
  | 'move-confirm-naval'
  | 'attack'
  | 'hit'
  | 'destroy';

type OscillatorWave = 'sine' | 'square' | 'sawtooth' | 'triangle';

type ToneStep = {
  wave: OscillatorWave;
  frequency: number;
  duration: number;
  gain: number;
  attack?: number;
  release?: number;
  startOffset?: number;
};

const DEFAULT_ATTACK = 0.005;
const DEFAULT_RELEASE = 0.06;
const SOUND_EFFECT_FILE_PATHS: Record<SoundEffectId, string> = {
  confirm: './audio/se/confirm.mp3',
  cancel: './audio/se/cancel.mp3',
  error: './audio/se/error.mp3',
  'unit-select': './audio/se/unit-select.mp3',
  'move-confirm-foot': './audio/se/move-confirm-foot.mp3',
  'move-confirm-tread': './audio/se/move-confirm-tread.mp3',
  'move-confirm-wheel': './audio/se/move-confirm-wheel.mp3',
  'move-confirm-air': './audio/se/move-confirm-air.mp3',
  'move-confirm-naval': './audio/se/move-confirm-naval.mp3',
  attack: './audio/se/attack.mp3',
  hit: './audio/se/hit.mp3',
  destroy: './audio/se/destroy.mp3',
};

const SOUND_EFFECTS: Record<SoundEffectId, ToneStep[]> = {
  confirm: [
    { wave: 'triangle', frequency: 660, duration: 0.06, gain: 0.13 },
    { wave: 'triangle', frequency: 880, duration: 0.08, gain: 0.1, startOffset: 0.045 },
  ],
  cancel: [
    { wave: 'triangle', frequency: 420, duration: 0.08, gain: 0.11 },
    { wave: 'triangle', frequency: 320, duration: 0.08, gain: 0.09, startOffset: 0.05 },
  ],
  error: [
    { wave: 'square', frequency: 230, duration: 0.08, gain: 0.12 },
    { wave: 'square', frequency: 180, duration: 0.12, gain: 0.11, startOffset: 0.04 },
  ],
  'unit-select': [
    { wave: 'sine', frequency: 540, duration: 0.05, gain: 0.09 },
    { wave: 'triangle', frequency: 720, duration: 0.05, gain: 0.08, startOffset: 0.03 },
  ],
  'move-confirm-foot': [
    { wave: 'triangle', frequency: 380, duration: 0.035, gain: 0.06 },
    { wave: 'triangle', frequency: 430, duration: 0.04, gain: 0.055, startOffset: 0.045 },
  ],
  'move-confirm-tread': [
    { wave: 'square', frequency: 150, duration: 0.06, gain: 0.1 },
    { wave: 'sawtooth', frequency: 120, duration: 0.08, gain: 0.08, startOffset: 0.035 },
  ],
  'move-confirm-wheel': [
    { wave: 'triangle', frequency: 300, duration: 0.04, gain: 0.07 },
    { wave: 'triangle', frequency: 360, duration: 0.045, gain: 0.065, startOffset: 0.03 },
    { wave: 'triangle', frequency: 410, duration: 0.04, gain: 0.055, startOffset: 0.06 },
  ],
  'move-confirm-air': [
    { wave: 'sine', frequency: 620, duration: 0.05, gain: 0.07 },
    { wave: 'triangle', frequency: 760, duration: 0.07, gain: 0.065, startOffset: 0.03 },
  ],
  'move-confirm-naval': [
    { wave: 'sawtooth', frequency: 170, duration: 0.07, gain: 0.08 },
    { wave: 'triangle', frequency: 130, duration: 0.1, gain: 0.07, startOffset: 0.04 },
  ],
  attack: [
    { wave: 'square', frequency: 180, duration: 0.06, gain: 0.11 },
    { wave: 'sawtooth', frequency: 140, duration: 0.08, gain: 0.08, startOffset: 0.03 },
  ],
  hit: [
    { wave: 'square', frequency: 220, duration: 0.05, gain: 0.1 },
    { wave: 'triangle', frequency: 150, duration: 0.09, gain: 0.08, startOffset: 0.02 },
  ],
  destroy: [
    { wave: 'sawtooth', frequency: 240, duration: 0.12, gain: 0.12 },
    { wave: 'square', frequency: 110, duration: 0.16, gain: 0.1, startOffset: 0.03 },
    { wave: 'triangle', frequency: 70, duration: 0.2, gain: 0.08, startOffset: 0.07, release: 0.12 },
  ],
};

let soundEffectsVolume = 0.7;
let audioContext: AudioContext | null = null;
let fileAudioCache: Partial<Record<SoundEffectId, HTMLAudioElement>> = {};

const clampVolume = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
};

const createFileAudio = (id: SoundEffectId): HTMLAudioElement | null => {
  if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
    return null;
  }

  try {
    const audio = new window.Audio(SOUND_EFFECT_FILE_PATHS[id]);
    audio.preload = 'auto';
    return audio;
  } catch {
    return null;
  }
};

const playFileSoundEffect = (id: SoundEffectId): boolean => {
  const baseAudio = fileAudioCache[id] ?? createFileAudio(id);
  if (!baseAudio) {
    return false;
  }

  fileAudioCache[id] = baseAudio;
  const playbackAudio = typeof baseAudio.cloneNode === 'function'
    ? (baseAudio.cloneNode(true) as HTMLAudioElement)
    : baseAudio;

  playbackAudio.volume = soundEffectsVolume;
  try {
    playbackAudio.currentTime = 0;
  } catch {
    // Ignore browsers that prevent seeking before metadata is loaded.
  }

  try {
    const playResult = playbackAudio.play();
    if (playResult && typeof playResult.catch === 'function') {
      void playResult.catch(() => undefined);
    }
    return true;
  } catch {
    return false;
  }
};

const playTone = (context: AudioContext, startTime: number, step: ToneStep): void => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const attack = step.attack ?? DEFAULT_ATTACK;
  const release = step.release ?? DEFAULT_RELEASE;
  const endTime = startTime + step.duration;

  oscillator.type = step.wave;
  oscillator.frequency.setValueAtTime(step.frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, step.gain * soundEffectsVolume), startTime + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime + release);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(endTime + release);
};

export const setSoundEffectsVolume = (volume: number): void => {
  soundEffectsVolume = clampVolume(volume) / 100;
};

export const getMoveSoundEffectId = (movementType: MovementType): SoundEffectId => {
  switch (movementType) {
    case 'FOOT':
      return 'move-confirm-foot';
    case 'TREAD':
      return 'move-confirm-tread';
    case 'WHEEL':
      return 'move-confirm-wheel';
    case 'AIR':
      return 'move-confirm-air';
    case 'NAVAL':
      return 'move-confirm-naval';
    default:
      return 'move-confirm-foot';
  }
};

export const playSoundEffect = (id: SoundEffectId): void => {
  if (soundEffectsVolume <= 0) {
    return;
  }

  if (playFileSoundEffect(id)) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }

  const steps = SOUND_EFFECTS[id];
  const now = context.currentTime + 0.001;
  steps.forEach((step) => {
    playTone(context, now + (step.startOffset ?? 0), step);
  });
};

export const playMoveSoundEffect = (movementType: MovementType): void => {
  playSoundEffect(getMoveSoundEffectId(movementType));
};

export const resetSoundEffectsForTest = (): void => {
  audioContext = null;
  soundEffectsVolume = 0.7;
  fileAudioCache = {};
};
