# LOCAL WARS

ブラウザで動作するターン制の戦略シミュレーションゲームです。  
React + TypeScript + Vite で実装されており、ローカル実行ですぐ遊べます。

## 特徴

- ターン制の盤面バトル（移動 / 攻撃 / 占領 / 生産）
- 勝利条件: HQ占領 / 敵全滅 / VP上限到達（マップ設定時）
- 索敵（Fog of War）ON/OFF
- 設定可能なゲームパラメータ（初期資金、収入、拠点回復量など）
- 燃料・弾薬消費のON/OFF
- 3スロットのセーブ/ロード（`localStorage`）
- 収録スカーミッシュマップ: 10種
- PWA対応（インストール可能）

## 動作環境

- Node.js 18 以上推奨
- npm

## セットアップ

```bash
npm install
```

## 開発サーバー起動

```bash
npm run dev
```

- 既定ポート: `http://localhost:3000`

## ビルド

```bash
npm run build
```

生成物は `dist/` に出力されます。

## プレビュー

```bash
npm run preview
```

## テスト / 品質チェック

```bash
npm run test
npm run test:watch
npm run test:coverage
npm run typecheck
npm run lint
```

## ゲームの基本フロー

1. ユニットを選択して移動
2. 攻撃・占領・待機を実行
3. 自軍工場でユニットを生産
4. ターン終了で相手手番へ

## 設定項目（例）

- AI難易度（easy / normal / hard）
- 人間プレイヤー陣営（P1 / P2）
- 索敵の有無
- 初期資金
- 1ターン収入（都市 / 工場 / HQ）
- 都市 / 工場 / HQ のHP回復量
- 敵行動ログ表示
- 航空・海ユニット有効化
- 燃料 / 弾薬消費有効化

## セーブデータ

- 保存先: ブラウザ `localStorage`
- 既定キー: `local_wars_save_slots_v1`
- スロット数: 3

## ディレクトリ構成（主要）

```text
src/
  app/          アプリ全体の状態・設定型
  components/   画面コンポーネント
  core/         ルール・エンジン
  data/         マップ定義
  screens/      各画面
  services/     セーブ管理など
  store/        Zustandストア
tests/          unit / integration / ui テスト
```

## 技術スタック

- React 18
- TypeScript
- Vite
- Zustand
- MUI
- Jest + Testing Library

## 音源クレジット

BGM は以下のフリー素材を利用しています。

- 提供元: incompetech (Kevin MacLeod)
- URL: https://incompetech.com/music/royalty-free/music.html
- ライセンス: CC BY 4.0
- ライセンスURL: https://creativecommons.org/licenses/by/4.0/

曲ごとの割り当てはゲーム内のクレジット画面に記載しています。

※ 配布音源をそのままではなく、ゲーム用途向けに約20秒の短尺ループ用へ編集して利用しています。

## ライセンス

ライセンス表記は未設定です。公開時に必要であれば `LICENSE` を追加してください。







