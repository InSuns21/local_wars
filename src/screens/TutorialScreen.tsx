import React, { useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

type TutorialScreenProps = {
  onBack: () => void;
};

type TutorialSection = 'basic' | 'detailed';

const BASIC_STEPS = [
  {
    title: '1. ユニット情報で自軍ユニットを確認する',
    body: '盤面上で味方ユニットをクリックすると `ユニット情報` に HP、燃料、弾薬、座標が出ます。まずは歩兵か戦車を1体選びます。',
  },
  {
    title: '2. 盤面で移動先を選ぶ',
    body: '移動可能マスは盤面上で強調表示されます。移動先をクリックすると `実行コマンド` に選択移動先と経路プレビューが出ます。',
  },
  {
    title: '3. 実行コマンドで攻撃か占領を決める',
    body: '敵が射程にいるなら攻撃、歩兵が拠点にいるなら占領を選びます。迷ったらまず都市や工場を取る動きを優先します。',
  },
  {
    title: '4. 補給が必要な部隊は補給ユニットの隣に寄せる',
    body: '燃料や弾薬が減った味方は `補給車` や `空中補給機` の周囲1マスへ寄せます。 `補給` を押すと有効対象がまとめて最大まで回復します。',
  },
  {
    title: '5. 盤面凡例と経過ログで結果を確認する',
    body: '色や線の意味は `盤面凡例` で確認できます。行動結果は `経過ログ` と `最終コマンド` に反映されます。',
  },
  {
    title: '6. ターン終了で相手手番へ進める',
    body: '移動や生産、補給を終えたら上部バーの `ターン終了` を押します。これで最初の1ターンを一通り進められます。',
  },
];

const DETAILED_RULES = [
  {
    title: '勝利条件',
    items: [
      '司令部（HQ）占領: 相手HQの所有者を自軍にすると即勝利。',
      '全滅: 相手の生存ユニットが0になると勝利。',
      'VP上限: マップに上限設定がある場合、到達側が勝利。',
    ],
  },
  {
    title: '地形と拠点',
    items: [
      '森は防御寄り、山は歩兵向け、道路と橋は進軍路として重要です。',
      '都市、工場、司令部は歩兵で占領できます。自軍所有にすると収入と補給の基盤になります。',
      '工場は空いている自軍マスなら生産可能で、長期戦では所有数が差になります。空港は航空機の生産と整備拠点です。',
    ],
  },
  {
    title: '補給と索敵',
    items: [
      '燃料・弾薬ONでは、前に出しすぎると継戦能力が落ちます。拠点付近で補給ルートを維持してください。',
      '補給車は周囲1マスの地上ユニット、空中補給機は周囲1マスの航空ユニットへ燃料と弾薬をまとめて補給します。補給ユニットは攻撃できません。',
      '補給回数は 1 回ごとに 1 消費し、補給車は味方の都市・工場・HQ、空中補給機は味方空港でターン終了すると全回復します。',
      '索敵ONでは森や地形越しの視界差が重要です。偵察車や前衛歩兵で敵位置を先に掴みます。',
    ],
  },
  {
    title: '生産とユニット相性',
    items: [
      '歩兵は占領要員、戦車は前線主力、対戦車は装甲対策、自走砲は後方支援です。',
      '高コスト機体を急ぐ前に、歩兵と前衛の枚数が足りているかを確認します。',
      '対空車は航空対策に強い一方、重戦車との正面戦闘は苦手です。',
    ],
  },
];

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<TutorialSection>('basic');

  return (
    <Box
      component="main"
      sx={{
        maxWidth: 980,
        mx: 'auto',
        px: 2,
        py: 2,
        height: '100vh',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 1, flexShrink: 0 }}>チュートリアル</Typography>
        <Typography sx={{ mb: 2, flexShrink: 0 }}>
          初回は `3分で分かる基本操作` だけ読めば十分です。詳しいルールは必要になったときに確認できます。
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>
          <Button
            type="button"
            variant={activeSection === 'basic' ? 'contained' : 'outlined'}
            onClick={() => setActiveSection('basic')}
          >
            3分で分かる基本操作
          </Button>
          <Button
            type="button"
            variant={activeSection === 'detailed' ? 'contained' : 'outlined'}
            onClick={() => setActiveSection('detailed')}
          >
            詳細ルール
          </Button>
        </Stack>

        <Stack data-testid="tutorial-scroll-content" spacing={2.5} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5, mb: 2 }}>
          {activeSection === 'basic' && (
            <>
              <Box component="section" aria-label="基本操作の流れ">
                <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>基本操作の流れ</Typography>
                <Stack spacing={1.5}>
                  {BASIC_STEPS.map((step) => (
                    <Paper key={step.title} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{step.title}</Typography>
                      <Typography variant="body2">{step.body}</Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Box component="section" aria-label="画面上の見どころ">
                <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>画面上の見どころ</Typography>
                <Stack spacing={1.5}>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>ユニット情報</Typography>
                    <Typography variant="body2">選択中ユニットの状態確認に使います。HP、燃料、弾薬が足りているかを毎ターン見ます。</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>実行コマンド</Typography>
                    <Typography variant="body2">移動、攻撃、占領、生産、補給の判断をまとめる場所です。移動先を選んだ後や補給ユニットを選んだ後に確認します。</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>盤面凡例 / 経過ログ</Typography>
                    <Typography variant="body2">盤面の色意味は `盤面凡例`、直前の結果は `経過ログ` で確認します。迷ったらこの2つを見ます。</Typography>
                  </Paper>
                </Stack>
              </Box>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>次に押すもの</Typography>
                <Typography variant="body2">
                  この画面を閉じたら `はじめから` で標準マップを選び、歩兵で都市を取りながら、燃料や弾薬が減った部隊は補給ユニットの隣で立て直してみてください。
                </Typography>
              </Paper>
            </>
          )}

          {activeSection === 'detailed' && (
            <>
              {DETAILED_RULES.map((section) => (
                <Box key={section.title} component="section" aria-label={section.title}>
                  <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>{section.title}</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {section.items.map((item) => (
                        <li key={item} style={{ marginBottom: 8 }}>
                          <Typography variant="body2" component="span">{item}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Paper>
                </Box>
              ))}
            </>
          )}
        </Stack>

        <Box data-testid="tutorial-footer" sx={{ flexShrink: 0, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button type="button" variant="contained" onClick={onBack}>戻る</Button>
        </Box>
      </Paper>
    </Box>
  );
};
