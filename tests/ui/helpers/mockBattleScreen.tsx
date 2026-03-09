import React, { useState } from 'react';
import type { GameState } from '@core/types/state';
import type { SoundEffectId } from '@services/soundEffects';

type MockBattleScreenProps = {
  useStore?: <T>(selector: (state: { gameState: GameState }) => T) => T;
  onSaveAndExit?: (state: GameState) => void;
  onExitWithoutSave?: () => void;
  onReturnToTitle?: () => void;
  onOpenTutorial?: () => void;
  onPlaySoundEffect?: (id: SoundEffectId) => void;
};

export const BattleScreen: React.FC<MockBattleScreenProps> = ({
  useStore,
  onSaveAndExit,
  onExitWithoutSave,
  onReturnToTitle,
  onOpenTutorial,
}) => {
  const gameState = useStore ? useStore((state) => state.gameState) : null;
  const [showOtherMenu, setShowOtherMenu] = useState(false);
  const [showGameExitMenu, setShowGameExitMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  if (!gameState) {
    return null;
  }

  const maxTileX = Math.max(0, gameState.map.width - 1);
  const maxTileY = Math.max(0, gameState.map.height - 1);

  if (gameState.winner) {
    return (
      <main>
        <h1>LOCAL WARS</h1>
        <h2>対局結果</h2>
        <button type="button" onClick={() => onReturnToTitle?.()}>タイトルへ戻る</button>
      </main>
    );
  }

  return (
    <main>
      <h1>LOCAL WARS</h1>
      <p>ターン: {gameState.turn}</p>
      <p>手番: {gameState.currentPlayerId}</p>
      <button type="button" onClick={() => setShowOtherMenu((prev) => !prev)}>その他</button>
      {showOtherMenu ? (
        <div>
          <button type="button" onClick={() => setShowGameExitMenu((prev) => !prev)}>ゲーム終了</button>
          {showGameExitMenu ? (
            <div>
              <button type="button" onClick={() => onSaveAndExit?.(gameState)}>保存して終了</button>
              <button type="button" onClick={() => onExitWithoutSave?.()}>保存しないで終了</button>
            </div>
          ) : null}
          <button type="button" onClick={() => setShowHelpMenu((prev) => !prev)}>ヘルプ</button>
          {showHelpMenu ? (
            <div>
              <button type="button" onClick={() => onOpenTutorial?.()}>チュートリアル</button>
            </div>
          ) : null}
        </div>
      ) : null}
      <button type="button" aria-label={`タイル ${maxTileX},${maxTileY}`}>タイル {maxTileX},{maxTileY}</button>
    </main>
  );
};
