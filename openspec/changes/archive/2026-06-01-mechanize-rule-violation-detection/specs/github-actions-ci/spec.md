## MODIFIED Requirements

### Requirement: lint ジョブが apps/lp の lint を実行する

`lint` ジョブは `pnpm -r lint` で全アプリ（`apps/lp` / `apps/admin` / `apps/reservation`）の ESLint を実行しなければならない（SHALL）。`apps/admin` と `apps/reservation` には本 change で `lint` script を新規追加する（SHALL）。各アプリの lint script が無いワークスペースは `pnpm -r` の挙動でスキップされる前提とする。終了コード 0 で成功とみなす（SHALL）。

#### Scenario: lint コマンドが pnpm -r lint である
- **WHEN** lint ジョブのチェックステップを読み込む
- **THEN** `pnpm -r lint` が実行される

#### Scenario: admin と reservation の lint が CI で実行される
- **WHEN** `pnpm -r lint` を実行する
- **THEN** `apps/admin` と `apps/reservation` の ESLint も起動し、ESLint error 時に lint job が fail する

## ADDED Requirements

### Requirement: static-checks ジョブが構造ルール検査を CI で並列実行する

ワークフローは `static-checks` ジョブを持たなければならない（SHALL）。`static-checks` ジョブは `needs: install` を宣言し（SHALL）、`install` 完了後に他の typecheck / lint / test / build / e2e と並列で起動しなければならない（SHALL）。本ジョブは以下の step を実行しなければならない（SHALL）:

1. `service_role` 文字列の grep 検査（`apps/*/src/` 配下に出現したら fail）
2. `dependency-cruiser` の依存方向検証（違反で fail）
3. `stylelint` の `.vue` 内 `<style>` ブロック検査（warning で job 自体は pass）

各 step は非ゼロ終了で job を fail させなければならない（SHALL、warning 設計の step を除く）。

#### Scenario: static-checks が install を needs に持つ
- **WHEN** `.github/workflows/ci.yml` の `jobs.static-checks` を読み込む
- **THEN** `needs: install` が含まれる

#### Scenario: static-checks が他ジョブと並列に起動する
- **WHEN** install が成功した後の挙動を観察する
- **THEN** typecheck / lint / test / build / e2e / static-checks が同時刻に起動する

#### Scenario: service_role grep step が fail で job fail
- **WHEN** `apps/reservation/src/foo.ts` に `service_role` 文字列がある状態で CI が走る
- **THEN** static-checks job が fail する

### Requirement: migration-safety ジョブが SQL 静的解析を CI で実行する

ワークフローは `migration-safety` ジョブを持たなければならない（SHALL）。本ジョブは PR の変更ファイルに `supabase/migrations/**` が含まれる場合のみ起動しなければならない（SHALL、`paths-filter` または `dorny/paths-filter` 等で判定）。本ジョブは以下の step を実行しなければならない（SHALL）:

1. RLS ポリシー存在検査（allowlist 除外）
2. マイナンバー 12 桁 text 列禁止検査
3. ロールバック手順コメント存在 warning

`service_role` 検査と異なり migration 関連は変更頻度が低いため独立 job として隔離する。

#### Scenario: migrations 変更なしで migration-safety はスキップ
- **WHEN** PR の変更が `apps/` のみで `supabase/migrations/` を含まない
- **THEN** migration-safety job は起動しない（skipped）

#### Scenario: 新規 migration 追加で migration-safety が起動
- **WHEN** PR の変更に `supabase/migrations/*.sql` の追加が含まれる
- **THEN** migration-safety job が起動し、RLS / マイナンバー検査を実行する

#### Scenario: RLS なし migration で job fail
- **WHEN** 新規 migration ファイルに `create table` のみで `enable row level security` を含まない
- **THEN** migration-safety job が fail し、PR を merge できない

### Requirement: test ジョブが coverage threshold を計測する

`test` ジョブは `pnpm -r test:coverage` 相当のコマンドで vitest を coverage 計測モードで実行しなければならない（SHALL）。coverage threshold（lines / branches / functions）を満たさない場合 job が fail しなければならない（SHALL）。coverage report は次のいずれかの方法で可視化されなければならない（SHALL）:

- A. PR コメント
- B. GitHub Actions job summary
- C. `actions/upload-artifact` で `coverage/` を `retention-days: 14` で保存

#### Scenario: test ジョブが coverage を計測する
- **WHEN** test ジョブのチェックステップを読み込む
- **THEN** `pnpm -r test:coverage` または同等のコマンドが実行される

#### Scenario: coverage threshold 未達で test job fail
- **WHEN** いずれかの app で coverage が threshold を下回る
- **THEN** test job が fail する

#### Scenario: coverage report が可視化される
- **WHEN** test ジョブの step を読み込む
- **THEN** PR コメント / job summary / artifact upload のいずれかが設定されている

### Requirement: static-checks ジョブが 4 状態テスト存在と E2E 件数を warning として実行する

`static-checks` ジョブには以下の warning step を追加しなければならない（SHALL）:

1. 新規追加された `widgets/` / `features/` / `pages/` 配下の `.vue` ファイルに対応する `*.spec.ts` 内に `Loading` / `Empty` / `Error` / `Success` の test ケース名のいずれかを含むかの grep（含まない場合 warning）
2. `apps/*/e2e/` 配下の E2E ファイル数を機能ごとに集計（3 件以上で warning）

warning step は CI fail を引き起こしてはならない（SHALL NOT fail）。GitHub Actions の `::warning::` annotation で可視化しなければならない（SHALL）。

#### Scenario: 4 状態テスト無しの新規 .vue で warning
- **WHEN** PR で `apps/reservation/src/widgets/foo/Foo.vue` が新規追加され、対応 spec が無い
- **THEN** `::warning::` annotation が出るが static-checks job 自体は pass する

#### Scenario: E2E 機能あたり 3 件以上で warning
- **WHEN** `apps/reservation/e2e/booking-*.e2e.ts` が 3 ファイル以上ある
- **THEN** `::warning::` annotation が出るが job は pass する
