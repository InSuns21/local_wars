# screen-flow

現行実装に準拠した画面遷移仕様です。旧 `画面遷移.md` を正式な仕様書として再編しました。

最終更新: 2026-03-06
対象実装: `src/app/App.tsx`, `src/screens/*`

## 画面一覧
- `title`
- `map-select`
- `settings`
- `save-select`
- `credits`
- `tutorial`
- `audio-settings`
- `battle`

## 全体遷移
```text
title
 ├─ はじめから -> map-select -> settings -> battle
 ├─ つづきから -> save-select -> battle
 ├─ クレジット -> credits -> title
 ├─ チュートリアル -> tutorial -> title
 └─ 音量設定 -> audio-settings -> title

battle
 ├─ その他 > ヘルプ > チュートリアル -> tutorial -> battle
 ├─ その他 > ゲーム終了 > 保存して終了 -> title
 ├─ その他 > ゲーム終了 > 保存しないで終了 -> 確認モーダル -> title
 └─ 勝敗確定時 -> 結果モーダル -> title
```

## 画面別仕様

### title
- `はじめから` -> `map-select`
- `つづきから` -> `save-select`
  - 遷移前にセーブ一覧を再読込する
- `クレジット` -> `credits`
- `チュートリアル` -> `tutorial`
  - `tutorialReturnScreen = 'title'`
- `音量設定` -> `audio-settings`

### map-select
- マップ一覧と選択中マップの詳細プレビューを表示する
- `このマップで確定` -> `settings`
- `戻る` -> `title`

### settings
- `基本設定` と `詳細設定` を持つ
- `この設定で開始` -> `battle`
  - 新規 `GameState` を生成し、必要な初期 state を組み立てる
- `戻る` -> `map-select`

### save-select
- 保存済みスロットにはマップ名、更新日時、設定要約を表示する
- 空スロットは `ロード不可` と理由をカード内表示する
- `このスロットで開始` -> `battle`
  - 保存済みスロットのみ有効
- `削除` -> セーブ削除確認モーダル
- `戻る` -> `title`

### credits
- `戻る` -> `title`

### tutorial
- `3分で分かる基本操作` と `詳細ルール` を表示する
- `戻る` -> `tutorialReturnScreen`

### audio-settings
- BGM 音量を 0〜100% で調整する
- 設定は永続化する
- `タイトルへ戻る` -> `title`

### battle
- 盤面ズームとスクロールナビゲーションを持つ
- `その他 > ゲーム終了 > 保存して終了`
  - 紐付けスロットがあれば上書き保存
  - 空きスロットがあれば自動保存
  - 空きがなければ上書き先選択モーダルを開く
- `その他 > ゲーム終了 > 保存しないで終了`
  - 確認後に `title`
- `その他 > ヘルプ > チュートリアル`
  - `tutorialReturnScreen = 'battle'`
- `winner !== null` 時は結果モーダルを表示し、`タイトルへ戻る` で `title`

## 画面遷移ではない重要 UI
- セーブ削除確認モーダル
- 保存しない終了確認モーダル
- 保存スロット上書き選択モーダル
- 対局結果モーダル

## 関連文書
- [gameplay-flow.md](gameplay-flow.md)
- [index.md](index.md)
- [../design-docs/ui-ux-review.md](../design-docs/ui-ux-review.md)
