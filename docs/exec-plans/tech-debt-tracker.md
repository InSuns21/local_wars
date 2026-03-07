# tech-debt-tracker

技術的負債と継続改善項目の台帳です。進行中の個別計画は `active/`、完了記録は `completed/` に置きます。

## 管理ルール
- 負債は `現象 / 影響 / 優先度 / 次の打ち手` を最低限残す
- 実装着手するなら `active/` に計画を切る
- 片付いたら `completed/` に移して、この台帳には要約だけ残す

## 現在の主な技術的負債

### 高優先度
- 補給ユニットと補給コマンド未実装
  - 現象: 燃料と弾薬の管理は施設補給前提で、前線補給ユニットが存在しない
  - 影響: 航空戦と長期戦の継戦設計が単調になり、補給線という戦術レイヤーが不足する
  - 次の打ち手: [active/2026-03-07-support-units-and-resupply.md](active/2026-03-07-support-units-and-resupply.md) に沿って実装する
- スタック拡張ルール未実装
  - 現象: 現状は 1 マス 1 ユニット前提
  - 影響: 工場 2、HQ 3、複数積み生産などの要件を満たせない
  - 次の打ち手: 盤面占有モデル、移動、生産、描画、AI の改修計画を `active/` に切る
- 特殊マップ向け HQ 判定メタの未整備
  - 現象: 左右端 HQ 前提が残る
  - 影響: 複数 HQ や変則配置で勝利判定が破綻しうる
  - 次の打ち手: マップメタに HQ / 勝利条件定義を追加する
- 盤面文脈メニュー未実装
  - 現象: 主要操作が左カラム依存のまま
  - 影響: 盤面近傍での操作完結性が不足する
  - 次の打ち手: `BattleScreen` と `GameCanvas` の UI 設計を `active/` 化する

### 中優先度
- 輸送ユニットと搭載ルール未実装
  - 現象: 輸送車、輸送ヘリ、cargo 管理、搭載と降車コマンドが存在しない
  - 影響: 歩兵と軽車両の再配置戦術、航空輸送、輸送中燃料停止の体験を表現できない
  - 次の打ち手: [active/2026-03-07-transport-units.md](active/2026-03-07-transport-units.md) に沿って実装する

- 盤面凡例と視覚トークン化の不足
  - 現象: 色、線、バッジの意味がコードと UI に分散している
  - 影響: 初見理解が弱く、見た目変更時に整合が崩れやすい
  - 次の打ち手: `BoardLegend` と visual token の導入
- `localStorage` ベース永続化のまま
  - 現象: セーブ量の増加に対する拡張余地が小さい
  - 影響: 将来のリプレイや大型データで限界が来る
  - 次の打ち手: IndexedDB 移行条件とスキーマを別途設計する
- 実ブラウザ E2E 未導入
  - 現象: 導線保証は UI テストが中心
  - 影響: ブラウザ依存の最終保証が弱い
  - 次の打ち手: 主要フローだけでも Playwright を導入するか判断する
- スタック例外ルール未実装
  - 現象: 空 + 地上、空 + 海、輸送ユニットなどの同居仕様が未対応
  - 影響: 将来の空海追加時に盤面モデルを作り直す可能性が高い
  - 次の打ち手: スタック基盤とセットで整理する

### 低優先度
- 音量設定画面の情報設計見直し
- クレジット画面の可読性改善
- 破壊的操作モーダルの視覚差別化
- モバイル UI の実機レビュー手順整備

## 完了済みの主な整理
- 航空ユニット、空港、ステルス、施設爆撃の仕様追加
  - 完了記録: [completed/2026-03-06-air-units-and-airport-expansion.md](completed/2026-03-06-air-units-and-airport-expansion.md)
  - 仕様: [../product-specs/air-units-and-airport.md](../product-specs/air-units-and-airport.md)

## 参照先
- 完了記録: [completed/mvp-baseline-2026-03.md](completed/mvp-baseline-2026-03.md)
- 完了記録: [completed/2026-03-06-air-units-and-airport-expansion.md](completed/2026-03-06-air-units-and-airport-expansion.md)
- 設計判断: [../design-docs/system-overview.md](../design-docs/system-overview.md)
- UI/UX 判断: [../design-docs/ui-ux-review.md](../design-docs/ui-ux-review.md)
- 画面仕様: [../product-specs/screen-flow.md](../product-specs/screen-flow.md)
- 航空仕様: [../product-specs/air-units-and-airport.md](../product-specs/air-units-and-airport.md)
