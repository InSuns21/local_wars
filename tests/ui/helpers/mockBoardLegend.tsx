import React from 'react';

const LABELS = [
  '選択中ユニット',
  '選択移動先',
  '経路プレビュー',
  '移動可能',
  '攻撃範囲',
  '攻撃対象',
  '味方ユニット',
  '敵ユニット',
  '自軍拠点',
  '敵軍拠点',
];

export const BoardLegend: React.FC = () => (
  <section aria-label="盤面凡例">
    {LABELS.map((label) => (
      <span key={label}>{label}</span>
    ))}
  </section>
);
