import { useEffect, useState } from 'react';

const isDronePreset = (settings: {
  enableSuicideDrones?: boolean;
  fogOfWar?: boolean;
}): boolean => Boolean(settings.enableSuicideDrones && settings.fogOfWar);

vi.mock('@/screens/BattleScreen', async () => await import('./mockBattleScreen'));

vi.mock('@/screens/TitleScreen', () => ({
  TitleScreen: ({
    hasAnySaveData,
    onContinue,
    onCredits,
    onOpenAudioSettings,
    onStart,
    onTutorial,
  }: {
    hasAnySaveData: boolean;
    onContinue: () => void;
    onCredits: () => void;
    onOpenAudioSettings: () => void;
    onStart: () => void;
    onTutorial: () => void;
  }) => (
    <main>
      <h1>LOCAL WARS</h1>
      <button type="button" onClick={onStart}>はじめから</button>
      <button type="button" onClick={onContinue} disabled={!hasAnySaveData}>つづきから</button>
      <button type="button" onClick={onCredits}>クレジット</button>
      <button type="button" onClick={onTutorial}>3分で分かる基本操作を見る</button>
      <button type="button" onClick={onOpenAudioSettings}>音量設定</button>
    </main>
  ),
}));

vi.mock('@/screens/MapSelectScreen', () => ({
  MapSelectScreen: ({
    maps,
    onBack,
    onConfirm,
  }: {
    maps: Array<{ id: string; name: string }>;
    onBack: () => void;
    onConfirm: (mapId: string) => void;
  }) => {
    const [selectedMapId, setSelectedMapId] = useState(maps[0]?.id ?? '');

    return (
      <main>
        <h1>マップ選択</h1>
        {maps.map((map) => (
          <button
            key={map.id}
            type="button"
            aria-pressed={selectedMapId === map.id}
            onClick={() => setSelectedMapId(map.id)}
          >
            {map.name}
          </button>
        ))}
        <button type="button" onClick={() => onConfirm(selectedMapId)}>このマップで確定</button>
        <button type="button" onClick={onBack}>戻る</button>
      </main>
    );
  },
}));

vi.mock('@/screens/SettingsScreen', () => ({
  SettingsScreen: ({
    initialSettings,
    onBack,
    onConfirm,
  }: {
    initialSettings?: {
      aiDifficulty?: 'easy' | 'normal' | 'hard' | 'nightmare';
      enableSuicideDrones?: boolean;
      fogOfWar?: boolean;
      humanPlayerSide?: 'P1' | 'P2';
    };
    onBack: () => void;
    onConfirm: (settings: {
      aiDifficulty?: 'easy' | 'normal' | 'hard' | 'nightmare';
      enableSuicideDrones?: boolean;
      fogOfWar?: boolean;
      humanPlayerSide?: 'P1' | 'P2';
    }) => void;
  }) => {
    const [settings, setSettings] = useState(() => ({
      aiDifficulty: initialSettings?.aiDifficulty ?? 'normal',
      enableSuicideDrones: initialSettings?.enableSuicideDrones ?? false,
      fogOfWar: initialSettings?.fogOfWar ?? false,
      humanPlayerSide: initialSettings?.humanPlayerSide ?? 'P1',
    }));

    useEffect(() => {
      setSettings({
        aiDifficulty: initialSettings?.aiDifficulty ?? 'normal',
        enableSuicideDrones: initialSettings?.enableSuicideDrones ?? false,
        fogOfWar: initialSettings?.fogOfWar ?? false,
        humanPlayerSide: initialSettings?.humanPlayerSide ?? 'P1',
      });
    }, [initialSettings]);

    return (
      <main>
        <h1>設定</h1>
        <label>
          人間が担当する陣営
          <select
            aria-label="人間が担当する陣営"
            value={settings.humanPlayerSide}
            onChange={(event) => setSettings((prev) => ({
              ...prev,
              humanPlayerSide: event.target.value as 'P1' | 'P2',
            }))}
          >
            <option value="P1">P1</option>
            <option value="P2">P2</option>
          </select>
        </label>
        <label>
          AIの強さ
          <select
            aria-label="AIの強さ"
            value={settings.aiDifficulty}
            onChange={(event) => setSettings((prev) => ({
              ...prev,
              aiDifficulty: event.target.value as 'easy' | 'normal' | 'hard' | 'nightmare',
            }))}
          >
            <option value="easy">easy</option>
            <option value="normal">normal</option>
            <option value="hard">hard</option>
            <option value="nightmare">nightmare</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.fogOfWar}
            onChange={(event) => setSettings((prev) => ({
              ...prev,
              fogOfWar: event.target.checked,
            }))}
          />
          索敵あり
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.enableSuicideDrones}
            onChange={(event) => setSettings((prev) => ({
              ...prev,
              enableSuicideDrones: event.target.checked,
            }))}
          />
          自爆ドローン有効
        </label>
        <p>現在の状態: {isDronePreset(settings) ? 'ドローン戦' : '通常戦'}</p>
        <button type="button" onClick={() => onConfirm(settings)}>この設定で開始</button>
        <button type="button" onClick={onBack}>戻る</button>
      </main>
    );
  },
}));

