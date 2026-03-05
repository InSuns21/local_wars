import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { AudioSettingsScreen } from '@/screens/AudioSettingsScreen';

describe('AudioSettingsScreen', () => {
  it('現在の音量を表示し、戻るボタンでonBackが呼ばれる', () => {
    const onBack = jest.fn();

    render(<AudioSettingsScreen volume={42} onChangeVolume={() => {}} onBack={onBack} />);

    expect(screen.getByRole('heading', { name: '音量設定' })).toBeInTheDocument();
    expect(screen.getByText('BGM音量: 42%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'タイトルへ戻る' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
