# インフラ・CI/CD 構成

## ホスティング構成

| コンポーネント | サービス | プラン |
|-------------|---------|--------|
| LP | Render（Static Site） | 無料枠 |
| Admin（予定） | Render（Static Site） | 無料枠 |
| Reservation（予定） | Render（Static Site） | 無料枠 |
| DB / Auth / Storage | Supabase | 無料枠 |
| 既存イベントAPI | AWS API Gateway + DynamoDB | 既存 |

---

## Render デプロイ設定（render.yaml）

リポジトリルートの `render.yaml` が **真実の源（Blueprint mode）**。Dashboard 側での個別変更は禁止し、すべて本ファイルへの PR 経由で管理する。

```yaml
services:
  - type: web
    name: high-q-volleyball
    runtime: static
    rootDir: apps/lp
    branch: master
    buildCommand: corepack enable && pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm build
    staticPublishPath: dist
    autoDeployTrigger: checksPass
    previews:
      generation: automatic
    envVars:
      - key: NODE_VERSION
        value: "22"
```

### Render 運用上の注意

- `branch: master` → master 向けの commit が `autoDeployTrigger` に従って評価される
- `autoDeployTrigger: checksPass` → **GitHub Actions CI がすべて緑になった時のみ deploy が起動**（CI が落ちている間は deploy 抑止）。`commit` トリガー（コミット即デプロイ）は #128 で暫定採用していたが、#80 の CI 構築完了で `checksPass` に切り戻し済み
- `previews.generation: automatic` → PR ごとにプレビュー URL が自動生成される
- buildCommand の `--ignore-scripts` → `prepare`/`postinstall` 等の lifecycle script を無効化（jsdom v25 の `convert-idl` 等が走らないことを保証）
- buildCommand の `--prod` → root devDependencies は install しない（本番不要）。CI 側はフル install してテスト実行する想定
- ビルドが3回連続失敗した場合は CLAUDE.md Pillar 5 の「デプロイ 3 回連続失敗時の対応」に従う

---

## CI/CD パイプライン（GitHub Actions）

### ワークフロー構成

`.github/workflows/ci.yml` で `install` ジョブ完了後に **typecheck / lint / test / build の 4 ジョブを並列実行**する。

```
[install] (pnpm store キャッシュ + frozen-lockfile install)
   ↓ needs
   ├── [typecheck]  pnpm -r typecheck
   ├── [lint]       pnpm --filter @high-q/lp lint
   ├── [test]       pnpm -r test
   └── [build]      pnpm -r build
```

各 job は独立 runner で動き、1 つが失敗しても他はキャンセルされず最後まで走る（PR で問題を一度に把握できる）。Wall time の実測値は ~44 秒（install 17s + 並列 max 22s）。

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

- **pnpm store のみ** キャッシュ（key: `pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}` + restore-keys 部分一致 fallback）
- Vite / Vitest / `tsbuildinfo` / ESLint キャッシュは投資対効果が薄いため不採用

### Node / pnpm

- Node: `22` 固定（GitHub-hosted runner の最新 22.x に追随）
- pnpm: `corepack enable` で root `package.json` の `packageManager` 指定版を使用（Render と同方式）

### 必須 CI チェック（PR 必須条件）

PR は `typecheck` / `lint` / `test` / `build` の 4 ジョブすべてがパスするまでマージ不可とする（GitHub ブランチ保護で設定、後述）。

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
| Required status checks | `lint`, `typecheck`, `test`, `build` | 全チェック必須 |
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

| 変数 | 配置 | 用途 |
|------|------|------|
| `VITE_SUPABASE_URL` | `.env.local` / Render env | Supabase プロジェクト URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` / Render env | Supabase 公開キー |
| `NODE_VERSION` | render.yaml | ビルド時の Node バージョン指定 |

- `.env.local` は `.gitignore` に含まれており、コミット禁止
- `VITE_` プレフィックスの変数はバンドルに含まれる（公開して問題ないもののみ設定）
- `service_role` キーはクライアントサイドで絶対に使わない
