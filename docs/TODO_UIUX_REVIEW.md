# UI/UX TODO Review

最終更新: 2026-03-06
レビュー対象: `AGENT.md`, `docs/画面遷移.md`, `src/app/App.tsx`, `src/screens/*`, `src/components/board/GameCanvas.tsx`
レビュー前提: 実装コードベースの静的レビュー。実機操作によるユーザーテストは未実施。

## 優先度: 高

- [x] `src/screens/BattleScreen.tsx`
  対局中の主要操作が「ユニット選択 -> 盤面クリック -> 左カラムの実行ボタン」という分断導線になっている。盤面上で完結せず、視線移動と操作負荷が大きい。
  TODO: 盤面選択直後に文脈メニューを出すか、選択中ユニットの足元付近にアクションを出して、移動・攻撃・占領を局所完結にする。

- [ ] `src/components/board/GameCanvas.tsx`
  盤面タイルは `112x96` 固定で、マップが大きい場合に表示効率が悪く、可視範囲と操作範囲の両立が難しい。拡大縮小やパンもなく、盤面把握に不利。
  TODO: PC前提でも縮尺変更、ズーム、ドラッグ移動、またはミニマップを追加する。

- [ ] `src/components/board/GameCanvas.tsx`
  タイルの意味が色・枠線・破線・バッジに分散しており、初見では「移動可能」「攻撃範囲」「選択中」「拠点所有」が判別しづらい。ツールチップ依存も強い。
  TODO: 盤面凡例を常設し、状態ごとに視覚ルールを整理する。色だけでなくアイコンやパターン差も使う。

- [ ] `src/screens/SettingsScreen.tsx`
  「この設定で開始」に直結する画面なのに、設定項目が多く、初期値の意味や推奨値が説明されていない。初心者は何を変えるべきか判断しにくい。
  TODO: 「基本設定」と「詳細設定」を分け、初心者向けプリセットやリセットボタンを追加する。

- [ ] `src/screens/SaveSelectScreen.tsx` と `src/app/App.tsx`
  空スロットで開始を押したときの失敗理由は `Alert` が画面上部に出るだけで、どのスロットが問題だったかの文脈が弱い。選択結果とフィードバックが離れている。
  TODO: カード内に状態を出し分け、空スロットでは主ボタン文言を無効化または「ロード不可」と明示する。

## 優先度: 中

- [ ] `src/screens/TitleScreen.tsx`
  タイトル画面が「タイトル画面」というプレースホルダー表示のままで、ゲームの世界観、プレイ内容、現在の状態が伝わらない。
  TODO: サブコピーをゲーム内容に置き換え、最新セーブ情報や推奨導線を出して最初の意思決定を補助する。

- [ ] `src/screens/MapSelectScreen.tsx`
  マップ選択肢が `name` と `width x height` だけで、難易度、特徴、推定プレイ時間、勝利条件の差が分からない。
  TODO: 選択中マップの詳細プレビュー領域を設け、比較判断に必要な情報を追加する。

- [ ] `src/screens/SettingsScreen.tsx`
  数値項目が自由入力で、単位や許容レンジの補助がない。負数以外でも極端な値を入れられ、ゲームバランスを壊しやすい。
  TODO: `helperText`、最小/最大値、推奨レンジ、プリセット復元を追加する。

- [ ] `src/screens/TutorialScreen.tsx`
  情報量は多いが、長文中心で、プレイ開始前に読むには重い。実際の操作と対応づく「次に何を押すか」が弱い。
  TODO: 「3分で分かる基本操作」と「詳細ルール」に分割し、対局画面のUI名称と対応づける。

- [ ] `src/screens/AudioSettingsScreen.tsx`
  音量変更はできるが、試聴・ミュートトグル・現在BGMの状態が分からない。音が出ないときも、理由の切り分けがしにくい。
  TODO: ミュート切替、テスト再生、ブラウザ制約で再生保留中の案内を追加する。

