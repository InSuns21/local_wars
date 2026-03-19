# AGENTS.md

このファイルは、このリポジトリのドキュメント目次であり、運用ルールの入口です。詳細本文は個別ファイルに分離し、`docs/` を正式な記録システムとして扱います。

## Shell
- Use PowerShell
- Use encoding utf-8

## 必ず守る
- ファイルの読み込み・書き込みでは Filesystem MCP の利用を優先すること
- ts ファイルを編集した後は必ず構文チェックをすること
- ts ファイルを編集した後は編集部分を確認するテストコードも用意し、テストを実行して PASS を確認すること。実行するテストは`npm run test:changed`,全体テストは`npm run test`,コア部分は`npm run test:core`,UI部分は`npm run test:ui`だけを利用すること。それ以外の--runInBandオプションを使ったテストは実行しないこと。
- ファイルを変更したとき、[コミットメッセージ] 具体的なコミットメッセージを日本語で考えること

## 使い方
- 全体像を把握したいときは、まず [ARCHITECTURE.md](ARCHITECTURE.md) を読む。
- 設計判断を追いたいときは `docs/design-docs/` を見る。
- 実行中の施策や技術的負債は `docs/exec-plans/` を見る。
- プロダクト仕様は `docs/product-specs/` を見る。
- 分野別の運用方針は `docs/*.md` のトップレベル文書を見る。

## トップレベル
- [ARCHITECTURE.md](ARCHITECTURE.md): ドメイン、責務、パッケージ階層のトップレベルマップ
- [README.md](README.md): セットアップ、実行、基本的なプロジェクト概要

## docs/ の正式構造

### 設計ドキュメント
- [docs/design-docs/index.md](docs/design-docs/index.md): 設計文書の索引
- [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md): 設計原則と判断基準
- [docs/design-docs/system-overview.md](docs/design-docs/system-overview.md): 現行実装基準のシステム設計要約
- [docs/design-docs/ui-ux-review.md](docs/design-docs/ui-ux-review.md): UI/UX 判断記録と継続課題

### 実行計画
- [docs/exec-plans/active/](docs/exec-plans/active): 進行中の実行計画
- [docs/exec-plans/completed/](docs/exec-plans/completed): 完了済み実行計画
- [docs/exec-plans/tech-debt-tracker.md](docs/exec-plans/tech-debt-tracker.md): 技術的負債の一覧と優先度

### 自動生成
- [docs/generated/db-schema.md](docs/generated/db-schema.md): 自動生成ドキュメントの置き場

### プロダクト仕様
- [docs/product-specs/index.md](docs/product-specs/index.md): 仕様書索引
- [docs/product-specs/screen-flow.md](docs/product-specs/screen-flow.md): 現行画面遷移とモーダル仕様
- [docs/product-specs/gameplay-flow.md](docs/product-specs/gameplay-flow.md): 開始、対局、保存、再開の体験フロー
- [docs/product-specs/ai-thinking-routines.md](docs/product-specs/ai-thinking-routines.md): CPU の難易度、思考傾向、補給、FoW、ドローン戦を含む思考ルーチン仕様
- [docs/product-specs/transport-units.md](docs/product-specs/transport-units.md): 輸送車、輸送ヘリ、搭載と降車の草案仕様
- [docs/product-specs/suicide-drones-and-counter-drone.md](docs/product-specs/suicide-drones-and-counter-drone.md): 自爆ドローン、対ドローン防空車、防空歩兵の草案仕様
- [docs/product-specs/naval-units-and-ports.md](docs/product-specs/naval-units-and-ports.md): 海上ユニット、港湾、海戦マップの草案仕様
- [docs/product-specs/sound-effects.md](docs/product-specs/sound-effects.md): UI と戦闘へ導入する効果音の仕様

### 参照資料
- [docs/references/design-system-reference-llms.txt](docs/references/design-system-reference-llms.txt): LLM 向け参照資料の置き場

### 分野別ガイド
- [docs/DESIGN.md](docs/DESIGN.md): デザイン原則
- [docs/FRONTEND.md](docs/FRONTEND.md): フロントエンド実装指針
- [docs/PRODUCT_SENSE.md](docs/PRODUCT_SENSE.md): プロダクト判断基準
- [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md): 品質評価の見方
- [docs/RELIABILITY.md](docs/RELIABILITY.md): 信頼性と障害耐性
- [docs/SECURITY.md](docs/SECURITY.md): セキュリティ方針

## 運用ルール
- 新しい正式ドキュメントは、まず該当する `docs/` 配下へ置く
- `AGENTS.md` には要約とリンクを置き、長文本文は個別ドキュメントへ分離する
- 旧ファイルを削除する前に、index から新しい置き場へリンクを張る
- 実行計画は `active` から始め、完了時に `completed` へ移す
- 技術的負債は `tech-debt-tracker.md` に集約する
- 自動生成物は `generated/` に限定し、手編集方針を明記する
- 外部ライブラリの LLM 向け資料は `references/` に置く

## 目次更新の条件
- 新しい正式文書を追加したら `AGENTS.md` にリンクを追加する
- ファイル名を変更したら、目次と各 index の両方を更新する
- 既存リンクが壊れたら `AGENTS.md` を優先して直す
