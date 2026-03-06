import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapSelectScreen } from '@/screens/MapSelectScreen';
import { MAP_CATALOG } from '@/data/maps';

describe('MapSelectScreen UIテスト: 詳細プレビュー', () => {
  it('初期表示で選択中マップ詳細に比較情報が表示される', () => {
    const { container } = render(<MapSelectScreen maps={MAP_CATALOG} onConfirm={() => {}} onBack={() => {}} />);

    const detail = container.querySelector('[aria-label="選択中マップ詳細"]');
    expect(detail).not.toBeNull();
    expect(detail).toHaveTextContent('平原会戦');
    expect(detail).toHaveTextContent('初心者向け');
    expect(detail).toHaveTextContent('20 分前後');
    expect(detail).toHaveTextContent('中央工場');
    expect(detail).toHaveTextContent('初回プレイにおすすめ');
  });

  it('マップを切り替えると詳細プレビューが同期して変わる', () => {
    const { container } = render(<MapSelectScreen maps={MAP_CATALOG} onConfirm={() => {}} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /河川突破/ }));

    const detail = container.querySelector('[aria-label="選択中マップ詳細"]');
    expect(detail).not.toBeNull();
    expect(detail).toHaveTextContent('河川突破');
    expect(detail).toHaveTextContent('標準');
    expect(detail).toHaveTextContent('25 分前後');
    expect(detail).toHaveTextContent('橋');
    expect(detail).toHaveTextContent('橋の制圧に失敗すると前線が停滞しやすい。砲撃支援が重要。');
  });

  it('一覧側でもおすすめバッジと難易度が見える', () => {
    render(<MapSelectScreen maps={MAP_CATALOG} onConfirm={() => {}} onBack={() => {}} />);

    expect(screen.getAllByText('おすすめ').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/難易度:/).length).toBeGreaterThan(0);
  });
});
