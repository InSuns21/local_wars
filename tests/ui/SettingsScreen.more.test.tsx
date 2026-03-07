import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsScreen } from '@/screens/SettingsScreen';

describe('SettingsScreen 追加UIカバレッジ', () => {
  it('各設定を変更して開始すると変更値が渡る', () => {
    const onConfirm = jest.fn();

    render(<SettingsScreen onConfirm={onConfirm} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('AIの強さ'), { target: { value: 'hard' } });
    fireEvent.change(screen.getByLabelText('人間が担当する陣営'), { target: { value: 'P2' } });
    fireEvent.click(screen.getByLabelText('索敵あり'));
    fireEvent.click(screen.getByRole('button', { name: /詳細設定/ }));
    fireEvent.change(screen.getByLabelText('初期資金'), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText('1ターン収入（都市/工場/司令部）'), { target: { value: '777' } });
    fireEvent.change(screen.getByLabelText('1ターン収入（空港）'), { target: { value: '888' } });
    fireEvent.change(screen.getByLabelText('1ターン収入（港湾）'), { target: { value: '999' } });
    fireEvent.change(screen.getByLabelText('都市のHP回復量（ターン開始時）'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('工場のHP回復量（ターン開始時）'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('HQのHP回復量（ターン開始時）'), { target: { value: '6' } });
    fireEvent.click(screen.getByLabelText('燃料消費あり'));
    fireEvent.click(screen.getByLabelText('弾薬消費あり'));

    fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const submitted = onConfirm.mock.calls[0][0];
    expect(submitted.aiDifficulty).toBe('hard');
    expect(submitted.humanPlayerSide).toBe('P2');
    expect(submitted.fogOfWar).toBe(true);
    expect(submitted.initialFunds).toBe(12345);
    expect(submitted.incomePerProperty).toBe(777);
    expect(submitted.incomeAirport).toBe(888);
    expect(submitted.incomePort).toBe(999);
    expect(submitted.hpRecoveryCity).toBe(2);
    expect(submitted.hpRecoveryFactory).toBe(4);
    expect(submitted.hpRecoveryHq).toBe(6);
    expect(submitted.enableAirUnits).toBe(true);
    expect(submitted.enableNavalUnits).toBe(true);
    expect(submitted.enableFuelSupply).toBe(false);
    expect(submitted.enableAmmoSupply).toBe(false);
    expect(submitted.showEnemyActionLogs).toBe(false);
  });

  it('詳細設定が初期状態で閉じている', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    expect(screen.getByRole('button', { name: /詳細設定/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('プリセット変更で複数フィールドが更新される', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('プリセット'), { target: { value: 'beginner' } });
    fireEvent.click(screen.getByRole('button', { name: /詳細設定/ }));

    expect(screen.getByLabelText('AIの強さ')).toHaveValue('easy');
    expect(screen.getByLabelText('索敵あり')).not.toBeChecked();
    expect(screen.getByLabelText('初期資金')).toHaveValue(15000);
    expect(screen.getByLabelText('1ターン収入（空港）')).toHaveValue(1200);
    expect(screen.getByLabelText('1ターン収入（港湾）')).toHaveValue(1200);
    expect(screen.getByLabelText('燃料消費あり')).not.toBeChecked();
    expect(screen.getByText('現在の状態: 初心者向け')).toBeInTheDocument();
  });

  it('リセットで標準値に戻る', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('プリセット'), { target: { value: 'advanced' } });
    fireEvent.click(screen.getByRole('button', { name: '標準にリセット' }));
    fireEvent.click(screen.getByRole('button', { name: /詳細設定/ }));

    expect(screen.getByLabelText('AIの強さ')).toHaveValue('normal');
    expect(screen.getByLabelText('初期資金')).toHaveValue(10000);
    expect(screen.getByLabelText('1ターン収入（空港）')).toHaveValue(1000);
    expect(screen.getByLabelText('1ターン収入（港湾）')).toHaveValue(1000);
    expect(screen.getByLabelText('燃料消費あり')).toBeChecked();
    expect(screen.getByText('現在の状態: 標準')).toBeInTheDocument();
  });

  it('個別変更するとカスタム表示に切り替わる', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('AIの強さ'), { target: { value: 'hard' } });

    expect(screen.getByText('現在の状態: カスタム')).toBeInTheDocument();
    const preset = screen.getByLabelText('プリセット');
    expect(within(preset).getByRole('option', { name: 'カスタム' })).toBeDisabled();
  });

  it('数値項目に許容範囲と推奨レンジが表示される', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /詳細設定/ }));

    expect(screen.getByLabelText('初期資金')).toHaveAttribute('min', '0');
    expect(screen.getByLabelText('初期資金')).toHaveAttribute('max', '50000');
    expect(screen.getByText(/標準値: 10000/)).toBeInTheDocument();
    expect(screen.getByText(/推奨: 8000-15000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '詳細設定を標準へ戻す' })).toBeInTheDocument();
  });

  it('許容範囲外の数値を入れると開始ボタンが無効になり、警告が出る', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /詳細設定/ }));
    fireEvent.change(screen.getByLabelText('初期資金'), { target: { value: '60000' } });

    expect(screen.getByRole('button', { name: 'この設定で開始' })).toBeDisabled();
    expect(screen.getByText(/許容範囲は 0-50000/)).toBeInTheDocument();
  });

  it('拠点HP回復量が負数のとき開始ボタンが無効になる', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /詳細設定/ }));
    fireEvent.change(screen.getByLabelText('都市のHP回復量（ターン開始時）'), { target: { value: '-1' } });

    expect(screen.getByRole('button', { name: 'この設定で開始' })).toBeDisabled();
  });

  it('戻るボタンでonBackが呼ばれる', () => {
    const onBack = jest.fn();
    render(<SettingsScreen onConfirm={() => {}} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
