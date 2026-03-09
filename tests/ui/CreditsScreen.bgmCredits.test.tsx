import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CreditsScreen } from '@/screens/CreditsScreen';

describe('CreditsScreen BGM credits', () => {
  it('BGMとSEの配布元、ライセンス、曲情報を表示する', () => {
    render(<CreditsScreen onBack={() => {}} />);

    expect(screen.getByText('BGM素材は incompetech（Kevin MacLeod）を使用しています。')).toBeInTheDocument();
    expect(screen.getByText(/ライセンス: CC BY 4.0/)).toBeInTheDocument();
    expect(screen.getByText('効果音素材は Kenney の Interface Sounds を使用しています。')).toBeInTheDocument();
    expect(screen.getByText(/ライセンス: CC0 1.0/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://kenney.nl/assets/interface-sounds' })).toBeInTheDocument();
    expect(screen.getByText('タイトル画面')).toBeInTheDocument();
    expect(screen.getByText(/Call to Adventure/)).toBeInTheDocument();
    expect(screen.getByText('勝敗確定モーダル')).toBeInTheDocument();
    expect(screen.getByText(/Marty Gots a Plan/)).toBeInTheDocument();
  });
});

