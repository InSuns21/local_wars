# ARCHITECTURE.md

LOCAL WARS のトップレベル構造を示す概要マップです。詳細な設計判断は `docs/design-docs/` 側へ切り出します。

## アプリケーション層
- `src/app`: 画面遷移のハブと UI 向け型
- `src/screens`: 画面単位の UI 実装
- `src/components`: 再利用 UI と盤面表示コンポーネント

## ゲームドメイン層
- `src/core/types`: ゲーム状態、ユニット、マップ、戦闘などのコア型
- `src/core/rules`: 視界、移動、戦闘、占領、勝利条件などのルール
- `src/core/engine`: 初期化、コマンド適用、ターン進行、AI 行動

## データ層
- `src/data`: マップカタログ、スカーミッシュ定義
- `src/services`: セーブ/ロード、音量、BGM トラックなどのブラウザ依存サービス
- `src/store`: Zustand ベースのゲームストア

## 支援レイヤー
- `src/utils`: 座標変換、ラベル化などの小さなユーティリティ
- `tests/unit`: ルールと純粋関数の検証
- `tests/ui`: 画面導線と UI 状態の検証

## 重要な責務境界
- ルールは `src/core/` に閉じる。UI コンポーネントからルール詳細を再実装しない。
- 画面の導線制御は `src/app/App.tsx` に寄せる。
- 保存形式とブラウザ API 依存は `src/services/` に閉じる。
- マップ定義は `src/data/` に置き、 UI が独自にメタデータを持たない。

## 参照先
- 詳細設計索引: [docs/design-docs/index.md](docs/design-docs/index.md)
- プロダクト仕様索引: [docs/product-specs/index.md](docs/product-specs/index.md)
- 技術的負債: [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md)
