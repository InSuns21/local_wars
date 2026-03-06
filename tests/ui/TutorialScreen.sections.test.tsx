import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { TutorialScreen } from '@/screens/TutorialScreen';

describe('TutorialScreen UIテスト: セクション分割', () => {
  it('初期表示で3分で分かる基本操作が表示される', () => {
    render(<TutorialScreen onBack={() => {}} />);

    expect(screen.getByRole('button', { name: '3分で分かる基本操作' })).toBeInTheDocument();
    expect(screen.getByText('基本操作の流れ')).toBeInTheDocument();
    expect(screen.getByText(/1. ユニット情報で自軍ユニットを確認する/)).toBeInTheDocument();
    expect(screen.getByText(/5. ターン終了で相手手番へ進める/)).toBeInTheDocument();
  });

  it('基本操作編に対局画面のUIラベルが含まれる', () => {
    render(<TutorialScreen onBack={() => {}} />);

    expect(screen.getByText('ユニット情報')).toBeInTheDocument();
    expect(screen.getByText('実行コマンド')).toBeInTheDocument();
    expect(screen.getByText(/盤面凡例 \/ 経過ログ/)).toBeInTheDocument();
  });

  it('詳細ルールに切り替えると参照用ルール群が表示される', () => {
    render(<TutorialScreen onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '詳細ルール' }));

    expect(screen.getByText('勝利条件')).toBeInTheDocument();
    expect(screen.getByText('地形と拠点')).toBeInTheDocument();
    expect(screen.getByText('補給と索敵')).toBeInTheDocument();
    expect(screen.getByText('生産とユニット相性')).toBeInTheDocument();
    expect(screen.queryByText('基本操作の流れ')).not.toBeInTheDocument();
  });
});