- [ ] `src/app/App.tsx`
  `notice` の警告表示がグローバルで、どの操作に紐づくものか分かりづらい。成功通知もほぼなく、状態変化の手応えが薄い。
  TODO: 画面単位またはコンポーネント単位のフィードバックに寄せ、成功/失敗/注意で表示位置とトーンを分ける。

- [ ] `src/screens/CreditsScreen.tsx`
  URL の生表示が長く、可読性が低い。利用者視点では情報整理よりリンク列挙に見える。
  TODO: クレジットをカード化し、曲名・利用箇所・ライセンス・リンクを視認しやすく整理する。

## 優先度: 低

- [ ] `src/theme.ts` と `src/styles.css`
  全体の配色は無難だが、階層差とブランドの個性が弱い。各画面が似たレイアウトで、状態変化の印象が薄い。
  TODO: 画面ごとのトーン差、強調色の使い分け、見出しと本文の情報階層を再設計する。

- [ ] `src/components/common/ConfirmModal.tsx`
  確認ダイアログは汎用化されているが、破壊的操作と軽微操作で見た目差が小さい。判断コストに対する注意喚起が弱い。
  TODO: 破壊的操作では補足文や影響範囲を追加し、ボタンの強弱と初期フォーカスを再設計する。

## 優先度: 極低

- [ ] `src/screens/*`
  多くの画面で `height: 100vh` と固定フッター構成を使っており、モバイルブラウザのアドレスバー表示時に窮屈になる可能性がある。
  TODO: モバイルを本格対応する段階になったら、`100dvh` 系の採用や安全余白の見直しを行い、実機で縦方向の圧迫を確認する。

## 次のレビュー候補

- [ ] 実機確認を実施し、キーボード操作、画面リーダー、スマホ横幅、長時間プレイ時の疲労を別途評価する。
- [ ] `tests/ui` に、主要導線の文言・無効状態・エラー表示位置を保証するUIテストを追加する。

## 優先度: 高 詳細設計案

### 1. 対局操作を盤面中心に再設計する

対象: `src/screens/BattleScreen.tsx`, `src/components/board/GameCanvas.tsx`

目的:
- ユニット選択後の主要操作を盤面近傍で完結させる。
- 左カラムは「詳細確認」と「補助操作」に寄せ、主導線から外す。

設計案:
- `BattleScreen` に `contextCommandState` を追加する。
- 型は `type ContextCommandState = { anchor: Coord; unitId: string; actions: Array<'move' | 'attack' | 'capture' | 'wait'>; targetTile?: Coord | null } | null;` とする。
- 味方ユニット選択時に、そのユニットが実行可能なアクションを計算して `contextCommandState` を開く。
- 盤面クリック時の挙動を「選択」と「確定」に分離し、1回目は候補表示、2回目またはメニュー押下でコマンド発行にする。
- 盤面上のメニューは MUI `Popover` か `Paper` の絶対配置で実装し、アンカー座標は `GameCanvas` からピクセル位置を返す。
- 左カラムの `実行コマンド` セクションは削除せず、盤面メニューと同じ state を読む read-only 補助パネルに縮退させる。

実装ステップ:
- `GameCanvas` に `onSelectUnitWithAnchor?: (unitId: string | null, anchor: { x: number; y: number }) => void` を追加する。
- タイル DOM の `getBoundingClientRect()` からアンカー位置を算出し、選択イベントと一緒に返す。
- `BattleScreen` 側で `selectedUnitId`, `selectedTile`, `moveRangeTiles`, `attackableEnemyUnits` をもとに実行可能アクションを導出する `deriveContextActions()` を切り出す。
- `MOVE_UNIT`, `ATTACK`, `CAPTURE` 実行後は `contextCommandState` を閉じ、`lastResult` と選択状態を同期させる。
- `ターン終了`, `Undo`, `その他` は上部バーに残す。

受け入れ条件:
- 味方ユニット選択後、移動・攻撃・占領の少なくともどれかが盤面近傍に表示される。
- 敵ユニット選択時には実行メニューが開かない。
- コマンド実行後に stale なメニューが残らない。

