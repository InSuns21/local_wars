# 2026-03-20-ai-visible-turn-playback

AI ターン中に、プレイヤーが認知可能な敵行動と結果だけを段階表示するための実装計画です。目的は、Fog of War の情報制約を破らずに、自軍ターン開始時の状況把握コストを下げることです。

最終更新: 2026-03-20
状態: active
関連仕様: [../../product-specs/ai-thinking-routines.md](../../product-specs/ai-thinking-routines.md), [../../product-specs/gameplay-flow.md](../../product-specs/gameplay-flow.md)

## 解決したい課題
- 現状の AI ターンは内部で一気に解決されるため、プレイヤーは自分の手番が始まった時点で結果だけを見ることになる
- Fog of War があるため、敵の実際の移動経路や内部判断をそのまま見せることはできない
- その結果、次のような把握コストが発生している
  - どこで自軍が被害を受けたか分かりにくい
  - どの施設で占領進行や所有変化が起きたか追いづらい
  - 可視範囲で見えていた敵がどのように動いたか認知できない
  - ターン開始直後に盤面全体をスキャンする必要がある

## ゴール
- AI ターン中、プレイヤーが認知可能な出来事だけを逐次再生する
- 可視敵の移動、可視戦闘、被害、占領進行、施設所有変化、新規視認を分かる形で提示する
- Fog of War の制約を守り、不可視の敵経路や不可視状態の敵位置は漏らさない
- 再生後にプレイヤー手番へ遷移し、必要なら短いターン開始サマリーも出せるようにする

## 非ゴール
- AI の思考理由やスコアリング内容を表示すること
- 不可視敵の移動経路や現在位置を推定表示すること
- AI の内部実行をリアルタイム同期に作り変えること

## 基本方針
- AI の内部解決と、プレイヤーに見せる再生イベント列を分離する
- `runAiTurn` は最終 `GameState` を作りつつ、同時に `visible playback events` を収集する
- UI はそのイベント列を順番再生し、再生完了後に最終 `GameState` を確定反映する
- 見せてよい情報の判定は「その瞬間のプレイヤー視点で可視か」「結果として自軍が認知できるか」で決める

## 表示対象の原則

### 表示してよいもの
- プレイヤー視界内にいた敵ユニットの移動
- プレイヤー視界内で発生した攻撃
- 自軍ユニットの被害、撃破、補給切れ警戒などの結果
- 占領進行や施設所有変化
- AI ターン中に新しく視認できるようになった敵ユニット
- プレイヤー手番開始時点で盤面上から直接確認できる差分

### 表示してはいけないもの
- 視界外にいた敵ユニットの移動経路
- 不可視状態の敵現在位置
- 敵がどの候補を比較して行動したかという思考情報
- 記憶情報 `enemyMemory` を断定情報のように見せること

## 提案アーキテクチャ

### 1. AI 実行結果を拡張する
現状の `runAiTurn` は `GameState` を返しているため、以下のような戻り値へ拡張する。

```ts
export type VisibleAiPlaybackEvent =
  | {
      type: 'move';
      unitId: string;
      owner: 'P1' | 'P2';
      path: Coord[];
      startedVisible: boolean;
      endedVisible: boolean;
    }
  | {
      type: 'attack';
      attackerId: string;
      defenderId: string;
      attackerOwner: 'P1' | 'P2';
      defenderOwner: 'P1' | 'P2';
      attackerCoord: Coord;
      defenderCoord: Coord;
      damageToAttacker?: number;
      damageToDefender?: number;
      attackerDestroyed?: boolean;
      defenderDestroyed?: boolean;
      visible: boolean;
    }
  | {
      type: 'capture';
      unitId: string;
      coord: Coord;
      ownerBefore: 'P1' | 'P2' | undefined;
      ownerAfter: 'P1' | 'P2' | undefined;
      capturePointsBefore: number;
      capturePointsAfter: number;
      visible: boolean;
    }
  | {
      type: 'spotted';
      unitId: string;
      coord: Coord;
      unitType: UnitType;
    }
  | {
      type: 'damage_report';
      unitId: string;
      owner: 'P1' | 'P2';
      coord: Coord;
      hpBefore: number;
      hpAfter: number;
      destroyed: boolean;
    }
  | {
      type: 'property_changed';
      coord: Coord;
      ownerBefore: 'P1' | 'P2' | undefined;
      ownerAfter: 'P1' | 'P2' | undefined;
      terrainType: string;
    };

export type AiTurnResult = {
  finalState: GameState;
  playbackEvents: VisibleAiPlaybackEvent[];
};
```

