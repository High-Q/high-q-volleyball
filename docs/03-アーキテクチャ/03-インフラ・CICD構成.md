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

```yaml
services:
  - type: web
    name: high-q-lp
    env: static
    rootDir: apps/lp
    buildCommand: pnpm install && pnpm build
    staticPublishPath: dist
    branch: master
    pullRequestPreviewsEnabled: true
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: NPM_CONFIG_IGNORE_SCRIPTS
        value: "true"
```

### Render 運用上の注意

- `branch: master` → master へのマージで自動デプロイが発火
- `pullRequestPreviewsEnabled: true` → PR ごとにプレビュー URL が自動生成される
- `NPM_CONFIG_IGNORE_SCRIPTS=true` → `prepare: husky` 等の lifecycle script を無効化（axios@1.15.2 対策）
- ビルドが3回連続失敗した場合は CLAUDE.md の「アンチループデプロイ原則」に従う

---

## CI/CD パイプライン（GitHub Actions）

### 必須 CI チェック（PR 必須条件）

```yaml
# .github/workflows/ci.yml （未実装・要設定）
jobs:
  lint:      # eslint
  typecheck: # vue-tsc --noEmit
  test:      # vitest run
  build:     # vite build
```

PR は上記すべてがパスするまでマージ不可とする（GitHub ブランチ保護で設定）。

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
