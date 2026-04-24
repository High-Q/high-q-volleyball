# Tasks: [変更名]

> **承認ゲート**: Design が承認済みであること。各タスクは TDD（RED→GREEN→REFACTOR）で実装すること。

## 進捗

- 完了: 0 / N タスク

---

## タスク一覧

### Setup

- [ ] **T-01**: ブランチを作成する（`feature/<issue番号>-<概要>`）
  - `git checkout -b feature/XXX-yyy`

---

### Domain Layer

- [ ] **T-02**: `[EntityName]Id` Value Object を実装する
  - UT: 空文字でエラー / 正常値でインスタンス生成
  - ファイル: `packages/shared/src/domain/[domain]/[EntityName]Id.ts`

- [ ] **T-03**: `[EntityName]` Entity を実装する
  - UT: バリデーション・ドメインメソッドの正常系・異常系
  - ファイル: `packages/shared/src/domain/[domain]/[EntityName].ts`

- [ ] **T-04**: `[EntityName]Repository` インターフェースを定義する
  - UT: 不要（インターフェース定義のみ）
  - ファイル: `packages/shared/src/domain/[domain]/[EntityName]Repository.ts`

---

### Application Layer

- [ ] **T-05**: `[UseCaseName]UseCase` を実装する
  - UT: 正常系（モックリポジトリ） / 異常系（エラー伝播）
  - ファイル: `packages/shared/src/application/[UseCaseName]UseCase.ts`

---

### Infrastructure Layer

- [ ] **T-06**: `[EntityName]SupabaseRepository` を実装する
  - Integration Test: Supabase クライアントのモックで CRUD 確認
  - ファイル: `apps/[app]/src/infrastructure/[EntityName]SupabaseRepository.ts`

---

### Presentation Layer

- [ ] **T-07**: `[ComponentName].vue` コンポーネントを実装する
  - Component Test: レンダリング確認 / ユーザー操作確認
  - ファイル: `apps/[app]/src/components/[ComponentName].vue`
  - チェック:
    - [ ] Loading / Empty / Error 状態の表示
    - [ ] モバイルレイアウト確認（375px）
    - [ ] キーボード操作・スクリーンリーダー対応

- [ ] **T-08**: `use[FeatureName].ts` Composable を実装する
  - UT: 状態管理・非同期処理の正常系・異常系
  - ファイル: `apps/[app]/src/composables/use[FeatureName].ts`

---

### Integration

- [ ] **T-09**: ローカル環境で E2E 動作確認
  - [ ] ゴールデンパス（正常フロー）
  - [ ] エラー系（API障害・入力バリデーション）
  - [ ] モバイル表示

- [ ] **T-10**: PR 作成・CI 通過確認
  - [ ] lint
  - [ ] typecheck
  - [ ] test
  - [ ] build

---

## 備考・ブロッカー

<!-- 実装中に発生した課題や決定事項を記録 -->

- 
