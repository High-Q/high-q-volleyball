## 1. 事前準備（翔太郎くん手作業）

- [x] 1.1 GitHub Repository Secrets に `SUPABASE_ACCESS_TOKEN` を登録（[Supabase Account → Access Tokens](https://supabase.com/dashboard/account/tokens) で「High Q prd db push CI」名で発行）
- [x] 1.2 GitHub Repository Secrets に `SUPABASE_PRD_PROJECT_REF` を登録（値は 1Password 保管の prd project-ref 文字列）
- [x] 1.3 GitHub Repository Secrets に `SUPABASE_DB_PASSWORD` を登録（値は 1Password 保管の prd DB password）
- [x] 1.4 GitHub Settings → Environments で `prd-db-push` Environment を新規作成し、Required reviewers に翔太郎くん（自分）を追加
- [x] 1.5 GitHub Notification 設定で「Actions: Failed workflows only」相当のメール通知が有効になっていることを確認

## 2. ワークフロー実装

- [x] 2.1 `.github/workflows/db-push-prd.yml` を新規作成し、ワークフロー名 / `on` トリガー（`pull_request` と `push` × `paths: supabase/migrations/**` × `branches: master`）を定義
- [x] 2.2 dry-run job（PR 用）を実装: `if: github.event_name == 'pull_request'`、Node 22 セットアップ → `corepack enable` → `pnpm install --frozen-lockfile` → `pnpm exec supabase link --project-ref ${{ secrets.SUPABASE_PRD_PROJECT_REF }}` → `pnpm exec supabase db diff --linked --schema public` を実行しログ出力
- [x] 2.3 apply job（master push 用）を実装: `if: github.event_name == 'push'`、`environment: prd-db-push`（Required reviewers でゲート）、Node 22 セットアップ → `corepack enable` → `pnpm install --frozen-lockfile` → `pnpm exec supabase link --project-ref ${{ secrets.SUPABASE_PRD_PROJECT_REF }}` → `pnpm exec supabase db push --include-all` を実行
- [x] 2.4 全 job の `env:` に `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` を Secrets から設定し、DB password をコマンドライン引数ではなく環境変数で CLI に渡す（CLI の `--password` フラグ不使用）
- [x] 2.5 apply job 末尾に「job summary 出力ステップ」を追加し、commit SHA / 対象 migration ファイル一覧を `$GITHUB_STEP_SUMMARY` に書き出す
- [x] 2.6 ワークフロー YAML 内の Supabase CLI バージョン固定方針を決め（`supabase` を `npm:supabase` または `pnpm exec supabase` で workspace pinned に依存）、現行 lockfile と一致させる
- [x] 2.7 ワークフローの YAML syntax を `gh workflow view` / `act` 等で lint またはローカル `yamllint` で検証

## 3. ドキュメント更新

- [x] 3.1 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に「prd 自動 db push ワークフロー」セクションを追加（トリガー条件 / Secrets 一覧 / Environment 承認フロー / dry-run 出力場所）
- [x] 3.2 同ドキュメントに「prd db push rollback 手順」セクションを追加（①ワークフロー revert ②Supabase Daily Backup point-in-time restore ③手動ロールバック migration の 3 観点）
- [x] 3.3 `docs/08-移行/01-環境戦略・本番リリース計画.md` § 3.1 / § 5 / § 8 の「migrations は当面手動」「Phase 3 別 Issue で検討」記述を「prd は GitHub Actions が承認ゲート付きで自動適用、dev のみ手動」に更新し、Issue #268 への参照を追加

## 4. 動作確認（PR 段階）

- [x] 4.1 本 PR には migration を含めない（path filter で dry-run job 自体起動しないことを確認）— 差分に `supabase/migrations/**` を含まないことを `git diff --stat` で確認済
- [ ] 4.2 既存 CI（`.github/workflows/ci.yml`）の全 job が緑になることを確認（PR 作成後に GitHub Actions UI で確認）
- [ ] 4.3 GitHub Actions UI で `prd Supabase db push` ワークフローが「No runs」または「Skipped」になっていることを目視確認（PR 作成後）

## 5. 動作確認（マージ後フォロー、別 Issue / 別 PR で実施）

- [ ] 5.1 翔太郎くんが手元で無害なダミー migration（例: `COMMENT ON TABLE venues IS '<更新文>'`）を作成
- [ ] 5.2 当該 migration を含む PR を作成し、dry-run job が起動して差分がログに出ることを確認
- [ ] 5.3 PR をマージし、apply job が `prd-db-push` environment で承認待ちになることを確認
- [ ] 5.4 翔太郎くんが Approve し、apply job が成功し prd に COMMENT が反映されることを `supabase db query --linked` で確認
- [ ] 5.5 マージ後の job summary に commit SHA / migration ファイル名が出力されていることを確認
- [ ] 5.6 失敗パスの検証（任意）: わざと壊れた SQL を含む migration を作って apply job が failure → 翔太郎くんに失敗通知メールが届くことを確認（実施判断は翔太郎くん）

## 6. 完了確認

- [x] 6.1 全 spec 要件のシナリオが満たされていることを `proposal.md` / `design.md` / `specs/prd-db-push-ci/spec.md` と照らして確認 — 9 Requirement / 17 Scenario すべてワークフロー実装 + docs 更新で充足
- [x] 6.2 `pnpm -r test` / `pnpm -r build` をローカル実行 — 全 workspace 緑 (admin 89 files / reservation 73 files / shared / lp 全 pass、build も全成功)
- [x] 6.3 PR description に「Secrets と Environment 設定はマージ前に翔太郎くんが完了している必要がある」旨を明記（事前準備は翔太郎くんが「ok」で完了確認済、PR description にも明記する）
