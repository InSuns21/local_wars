import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  ThemeProvider,
  Typography,
} from '@mui/material';
import type { GameState } from '@core/types/state';
import { createGameStore } from '@store/gameStore';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import { ConfirmModal } from '@components/common/ConfirmModal';
import { MAP_CATALOG } from '@data/maps';
import { CreditsScreen } from '@/screens/CreditsScreen';
import { BattleScreen } from '@/screens/BattleScreen';
import { MapSelectScreen } from '@/screens/MapSelectScreen';
import { SaveSelectScreen } from '@/screens/SaveSelectScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { TitleScreen } from '@/screens/TitleScreen';
import { TutorialScreen } from '@/screens/TutorialScreen';
import { AudioSettingsScreen } from '@/screens/AudioSettingsScreen';
import {
  deleteSaveSlot,
  findFirstEmptySlot,
  getAllSaveSlots,
  getSaveSlot,
  type SaveSlotsRecord,
  upsertSaveSlot,
} from '@services/saveSlots';
import { getBgmTrackByContext, type BgmContext } from '@services/bgmTracks';
import { loadBgmVolume, saveBgmVolume } from '@services/bgmVolume';
import { loadSeVolume, saveSeVolume } from '@services/seVolume';
import { playSoundEffect, setSoundEffectsVolume, type SoundEffectId } from '@services/soundEffects';
import { appTheme } from '@/theme';
import { DEFAULT_SETTINGS, GAME_SETTINGS_PRESETS, type GameSettings } from './types';

type Screen = 'title' | 'map-select' | 'settings' | 'save-select' | 'credits' | 'tutorial' | 'battle' | 'audio-settings';

type OverwriteState = {
  gameState: GameState;
};

type AppProps = {
  saveSlotsStorageKey?: string;
};

const toGain = (volumePercent: number): number => Math.max(0, Math.min(1, volumePercent / 100));
const isAudioDisabled = process.env.NODE_ENV === 'test';
const DRONE_FOCUSED_MAP_IDS = new Set(['drone-factory-front', 'interceptor-belt', 'industrial-drone-raid']);

const tryPlay = async (audio: HTMLAudioElement): Promise<boolean> => {
  try {
    await audio.play();
    return true;
  } catch {
    return false;
  }
};