暫定移行としては、`runAiTurn` を直接変えるか、内部に `runAiTurnWithPlayback` を追加して store からは新 API を呼ぶ。

### 2. イベント収集責務を分離する
`src/core/engine/aiTurn.ts` にイベント構築を直書きしすぎると重くなるため、以下の補助モジュールを分ける。

候補:
- `src/core/engine/aiTurnPlayback.ts`
  - 実行前後 `GameState` の比較
  - 可視判定
  - `VisibleAiPlaybackEvent` 生成
- `src/core/types/aiPlayback.ts`
  - イベント型定義

### 3. store に AI 再生状態を持たせる
`gameStore` は AI 実行後ただちに最終状態へ差し替えるのではなく、再生中の一時状態を持てるようにする。

追加候補 state:
- `aiPlaybackStatus: 'idle' | 'running'`
- `aiPlaybackEvents: VisibleAiPlaybackEvent[]`
- `aiPlaybackIndex: number`
- `pendingAiFinalState: GameState | null`
- `displayedGameState: GameState`

追加候補 action:
- `startAiPlayback(result: AiTurnResult)`
- `stepAiPlayback()`
- `finishAiPlayback()`
- `skipAiPlayback()`

実装方針:
- 人間が `END_TURN` を押す
- store は AI の最終結果とイベント列を受け取る
- `displayedGameState` は人間ターン終了直後の状態をベースに、イベントを順次適用して見せる
- 最後に `pendingAiFinalState` を正式な `gameState` として反映する

### 4. BattleScreen で再生 UI を追加する
`BattleScreen` 側では以下を担う。
- AI 再生中のオーバーレイ表示
- 再生速度制御
- `スキップ` ボタン
- 被害数値や占領進行の一時表示
- 新規視認時の強調表示

最低限必要な UI:
- `敵軍行動中...` バナー
- `スキップ` ボタン
- マップ上アニメーション
- ダメージポップアップ
- 占領進行ポップアップ

## 可視判定ルール

### 移動
- 移動開始地点と終了地点のどちらも不可視なら、移動イベントは出さない
- 移動途中で可視になるケースは、最初に可視化されたマス以降だけ表示する
- 実装簡略版では、最初は「開始地点または終了地点が可視なら全経路を表示」でよい
- 将来的に厳密化する場合は、経路を 1 マスずつ視界判定する

### 攻撃
- 戦闘発生時点で攻撃者または防御者が可視なら戦闘演出を出す
- 戦闘自体が見えていなくても、自軍被害や自軍撃破は結果イベントとして表示してよい
- 反撃ダメージも同一イベント内で扱う

### 占領
- 施設マスがプレイヤーに見えていれば進行を表示する
- プレイヤー所有施設の占領進行や所有権変化は、見えていなくてもターン開始差分として別途通知してよいかを仕様で決める
- 初期実装では「現在見えている施設」だけアニメ表示し、不可視の所有変化はターン開始サマリーへ寄せるのが安全

### 新規視認
- AI ターン前は不可視、AI ターン後に可視になった敵は `spotted` として出す
- これはプレイヤーにとって価値が高いので優先度を上げる

## フェーズ分割

### Phase 1: 最小実装
- `AiTurnResult` と `VisibleAiPlaybackEvent` を導入
- 可視戦闘、被害、占領進行、施設所有変化だけイベント化
- `BattleScreen` に `敵軍行動中...` と `スキップ` を追加
- イベントは簡易順再生、移動アニメはまだ入れない