テスト案:
- `tests/ui/BattleScreen.contextMenu.test.tsx` を追加する。
- 味方ユニット選択で文脈メニューが出ること。
- 攻撃不可状態では `攻撃` が disabled または非表示になること。
- コマンド成功後にメニューが閉じること。

### 2. 盤面の縮尺変更とナビゲーションを追加する

対象: `src/components/board/GameCanvas.tsx`, 必要に応じて `src/screens/BattleScreen.tsx`

目的:
- 大きいマップでも盤面全体と局所確認を切り替えられるようにする。
- 表示効率の悪さを解消し、視認と操作の両立を取る。

設計案:
- `GameCanvas` に `zoom` と `viewportOrigin` の概念を導入する。
- 第一段階では実装負荷の低い `zoom` のみ先行し、`100% / 85% / 70%` の3段階切替に限定する。
- 第二段階で必要なら `viewportOrigin` を導入し、ズーム時のみスクロール中央維持またはドラッグパンを追加する。
- ミニマップは初手で入れず、ズーム導入後に盤面把握がまだ悪い場合の第2施策とする。

実装ステップ:
- `GameCanvas` の `TILE_WIDTH`, `TILE_HEIGHT` を定数固定から `baseTileWidth`, `baseTileHeight`, `zoom` に分離する。
- `const tileWidth = Math.round(BASE_TILE_WIDTH * zoom)` のように計算し、インライン style に反映する。
- `BattleScreen` に `boardZoom` state を持たせ、上部バーか盤面ヘッダにズーム切替 UI を追加する。
- 既存の `previewPath`, `moveRangeTiles`, `attackRangeTiles`, badge 表示が縮尺変更時にも崩れないよう absolute 位置と font-size を見直す。
- 盤面ラッパーを `overflow: auto` にし、縮小時は全体俯瞰、標準時は現行に近い見え方にする。

受け入れ条件:
- ズーム操作で盤面が再描画されても選択状態が失われない。
- badge, HP, 所有者表示, 範囲表示が縮尺変更後も視認可能。
- 既存のクリック座標判定が壊れない。

テスト案:
- `tests/ui/BattleScreen.boardZoom.test.tsx` を追加する。
- ズーム変更後も `data-attack-range`, `data-move-reachable` が維持されること。
- ズーム変更後もタイルクリックで正しいユニット選択ができること。

### 3. 盤面凡例と視覚ルールを明文化する

対象: `src/components/board/GameCanvas.tsx`, `src/screens/BattleScreen.tsx`

目的:
- 盤面上の色情報・枠線・バッジの意味を即時理解できるようにする。
- ツールチップ依存を下げ、初見理解コストを下げる。

設計案:
- `BattleScreen` の盤面上部に `BoardLegend` コンポーネントを追加する。
- `BoardLegend` は「選択中」「移動可能」「攻撃範囲」「経路プレビュー」「味方」「敵」「自軍拠点」「敵拠点」を常設表示する。
- `GameCanvas` 内のオーバーレイ色は意味単位でトークン化し、直接値のベタ書きをやめる。
- 色だけでなく、線種やアイコンもセットにして表現する。例: 移動可能は青破線、攻撃範囲は赤半透明、選択中は金枠。

実装ステップ:
- `const BOARD_VISUAL_TOKENS = { selectedTile: ..., moveReachable: ..., attackRange: ... }` を `GameCanvas.tsx` 内または別ファイルへ切り出す。
- `BoardLegend.tsx` を `src/components/board/` 配下に追加し、トークンと同じ見た目を使って説明を出す。
- `title` 属性ベースの説明は残しつつ、主要状態は画面常設情報だけで理解できる構成に寄せる。
- `ownerBadge` と `property owner border` は見た目だけでなくラベル凡例にも明示する。

受け入れ条件:
- 盤面凡例だけ見れば、主要な色・線・バッジの意味を把握できる。
- `GameCanvas` 側で色指定が散らばらず、トークン参照に統一される。

テスト案:
- `tests/ui/BattleScreen.boardLegend.test.tsx` を追加する。
- 凡例に主要6状態以上が表示されること。
- 凡例と盤面が同じラベル文言を使っていること。

