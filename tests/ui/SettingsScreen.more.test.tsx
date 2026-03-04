import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsScreen } from '@/screens/SettingsScreen';

describe('SettingsScreen 追加UIカバレッジ', () => {
  it('各設定を変更して開始すると変更値が渡る', () => {
    const onConfirm = jest.fn();

    render(<SettingsScreen onConfirm={onConfirm} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText(/AI/), { target: { value: 'hard' } });
    fireEvent.change(screen.getByLabelText('人間が担当する陣営'), { target: { value: 'P2' } });
    fireEvent.click(screen.getByLabelText('索敵あり'));
    fireEvent.change(screen.getByLabelText('初期資金'), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText('1ターン収入（都市/工場/司令部）'), { target: { value: '777' } });
    fireEvent.change(screen.getByLabelText('都市のHP回復量（ターン開始時）'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('工場のHP回復量（ターン開始時）'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('HQのHP回復量（ターン開始時）'), { target: { value: '6' } });
    fireEvent.click(screen.getByLabelText('航空ユニットあり'));
    fireEvent.click(screen.getByLabelText('海ユニットあり'));
    fireEvent.click(screen.getByLabelText('燃料補給あり'));
    fireEvent.click(screen.getByLabelText('弾薬補給あり'));

    fireEvent.click(screen.getByRole('button', { name: 'この設定で開始' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const submitted = onConfirm.mock.calls[0][0];
    expect(submitted.aiDifficulty).toBe('hard');
    expect(submitted.humanPlayerSide).toBe('P2');
    expect(submitted.fogOfWar).toBe(true);
    expect(submitted.initialFunds).toBe(12345);
    expect(submitted.incomePerProperty).toBe(777);
    expect(submitted.hpRecoveryCity).toBe(2);
    expect(submitted.hpRecoveryFactory).toBe(4);
    expect(submitted.hpRecoveryHq).toBe(6);
    expect(submitted.enableAirUnits).toBe(false);
    expect(submitted.enableNavalUnits).toBe(false);
    expect(submitted.enableFuelSupply).toBe(false);
    expect(submitted.enableAmmoSupply).toBe(false);
    expect(submitted.showEnemyActionLogs).toBe(false);
  });

  it('初期資金が負数のとき開始ボタンが無効になる', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.change(screen.getByLabelText('初期資金'), { target: { value: '-1' } });

    expect(screen.getByRole('button', { name: 'この設定で開始' })).toBeDisabled();
  });

  it('拠点HP回復量が負数のとき開始ボタンが無効になる', () => {
    render(<SettingsScreen onConfirm={() => {}} onBack={() => {}} />);

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