期待効果:
- どこで被害と占領が起きたか把握しやすくなる
- 実装リスクが低い

### Phase 2: 可視移動の逐次再生
- 状態: 実装済み (2026-03-21)
- `MOVE_UNIT` 後に経路ベースの表示イベントを追加
- 可視敵のみ 1 マスずつ動かす
- 移動途中で視認された場合の簡易処理を追加

期待効果:
- 「敵がどこから来たか」の認知性が大きく改善する

### Phase 3: 新規視認とターン開始サマリー
- `spotted` を追加
- 再生終了後に短い差分サマリーを表示
- `HQ脅威 / 施設喪失 / 主力被害 / 新規視認` などを要約する

期待効果:
- 再生を見逃しても、開始時点で何が変わったかが分かる

## 実装手順
1. `aiPlayback` 型定義を追加する
2. `runAiTurn` の内部でコマンド前後差分を拾えるようにする
3. `ATTACK / CAPTURE / END_TURN` まわりからイベント化を始める
4. store に `pendingAiFinalState` と再生キューを追加する
5. `BattleScreen` に AI 再生状態 UI を追加する
6. 次に `MOVE_UNIT` の可視経路イベントを追加する
7. 最後に `spotted` とターン開始サマリーを足す

## 変更対象の候補ファイル
- `src/core/engine/aiTurn.ts`
- `src/core/engine/aiTurnPlayback.ts` 新規
- `src/core/types/aiPlayback.ts` 新規
- `src/store/gameStore.ts`
- `src/screens/BattleScreen.tsx`
- 必要なら `src/components/board/GameCanvas` 周辺

## UI / UX 詳細案
- 再生速度は初期値 `標準` のみでよい
- 連続イベント間は `250ms` 前後
- 攻撃イベントは `450ms` 前後
- `スキップ` で即座に `pendingAiFinalState` を確定反映する
- プレイヤー操作は再生中無効化する
- 再生中でも `現在の出来事` を 1 行テキストで出す
  - 例: `敵戦車が前進` `自軍砲兵が被弾` `工場の占領が進行`

## リスクと注意点
- AI 実行と表示再生を混ぜると、状態整合が崩れやすい
- 再生中に `gameState` を直接更新し続けると undo や UI 選択状態へ影響しやすい
- 移動可視判定を厳密にやると複雑化するため、最初は簡略ルールで入れる
- FoW に関わるため、`見せてよい情報` の境界をテストで固定する必要がある

## テスト方針

### unit
- 可視移動イベントが生成される
- 不可視移動イベントが生成されない
- 可視戦闘が戦闘イベントへ変換される
- 自軍被害だけは不可視戦闘でも `damage_report` として拾える仕様にするかを固定する
- 占領進行イベント、施設所有変化イベントが正しく出る
- 新規視認イベントが出る

### integration
- 人間 `END_TURN` 後、AI 最終状態とは別に再生イベント列が store に積まれる
- 再生完了後に `pendingAiFinalState` が正式状態へ反映される
- `skipAiPlayback()` で即時完了できる
- FoW で不可視敵経路がイベント列へ出ない

### ui
- AI 再生中に `敵軍行動中...` が表示される
- `スキップ` ボタンが表示される
- 再生中はプレイヤー操作 UI が無効化される
- 可視戦闘時に被害表示が見える
- 占領進行が見える
- 再生後に自軍手番へ戻る

## 受け入れ条件
- AI ターン中、可視敵の行動を段階的に認知できる
- Fog of War 下で不可視敵の経路や位置を漏らさない
- 自軍被害や施設変化を見逃しにくくなる
- `スキップ` しても最終状態が破綻しない
- 再生なしの従来挙動より状況把握がしやすい

## 実装判断メモ
- まずは `差分の認知` を優先し、アニメーションの豪華さは後回しにする
- 盤面上の逐次移動は価値が高いが、Phase 1 で必須にはしない
- 最初から完全リアルタイムにせず、`最終状態 + 見せてよいイベント列` の二層構造で安定化する