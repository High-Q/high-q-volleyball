## 1. 事前準備

- [x] 1.1 ブランチ作成: `feature/299-prd-backup-github-actions`
- [x] 1.2 既存ワークフロー `.github/workflows/db-push-prd.yml` を再読し、共通 Secrets / setup ステップ / corepack + pnpm cache パターンの流用箇所を確定する
- [x] 1.3 既存 Secrets `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PRD_PROJECT_REF` / `SUPABASE_DB_PASSWORD` が GitHub Actions Secrets に存在していることを確認（db-push-prd.yml の稼働実績で担保済みであれば追加確認不要）

## 2. ワークフロー実装

- [x] 2.1 `.github/workflows/backup-prd.yml` を新規作成
  - `name: backup prd Supabase (weekly pg_dump)`
  - トリガー: `schedule: [cron: "0 18 * * 6"]`（UTC 土曜 18:00 = 日曜 03:00 JST）+ `workflow_dispatch:`
  - `concurrency` group: `backup-prd-${{ github.workflow }}-${{ github.ref }}`、`cancel-in-progress: false`（手動と cron の競合時はキューイングして両方完走させる）
  - `permissions: contents: read`（Artifacts upload のみ、リポジトリ書き込み不要）
- [x] 2.2 jobs.backup を実装
  - `runs-on: ubuntu-latest`
  - `env`: `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` を Secrets から注入（db-push-prd.yml と同一形式）
  - steps:
    - `actions/checkout@v5`
    - `actions/setup-node@v5` (node-version: 22, package-manager-cache: false)
    - `corepack enable`
    - pnpm store path 解決 + `actions/cache@v5` で store 復元（db-push-prd.yml と同一パターン）
    - `pnpm install --frozen-lockfile`
    - `pnpm exec supabase link --project-ref "${{ secrets.SUPABASE_PRD_PROJECT_REF }}"`
- [x] 2.3 dump 取得ステップを追加
  - dump ファイル名を `prd_$(date -u +%Y%m%d_%H%M%S).sql` で生成（UTC タイムスタンプ、run の同時実行衝突回避）
  - `pnpm exec supabase db dump --linked --schema public --schema auth -f "$DUMP_FILE"` を実行
  - dump 完了後、ファイルサイズと先頭・末尾の数行を `$GITHUB_STEP_SUMMARY` に出力（内容ではなくメタ情報のみ、機微情報を漏らさない）
- [x] 2.4 Artifacts アップロードステップを追加
  - `actions/upload-artifact@v4` を使用
  - `name: prd-backup-<タイムスタンプ>`、`path: $DUMP_FILE`、`retention-days: 90`、`if-no-files-found: error`
- [x] 2.5 ジョブ完了サマリを `$GITHUB_STEP_SUMMARY` に出力（成否 / commit SHA / cron or manual / dump ファイル名 / size）
- [x] 2.6 ワークフロー全体を `actionlint` 相当でローカル yaml 構文確認（VSCode の GitHub Actions 拡張で警告ゼロ確認、または `pnpm dlx @lintspaces/cli` 等は不要、目視で十分）— node + js-yaml で構文 OK 確認済

## 3. spec 反映

- [x] 3.1 `openspec validate prd-backup-github-actions` を実行し、spec 変更が valid であることを確認
- [x] 3.2 `openspec/changes/prd-backup-github-actions/specs/supabase-foundation/spec.md` の ADDED Requirement が `## ADDED Requirements` 直下に正しく配置されていること、各 Requirement が最低 1 つの `#### Scenario` を持つことを目視で再確認（memory: feedback_openspec_modified_header_strict 関連、ADDED は header 完全一致の制約は無いが書式厳守）— 6 Scenario すべて 4 ハッシュで正規確認済

## 4. SOP 14 の更新

- [x] 4.1 `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` § 7.2 に GitHub Actions Artifacts からの restore 手順を追記
  - 手順: GitHub → Actions タブ → `backup prd Supabase (weekly pg_dump)` → 該当 run → Artifacts → dump をダウンロード → § 6 と同じ流れで dev に restore して動作確認
  - 90 日経過 dump は失われる旨を制約として明記（既に § 7.2 末尾に記載済みなら追記不要）
- [x] 4.2 SOP 内で「#299 で導入予定」「#299 で導入する」等の未来形表現を検索し、実装済み表現に書き換える
  - 対象: § 0 表 1 行目 / § 1.2 / § 1.3 / § 2.3 / § 3.4 / § 4.1 表カテゴリ 3 / § 5.2 / § 6.1 / § 7.2 / § 9.1 / § 10.1
  - 「実装予定」「導入予定」→「導入済み」「運用中」など現在形へ変換
- [x] 4.3 SOP § 10.1 「本 PR と並行で別 Issue 化済み」の #299 行を「本 SOP 公開後に Apply 完了済み（本 SOP § 7.2 参照）」表現へ更新

## 5. 動作確認

- [x] 5.1 PR 作成前のローカル確認: `.github/workflows/backup-prd.yml` 単体での yaml syntax check（VSCode 拡張または `python -c "import yaml; yaml.safe_load(open('...'))"`）— node + js-yaml で構文 OK・12 steps 構造正常を確認
- [ ] 5.2 PR 作成後、master へ merge する前に **feature branch から `workflow_dispatch` で手動実行**し以下を確認:
  - run が SUCCESS で完了する
  - GitHub Artifacts に `prd-backup-<タイムスタンプ>` が表示される
  - Artifact をダウンロードし、SQL ダンプ先頭部分に `CREATE SCHEMA IF NOT EXISTS auth;` 等の auth スキーマ定義、および `public.members` などのテーブル復元 SQL が含まれることを確認（端末上でダウンロード後即削除、リポジトリ / 外部に置かない）
  - Step Summary にファイル名・サイズ・実行モード（manual）が出力される
- [ ] 5.3 5.2 の手動実行で失敗した場合、ログ確認後にワークフロー修正 → 再実行で SUCCESS を確認してから次に進む
- [ ] 5.4 失敗通知の挙動確認: 必要に応じて意図的に失敗するステップを一時挿入し、GitHub 標準通知が翔太郎くんに届くことを確認（確認後は revert）。デフォルト挙動で十分なら本タスクはスキップ可

## 6. PR 作成・完了確認

- [ ] 6.1 PR 作成（title: `chore(infra): GitHub Actions による prd Supabase 定期 pg_dump 自動化 (#299)`）
- [ ] 6.2 既存 CI（`.github/workflows/ci.yml`）の全 job が緑になることを確認
- [ ] 6.3 db-push-prd.yml ワークフローが当該 PR で起動しないことを確認（本変更は `supabase/migrations/` 配下にファイル追加しないため、paths filter で起動しない見込み）
- [ ] 6.4 翔太郎くんレビュー完了 → Sync (spec + SOP) → Archive → push → master merge → ブランチ削除 + Issue #299 クローズ（`/opsx-ship` で実施）

## 7. cron 初回発火確認（merge 後）

- [ ] 7.1 master merge 後、次の日曜 03:00 JST（UTC 土曜 18:00）に cron が発火することを翌週確認する
  - 発火後の Artifacts が `prd-backup-<タイムスタンプ>` 名で存在
  - 7.1 確認は本 PR / 本 change のスコープ外（自然発火タイミング待ちのため）、SOP § 1.2 月次確認運用に統合
