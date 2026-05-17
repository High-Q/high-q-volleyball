# インフラ・CI/CD 構成

## ホスティング構成

| コンポーネント | サービス | Render サービス名 | 状態 | プラン |
|-------------|---------|------------------|------|--------|
| LP | Render（Static Site） | `high-q-volleyball` | デプロイ済み | 無料枠 |
| Admin | Render（Static Site） | `high-q-admin` | デプロイ済み（#139） | 無料枠 |
| Reservation | Render（Static Site） | `high-q-reservation` | デプロイ済み（#140） | 無料枠 |
| DB / Auth / Storage | Supabase | — | 利用中 | 無料枠 |
| 既存イベントAPI | AWS API Gateway + DynamoDB | — | 既存 | 既存 |

3 アプリ（LP / admin / reservation）すべてが Render Static Site としてデプロイ済み。**未完成アプリを商用公開しないガバナンス方針**（後述）に基づき、admin は #139、reservation は #140 でそれぞれ前提条件（認証ゲート / 主要フロー実装 + 公開判断 OK）を満たしてから `render.yaml` の `services` 配列へ昇格させた。`render.yaml` 末尾の雛形コメントは 3 アプリ完了に伴い消化済。

### 未完成アプリの商用公開禁止ガバナンス

Render Static Site はデフォルトで完全公開され、URL (`<service-name>.onrender.com`) を知っていれば誰でもアクセス可能。認証ゲートのない管理画面や未完成サイトを `services` 配列に追加することは情報漏洩・将来の攻撃面拡大に直結するため、**以下を満たさない限り `services` 配列への追加を禁止する**:

1. **管理画面 (admin)**: Supabase Auth ゲート実装済み + 最低限の管理機能実装済み
2. **公開サイト (reservation 等)**: 最低限の機能実装済み + 公開判断 OK
3. **共通**: env var は `sync: false` で枠だけ定義（CLAUDE.md の `.env を読まない` ルール準拠）
4. **共通**: SPA history routing 利用時は `routes` で `/* → /index.html` リライトを設定
5. **共通**: PR レビューで「公開して問題ない状態か」を明示確認

---

## Render デプロイ設定（render.yaml）

リポジトリルートの `render.yaml` が **真実の源（Blueprint mode）**。Dashboard 側での個別変更は禁止し、すべて本ファイルへの PR 経由で管理する。3 アプリ（LP / admin / reservation）すべてが `services` 配列に定義済で、`render.yaml` 末尾の雛形コメントは消化済。

### LP サービス定義（デプロイ済み）

| 設定項目 | 値 | 役割 |
|---|---|---|
| `name` | `high-q-volleyball` | 既存サービス名。**不変厳守**（#125 二重作成回避） |
| `runtime` | `static` | Static Site として配信（無料枠） |
| `rootDir` | `apps/lp` | 該当ディレクトリ配下の変更のみが LP デプロイをトリガー |
| `branch` | `master` | master 向け変更を deploy 対象とする |
| `buildCommand` | `corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/lp build` | pnpm workspace のフィルタで LP のみビルド（#81 でモノレポ対応化） |
| `staticPublishPath` | `dist` | Vite ビルド出力を公開 |
| `autoDeployTrigger` | `checksPass` | GitHub Actions CI 緑のときだけ deploy 起動 |
| `previews.generation` | `automatic` | 全 PR に Preview 環境を自動生成 |
| `envVars[].NODE_VERSION` | `"22"` | ビルド時 Node バージョン統一 |
| `envVars[].VITE_SENTRY_DSN` | `sync:false` + `previewValue` | 本番値は Dashboard 設定 (prd DSN、カットオーバー時に有効化)、PR Preview は dev DSN。空文字なら Sentry 初期化スキップ（#267） |
| `envVars[].VITE_SENTRY_ENVIRONMENT` | `sync:false` + `previewValue` | 本番値は `prd`、PR Preview は `dev` を明示。未設定時は `import.meta.env.PROD` から推定するが、PR Preview も Vite 上は production build のため明示が必須（#267） |

### admin サービス定義（デプロイ済み・#139）

