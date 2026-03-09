# 効果音素材

このディレクトリの効果音は、Kenney の無料素材 `Interface Sounds` を元に配置しています。

## 出所
- 配布元: Kenney
- パック名: Interface Sounds
- 取得元: `Calinou/kenney-interface-sounds` の GitHub ミラー
- ライセンス: `LICENSE.txt` を参照

## 割り当て
- `confirm.mp3`: 決定
- `cancel.mp3`: 戻る・キャンセル
- `error.mp3`: エラー
- `unit-select.mp3`: ユニット選択
- `move-confirm-foot.mp3`: 徒歩移動
- `move-confirm-tread.mp3`: 履帯移動
- `move-confirm-wheel.mp3`: 車輪移動
- `move-confirm-air.mp3`: 航空移動
- `move-confirm-naval.mp3`: 海上移動
- `attack.mp3`: 攻撃開始
- `hit.mp3`: 被弾
- `destroy.mp3`: 撃破

## 運用
- 再生サービスはまずこのディレクトリの音声ファイルを使います
- 音声ファイルが再生できない環境では `Web Audio API` の仮音へフォールバックします
- 差し替える場合は同名ファイルを上書きしてください
