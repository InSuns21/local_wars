import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@/app/types';
import { MapSelectScreen } from '@/screens/MapSelectScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SaveSelectScreen } from '@/screens/SaveSelectScreen';
import { CreditsScreen } from '@/screens/CreditsScreen';
import { TutorialScreen } from '@/screens/TutorialScreen';
import { createInitialGameState } from '@core/engine/createInitialGameState';
import type { SaveSlotsRecord } from '@/services/saveSlots';

const expectStickyLayout = (
  scrollContentTestId: string,
  footerTestId: string,
  scrollStyle: Record<string, string> = { overflowY: 'auto' },
): void => {
  expect(screen.getByRole('main')).toHaveStyle({ height: '100vh', overflow: 'hidden' });
  expect(screen.getByTestId(scrollContentTestId)).toHaveStyle(scrollStyle);
  expect(screen.getByTestId(footerTestId)).toHaveStyle({ flexShrink: '0' });
};

describe('Screen layout: 内容スクロール + 固定フッター', () => {
  it('マップ選択画面', () => {
    render(
      <MapSelectScreen
        maps={[{
          id: 'map-a',
          name: 'Map A',
          width: 10,
          height: 10,
          difficulty: 'beginner',
          estimatedMinutes: 15,
          victoryHint: '中央制圧',
          featureTags: ['平地多め'],
          summary: 'レイアウト確認用のダミーマップ',
        }]}
        onConfirm={() => {}}
        onBack={() => {}}
      />,
    );

    expectStickyLayout('map-select-scroll-content', 'map-select-footer', { overflow: 'hidden' });
    expect(screen.getByTestId('map-select-card-list')).toHaveStyle({ overflowY: 'auto' });
    expect(screen.getByTestId('map-select-detail-panel')).toHaveStyle({ overflowY: 'auto' });
  });

  it('設定画面', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    expectStickyLayout('settings-scroll-content', 'settings-footer');
  });

  it('セーブ選択画面', () => {
    const slots: SaveSlotsRecord = { '1': null, '2': null, '3': null };

    render(
      <SaveSelectScreen
        slots={slots}
        selectedSlotId={1}
        onSelectSlot={() => {}}
        onConfirmLoad={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    expectStickyLayout('save-select-scroll-content', 'save-select-footer');
  });

  it('セーブ選択画面でnightmare難易度をめちゃつよ表示する', () => {
    const nightmareSettings = {
      ...DEFAULT_SETTINGS,
      aiDifficulty: 'nightmare' as const,
      selectedAiProfile: 'captain' as const,
    };
    const slots: SaveSlotsRecord = {
      '1': {
        slotId: 1,
        updatedAt: '2026-03-21T00:00:00.000Z',
        mapId: 'plains-clash',
        settings: nightmareSettings,
        state: createInitialGameState({ mapId: 'plains-clash', settings: nightmareSettings }),
      },
      '2': null,
      '3': null,
    };

    render(
      <SaveSelectScreen
        slots={slots}
        selectedSlotId={1}
        onSelectSlot={() => {}}
        onConfirmLoad={() => {}}
        onDelete={() => {}}
        onBack={() => {}}
      />,
    );

    expect(screen.getByText(/設定: AI:めちゃつよ/)).toBeInTheDocument();
    expect(screen.getByText(/傾向:占領/)).toBeInTheDocument();
  });

  it('クレジット画面', () => {
    render(<CreditsScreen onBack={() => {}} />);

    expectStickyLayout('credits-scroll-content', 'credits-footer');
  });

  it('チュートリアル画面', () => {
    render(<TutorialScreen onBack={() => {}} />);

    expectStickyLayout('tutorial-scroll-content', 'tutorial-footer');
  });
});

