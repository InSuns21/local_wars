import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsScreen } from '@/screens/SettingsScreen';
import type { GameSettings } from '@/app/types';

describe('SettingsScreen 人間担当陣営設定', () => {
  it('人間担当陣営でP2を選択して開始時に値が渡る', () => {
    const onConfirm = vi.fn<(settings: GameSettings) => void>();

    render(
      <SettingsScreen
        onConfirm={onConfirm}
        onBack={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText('人間が担当する陣営'), { target: { value: 'P2' } });
    fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const submitted = onConfirm.mock.calls[0]?.[0];
    expect(submitted?.humanPlayerSide).toBe('P2');
  });
});





