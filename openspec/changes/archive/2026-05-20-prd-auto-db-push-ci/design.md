## Context

prd Supabase は商用稼働中で、現在 migration の本番適用は翔太郎くんが手元の CLI から `supabase link --project-ref <prd-ref>` → `supabase db push` を打つ運用。dev に push したセッション内で prd 側を忘れる、`link` の戻し忘れで以降のローカル作業が prd を向いてしまう、複数 PR を続けて merge したとき適用順を取り違える、といったヒューマンエラーが構造的に起きうる。商用稼働後のスキーマドリフトは復旧コストが高く、自動化の優先度が上がった。

既存 `.github/workflows/ci.yml` は app の typecheck/lint/test/build/e2e を司っており、本件はそれと関心が異なる「Supabase インフラ寄り CI」として独立ファイル `.github/workflows/db-push-prd.yml` を新設する。

## Goals / Non-Goals

**Goals:**

- master マージで `supabase/migrations/` に新しい SQL が含まれていれば、追加の人手なしで prd Supabase に適用される
- PR 段階で「この migration を本番に適用すると何が起きるか」が翔太郎くんに見える（dry-run）
- 危険操作（DROP / TRUNCATE / RENAME など破壊的 SQL）を含む migration は、自動適用前に翔太郎くんの承認が要る
- 自動適用が失敗したら確実に翔太郎くんへ届く（GitHub 標準通知メールが Owner に届く構造を維持）
- 適用が壊れたときの戻し方が docs に書いてあり、夜中の障害でも辿れる

**Non-Goals:**

- dev Supabase への自動 push（dev はテスト用、手動運用維持）
- Edge Function の自動 deploy（別 Issue で検討）
- migration の自動生成や lint（本件は適用の自動化だけ）
- 本番 DB のバックアップ自動化（Supabase 標準の Daily Backup に依存）
- Slack 通知（個人開発のため GitHub Notification メールで充分、過剰投資を避ける）

## Decisions

### 1. ワークフロー分割：CI とは別ファイル

既存 `ci.yml` に jobs を足すのではなく `.github/workflows/db-push-prd.yml` を新設する。理由は ①関心が異なる（app テスト vs インフラ適用） ②トリガー条件が異なる（CI は常時 / db-push は migrations 変更時のみ） ③ Secrets スコープを最小化したい（DB password を app build に晒さない）。

**Alternatives:** 既存 ci.yml に jobs 追加 → 上記 3 点が崩れるため不採用。

### 2. トリガー：PR は dry-run、master push で本適用

- `pull_request` (master 向け): `supabase/migrations/**` の path filter で起動、dry-run job のみ実行
- `push` (master): 同 path filter、本適用 job 実行

これにより「migration を含まない PR」では起動せず、無駄な runner 時間を使わない。

**Alternatives:** 手動 trigger (`workflow_dispatch`) のみ → 自動化の目的に反するため不採用。

### 3. Supabase CLI の認証方式

`SUPABASE_ACCESS_TOKEN` を環境変数で渡し `supabase link --project-ref <prd-ref>` で接続する。DB password は `--password` フラグではなく `SUPABASE_DB_PASSWORD` 環境変数で渡す（コマンドライン履歴に残らない）。

**Alternatives:** Postgres 接続文字列を直接 secret に → connection string 全体を 1 つの secret にすると粒度が荒く、URL 更新時に全更新が必要になるため不採用。

### 4. 危険操作の検知と承認ゲート

migration ファイル内の SQL を grep で走査し、以下のキーワードが含まれていたら「危険」と判定する: `DROP TABLE`, `DROP COLUMN`, `DROP SCHEMA`, `TRUNCATE`, `ALTER COLUMN .* DROP`, `RENAME`, `DROP CONSTRAINT`。

危険判定が出たら GitHub Environment `prd-db-push` の Required reviewers に翔太郎くんを登録しておき、apply job がその environment を要求することで承認待ちになる。承認なし migration は environment 不要にすると速度が出るが、安全側に倒して **全ての本適用で environment を要求** し、危険なしの場合は Auto-approve（PR 状況に応じて翔太郎くんが Approve）する運用も可能。本件はシンプルさ優先で「全本適用で environment 要求」を採る。

