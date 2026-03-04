# LOCAL WARS システム設計（TypeScript/React + Zustand + Jest）

## 1. 設計方針

- 完全ローカル完結（オフライン/PWA、保存は IndexedDB + JSON Export/Import）
- UI とゲームルールを分離し、ロジックは純粋関数中心でテスト容易性を最優先
- 「速い操作」を実現するため、入力処理と盤面描画は軽量に保つ
- 段階開発: MVP（地上戦）→ v1.0（FoW/航空/輸送/海）→ v1.5（キャンペーン/リプレイ）

## 2. アーキテクチャ概要

```text
React UI (components/screens)
  -> hooks (UI入力, キーバインド, 描画状態)
  -> Zustand Store (app state orchestration)
  -> UseCases (turn, move, combat, production, capture)
  -> Core Domain (pure logic: rules, simulation, AI, pathfinding)
  -> Data/Repository (map/unit/scenario JSON, save/load, replay, idb)
```

- `Core Domain` は React/Zustand に依存しない
- `UseCases` は「1操作単位の整合性」を担保する境界
- `Zustand` は状態集約と UI 同期のみ担当

## 3. 推奨ディレクトリ構成

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    board/
      GameCanvas.tsx
      TileLayer.tsx
      UnitLayer.tsx
      OverlayLayer.tsx
    hud/
      UnitPanel.tsx
      CommandMenu.tsx
      TurnPanel.tsx
      ProductionPanel.tsx
      CombatForecast.tsx
    common/
      Modal.tsx
      Icon.tsx
  screens/
    TitleScreen.tsx
    SkirmishScreen.tsx
    CampaignScreen.tsx
    EditorScreen.tsx
    BattleScreen.tsx
  hooks/
    useKeyboardControls.ts
    useCanvasRenderer.ts
    useSelection.ts
  store/
    gameStore.ts
    slices/
      sessionSlice.ts
      boardSlice.ts
      uiSlice.ts
      historySlice.ts
      aiSlice.ts
  core/
    types/
      game.ts
      unit.ts
      map.ts
      combat.ts
      ai.ts
    rules/
      movement.ts
      combat.ts
      capture.ts
      production.ts
      supply.ts
      victory.ts
      fog.ts
    engine/
      turnEngine.ts
      commandApplier.ts
      actionValidator.ts
      replayEngine.ts
    ai/
      evaluator.ts
      policy.ts
      search.ts
    pathfinding/
      moveRange.ts
      threatMap.ts
  data/
    units/defaultUnits.json
    maps/skirmish/*.json
    scenarios/*.json
  services/
    storage/
      saveRepository.ts
      idbClient.ts
      exportImport.ts
    random/
      seededRng.ts
  utils/
    coord.ts
    math.ts
    assertions.ts
  styles/
    tokens.css
    game.css
tests/
  unit/
  integration/
  ui/
  fixtures/
```

## 4. ドメインモデル（MVP中心）

### 4.1 主な型

- `GameState`
  - `turn: number`
  - `currentPlayerId: PlayerId`
  - `phase: "command" | "production" | "end"`
  - `map: MapState`
  - `units: Record<UnitId, UnitState>`
  - `players: Record<PlayerId, PlayerState>`
  - `rngSeed: number`
  - `actionLog: ActionLogEntry[]`
  - `winner: PlayerId | null`

- `UnitState`
  - `id, owner, type, hp(0-10), fuel, ammo, position, moved, acted, cargo`

- `TileState`
  - `terrainType, owner?, capturePoints?, productionType?`

### 4.2 コマンド駆動

- UI は必ず `GameCommand` を発行し、`commandApplier` で適用
- 例:
  - `MoveUnitCommand`
  - `AttackCommand`
  - `CaptureCommand`
  - `ProduceUnitCommand`
  - `EndTurnCommand`
  - `UndoCommand`（同ターンのみ）

## 5. ルール設計の実装分割

- `rules/movement.ts`
  - 地形コスト・移動タイプ・ZOC・通行可否
  - BFS/Dijkstra で移動可能範囲を計算
- `rules/combat.ts`
  - 戦闘予測と実戦闘の両方を提供
  - 乱数は `seededRng` で再現可能
- `rules/capture.ts`
  - 歩兵系のみ占領可、毎ターン占領値を進める
- `rules/production.ts`
  - 拠点種別に応じた生産可否、資金チェック
- `rules/supply.ts`
  - 都市/補給点で燃料・弾薬回復、枯渇判定
- `rules/victory.ts`
  - HQ占領/全滅/VP期限
- `rules/fog.ts`（v1.0）
  - 視界計算と隠蔽ユニット判定

## 6. Zustand 状態管理設計

## 6.1 Store構成

- `sessionSlice`
  - モード（スカーミッシュ/キャンペーン）、難易度、設定
- `boardSlice`
  - `GameState` と現在選択中ユニット/タイル
- `uiSlice`
  - オーバーレイ表示（移動範囲、脅威範囲、予測パネル）
- `historySlice`
  - Undo履歴（同ターン限定）、リプレイログ
- `aiSlice`
  - AI思考中フラグ、推奨行動、難易度パラメータ

## 6.2 Store API（例）

- `dispatchCommand(cmd: GameCommand): CommandResult`
- `getMoveRange(unitId): Coord[]`
- `getThreatMap(playerId): ThreatCell[]`
- `simulateCombat(attackerId, defenderId): CombatForecast`
- `endTurn(): void`
- `undo(): void`

## 6.3 ミドルウェア

- `persist`（セーブスロット単位）
- `devtools`（開発時のみ）
- `subscribeWithSelector`（描画最適化）

## 7. UI/描画設計

- Canvas 2D を主描画に採用（盤面/ユニット/範囲オーバーレイ）
- React は HUD とメニューに集中
- 入力導線:
  - 左クリック: 決定
  - 右クリック: キャンセル
  - `WASD/矢印`: カーソル移動
  - `Enter`: 決定
  - `Space`: 行動メニュー
  - `Shift`: 射程/危険範囲オーバーレイ

## 8. AI設計（ローカル最適）

- Easy: 局所最大化（当面の有利交換）
- Normal: 占領価値 + 被害回避 + 目標距離
- Hard: 1〜2手先探索（候補手を枝刈り）+ 賢いユニット生産 + うまい間接射撃
- VeryHard: MCTS（3,4手先） + 生産ユニット最適化 + うまい間接射撃


評価関数（例）:

- `score = VP差 + 拠点価値 + 生存戦力 + 危険露出ペナルティ + 目標達成度`

## 9. 永続化/データ形式

- `maps/*.json`
  - サイズ、地形配列、初期ユニット、勝利条件、資金、FoW設定
- `units/defaultUnits.json`
  - コスト、移動、射程、武器テーブル、燃料/弾薬
- `scenarios/*.json`
  - 会話、イベント、増援、クリア条件
- `saveRepository.ts`
  - IndexedDB に `saveSlots` と `replays` を分離保存
- Export/Import
  - バージョン付き JSON（`schemaVersion`）で互換管理

## 10. テスト戦略（Jest厚め）

## 10.1 テスト層

- Unit (`tests/unit`)
  - ルール関数を網羅（移動/戦闘/占領/勝利/補給）
- Integration (`tests/integration`)
  - コマンド適用の一連処理（移動→攻撃→反撃→撃破→資金更新）
- UI (`tests/ui`)
  - React Testing Library で操作導線検証（選択、メニュー、予測表示、Undo）

## 10.2 重点ケース

- 戦闘予測と実ダメージの整合（seed固定）
- ZOC/地形コスト境界
- 占領中断（被弾/移動）と継続判定
- 生産不能条件（資金不足/配置不可）
- 勝利条件競合（同時達成時の優先規則）
- Undo可能範囲（同ターン限定）
- AIターンで不正手を打たないこと

## 10.3 カバレッジ基準（初期）

- `lines/statements/functions >= 85%`
- `branches >= 75%`
- `core/rules` は `branches >= 90%` を目標

## 11. リリース段階に対応した実装スコープ

- MVP
  - 地上5種、占領/生産/HQ勝利、AI Easy/Normal、セーブ/ロード、スカーミッシュ
- v1.0
  - キャンペーン10面、FoW
- v1.5
  - 補給ユニット、航空・輸送、対空ユニット、高難度AI、海要素
  - 人間ユニットは燃料無限
  - 人間ユニットで砲兵は弾薬制限あり、単純歩兵は弾薬制限なし
- v2.0
  - 簡易エディタ、リプレイ、パズル、キャンペーン

## 12. 最初の実装タスク（着手順）

1. `core/types` と `rules/movement/combat/capture/victory` の純粋関数を実装
2. `turnEngine` と `commandApplier` を作成し、Jest unit/integration を先行
3. `gameStore`（Zustand）を導入し `dispatchCommand` で一元制御
4. `BattleScreen + GameCanvas + HUD` を実装し、UIテストを作成
5. `saveRepository`（IndexedDB）と JSON Export/Import を実装
6. AI Easy/Normal を追加し、ターン進行の統合テストを拡充