| 設定項目 | 値 | 役割 |
|---|---|---|
| `name` | `high-q-admin` | admin 用 Render サービス名。**不変厳守** |
| `runtime` | `static` | Static Site として配信（無料枠） |
| `rootDir` | `apps/admin` | 該当ディレクトリ配下の変更のみが admin デプロイをトリガー |
| `branch` | `master` | master 向け変更を deploy 対象とする |
| `buildCommand` | `corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/admin build` | pnpm workspace のフィルタで admin のみビルド |
| `staticPublishPath` | `dist` | Vite ビルド出力を公開 |
| `routes` | `/* → /index.html` rewrite | vue-router history mode のサブパス直アクセス対応 |
| `autoDeployTrigger` | `checksPass` | GitHub Actions CI 緑のときだけ deploy 起動 |
| `previews.generation` | `automatic` | 全 PR に Preview 環境を自動生成 |
| `envVars[].NODE_VERSION` | `"22"` | ビルド時 Node バージョン統一 |
| `envVars[].SKIP_INSTALL_DEPS` | `"true"` | pnpm workspace のため自動 npm install を skip（#84 で確立） |
| `envVars[].VITE_SUPABASE_URL` | `sync:false` + `previewValue` | 本番値は Dashboard 設定 (prd)、PR Preview は dev URL |
| `envVars[].VITE_SUPABASE_PUBLISHABLE_KEY` | `sync:false` + `previewValue` | 本番値は Dashboard 設定 (prd)、PR Preview は dev 公開キー |
| `envVars[].VITE_SENTRY_DSN` | `sync:false` + `previewValue` | 本番値は Dashboard 設定 (prd DSN、カットオーバー時に有効化)、PR Preview は dev DSN。空文字なら Sentry 初期化スキップ（#267） |
| `envVars[].VITE_SENTRY_ENVIRONMENT` | `sync:false` + `previewValue` | 本番値は `prd`、PR Preview は `dev` を明示。未設定時は `import.meta.env.PROD` から推定するが、PR Preview も Vite 上は production build のため明示が必須（#267） |

### reservation サービス定義（デプロイ済み・#140）

| 設定項目 | 値 | 役割 |
|---|---|---|
| `name` | `high-q-reservation` | reservation 用 Render サービス名。**不変厳守** |
| `runtime` | `static` | Static Site として配信（無料枠） |
| `rootDir` | `apps/reservation` | 該当ディレクトリ配下の変更のみが reservation デプロイをトリガー |
| `branch` | `master` | master 向け変更を deploy 対象とする |
| `buildCommand` | `corepack enable && pnpm install --frozen-lockfile --ignore-scripts && pnpm --filter @high-q/reservation build` | pnpm workspace のフィルタで reservation のみビルド |
| `staticPublishPath` | `dist` | Vite ビルド出力を公開 |
| `routes` | `/* → /index.html` rewrite | vue-router history mode のサブパス直アクセス対応 |
| `autoDeployTrigger` | `checksPass` | GitHub Actions CI 緑のときだけ deploy 起動 |
| `previews.generation` | `automatic` | 全 PR に Preview 環境を自動生成 |
| `envVars[].NODE_VERSION` | `"22"` | ビルド時 Node バージョン統一 |
| `envVars[].SKIP_INSTALL_DEPS` | `"true"` | pnpm workspace のため自動 npm install を skip（#84 で確立） |
| `envVars[].VITE_SUPABASE_URL` | `sync:false` + `previewValue` | 本番値は Dashboard 設定 (prd)、PR Preview は dev URL（admin と同一の dev プロジェクトを共有） |
| `envVars[].VITE_SUPABASE_PUBLISHABLE_KEY` | `sync:false` + `previewValue` | 本番値は Dashboard 設定 (prd)、PR Preview は dev 公開キー（admin と同値） |
| `envVars[].VITE_SENTRY_DSN` | `sync:false` + `previewValue` | 本番値は Dashboard 設定 (prd DSN、カットオーバー時に有効化)、PR Preview は dev DSN。空文字なら Sentry 初期化スキップ（#267） |
| `envVars[].VITE_SENTRY_ENVIRONMENT` | `sync:false` + `previewValue` | 本番値は `prd`、PR Preview は `dev` を明示。未設定時は `import.meta.env.PROD` から推定するが、PR Preview も Vite 上は production build のため明示が必須（#267） |

### Render 運用上の注意

