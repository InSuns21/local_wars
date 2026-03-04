import React from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

type TutorialScreenProps = {
  onBack: () => void;
};

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onBack }) => (
  <Box component="main" sx={{ maxWidth: 980, mx: 'auto', mt: { xs: 2, md: 3 }, px: 2 }}>
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: 28, md: 34 }, mb: 1 }}>チュートリアル</Typography>
      <Typography sx={{ mb: 2 }}>LOCAL WARS の基本ルールと、勝つための要点をまとめています。</Typography>

      <Stack spacing={2.5}>
        <Box component="section" aria-label="ゲームの進め方">
          <Typography variant="h2" sx={{ fontSize: 22, mb: 0.5 }}>ゲームの進め方</Typography>
          <ol>
            <li>自軍ユニットを選び、移動します。</li>
            <li>移動後に攻撃・占領・待機を行います。</li>
            <li>空いている自軍工場でユニットを生産します。</li>
            <li>ターン終了で相手手番へ移ります。</li>
          </ol>
          <Typography variant="body2">ポイント: 歩兵の占領を止めるか、こちらの占領を通すかが序盤の主戦略です。</Typography>
        </Box>

        <Box component="section" aria-label="勝利条件">
          <Typography variant="h2" sx={{ fontSize: 22, mb: 0.5 }}>勝利条件</Typography>
          <ul>
            <li>司令部（HQ）占領: 相手HQの所有者を自軍にすると即勝利。</li>
            <li>全滅: 相手の生存ユニットが0になると勝利。</li>
            <li>VP上限: マップに上限設定がある場合、到達側が勝利。</li>
          </ul>
        </Box>

        <Box component="section" aria-label="マップのマス効果">
          <Typography variant="h2" sx={{ fontSize: 22, mb: 0.5 }}>マップのマス効果</Typography>
          <ul>
            <li>平地: 基本地形。ほぼ全ユニットが通行しやすい。</li>
            <li>森: 車両の移動コストが増える。歩兵の進行は維持しやすい。</li>
            <li>山: 歩兵のみ通行可。歩兵は防御上昇と視界+1の恩恵。</li>
            <li>道路/橋: 車両が進みやすい主進軍ルート。</li>
            <li>川: 歩兵は通行可。車両は通行不可。</li>
            <li>海: 海ユニットと航空ユニットの行動領域。</li>
            <li>都市: 歩兵で占領可能。自軍所有時はターン開始時に補給地点。</li>
            <li>工場: 歩兵で占領可能。自軍所有かつ空きマスで生産可能。収入対象。</li>
            <li>司令部（HQ）: 歩兵で占領可能。収入対象かつ勝敗に直結。</li>
            <li>空港/港: 航空・海ユニットを使うマップで重要な拠点。</li>
          </ul>
        </Box>

        <Box component="section" aria-label="TIPS">
          <Typography variant="h2" sx={{ fontSize: 22, mb: 0.5 }}>TIPS</Typography>
          <ul>
            <li>占領中の歩兵は最優先で妨害する。</li>
            <li>砲兵（自走砲）は前に出しすぎず、前衛の後ろで守る。</li>
            <li>敵ZOCの近くでは通過ルートが制限されるため、進軍線を複数用意する。</li>
            <li>燃料・弾薬ONの設定では、拠点上でターンをまたいで補給する。</li>
            <li>高コスト機を1機作る前に、歩兵と前衛の枚数不足を確認する。</li>
          </ul>
        </Box>

        <Box component="section" aria-label="ユニット相性">
          <Typography variant="h2" sx={{ fontSize: 22, mb: 0.5 }}>ユニット相性</Typography>
          <ul>
            <li>歩兵: 占領要員。戦闘は弱いが数と位置で勝負。</li>
            <li>偵察車: 高機動で索敵と削り。重装甲相手は不利。</li>
            <li>戦車: 前線の主力。歩兵・軽車両に強い。</li>
            <li>対戦車: 戦車迎撃が得意。機動力は低め。</li>
            <li>自走砲: 射程2-3の間接攻撃。隣接されると脆い。</li>
            <li>対空車: 航空ユニットへの対抗札。対地は中程度。</li>
            <li>戦闘機: 対空の主力。地上目標への効率は低い。</li>
            <li>爆撃機: 対地高火力。対空迎撃に弱い。</li>
          </ul>

          <Typography variant="subtitle1" sx={{ mt: 1.5, mb: 0.5, fontWeight: 700 }}>相性表（目安）</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>攻撃側</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>得意</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: '6px 8px' }}>苦手</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>歩兵</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>歩兵、瀕死ユニット</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>戦車系、対空車</td>
                </tr>
                <tr>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>戦車</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>歩兵、偵察車、砲兵</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>対戦車、爆撃機</td>
                </tr>
                <tr>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>対戦車</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>戦車、装甲目標</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>偵察車、歩兵ラッシュ</td>
                </tr>
                <tr>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>自走砲</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>地上全般（先制）</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '6px 8px' }}>隣接された時</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px' }}>対空車</td>
                  <td style={{ padding: '6px 8px' }}>戦闘機、爆撃機</td>
                  <td style={{ padding: '6px 8px' }}>重戦車との正面殴り合い</td>
                </tr>
              </tbody>
            </table>
          </Box>
        </Box>
      </Stack>

      <Button type="button" variant="contained" onClick={onBack} sx={{ mt: 2 }}>戻る</Button>
    </Paper>
  </Box>
);

