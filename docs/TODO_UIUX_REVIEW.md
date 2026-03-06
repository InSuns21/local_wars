# UI/UX TODO Review

最終更新: 2026-03-06
レビュー対象: `AGENT.md`, `docs/画面遷移.md`, `src/app/App.tsx`, `src/screens/*`, `src/components/board/GameCanvas.tsx`
レビュー前提: 実装コードベースの静的レビュー。実機操作によるユーザーテストは未実施。

## 優先度: 高

- [x] `src/screens/BattleScreen.tsx`
  対局中の主要操作が「ユニット選択 -> 盤面クリック -> 左カラムの実行ボタン」という分断導線になっている。盤面上で完結せず、視線移動と操作負荷が大きい。
  TODO: 盤面選択直後に文脈メニューを出すか、選択中ユニットの足元付近にアクションを出して、移動・攻撃・占領を局所完結にする。

- [x] `src/components/board/GameCanvas.tsx`
  盤面タイルは `112x96` 固定で、マップが大きい場合に表示効率が悪く、可視範囲と操作範囲の両立が難しい。拡大縮小やパンもなく、盤面把握に不利。
  TODO: PC前提でも縮尺変更、ズーム、ドラッグ移動、またはミニマップを追加する。

- [x] `src/components/board/GameCanvas.tsx`
  タイルの意味が色・枠線・破線・バッジに分散しており、初見では「移動可能」「攻撃範囲」「選択中」「拠点所有」が判別しづらい。ツールチップ依存も強い。
  TODO: 盤面凡例を常設し、状態ごとに視覚ルールを整理する。色だけでなくアイコンやパターン差も使う。

- [x] `src/screens/SettingsScreen.tsx`
  「この設定で開始」に直結する画面なのに、設定項目が多く、初期値の意味や推奨値が説明されていない。初心者は何を変えるべきか判断しにくい。
  TODO: 「基本設定」と「詳細設定」を分け、初心者向けプリセットやリセットボタンを追加する。

- [x] `src/screens/SaveSelectScreen.tsx` と `src/app/App.tsx`
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

### 6. タイトル画面に現在状態と推奨導線を追加する

対象: `src/screens/TitleScreen.tsx`, 必要に応じて `src/app/App.tsx`, `src/services/saveSlots.ts`

目的:
- 初回プレイ時に「何をするゲームか」と「最初に押すべきボタン」を数秒で理解できるようにする。
- 既存プレイヤーには最新セーブ状況を見せ、`つづきから` の判断を早くする。

設計案:
- `TitleScreen` を「ヒーロー領域」「最新セーブ概要」「主要アクション」の3ブロック構成にする。
- タイトル直下のサブコピーは「ローカル対戦風のターン制戦略ゲーム」など、プレイ内容と勝ち筋が伝わる文言へ差し替える。
- `TitleScreenProps` に `latestSaveSummary?: { slotId: 1 | 2 | 3; mapName: string; updatedAt: string; turn: number } | null` を追加する。
- 最新セーブがある場合は `最新の続き` カードを表示し、`つづきから` を主導線、`はじめから` を副導線に寄せる。
- セーブが1件もない場合は `はじめから` を主導線にし、`チュートリアル` を補助導線として近接配置する。
- 補助情報として「推定プレイ人数感」「勝利条件の要約」「直近の更新日時」を短文で見せる。

実装ステップ:
- `App.tsx` で `saveSlots` から最新更新スロットを導出する `latestSaveSummary` を `useMemo` で作る。
- `TitleScreen` に `latestSaveSummary` と `hasAnySaveData` を props で渡す。
- タイトル領域のテキストをプレースホルダーから実ゲーム説明へ差し替える。
- CTA ボタンの視覚優先度を `保存あり` / `保存なし` で切り替える。
- セーブ概要カードには `マップ名`, `更新日時`, `ターン数` を表示し、情報がない項目は出しすぎない。

受け入れ条件:
- タイトル画面だけで、ゲーム概要と主な勝ち方が把握できる。
- セーブデータがある場合、最新スロットの要約が見える。
- セーブがない場合は `はじめから` が最も目立つ導線になる。

テスト案:
- `tests/ui/TitleScreen.entryPoints.test.tsx` を追加する。
- セーブなし時に `はじめから` が主導線として表示されること。
- セーブあり時に最新セーブ要約が表示されること。
- `つづきから` と `チュートリアル` の導線文言が同時に確認できること。

### 7. マップ選択に詳細プレビュー領域を追加する

対象: `src/screens/MapSelectScreen.tsx`, `src/data/maps.ts`, 必要に応じて `src/app/types.ts`

目的:
- マップ名とサイズだけでは分からない難易度差、特徴、想定時間を選択前に比較できるようにする。
- 「どれを選べばよいか分からない」状態を減らし、選択理由を作る。

設計案:
- `MapMeta` を `difficulty`, `estimatedMinutes`, `victoryHint`, `featureTags`, `summary` を含む構造へ拡張する。
- 一覧は軽量な選択リストのまま残し、右側または下部に `選択中マップ詳細` パネルを追加する。
- 詳細パネルには `難易度`, `広さ`, `推定プレイ時間`, `特徴タグ`, `勝利条件の傾向`, `おすすめ対象` を表示する。
- 難易度は `初心者向け / 標準 / 歯ごたえあり` のようなラベル化された表現にする。
- 初回向けに `おすすめ` バッジを付けられるよう `recommendedForFirstPlay?: boolean` も持てるようにする。