- **`name` 不変厳守**: Blueprint mode は `name` で既存サービスを識別する。変更すると新規サービスが二重作成される（#125 で経験済）
- `branch: master` → master 向けの commit が `autoDeployTrigger` に従って評価される
- `autoDeployTrigger: checksPass` → **GitHub Actions CI がすべて緑になった時のみ deploy が起動**（CI が落ちている間は deploy 抑止）。`commit` トリガー（コミット即デプロイ）は #128 で暫定採用していたが、#80 の CI 構築完了で `checksPass` に切り戻し済み
- `previews.generation: automatic` → PR ごとに LP の Preview URL が自動生成される
- `rootDir` による変更検知 → `apps/lp` 配下が変更されたときだけ deploy される
- buildCommand の `--ignore-scripts` → `prepare`/`postinstall` 等の lifecycle script を無効化（jsdom v25 の `convert-idl` 等が走らないことを保証）
- buildCommand の `--prod` → root devDependencies は install しない（本番不要）。CI 側はフル install してテスト実行する想定
- buildCommand の `pnpm --filter @high-q/lp build` → モノレポ workspace 依存（`@high-q/shared` 等）も含めて LP のみビルド。将来 admin / reservation 追加時もこの形式を踏襲
- ビルドが3回連続失敗した場合は CLAUDE.md Pillar 5 の「デプロイ 3 回連続失敗時の対応」に従う

### 新規 Static Site アプリを追加する際の手順

3 アプリ（LP / admin / reservation）はすべて `services` 配列へ昇格済（admin: #139、reservation: #140）。今後さらに新規 Static Site を追加する場合は、既存 3 サービスのいずれか（特に admin / reservation）の定義を参照テンプレートとして利用し、以下を必ず確認する:

1. **追加対象アプリの状態確認**: 認証ゲート実装済み（管理画面系）、または公開判断 OK（公開サイト系）。「未完成アプリの商用公開禁止ガバナンス」を再読
2. **PR 作成前**: Render Dashboard で既存 3 サービスの env var 一覧をスクリーンショット or テキスト退避
3. **PR 内容**:
   - `services` 配列に新サービスブロックを追加（既存サービスを参考）
   - SPA history routing 利用時は `routes` で `/* → /index.html` リライト設定
   - Supabase 系 env var は `sync: false`（本番値）+ `previewValue`（dev 値）の 2 段構造で定義（CLAUDE.md の `.env を読まない` ルール準拠、#184 で確立）
4. **PR Preview の制約**: 新サービスを services 配列に**初めて追加する PR** は構造的に Preview が出ない（Render Blueprint Instance がマージ後の Re-sync まで認識しない）。CI 緑 + コードレビューで進め、本番動作確認はマージ後 Dashboard 操作後に実施
5. **マージ後の Dashboard 操作**:
   - Blueprint Instance Re-sync で新規サービスが作成されることを確認
   - 新規サービスの Supabase 系 env var 値（prd）を Dashboard で設定
   - 既存サービスの env var 値が保持されていることを確認
   - Supabase Auth → Redirect URLs に新サービス本番ドメインを追加
   - 本番 URL が 200 を返すことを確認

---

## CI/CD パイプライン（GitHub Actions）

### ワークフロー構成

`.github/workflows/ci.yml` で `install` ジョブ完了後に **typecheck / lint / test / build / e2e の 5 ジョブを並列実行**する。

```
[install] (pnpm store キャッシュ + frozen-lockfile install)
   ↓ needs
   ├── [typecheck]  pnpm -r typecheck
   ├── [lint]       pnpm --filter @high-q/lp lint
   ├── [test]       pnpm -r test
   ├── [build]      pnpm -r build
   └── [e2e]        Playwright (PR=smoke / master=full、ブラウザ cache あり、失敗時 artifact upload)
```

各 job は独立 runner で動き、1 つが失敗しても他はキャンセルされず最後まで走る（PR で問題を一度に把握できる）。Wall time の実測値は ~75 秒（install 13-17s + 並列 max ≈ e2e 40-60s、cache hit 後）。

### トリガー

| イベント | 対象 |
|---|---|
| `pull_request` (`opened` / `synchronize` / `reopened` / `ready_for_review`) | `master` 向け PR のみ |
| `push` | `master` ブランチのみ（マージ後の sanity check） |

`ready_for_review` を types に含めることで draft PR では CI が起動しない。

### concurrency

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

- 同一 PR への連続 push で古い run を自動キャンセル
- master push は履歴に checks を残すためキャンセルしない

### キャッシュ戦略