**Alternatives:**
- 全自動（承認ゲートなし） → 商用稼働中のリスク許容できないため不採用
- 危険判定時のみ environment → grep が誤検知/見逃しした際の挙動が直感的でないため不採用

### 5. 通知設計

明示的な Slack/Sentry 連携は実装しない。GitHub Repository 設定で「Actions のワークフロー失敗通知メール」が翔太郎くん（Owner）へ届く既存仕様に依存する。Issue 完了条件の「Slack / メール / Sentry いずれか」をメールで充足する。

**Alternatives:** Sentry 連携 → 本ワークフローは GitHub Actions 上での失敗であり、Sentry の Crons / Job monitoring を入れるならスコープが広がる。MVP ではメールで充分。

### 6. dry-run の手段

`supabase db diff --linked --schema public` を使い「適用前後のスキーマ差分」を PR コメントまたは job ログとして出力する。`supabase db push --dry-run` 系フラグは現行 CLI で安定挙動が確証できないため、`db diff` で代替する。実装段階で `supabase --help` を確認し、より適した dry-run コマンドがあれば差し替える（tasks.md で詳細）。

**Alternatives:** PR ごとに ephemeral DB を立てて適用 → 個人開発スケールで過剰。

### 7. rollback 戦略

migration は forward-only（rollback SQL を別 migration として作る）。Supabase Daily Backup（Free プランは過去 7 日）で点復旧。手順を `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に整理する。

**Alternatives:** 下位 migration を SQL ファイル横並びで管理 → 個人開発でメンテ負担過多。

## Risks / Trade-offs

- **[Risk] GitHub Secrets 漏洩で prd DB に直接攻撃が来る** → Secrets は Repository secrets に閉じ、Org Secret にしない。Access Token は最小権限（project レベル access のみ）で発行。DB Password はカットオーバー時のものと同じだが、定期ローテーション運用は別 Issue で検討
- **[Risk] migration の自動適用が走った直後にアプリ deploy が古いコードで動く** → Render の `autoDeployTrigger: checksPass` により app deploy は CI 緑後。db-push-prd.yml が ci.yml と並行して動き、db 適用と app deploy のタイムラインがずれる可能性がある。基本は migration を先に通すパターンで設計（後方互換のある migration を前提）し、破壊的変更は別 PR で段階適用する運用ルールで担保
- **[Risk] grep 誤判定で危険操作を見逃す** → ホワイトリスト的に「常に environment を要求する」決定（Decision 4）でカバー
- **[Risk] dry-run が長時間 prd を hold する** → `db diff` は read-only でロックを取らない想定。実装時に動作確認
- **[Trade-off] dev への自動 push をやらない** → dev は手動運用維持。memory `dev_db_push_self_execute.md` に整合
- **[Trade-off] 全本適用に承認が必要 → 速度低下** → 商用稼働中の安全性を優先。1 タップ承認なので運用負担は許容範囲

## Migration Plan

1. GitHub Secrets を 3 件登録（Repo Settings で翔太郎くん作業）
2. GitHub Environment `prd-db-push` を作成し Required reviewers に翔太郎くん登録（翔太郎くん作業）
3. `.github/workflows/db-push-prd.yml` を PR で追加（レム作業）
4. 当該 PR は migration を含まないため dry-run / apply は走らない（path filter で skip）
5. マージ後、次に migration を含む PR を作るときに dry-run が走ることを確認
6. 動作確認用にダミー migration（無害な COMMENT 追加など）を 1 件含む PR を別途作って end-to-end 検証
7. docs を新運用に更新

**Rollback Plan:**

- ワークフロー自体に問題があれば `.github/workflows/db-push-prd.yml` を revert する PR を merge
- prd への適用が壊れた場合は Supabase Dashboard の Daily Backup から point-in-time restore（手順は docs に記載）

## Open Questions

- 翔太郎くんへの確認事項: Decision 4 の「全本適用で environment 要求」方針で OK か？「危険判定時のみ environment」を採るなら速度は出るが grep 誤判定のリスクを翔太郎くんが受け入れる必要がある（レム推奨: 全本適用要求で安全側）
- リポジトリは Public のため GitHub Environment 機能は追加コスト無しで利用可（確認済）
