import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import {
  deleteSaveSlot,
  findFirstEmptySlot,
  getAllSaveSlots,
  getSaveSlot,
  type SaveSlotsRecord,
  upsertSaveSlot,
} from '@services/saveSlots';
import { appTheme } from '@/theme';
import { DEFAULT_SETTINGS, type GameSettings } from './types';

type Screen = 'title' | 'map-select' | 'settings' | 'save-select' | 'credits' | 'tutorial' | 'battle';

type OverwriteState = {
  gameState: GameState;
};

type AppProps = {
  saveSlotsStorageKey?: string;
};

export const App: React.FC<AppProps> = ({ saveSlotsStorageKey }) => {
  const [screen, setScreen] = useState<Screen>('title');
  const [tutorialReturnScreen, setTutorialReturnScreen] = useState<'title' | 'battle'>('title');
  const [selectedMapId, setSelectedMapId] = useState<string>(MAP_CATALOG[0]?.id ?? 'plains-clash');
  const [saveSlots, setSaveSlots] = useState<SaveSlotsRecord>(getAllSaveSlots(saveSlotsStorageKey));
  const [selectedSaveSlotId, setSelectedSaveSlotId] = useState<1 | 2 | 3>(1);
  const [activeStore, setActiveStore] = useState<ReturnType<typeof createGameStore> | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<1 | 2 | 3 | null>(null);
  const [activeMapId, setActiveMapId] = useState<string>('plains-clash');
  const [activeSettings, setActiveSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [deleteConfirmSlotId, setDeleteConfirmSlotId] = useState<1 | 2 | 3 | null>(null);
  const [showExitWithoutSaveConfirm, setShowExitWithoutSaveConfirm] = useState<boolean>(false);
  const [overwriteState, setOverwriteState] = useState<OverwriteState | null>(null);
  const [overwriteTargetSlotId, setOverwriteTargetSlotId] = useState<1 | 2 | 3>(1);
  const [notice, setNotice] = useState<string>('');

  const refreshSlots = (): void => {
    setSaveSlots(getAllSaveSlots(saveSlotsStorageKey));
  };

  useEffect(() => {
    refreshSlots();
  }, []);

  const startNewGame = (mapId: string, gameSettings: GameSettings): void => {
    const initialState = createInitialGameState({ mapId, settings: gameSettings });
    const store = createGameStore(initialState);
    setActiveStore(() => store);
    setActiveSlotId(null);
    setActiveMapId(mapId);
    setActiveSettings(gameSettings);
    setScreen('battle');
    setNotice('');
  };

  const loadGameFromSlot = (slotId: 1 | 2 | 3): void => {
    const slot = getSaveSlot(slotId, saveSlotsStorageKey);
    if (!slot) {
      setNotice('選択したスロットにセーブデータがありません。');
      return;
    }

    const store = createGameStore(slot.state);
    setActiveStore(() => store);
    setActiveSlotId(slotId);
    setActiveMapId(slot.mapId);
    setActiveSettings(slot.settings);
    setScreen('battle');
    setNotice('');
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

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', px: 0, py: 0 }}>
        {screen === 'title' && (
          <TitleScreen
            onStart={() => setScreen('map-select')}
            onContinue={() => {
              refreshSlots();
              setScreen('save-select');
            }}
            onCredits={() => setScreen('credits')}
            onTutorial={() => {
              setTutorialReturnScreen('title');
              setScreen('tutorial');
            }}
          />
        )}

        {screen === 'map-select' && (
          <MapSelectScreen
            maps={MAP_CATALOG}
            onConfirm={(mapId: string) => {
              setSelectedMapId(mapId);
              setScreen('settings');
            }}
            onBack={() => setScreen('title')}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            onConfirm={(nextSettings: GameSettings) => {
              startNewGame(selectedMapId, nextSettings);
            }}
            onBack={() => setScreen('map-select')}
          />
        )}

        {screen === 'save-select' && (
          <SaveSelectScreen
            slots={saveSlots}
            selectedSlotId={selectedSaveSlotId}
            onSelectSlot={(slotId: 1 | 2 | 3) => setSelectedSaveSlotId(slotId)}
            onConfirmLoad={() => loadGameFromSlot(selectedSaveSlotId)}
            onDelete={(slotId: 1 | 2 | 3) => setDeleteConfirmSlotId(slotId)}
            onBack={() => setScreen('title')}
          />
        )}

        {screen === 'credits' && <CreditsScreen onBack={() => setScreen('title')} />}

        {screen === 'tutorial' && <TutorialScreen onBack={() => setScreen(tutorialReturnScreen)} />}

        {screen === 'battle' && activeStore && (
          <BattleScreen
            useStore={activeStore}
            onSaveAndExit={saveAndExit}
            onExitWithoutSave={() => setShowExitWithoutSaveConfirm(true)}
            onReturnToTitle={() => setScreen('title')}
            onOpenTutorial={() => {
              setTutorialReturnScreen('battle');
              setScreen('tutorial');
            }}
          />
        )}

        {notice && (
          <Box sx={{ maxWidth: 760, mx: 'auto', mt: 1.5 }}>
            <Alert severity="warning">{notice}</Alert>
          </Box>
        )}

        {deleteConfirmSlotId && (
          <ConfirmModal
            title="セーブ削除確認"
            message={`スロット${deleteConfirmSlotId}のデータを削除しますか？`}
            confirmLabel="削除する"
            cancelLabel="キャンセル"
            onConfirm={() => {
              deleteSaveSlot(deleteConfirmSlotId, saveSlotsStorageKey);
              setDeleteConfirmSlotId(null);
              refreshSlots();
            }}
            onCancel={() => setDeleteConfirmSlotId(null)}
          />
        )}

        {showExitWithoutSaveConfirm && (
          <ConfirmModal
            title="保存しないで終了"
            message="保存せずにタイトル画面へ戻ります。よろしいですか？"
            confirmLabel="終了する"
            cancelLabel="戻る"
            onConfirm={() => {
              setShowExitWithoutSaveConfirm(false);
              setScreen('title');
            }}
            onCancel={() => setShowExitWithoutSaveConfirm(false)}
          />
        )}

        {overwriteState && (
          <Dialog
            open
            aria-modal="true"
            aria-label="保存スロット上書き選択"
            onClose={() => setOverwriteState(null)}
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
              <Button type="button" onClick={() => setOverwriteState(null)}>キャンセル</Button>
              <Button type="button" variant="contained" onClick={confirmOverwriteSave}>このスロットに保存</Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </ThemeProvider>
  );
};




