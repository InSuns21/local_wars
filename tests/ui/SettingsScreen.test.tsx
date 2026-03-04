import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsScreen } from '@/screens/SettingsScreen';
import type { GameSettings } from '@/app/types';

describe('SettingsScreen 人間担当陣営設定', () => {
  it('人間担当陣営でP2を選択して開始時に値が渡る', () => {
    let submitted: GameSettings | null = null;

    render(
      <SettingsScreen
        onConfirm={(settings) => {
          submitted = settings;
        }}
        onBack={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText('人間が担当する陣営'), { target: { value: 'P2' } });
    fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));

    expect(submitted).not.toBeNull();
    expect(submitted?.humanPlayerSide).toBe('P2');
  });
});



