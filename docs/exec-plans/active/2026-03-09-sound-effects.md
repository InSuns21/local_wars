# 2026-03-09 sound-effects

状態: active

## 目的
- 主要UIと戦闘結果へ短いSEを導入し、操作の確定感と視認性を高める
- まずは仮音で体験を作り、後から本番音源へ差し替え可能にする

## スコープ
- `confirm / cancel / error`
- `unit-select / move-confirm`
- `attack / hit / destroy`
- `SE音量` の保存と設定UI

## 実装方針
- `src/services/soundEffects.ts` を追加し、`SoundEffectId` ベースで再生する
- `src/services/seVolume.ts` を追加し、`SE音量` を `localStorage` へ保存する
- `App` が音量状態を持ち、各画面へ必要な再生コールバックを渡す
- `BattleScreen` は画面内の行動結果に応じて `error`, `move-confirm`, `attack`, `hit`, `destroy`, `confirm` を鳴らす
- `AudioSettingsScreen` は `BGM音量` と `SE音量` の2系統を表示する

## 実装ステップ
1. 仕様書と索引、台帳を更新する
2. `SE音量` の保存サービスを追加する
3. 仮音ベースの `soundEffects` サービスを追加する
4. `AudioSettingsScreen` と `App` に `SE音量` を統合する
5. `BattleScreen` に主要コマンドと戦闘結果のSE再生を追加する
6. タイトル、マップ選択、設定、音量設定の主要導線に `confirm / cancel` を追加する
7. テストを追加・更新し、`typecheck` と `test:changed` を通す

## テスト方針
- `seVolume` の保存ロジックをユニットテストする
- `soundEffects` はモック `AudioContext` で再生呼び出しを確認する
- `BattleScreen` は再生コールバックを注入して、選択、移動、攻撃、失敗のSEを確認する
- `AudioSettingsScreen` は `SE音量` UI を確認する

## 完了条件
- 音量設定画面に `SE音量` が追加されている
- タイトルと設定導線に `confirm / cancel` が付く
- 盤面で `unit-select / move-confirm / attack / hit / destroy / error` が鳴る
- `npm run typecheck` と `npm run test:changed` が PASS する