vi.mock('@/screens/SaveSelectScreen', () => ({
  SaveSelectScreen: ({
    feedbackMessage,
    onBack,
    onConfirmLoad,
    onDelete,
    onSelectSlot,
    selectedSlotId,
    slots,
  }: {
    feedbackMessage?: string;
    onBack: () => void;
    onConfirmLoad: () => void;
    onDelete: (slotId: 1 | 2 | 3) => void;
    onSelectSlot: (slotId: 1 | 2 | 3) => void;
    selectedSlotId: 1 | 2 | 3;
    slots: Record<string, { mapId: string } | null>;
  }) => {
    const selectedSlot = slots[String(selectedSlotId)];
    const canLoad = Boolean(selectedSlot);

    return (
      <main>
        <h1>セーブ選択</h1>
        {[1, 2, 3].map((slotId) => {
          const slot = slots[String(slotId)];
          return (
            <div key={slotId} className="MuiCard-root">
              <label>
                <input
                  aria-label={`スロット${slotId}`}
                  checked={selectedSlotId === slotId}
                  name="save-slot"
                  type="radio"
                  onChange={() => onSelectSlot(slotId as 1 | 2 | 3)}
                />
                {`スロット${slotId}`}
              </label>
              <p>{slot ? slot.mapId : '未保存'}</p>
              {slot ? <button type="button" onClick={() => onDelete(slotId as 1 | 2 | 3)}>削除</button> : null}
            </div>
          );
        })}
        <p>{canLoad ? 'このスロットはロードできます。' : 'ロード不可: セーブデータを選択してください。'}</p>
        {feedbackMessage ? <p>{feedbackMessage}</p> : null}
        <button type="button" disabled={!canLoad} onClick={onConfirmLoad}>
          {canLoad ? 'このスロットで開始' : 'ロード不可'}
        </button>
        <button type="button" onClick={onBack}>タイトルへ戻る</button>
      </main>
    );
  },
}));

vi.mock('@/screens/CreditsScreen', () => ({
  CreditsScreen: ({ onBack }: { onBack: () => void }) => (
    <main>
      <h1>クレジット</h1>
      <button type="button" onClick={onBack}>タイトルへ戻る</button>
    </main>
  ),
}));

vi.mock('@/screens/TutorialScreen', () => ({
  TutorialScreen: ({ onBack }: { onBack: () => void }) => {
    const [section, setSection] = useState<'basic' | 'detail'>('basic');

    return (
      <main>
        <h1>チュートリアル</h1>
        {section === 'basic' ? <h2>基本操作の流れ</h2> : <h2>勝利条件</h2>}
        <button type="button" onClick={() => setSection('detail')}>詳細ルール</button>
        <button type="button" onClick={onBack}>戻る</button>
      </main>
    );
  },
}));

vi.mock('@/screens/AudioSettingsScreen', () => ({
  AudioSettingsScreen: ({ onBack }: { onBack: () => void }) => (
    <main>
      <h1>音量設定</h1>
      <button type="button" onClick={onBack}>タイトルへ戻る</button>
    </main>
  ),
}));

vi.mock('@components/common/ConfirmModal', () => ({
  ConfirmModal: ({
    cancelLabel,
    confirmLabel,
    message,
    onCancel,
    onConfirm,
    title,
  }: {
    cancelLabel: string;
    confirmLabel: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    title: string;
  }) => (
    <div aria-label={title} role="dialog">
      <h2>{title}</h2>
      <p>{message}</p>
      <button type="button" onClick={onConfirm}>{confirmLabel}</button>
      <button type="button" onClick={onCancel}>{cancelLabel}</button>
    </div>
  ),
}));
