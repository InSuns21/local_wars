import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AudioSettingsScreen } from '@/screens/AudioSettingsScreen';

describe('AudioSettingsScreen', () => {
  it('BGMとSEの現在音量を表示し、戻るボタンでonBackが呼ばれる', () => {
    const onBack = vi.fn();

    render(
      <AudioSettingsScreen
        bgmVolume={42}
        seVolume={70}
        onChangeBgmVolume={() => {}}
        onChangeSeVolume={() => {}}
        onBack={onBack}
      />,
    );

    expect(screen.getByRole('heading', { name: '音量設定' })).toBeInTheDocument();
    expect(screen.getByText('BGM音量: 42%')).toBeInTheDocument();
    expect(screen.getByText('SE音量: 70%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイトルへ戻る' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});