### 4. 設定画面を基本設定と詳細設定に分割する

対象: `src/screens/SettingsScreen.tsx`, `src/app/types.ts`

目的:
- 開始前に必要な意思決定だけを先に出し、詳細調整は折りたたみまたは別セクションに隔離する。
- 初心者がデフォルトから迷わず開始できる状態を作る。

設計案:
- `SettingsScreen` を `基本設定` と `詳細設定` の2セクションに分割する。
- `基本設定` には `AIの強さ`, `人間が担当する陣営`, `索敵あり` のみを置く。
- 数値項目と補給系フラグは `Accordion` または `詳細設定を開く` に移す。
- `GameSettingsPreset` を導入し、`標準`, `初心者向け`, `上級者向け` のプリセットを選べるようにする。
- プリセット選択後に個別変更してもよいが、編集開始時点で `custom` 扱いに遷移させる。

実装ステップ:
- `src/app/types.ts` に `type GameSettingsPreset = 'standard' | 'beginner' | 'advanced' | 'custom'` を追加する。
- `DEFAULT_SETTINGS` とは別に `GAME_SETTINGS_PRESETS` 定数を追加する。
- `SettingsScreen` に `selectedPreset` state を追加し、プリセット変更時は複数フィールドをまとめて更新する。
- `詳細設定` は MUI `Accordion` で初期 collapsed にする。
- 数値項目に `helperText` 相当の説明文を追加し、なぜ変更する項目なのかを短く示す。
- `リセット` ボタンで `standard` を再適用できるようにする。

受け入れ条件:
- 初見ユーザーは上3項目だけで開始できる。
- 詳細設定を開かなくてもゲーム開始まで完了できる。
- プリセット変更後に開始すると、対応する設定値が反映される。

テスト案:
- `tests/ui/SettingsScreen.presets.test.tsx` を追加する。
- プリセット変更で複数フィールドが更新されること。
- 詳細設定が初期状態で閉じていること。
- リセットで `standard` 値に戻ること。

### 5. セーブ選択のフィードバックをカード内へ寄せる

対象: `src/screens/SaveSelectScreen.tsx`, `src/app/App.tsx`

目的:
- どのスロットが操作可能で、なぜロードできないのかをカード単位で完結表示する。
- グローバル `Alert` 依存を減らし、失敗理由を選択文脈に紐づける。

設計案:
- `SaveSelectScreen` に `slotStatus` の概念を追加する。
- 型は `type SaveSlotUiStatus = 'ready' | 'empty' | 'selected' | 'error';` とする。
- `selectedSlotId` と `slots` から各カードの状態を導出し、空スロットには `未保存 / ロード不可` を明示する。
- フッターボタンは `このスロットで開始` のままでもよいが、空スロット選択時は disabled にし、近くに理由文を表示する。
- `App.tsx` の `notice` は save-select 専用では使わず、必要なら `SaveSelectScreen` に `feedbackMessage` を props で渡してカード付近へ表示する。

実装ステップ:
- `SaveSelectScreenProps` に `feedbackMessage?: string` を追加する。
- `App.tsx` の `loadGameFromSlot()` は `setNotice()` ではなく、`saveSelectFeedback` のような専用 state を更新する。
- スロット選択変更時に `saveSelectFeedback` をクリアする。
- 各カードの CTA 付近に `Chip` または `Typography` で `ロード可能`, `未保存`, `選択中` を表示する。
- `削除` ボタンは空スロットでは非表示のままでよいが、保存データありカードには「更新日時」「マップ名」「設定要約」を追加して比較しやすくする。

受け入れ条件:
- 空スロット選択中はロードボタンが押せない。
- 失敗理由が画面上部の共通警告ではなく、セーブ選択文脈内で分かる。
- スロットを切り替えると古いエラー表示が残らない。

テスト案:
- `tests/ui/AppFlow.saveSelect.feedback.test.tsx` を追加する。
- 空スロット選択時にロードボタンが disabled になること。
- 保存ありスロット選択時のみロードボタンが有効になること。
- スロット変更でエラーメッセージが消えること。
