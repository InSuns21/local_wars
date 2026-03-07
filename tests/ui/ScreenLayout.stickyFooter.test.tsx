import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MapSelectScreen } from '@/screens/MapSelectScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SaveSelectScreen } from '@/screens/SaveSelectScreen';
import { CreditsScreen } from '@/screens/CreditsScreen';
import { TutorialScreen } from '@/screens/TutorialScreen';
import type { SaveSlotsRecord } from '@/services/saveSlots';

const expectStickyLayout = (scrollContentTestId: string, footerTestId: string): void => {
  expect(screen.getByRole('main')).toHaveStyle({ height: '100vh', overflow: 'hidden' });
  expect(screen.getByTestId(scrollContentTestId)).toHaveStyle({ overflowY: 'auto' });
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

    expectStickyLayout('map-select-scroll-content', 'map-select-footer');
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

  it('クレジット画面', () => {
    render(<CreditsScreen onBack={() => {}} />);

    expectStickyLayout('credits-scroll-content', 'credits-footer');
  });

  it('チュートリアル画面', () => {
    render(<TutorialScreen onBack={() => {}} />);

    expectStickyLayout('tutorial-scroll-content', 'tutorial-footer');
  });
});
