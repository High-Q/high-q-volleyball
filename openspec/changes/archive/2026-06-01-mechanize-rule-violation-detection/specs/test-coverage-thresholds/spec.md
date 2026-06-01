## ADDED Requirements

### Requirement: vitest coverage を CI で計測し threshold を設定する

`apps/admin` / `apps/reservation` / `packages/shared` の vitest 設定には coverage provider（`@vitest/coverage-v8` 等）が install され、coverage threshold が設定されていなければならない（SHALL）。CI には `pnpm -r test:coverage` 相当の step が追加され、threshold を下回った場合 CI が fail しなければならない（SHALL）。

初期 threshold（本 change Apply 中に実測して確定）:
- lines: 50% 以上
- branches: 40% 以上
- functions: 50% 以上

threshold は段階的に引き上げる方針とし、引き上げ作業は別 Issue で扱う（SHALL NOT 本 change で 70% 等の高い目標値を設定する）。

#### Scenario: coverage threshold 未達で CI fail
- **WHEN** PR で test を実行した結果、`apps/reservation` の lines coverage が 40% である
- **THEN** vitest coverage step が threshold (50%) 未達として fail する

#### Scenario: threshold 達成で CI pass
- **WHEN** すべての app で threshold を満たす
- **THEN** coverage step が pass する

### Requirement: 新規追加された UI コンポーネントの 4 状態テスト存在を CI で warning する

`apps/admin` / `apps/reservation` の `widgets/` / `features/` / `pages/` 配下に新規追加された `.vue` ファイルに対し、対応する `*.spec.ts` ファイルが存在し、その内容に `Loading` / `Empty` / `Error` / `Success` の少なくとも 1 つを含む test ケース名が含まれていることが望ましい（SHOULD）。存在しない場合 CI step は warning を報告しなければならない（SHALL）。warning は CI fail にしない（SHALL NOT fail）。

対象から除外:
- `entities/*/ui/` 配下の純粋表示用コンポーネント（model / store と独立した薄いラッパー）
- `shared/ui/` 配下のプリミティブ（shadcn-vue から copy したもの）
- ファイル末尾が `.stories.vue` のもの

#### Scenario: spec ファイル無しで warning
- **WHEN** PR で `apps/admin/src/widgets/foo/Foo.vue` が新規追加され、`Foo.spec.ts` が存在しない
- **THEN** 4 状態テスト存在 step に warning が出る

#### Scenario: 4 状態のいずれかをカバーで warning なし
- **WHEN** `Foo.spec.ts` に `it("renders Loading state", ...)` が含まれる
- **THEN** warning が出ない

#### Scenario: shared/ui 配下のプリミティブは対象外
- **WHEN** `apps/reservation/src/shared/ui/Input.vue` が新規追加され spec が存在しない
- **THEN** warning が出ない

### Requirement: E2E ファイル数の機能あたり閾値超過を CI で warning する

`apps/*/e2e/` 配下の `.e2e.ts` ファイル数を機能（≒先頭ディレクトリ名 or ファイル名 prefix）ごとに集計し、1 機能あたり 3 ファイル以上の場合 CI step は warning を報告しなければならない（SHALL）。warning は CI fail にしない（SHALL NOT fail）。本ルールは CLAUDE.md「E2E スケーラビリティ運用ルール」と整合する。

#### Scenario: 1 機能 3 ファイル以上で warning
- **WHEN** `apps/reservation/e2e/booking-*.e2e.ts` が 3 ファイル以上存在する
- **THEN** E2E 件数 step に「booking 機能の E2E が 3 件以上」warning が出る

#### Scenario: 全機能 2 件以下で warning なし
- **WHEN** すべての機能で E2E が 2 件以下
- **THEN** warning が出ない

### Requirement: coverage report を PR コメント / artifact として可視化する

CI で生成した coverage report は次のいずれかの方法で可視化されなければならない（SHALL）:

- A. PR コメント（`actions/github-script` または `codecov/codecov-action` 等で coverage summary を投稿）
- B. GitHub Actions の job summary に coverage 表を出力
- C. `actions/upload-artifact` で `coverage/` ディレクトリを保存（`retention-days: 14`）

少なくとも 1 つの可視化を実装しなければならない（SHALL）。可視化なしで threshold チェックのみは許可しない（SHALL NOT）。

#### Scenario: 可視化が少なくとも 1 つ実装されている
- **WHEN** `.github/workflows/ci.yml` を読む
- **THEN** PR コメント / job summary / artifact upload のいずれかが coverage report に対して設定されている
