# mvp-baseline-2026-03

2026-03 時点での MVP 到達状況と、完了済みの主要タスクを記録します。旧 `MVP_GAP_REVIEW.md` と `TODO_TASK.md` の完了項目を統合した完了記録です。

## MVP 到達状況
- 地上 5 種以上のユニット運用: 完了
- 占領: 完了
- 生産: 完了
- HQ 勝利: 完了
- AI Easy / Normal: 完了
- セーブ / ロード: 完了
- スカーミッシュ 10 マップ: 完了

## 追加で完了済みの基盤整備
- ターン開始収入の反映
- 生産フェーズ UI 導線
- 実マップ読み込み
- AI 難易度設定の反映
- セーブデータの復元整合性改善
- FoW の遭遇戦対応
- 山地の移動制限と歩兵の地形特性
- 設定項目の実ロジック反映
- タイトル、マップ選択、設定、セーブ選択、チュートリアルの UX 改善

## 既知の残リスク
- HQ 判定は「左右端 HQ」前提が残るため、特殊マップでは専用メタデータが必要
- 永続化は `localStorage` ベースであり、データ量増加時の拡張余地がある
- 実ブラウザ E2E は未導入で、現状は UI テスト中心

## 関連文書
- [../tech-debt-tracker.md](../tech-debt-tracker.md)
- [../../product-specs/screen-flow.md](../../product-specs/screen-flow.md)
- [../../design-docs/system-overview.md](../../design-docs/system-overview.md)
