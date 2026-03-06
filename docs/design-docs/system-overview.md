# system-overview

現行実装を基準にしたシステム設計の要約です。旧 `system-design.md` のうち、今も参照価値がある構造と将来拡張の前提を整理しています。

## 設計方針
- ゲームルールは `src/core/` に閉じ、UI から再実装しない。
- 画面導線と画面間状態は `src/app/App.tsx` に寄せる。
- 画面単位の UI は `src/screens/`、再利用 UI は `src/components/` に分ける。
- 保存、音量、BGM などのブラウザ依存処理は `src/services/` に隔離する。
- 単体テストはルール、UI テストは導線と表示状態を確認する。

## レイヤー構成
```text
screens / components
  -> app orchestration
  -> core rules / engine
  -> data / services / store
```

### UI レイヤー
- `src/screens`: タイトル、マップ選択、設定、セーブ選択、対局などの画面実装
- `src/components/board`: 盤面、凡例、ユニット表示、範囲表示などの部品
- `src/components/common`: モーダルや共通 UI

### アプリケーションレイヤー
- `src/app/App.tsx`: 画面遷移、モーダル、ロード/セーブ起点の集約
- `src/app/types.ts`: UI 側で共有する型とメタデータ

### ドメインレイヤー
- `src/core/types`: ゲーム状態、ユニット、地形、勝敗条件のコア型
- `src/core/rules`: 移動、戦闘、占領、視界、補給、勝利判定
- `src/core/engine`: 初期化、コマンド適用、ターン進行、AI 行動

### データ/永続化レイヤー
- `src/data`: スカーミッシュマップ、ユニット定義、比較用メタデータ
- `src/services`: save/load、音量設定、BGM などのブラウザ API 接続
- `src/store`: Zustand ベースの保持が必要な場合の状態集約

## 現行で有効な責務境界
- `GameCanvas` は表示と入力イベント送出に集中し、ルール計算を抱え込まない。
- 設定画面で編集した値は `GameSettings` として保持し、初期化時にゲーム状態へ注入する。
- セーブデータは画面状態ではなく、再開に必要なゲーム状態と周辺メタを保存する。

## 将来拡張の前提
- HQ 勝利判定は現状「左右端 HQ」前提が残るため、特殊マップ対応では明示メタを追加する。
- 永続化は現状 `localStorage` ベースだが、データ量増加時は IndexedDB 移行を検討する。
- 疑似 E2E は UI テストで担保しているが、実ブラウザ操作の最終保証は別途追加余地がある。
- スタック拡張や空海ユニット追加は、盤面占有モデルと移動/生産/描画/AI をまたぐ改修になる。

## テスト方針
- `tests/unit`: ルールと純粋関数
- `tests/ui`: 画面導線、主要 UI 状態、モーダルやカード内フィードバック
- 将来必要なら実ブラウザ E2E を追加するが、既存 UI テストの価値を置き換えない

## 関連文書
- [core-beliefs.md](core-beliefs.md)
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- [../exec-plans/tech-debt-tracker.md](../exec-plans/tech-debt-tracker.md)
- [../product-specs/screen-flow.md](../product-specs/screen-flow.md)