export const App: React.FC<AppProps> = ({ saveSlotsStorageKey }) => {
  const [screen, setScreen] = useState<Screen>('title');
  const [tutorialReturnScreen, setTutorialReturnScreen] = useState<'title' | 'battle'>('title');
  const [selectedMapId, setSelectedMapId] = useState<string>(MAP_CATALOG[0]?.id ?? 'plains-clash');
  const [saveSlots, setSaveSlots] = useState<SaveSlotsRecord>(getAllSaveSlots(saveSlotsStorageKey));
  const [selectedSaveSlotId, setSelectedSaveSlotId] = useState<1 | 2 | 3>(1);
  const [saveSelectFeedback, setSaveSelectFeedback] = useState<string>('');
  const [activeStore, setActiveStore] = useState<ReturnType<typeof createGameStore> | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<1 | 2 | 3 | null>(null);
  const [activeMapId, setActiveMapId] = useState<string>('plains-clash');
  const [activeSettings, setActiveSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [pendingSettings, setPendingSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [deleteConfirmSlotId, setDeleteConfirmSlotId] = useState<1 | 2 | 3 | null>(null);
  const [showExitWithoutSaveConfirm, setShowExitWithoutSaveConfirm] = useState<boolean>(false);
  const [overwriteState, setOverwriteState] = useState<OverwriteState | null>(null);
  const [overwriteTargetSlotId, setOverwriteTargetSlotId] = useState<1 | 2 | 3>(1);
  const [bgmVolume, setBgmVolume] = useState<number>(loadBgmVolume());
  const [seVolume, setSeVolume] = useState<number>(loadSeVolume());
  const [isBgmBlocked, setIsBgmBlocked] = useState<boolean>(false);
  const [battleWinner, setBattleWinner] = useState<GameState['winner']>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);

  const refreshSlots = (): void => {
    setSaveSlots(getAllSaveSlots(saveSlotsStorageKey));
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  useEffect(() => {
    if (!activeStore) {
      setBattleWinner(null);
      return;
    }

    setBattleWinner(activeStore.getState().gameState.winner);
    const unsubscribe = activeStore.subscribe((state) => {
      setBattleWinner(state.gameState.winner);
    });

    return () => {
      unsubscribe();
    };
  }, [activeStore]);

  const bgmContext: BgmContext =
    screen === 'battle' && battleWinner !== null ? 'battle-result' : screen;

  useEffect(() => {
    if (isAudioDisabled) {
      return;
    }

    const src = getBgmTrackByContext(bgmContext);
    const gain = toGain(bgmVolume);

    if (!bgmAudioRef.current) {
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = gain;
      bgmAudioRef.current = audio;
      void tryPlay(audio).then((ok) => {
        setIsBgmBlocked(!ok);
      });
      return;
    }

    const audio = bgmAudioRef.current;
    audio.volume = gain;
    if (audio.src !== new URL(src, window.location.origin).toString()) {
      audio.src = src;
      audio.currentTime = 0;
      audio.load();
    }
    void tryPlay(audio).then((ok) => {
      setIsBgmBlocked(!ok);
    });
  }, [bgmContext, bgmVolume]);

  useEffect(() => {
    if (isAudioDisabled || !isBgmBlocked) {
      return;
    }

    const retryPlay = (): void => {
      const audio = bgmAudioRef.current;
      if (!audio) {
        return;
      }

      void tryPlay(audio).then((ok) => {
        if (ok) {
          setIsBgmBlocked(false);
        }
      });
    };

    window.addEventListener('pointerdown', retryPlay, { passive: true });
    window.addEventListener('touchstart', retryPlay, { passive: true });
    window.addEventListener('keydown', retryPlay);

    return () => {
      window.removeEventListener('pointerdown', retryPlay);
      window.removeEventListener('touchstart', retryPlay);
      window.removeEventListener('keydown', retryPlay);
    };
  }, [isBgmBlocked]);

  useEffect(() => {
    return () => {
      if (isAudioDisabled) {
        return;
      }

      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setSoundEffectsVolume(seVolume);
  }, [seVolume]);

  const playSe = (id: SoundEffectId): void => {
    if (isAudioDisabled) {
      return;
    }
    playSoundEffect(id);
  };

  const handleChangeBgmVolume = (volume: number): void => {
    const saved = saveBgmVolume(volume);
    setBgmVolume(saved);
  };

  const handleChangeSeVolume = (volume: number): void => {
    const saved = saveSeVolume(volume);
    setSeVolume(saved);
  };

  const startNewGame = (mapId: string, gameSettings: GameSettings): void => {
    const initialState = createInitialGameState({ mapId, settings: gameSettings });
    const store = createGameStore(initialState);
    setActiveStore(() => store);
    setActiveSlotId(null);
    setActiveMapId(mapId);
    setActiveSettings(gameSettings);
    setScreen('battle');
    setSaveSelectFeedback('');
  };

  const loadGameFromSlot = (slotId: 1 | 2 | 3): void => {
    const slot = getSaveSlot(slotId, saveSlotsStorageKey);
    if (!slot) {
      setSaveSelectFeedback('選択したスロットにセーブデータがありません。');
      return;
    }

    const store = createGameStore(slot.state);
    setActiveStore(() => store);
    setActiveSlotId(slotId);
    setActiveMapId(slot.mapId);
    setActiveSettings(slot.settings);
    setScreen('battle');
    setSaveSelectFeedback('');
  };

  const saveAndExit = (state: GameState): void => {
    if (activeSlotId) {
      upsertSaveSlot(activeSlotId, {
        mapId: activeMapId,
        state,
        settings: activeSettings,
      }, saveSlotsStorageKey);
      refreshSlots();
      setScreen('title');
      return;
    }

    const empty = findFirstEmptySlot(saveSlotsStorageKey);
    if (empty) {
      upsertSaveSlot(empty, {
        mapId: activeMapId,
        state,
        settings: activeSettings,
      }, saveSlotsStorageKey);
      refreshSlots();
      setScreen('title');
      return;
    }

    setOverwriteState({ gameState: state });
    setOverwriteTargetSlotId(1);
  };

  const confirmOverwriteSave = (): void => {
    if (!overwriteState) return;

    upsertSaveSlot(overwriteTargetSlotId, {
      mapId: activeMapId,
      state: overwriteState.gameState,
      settings: activeSettings,
    }, saveSlotsStorageKey);
    setOverwriteState(null);
    refreshSlots();
    setScreen('title');
  };

  const saveSlotSummary = useMemo(
    () => [1, 2, 3].map((n) => ({ slotId: n as 1 | 2 | 3, slot: saveSlots[String(n) as keyof SaveSlotsRecord] })),
    [saveSlots],
  );

  const latestSaveSummary = useMemo(() => {
    const latest = saveSlotSummary
      .filter((entry) => Boolean(entry.slot))
      .sort((left, right) => Date.parse(right.slot?.updatedAt ?? '') - Date.parse(left.slot?.updatedAt ?? ''))[0];

    if (!latest?.slot) {
      return null;
    }

    const mapName = MAP_CATALOG.find((map) => map.id === latest.slot?.mapId)?.name ?? latest.slot.mapId;
    return {
      slotId: latest.slotId,
      mapName,
      updatedAt: latest.slot.updatedAt,
      turn: latest.slot.state.turn,
    };
  }, [saveSlotSummary]);

  const hasAnySaveData = useMemo(
    () => saveSlotSummary.some((entry) => Boolean(entry.slot)),
    [saveSlotSummary],
  );

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', px: 0, py: 0 }}>
        {screen === 'title' && (
          <TitleScreen
            latestSaveSummary={latestSaveSummary}
            hasAnySaveData={hasAnySaveData}
            onStart={() => {
              playSe('confirm');
              setPendingSettings(DEFAULT_SETTINGS);
              setScreen('map-select');
            }}
            onContinue={() => {
              playSe('confirm');
              refreshSlots();
              setSaveSelectFeedback('');
              setScreen('save-select');
            }}
            onCredits={() => {
              playSe('confirm');
              setScreen('credits');
            }}
            onTutorial={() => {
              playSe('confirm');
              setTutorialReturnScreen('title');
              setScreen('tutorial');
            }}
            onOpenAudioSettings={() => {
              playSe('confirm');
              setScreen('audio-settings');
            }}
          />
        )}

        {screen === 'map-select' && (
          <MapSelectScreen
            maps={MAP_CATALOG}
            onConfirm={(mapId: string) => {
              playSe('confirm');
              setSelectedMapId(mapId);
              setPendingSettings(DRONE_FOCUSED_MAP_IDS.has(mapId) ? GAME_SETTINGS_PRESETS.drone : DEFAULT_SETTINGS);
              setScreen('settings');
            }}
            onBack={() => {
              playSe('cancel');
              setScreen('title');
            }}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            initialSettings={pendingSettings}
            onConfirm={(nextSettings: GameSettings) => {
              playSe('confirm');
              startNewGame(selectedMapId, nextSettings);
            }}
            onBack={() => {
              playSe('cancel');
              setScreen('map-select');
            }}
          />
        )}

        {screen === 'save-select' && (
          <SaveSelectScreen
            slots={saveSlots}
            selectedSlotId={selectedSaveSlotId}
            feedbackMessage={saveSelectFeedback}
            onSelectSlot={(slotId: 1 | 2 | 3) => {
              setSelectedSaveSlotId(slotId);
              setSaveSelectFeedback('');
            }}
            onConfirmLoad={() => {
              const slot = getSaveSlot(selectedSaveSlotId, saveSlotsStorageKey);
              playSe(slot ? 'confirm' : 'error');
              loadGameFromSlot(selectedSaveSlotId);
            }}
            onDelete={(slotId: 1 | 2 | 3) => {
              playSe('confirm');
              setDeleteConfirmSlotId(slotId);
            }}
            onBack={() => {
              playSe('cancel');
              setScreen('title');
            }}
          />
        )}

        {screen === 'credits' && <CreditsScreen onBack={() => {
          playSe('cancel');
          setScreen('title');
        }} />}

        {screen === 'tutorial' && <TutorialScreen onBack={() => {
          playSe('cancel');
          setScreen(tutorialReturnScreen);
        }} />}

        {screen === 'audio-settings' && (
          <AudioSettingsScreen
            bgmVolume={bgmVolume}
            seVolume={seVolume}
            onChangeBgmVolume={handleChangeBgmVolume}
            onChangeSeVolume={handleChangeSeVolume}
            onBack={() => {
              playSe('cancel');
              setScreen('title');
            }}
          />
        )}

        {screen === 'battle' && activeStore && (
          <BattleScreen
            useStore={activeStore}
            onSaveAndExit={(state) => {
              playSe('confirm');
              saveAndExit(state);
            }}
            onExitWithoutSave={() => {
              playSe('confirm');
              setShowExitWithoutSaveConfirm(true);
            }}
            onReturnToTitle={() => {
              playSe('cancel');
              setScreen('title');
            }}
            onOpenTutorial={() => {
              playSe('confirm');
              setTutorialReturnScreen('battle');
              setScreen('tutorial');
            }}
            onPlaySoundEffect={playSe}
          />
        )}

        {deleteConfirmSlotId && (
          <ConfirmModal
            title="セーブ削除確認"
            message={`スロット${deleteConfirmSlotId}のデータを削除しますか？`}
            confirmLabel="削除する"
            cancelLabel="キャンセル"
            onConfirm={() => {
              playSe('confirm');
              deleteSaveSlot(deleteConfirmSlotId, saveSlotsStorageKey);
              setDeleteConfirmSlotId(null);
              refreshSlots();
            }}
            onCancel={() => {
              playSe('cancel');
              setDeleteConfirmSlotId(null);
            }}
          />
        )}

        {showExitWithoutSaveConfirm && (
          <ConfirmModal
            title="保存しないで終了"
            message="保存せずにタイトル画面へ戻ります。よろしいですか？"
            confirmLabel="終了する"
            cancelLabel="戻る"
            onConfirm={() => {
              playSe('confirm');
              setShowExitWithoutSaveConfirm(false);
              setScreen('title');
            }}
            onCancel={() => {
              playSe('cancel');
              setShowExitWithoutSaveConfirm(false);
            }}
          />
        )}

        {overwriteState && (
          <Dialog
            open
            aria-modal="true"
            aria-label="保存スロット上書き選択"
            onClose={() => {
              playSe('cancel');
              setOverwriteState(null);
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>保存スロット上書き選択</DialogTitle>
            <DialogContent>
              <Typography sx={{ mb: 1.5 }}>上書きするスロットを選択してください。</Typography>

              {saveSlotSummary.map(({ slotId, slot }) => (
                <FormControlLabel
                  key={slotId}
                  control={
                    <Radio
                      name="overwrite-slot"
                      checked={overwriteTargetSlotId === slotId}
                      onChange={() => setOverwriteTargetSlotId(slotId)}
                    />
                  }
                  label={`スロット${slotId}${slot ? ` (${slot.mapId} / ${new Date(slot.updatedAt).toLocaleString()})` : ' (未保存)'}`}
                  sx={{ display: 'block' }}
                />
              ))}
            </DialogContent>
            <DialogActions>
              <Button type="button" onClick={() => {
                playSe('cancel');
                setOverwriteState(null);
              }}>キャンセル</Button>
              <Button type="button" variant="contained" onClick={() => {
                playSe('confirm');
                confirmOverwriteSave();
              }}>このスロットに保存</Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </ThemeProvider>
  );
};
