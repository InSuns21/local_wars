import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CreditsScreen } from '@/screens/CreditsScreen';

describe('CreditsScreen BGM credits', () => {
  it('BGM配布元とライセンス、曲情報を表示する', () => {
    render(<CreditsScreen onBack={() => {}} />);

    expect(screen.getByText('BGM素材は incompetech（Kevin MacLeod）を使用しています。')).toBeInTheDocument();
    expect(screen.getByText(/ライセンス: CC BY 4.0/)).toBeInTheDocument();
    expect(screen.getByText('タイトル画面')).toBeInTheDocument();
    expect(screen.getByText(/Call to Adventure/)).toBeInTheDocument();
    expect(screen.getByText('勝敗確定モーダル')).toBeInTheDocument();
    expect(screen.getByText(/Marty Gots a Plan/)).toBeInTheDocument();
  });
});