- **pnpm store** キャッシュ（key: `pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}` + restore-keys 部分一致 fallback）
- **Playwright ブラウザバイナリ** キャッシュ（key: `playwright-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}`、e2e job のみ、~250MB）
- Vite / Vitest / `tsbuildinfo` / ESLint キャッシュは投資対効果が薄いため不採用

### Node / pnpm

- Node: `22` 固定（GitHub-hosted runner の最新 22.x に追随）
- pnpm: `corepack enable` で root `package.json` の `packageManager` 指定版を使用（Render と同方式）

### 必須 CI チェック（PR 必須条件）

PR は `typecheck` / `lint` / `test` / `build` / `e2e` の 5 ジョブすべてがパスするまでマージ不可とする（GitHub ブランチ保護で設定、後述）。`e2e` は PR では smoke のみ（`@smoke` タグ）、master push ではフル E2E を実行する。

---

## GitHub ブランチ保護設定

> **人間側で行う設定**: GitHub リポジトリ → Settings → Branches → Add rule

### `master` ブランチへの必須設定

| 設定項目 | 値 | 理由 |
|---------|-----|------|
| Require a pull request before merging | ✅ ON | 直接 push を防ぐ |
| Require approvals | 0（個人開発のため） | - |
| Dismiss stale pull request approvals | ✅ ON | 再レビュー担保 |
| Require status checks to pass | ✅ ON | CI 必須 |
| Required status checks | `lint`, `typecheck`, `test`, `build`, `e2e` | 全チェック必須 |
| Require branches to be up to date | ✅ ON | マージ前に最新化 |
| Do not allow bypassing the above settings | ✅ ON | 管理者も例外なし |
| Allow force pushes | ❌ OFF | 履歴破壊を防ぐ |
| Allow deletions | ❌ OFF | master 削除を防ぐ |

### 設定手順

1. GitHub リポジトリページ → **Settings** タブ
2. 左サイドバー → **Branches**
3. **Add classic branch protection rule** をクリック
4. Branch name pattern: `master`
5. 上記の項目をすべて設定して **Create** をクリック

### 推奨追加設定

**Dependabot（セキュリティアップデート自動化）**:
1. Settings → Security → Code security and analysis
2. **Dependabot security updates** を Enable

**Dependabot 設定ファイル**（`.github/dependabot.yml` を作成）:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

**Secret scanning**:
1. Settings → Security → Code security and analysis
2. **Secret scanning** を Enable

---

## ローカル開発環境

```bash
# 開発サーバー起動
pnpm dev:lp          # LP のみ: http://localhost:5173

# ビルド
pnpm build:lp        # LP ビルド
pnpm build           # 全アプリビルド

# Lint
pnpm lint            # 全アプリ lint

# Node.js バージョン確認
node -v              # v22.x.x であること
```

---

## 環境変数管理

### Supabase 接続情報の dev / prd 切替（#184 で確立）

| 変数 | 値の出どころ | 用途 |
|------|------|------|
| `VITE_SUPABASE_URL` | dev/prd でそれぞれ別プロジェクト URL | Supabase プロジェクト URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | dev/prd でそれぞれ別 Publishable Key (公開キー) | Supabase クライアント認証用キー |
| `NODE_VERSION` | render.yaml | ビルド時の Node バージョン指定 |

#### 値の配置先

| 環境 | 配置 | 値 |
|---|---|---|
| 本番デプロイ (master) | `render.yaml` の `envVars: sync: false` + Render Dashboard で実値設定 | **prd** プロジェクトの URL/Key |
| PR Preview | `render.yaml` の `envVars: previewValue:` で git コミット | **dev** プロジェクトの URL/Key (公開キーなのでコミット可) |
| ローカル開発 | リポジトリ root の `.env.local` (gitignore 対象) | **dev** プロジェクトの URL/Key |

アプリ側 `shared/api/supabase.ts` は `import.meta.env.VITE_SUPABASE_*` を読むだけで dev/prd を判別しない。環境変数の値で透過的に切替わる。

#### セキュリティ運用ルール

- `.env.local` は `.gitignore` に含まれており、コミット禁止
- `VITE_` プレフィックスの変数はバンドルに含まれる（公開して問題ないもののみ設定）
- Publishable Key は **公開キー** (RLS で保護) なので `previewValue` に書いて git にコミットしてよい
- **Secret Key** (`sbs_xxx`、旧 `service_role` 相当) は `previewValue` を含むあらゆる場所に書いてはならない (RLS バイパス)
- prd の URL/Key は翔太郎くん本人のみが Supabase Dashboard で所有し、Claude には共有しない

