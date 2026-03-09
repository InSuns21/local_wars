# 効果音素材

このディレクトリの効果音は、Kenney の無料素材 `Interface Sounds` を元に配置しています。

## 出所
- 配布元: Kenney
- パック名: Interface Sounds
- 取得元: `Calinou/kenney-interface-sounds` の GitHub ミラー
- ライセンス: `LICENSE.txt` を参照

## 割り当て
- `confirm.wav`: 決定
- `cancel.wav`: 戻る・キャンセル
- `error.wav`: エラー
- `unit-select.wav`: ユニット選択
- `move-confirm-foot.wav`: 徒歩移動
- `move-confirm-tread.wav`: 履帯移動
- `move-confirm-wheel.wav`: 車輪移動
- `move-confirm-air.wav`: 航空移動
- `move-confirm-naval.wav`: 海上移動
- `attack.wav`: 攻撃開始
- `hit.wav`: 被弾
- `destroy.wav`: 撃破

## 運用
- 再生サービスはまずこのディレクトリの音声ファイルを使います
- 音声ファイルが再生できない環境では `Web Audio API` の仮音へフォールバックします
- 差し替える場合は同名ファイルを上書きしてください