実装ステップ:
- `src/app/types.ts` の `MapMeta` に比較用メタデータを追加する。
- `src/data/skirmishMaps.ts` か関連データに各マップの説明文とタグを付与する。
- `MapSelectScreen` に選択中マップの詳細カードを追加する。
- 一覧選択時に、詳細パネルが即時同期して更新されるようにする。
- `このマップで確定` の近くに短い要約を重ね、決定直前にも判断材料が見えるようにする。

受け入れ条件:
- マップ選択中に、少なくとも難易度・特徴・推定時間・勝利条件の傾向が確認できる。
- 一覧だけでなく詳細パネルを見れば、複数マップの違いを判断できる。
- 初見向けおすすめマップが識別できる。

テスト案:
- `tests/ui/MapSelectScreen.preview.test.tsx` を追加する。
- 選択中マップに応じて詳細パネルの文言が切り替わること。
- 詳細パネルに難易度、推定時間、特徴タグが表示されること。
- `おすすめ` 対象マップにバッジが出ること。

### 8. 設定画面の数値入力にレンジ補助を追加する

対象: `src/screens/SettingsScreen.tsx`, 必要に応じて `src/app/types.ts`

目的:
- 極端な値の投入を減らし、ゲームバランスを壊しにくくする。
- 各数値が何に効くのか、どの程度が標準かを入力時に判断できるようにする。

設計案:
- 数値項目ごとに `min`, `max`, `step`, `recommendedRangeText` を持つ `SETTINGS_FIELD_META` を定義する。
- `TextField` の `inputProps` に `min`, `max`, `step` を設定し、`helperText` で標準値と推奨レンジを表示する。
- 推奨レンジ外の入力時は即エラーにせず、まず `warning` 相当の補助文で注意を出す。
- 完全に不正な値だけを `開始不可` 条件にし、極端だが許容する値は開始可能のままにするか、上限でクランプする方針を選べるようにする。
- `標準にリセット` を詳細設定の近くにも配置し、調整後に戻しやすくする。

実装ステップ:
- `SettingsScreen` 内に数値設定メタ定義を追加する。
- 各 `TextField` に `helperText`, `inputProps`, `error` 判定を追加する。
- 既存の `isValid` を `min/max` ベースへ寄せ、負数判定だけに依存しないようにする。
- 推奨レンジ外かどうかを示す `isRecommendedOutlier()` を切り出す。
- 詳細設定の末尾かヘッダに `詳細設定を標準へ戻す` 導線を追加する。

受け入れ条件:
- 主要な数値項目に最小値・最大値・推奨レンジの説明が出る。
- 明らかな異常値は開始ボタンが無効になるか、入力時に制限される。
- 標準値へ戻す導線が詳細設定の文脈内にも存在する。

テスト案:
- `tests/ui/SettingsScreen.numericRanges.test.tsx` を追加する。
- 各数値項目に `min` / `max` が付くこと。
- 範囲外入力時に補助メッセージまたはエラー状態になること。
- リセットで標準値に戻ること。

### 9. チュートリアルを基本操作編と詳細ルール編に分割する

対象: `src/screens/TutorialScreen.tsx`, 必要に応じて `src/screens/BattleScreen.tsx`

目的:
- 初回プレイ前に必要な情報だけを短時間で読めるようにする。
- 対局画面の UI 名称と説明を結びつけ、読後すぐ操作に移れるようにする。

設計案:
- `TutorialScreen` を `3分で分かる基本操作` と `詳細ルール` の2タブまたは2セクション構成にする。
- 基本操作編は `1. ユニットを選ぶ 2. 移動先を選ぶ 3. 攻撃/占領する 4. ターン終了` の順に固定する。
- 詳細ルール編は `地形`, `補給`, `索敵`, `生産`, `勝利条件` の参照的内容をまとめる。
- 各項目の見出しに、実画面上のラベル名をそのまま使う。例: `ユニット情報`, `実行コマンド`, `経過ログ`, `盤面凡例`。
- 基本操作編の末尾に `そのまま対局へ戻る` または `はじめから遊ぶ` の導線を近接配置する。

実装ステップ:
- `TutorialScreen` に `activeTutorialSection` state を追加する。
- 長文本文を短いカードやステップ列へ分解し、基本操作編は4-6ステップ以内に収める。
- 既存のルール説明文を `基本操作で必要なもの` と `詳細で読むもの` に再分類する。
- `BattleScreen` の実際の UI ラベルとチュートリアル見出しを合わせる。
- 可能なら簡単なミニ図解や箇条書きにし、段落連打を避ける。

受け入れ条件:
- 基本操作編だけ読めば、最初の1ターンに必要な操作が分かる。
- 詳細ルールは基本操作から分離され、後から参照できる。
- 対局画面のラベル名とチュートリアル文言が対応している。

テスト案:
- `tests/ui/TutorialScreen.sections.test.tsx` を追加する。
- `3分で分かる基本操作` と `詳細ルール` の切替が表示されること。
- 基本操作編に主要4ステップ以上があること。
- 画面 UI と一致するラベル名がチュートリアル内に含まれること。