### Migration の dev / prd 同期運用ルール（#184 で確立）

新規 migration を `supabase/migrations/<timestamp>_<name>.sql` として追加した際は、**dev に push したら同セッションで prd にも push する**。スキーマドリフト禁止。

```bash
# 1. dev にリンク済の状態で migration を追加して dev に push
pnpm db:push   # = supabase db push (現在のリンク先 = dev)

# 2. 同セッションで prd に切替して push
pnpm exec supabase link --project-ref <prd-project-ref>   # 翔太郎くん作業 (DB password 入力)
pnpm exec supabase db push                                # レム作業

# 3. 完了後、必ず dev に戻す (誤操作防止)
pnpm exec supabase link --project-ref <dev-project-ref>
```

CI 自動化（master マージ時に prd へ自動 push）は Phase 3 別 Issue で検討。当面は手動運用。

## Supabase Edge Functions（#189 で導入）

`supabase/functions/<name>/index.ts` に Edge Function を配置し、`supabase functions deploy` でデプロイする。共通モジュールは `supabase/functions/_shared/` に置く。

現在の Function 一覧:

| Function 名 | 役割 | JWT 検証 | エンドポイント |
|---|---|---|---|
| `request-signup` | 「ゼロ滞留」signup フローのコード発行（#189） | OFF（未認証ユーザーが叩く） | `https://<project-ref>.supabase.co/functions/v1/request-signup` |
| `verify-signup` | 同フローのコード検証 + auth.users / members 一括作成（#189） | OFF | `https://<project-ref>.supabase.co/functions/v1/verify-signup` |

### デプロイ手順

```bash
# dev / prd 共通。--project-ref を切り替えて両方に同じ手順を適用する。
pnpm exec supabase functions deploy request-signup --project-ref <project-ref> --no-verify-jwt
pnpm exec supabase functions deploy verify-signup  --project-ref <project-ref> --no-verify-jwt
```

`--no-verify-jwt` を付けるのは未認証ユーザーが直接呼び出すフロー（signup）だから。認証済みユーザー向け Function を追加する際はこのフラグを外す。

### Edge Function Secrets

Supabase Dashboard → Edge Functions → Secrets に以下を登録する MUST:

| Name | 値 | 用途 |
|---|---|---|
| `GMAIL_USER` | `high.q.volleyball@gmail.com` | Gmail SMTP 送信元 |
| `GMAIL_APP_PASSWORD` | Google アプリパスワード（16 文字） | Gmail SMTP 認証 |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` は Supabase が自動注入するため設定不要。

`MAIL_FROM_NAME` 等の**日本語含む値は Secret に登録しない**：Supabase Dashboard の Secret 入力欄で日本語マルチバイト文字が U+FFFD に壊れる事象あり。日本語含むブランド名は `supabase/functions/_shared/mailer.ts` のソースコード内ハードコードで運用する。

### Gmail アプリパスワード発行手順

詳細手順は `docs/06-品質・セキュリティ/10-メール送信設定SOP.md` 参照。要点:

1. Google アカウント `high.q.volleyball@gmail.com` で 2 要素認証を有効化
2. `https://myaccount.google.com/apppasswords` で「High Q Edge Functions」等の判別名を付けて発行
3. 発行された 16 文字を Supabase Dashboard → Edge Functions → Secrets の `GMAIL_APP_PASSWORD` として登録
4. **重要**: Supabase Auth の SMTP 設定（既存運用）に登録されているアプリパスワードと**同じ値で問題ないが、Edge Function には別途登録**する必要がある（Auth 設定と Edge Function は別系統で credentials を管理する）

### service_role の table GRANT 補正（#189 で発見）

Phase 1 の `20260429000000_table_grants.sql` では anon / authenticated への GRANT のみ行っており、service_role には明示 GRANT が無く、Edge Function から `members` 等を直接 SELECT すると `permission denied` で失敗する事象があった。

`20260511000100_grant_service_role.sql` で全 public schema テーブルに対し service_role に CRUD 権限を付与済み。新規テーブル追加時は `alter default privileges in schema public grant ... to service_role` が効くため通常は再度の GRANT 不要だが、`signup_pending` のように個別 REVOKE する特殊テーブルでは service_role には GRANT を残すこと。
