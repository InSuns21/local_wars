# sound-effects

状態: 実装済み

短い効果音を追加して、操作の確定感と戦闘結果の把握を強めるための仕様です。本番音源は無料素材を `public/audio/se/` に配置し、再生できない環境だけ `Web Audio API` の仮音へフォールバックします。

## 目的
- 主要操作の成功、取消、失敗を視線移動なしに把握しやすくする
- 盤面操作の手応えを増やして、ゲームらしさを高める
- 戦闘結果の理解を速くする

## 対象SE
- `confirm`: 決定、保存、開始、通常コマンド成功
- `cancel`: 戻る、キャンセル、メニューを閉じる
- `error`: 実行失敗、条件不足、無効コマンド
- `unit-select`: 自軍ユニット選択
- `move-confirm-foot`: 徒歩移動成功
- `move-confirm-tread`: 履帯移動成功
- `move-confirm-wheel`: 車輪移動成功
- `move-confirm-air`: 航空移動成功
- `move-confirm-naval`: 海上移動成功
- `attack`: 攻撃実行
- `hit`: 攻撃成功でダメージ発生、撃破なし
- `destroy`: 撃破発生

## 再生ルール
### UI
- `confirm`
  - タイトルから各画面への遷移
  - マップ確定
  - 設定開始
  - セーブ上書き確定
  - 生産、搭載、降車、補給、占領、施設爆撃、ターン終了、行動取消の成功
- `cancel`
  - 戻る操作
  - モーダルのキャンセル
  - 盤面外のメニューを閉じる操作
- `error`
  - 実行コマンドが失敗した時
  - セーブなしで `つづきから` を行った時などの即時失敗時

### 盤面操作
- `unit-select`
  - 自軍ユニットを選択した時だけ再生する
  - 敵ユニット選択や空タイル選択では再生しない
- `move-confirm-*`
  - `MOVE_UNIT` が成功した時に、移動ユニットの `MovementType` に応じて再生する
  - 移動後攻撃、移動後占領の前半移動も成功時に再生する
  - 対応は `FOOT / TREAD / WHEEL / AIR / NAVAL`

## 移動音のイメージ
- `FOOT`
  - 軽い短い2歩分の足音。乾いたクリック寄りで、重すぎない
- `TREAD`
  - 低めで重い、短い履帯音。鈍い前進感を優先する
- `WHEEL`
  - `TREAD` より軽く速い、転がる感のある短音
- `AIR`
  - 上昇感のある明るい短音。地上移動音より高めで滑るような印象
- `NAVAL`
  - 低めでゆっくりした推進音。重心が低く、水上を進む感じを優先する

### 戦闘
- `attack`
  - 攻撃コマンド成功時に再生する
- `hit`
  - 攻撃後にいずれかのユニットへダメージが入り、撃破が発生しなかった時に再生する
- `destroy`
  - 攻撃後に少なくとも1ユニットが撃破された時に再生する

## 音量設定
- `BGM音量` と `SE音量` は分離する
- `SE音量` の保存先は `localStorage`
- 値の範囲は `0-100`
- デフォルト値は `70`

## 実装方針
- 本番音源は `public/audio/se/` の音声ファイルを使用する
- 素材は無料配布の Kenney `Interface Sounds` をベースに割り当てる
- 呼び出し側は `SoundEffectId` だけを指定し、音源詳細はサービス層に隠蔽する
- 音声ファイルが使えない環境では `Web Audio API` の短い仮音へフォールバックする
- テスト環境では実音再生を要求しない

## 非対象
- 長い演出音
- 環境音
- ボイス
- マップや兵種ごとの個別SE差分

## 素材配置
- `public/audio/se/confirm.mp3`
- `public/audio/se/cancel.mp3`
- `public/audio/se/error.mp3`
- `public/audio/se/unit-select.mp3`
- `public/audio/se/move-confirm-foot.mp3`
- `public/audio/se/move-confirm-tread.mp3`
- `public/audio/se/move-confirm-wheel.mp3`
- `public/audio/se/move-confirm-air.mp3`
- `public/audio/se/move-confirm-naval.mp3`
- `public/audio/se/attack.mp3`
- `public/audio/se/hit.mp3`
- `public/audio/se/destroy.mp3`

## 受け入れ条件
- 音量設定画面で `BGM音量` と `SE音量` を個別に調整できる
- 指定したSEが主要導線で再生される
- 移動成功時は `MovementType` に応じた移動音が鳴る
- `SE音量 0` では再生されない
- 音声ファイルが使えない環境でも仮音へフォールバックして動作する
