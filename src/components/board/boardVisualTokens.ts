export const BOARD_VISUAL_TOKENS = {
  selectedUnit: {
    label: '選択中ユニット',
    overlay: 'rgba(110,231,183,0.58)',
    outline: 'inset 0 0 0 3px #059669',
  },
  selectedTile: {
    label: '選択移動先',
    overlay: 'rgba(253,230,138,0.62)',
    outline: 'inset 0 0 0 3px #d97706',
  },
  previewPath: {
    label: '経路プレビュー',
    overlay: 'rgba(59,130,246,0.34)',
    outline: 'inset 0 0 0 3px #1d4ed8',
    markerBg: '#1d4ed8',
    markerBorder: '#eff6ff',
  },
  moveReachable: {
    label: '移動可能',
    overlay: 'rgba(191,219,254,0.18)',
    outline: 'inset 0 0 0 2px #2563eb',
    borderStyle: 'dashed' as const,
  },
  attackRange: {
    label: '攻撃範囲',
    overlay: 'rgba(252,165,165,0.5)',
  },
  interceptRange: {
    label: '迎撃半径',
    overlay: 'rgba(125,211,252,0.42)',
    outline: 'inset 0 0 0 2px #0284c7',
  },
  attackTarget: {
    label: '攻撃対象',
    overlay: 'rgba(244,63,94,0.28)',
    outline: 'inset 0 0 0 3px #be123c',
    badgeBg: '#ffe4e6',
    badgeColor: '#9f1239',
    borderColor: '#e11d48',
  },
  friendlyUnit: {
    label: '味方ユニット',
    badgeBg: '#dcfce7',
    badgeColor: '#166534',
    borderColor: '#16a34a',
  },
  enemyUnit: {
    label: '敵ユニット',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b',
    borderColor: '#ef4444',
  },
  friendlyProperty: {
    label: '自軍拠点',
    borderColor: '#2563eb',
  },
  enemyProperty: {
    label: '敵軍拠点',
    borderColor: '#dc2626',
  },
} as const;
