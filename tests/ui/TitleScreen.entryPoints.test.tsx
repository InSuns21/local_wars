import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { TitleScreen } from '@/screens/TitleScreen';

describe('TitleScreen UIテスト: 導線', () => {
  it('セーブなし時ははじめからが主導線で、つづきからは無効になる', () => {
    render(
      <TitleScreen
        hasAnySaveData={false}
        latestSaveSummary={null}
        onStart={() => {}}
        onContinue={() => {}}
        onCredits={() => {}}
        onTutorial={() => {}}
        onOpenAudioSettings={() => {}}
      />,
    );

    expect(screen.getByText('地形と拠点を取り合う、ローカル完結のターン制戦略ゲーム')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'はじめから' })).toHaveClass('MuiButton-contained');
    expect(screen.getByRole('button', { name: 'つづきから' })).toBeDisabled();
    expect(screen.getByText('保存データはまだありません')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3分で分かる基本操作を見る' })).toBeInTheDocument();
  });

  it('セーブあり時は最新セーブ要約が表示され、つづきからが主導線になる', () => {
    render(
      <TitleScreen
        hasAnySaveData
        latestSaveSummary={{
          slotId: 2,
          mapName: '平原会戦',
          updatedAt: '2026-03-06T08:00:00.000Z',
          turn: 5,
        }}
        onStart={() => {}}
        onContinue={() => {}}
        onCredits={() => {}}
        onTutorial={() => {}}
        onOpenAudioSettings={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'つづきから' })).toBeEnabled();
    expect(screen.getByText('最新の続き: スロット2')).toBeInTheDocument();
    expect(screen.getByText('マップ: 平原会戦')).toBeInTheDocument();
    expect(screen.getByText('ターン: 5')).toBeInTheDocument();
    expect(screen.getByText('推奨: つづきから')).toBeInTheDocument();
  });
});

