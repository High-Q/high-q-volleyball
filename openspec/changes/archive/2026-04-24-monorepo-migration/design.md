## Context

現在のリポジトリはVue3+Vuetify3のLPアプリ1本をルートに直置きしたフラット構造。今後Admin・Reservationの2アプリを追加するため、pnpm workspacesモノレポに移行する。npmからpnpmへの切り替えも同時に行う。

現在のルート構成:
```
src/          ← LPアプリのソース
public/
index.html
vite.config.js
package.json  ← npm管理
```

移行後:
```
apps/
  lp/         ← 現src/をそのまま移動
  admin/      ← スケルトンのみ
  reservation/ ← スケルトのみ
packages/
  shared/     ← 空（型・テーマの置き場として確保）
package.json  ← workspaceルート（devツールのみ）
pnpm-workspace.yaml
```

## Goals / Non-Goals

**Goals:**
- pnpm workspaces構成へ移行し、複数アプリを1リポジトリで管理できる状態にする
- LPアプリが移行後も `pnpm --filter @high-q/lp build` でビルドが通ること
- admin・reservation・sharedのスケルトンを作成し、次フェーズで実装できる状態にする
- Renderデプロイが productionマージ後も継続して動作すること

**Non-Goals:**
- admin・reservationの機能実装（別Issue）
- TypeScript化（Issue #77）
- テスト環境構築（Issue #78）
- Supabase連携（Issue #82）
- LPカレンダーの修正（Issue #93）

## Decisions

### D1: npmからpnpmへ切り替える
pnpm workspacesを使うためにpnpmが必須。Node.js v22環境ではpnpm corepackで導入可能。
- **採用**: `corepack enable && corepack prepare pnpm@latest --activate`
- **却下案**: npmのworkspaces機能 → pnpmに比べてホイスティング制御が弱く、モノレポ管理に不向き

### D2: パッケージ名は `@high-q/<app>` スコープ
`@high-q/lp`、`@high-q/admin`、`@high-q/reservation`、`@high-q/shared`。
将来的なnpmパブリッシュは不要だが、pnpm workspacesプロトコル（`workspace:*`）での依存解決に必要。

### D3: admin・reservationはVue3+Vuetify3+Viteのスケルトンのみ
`App.vue`と`main.ts`の最小構成にとどめる。TypeScript化は次のIssue #77で行うため、今回は`.js`のままでよい。

### D4: Render設定はproductionマージ直前に手動変更
- Root Directory: `apps/lp`
- Build Command: `pnpm install && pnpm build`
- Publish Directory: `dist`

自動化はせず、リリースチェックリストに含める。

## Risks / Trade-offs

- **[Risk] `package-lock.json` vs `pnpm-lock.yaml` 競合** → `package-lock.json`は削除し、`pnpm-lock.yaml`に一本化。`.gitignore`に`package-lock.json`を追加。
- **[Risk] Renderが新しいRoot Directoryを認識しない** → productionマージ前にRenderダッシュボードで設定変更後、手動デプロイで確認してからマージ。
- **[Risk] 既存CIが`npm`コマンドを使っている** → 現時点でCI未設定のため問題なし（Issue #80で対応）。

## Migration Plan

1. `feature/76-monorepo-migration` ブランチで作業
2. pnpmをcorepackで有効化
3. ルート`package.json`・`pnpm-workspace.yaml`を作成
4. `apps/lp/`へファイル移動（git mv）
5. `apps/admin/`・`apps/reservation/`・`packages/shared/`のスケルトン作成
6. 各アプリの`package.json`・`vite.config.js`を設置
7. `pnpm install` → `pnpm --filter @high-q/lp build` が通ることを確認
8. master へのPR作成・マージ
9. **Renderダッシュボードで設定変更**（Root Directory: `apps/lp`）
10. `master` → `production` マージ → Renderの自動デプロイ確認

**ロールバック**: `production`ブランチを1つ前のコミットにresetし、Renderのルート設定を元に戻す。
