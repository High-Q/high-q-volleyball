# monorepo-workspace Specification

## Purpose
TBD - created by archiving change monorepo-migration. Update Purpose after archive.
## Requirements
### Requirement: ワークスペースルートにpnpm workspaces設定が存在する
リポジトリルートの`pnpm-workspace.yaml`がワークスペースとして`apps/*`と`packages/*`を宣言しなければならない（SHALL）。

#### Scenario: pnpm installがワークスペース全体に対して実行される
- **WHEN** リポジトリルートで `pnpm install` を実行する
- **THEN** `apps/lp`・`apps/admin`・`apps/reservation`・`packages/shared` の依存関係がすべてインストールされる

### Requirement: LPアプリが`apps/lp`に配置される
現在のルートにある`src/`・`public/`・`index.html`・`vite.config.js`が`apps/lp/`以下に配置されなければならない（SHALL）。

#### Scenario: LPアプリのビルドがフィルタコマンドで実行できる
- **WHEN** `pnpm --filter @high-q/lp build` を実行する
- **THEN** `apps/lp/dist/` にビルド成果物が生成される

#### Scenario: LPアプリの開発サーバーが起動できる
- **WHEN** `pnpm --filter @high-q/lp dev` を実行する
- **THEN** Vite開発サーバーがlocalhost上で起動する

### Requirement: admin・reservation・sharedのスケルトンが存在する
`apps/admin/`・`apps/reservation/`・`packages/shared/`・`packages/design-tokens/`・`packages/ui/` が各自の `package.json` を持ち、pnpm ワークスペースに認識されなければならない（SHALL）。

#### Scenario: スケルトンパッケージがワークスペースリストに表示される
- **WHEN** `pnpm list -r --depth 0` を実行する
- **THEN** `@high-q/lp`・`@high-q/admin`・`@high-q/reservation`・`@high-q/shared`・`@high-q/design-tokens`・`@high-q/ui` がすべて一覧に表示される

#### Scenario: 新規パッケージが workspace 依存として解決できる
- **WHEN** `apps/admin` または `apps/reservation` の `package.json` で `"@high-q/design-tokens": "workspace:*"` および `"@high-q/ui": "workspace:*"` を宣言し `pnpm install` を実行する
- **THEN** 各 `node_modules` 配下に対応する symlink が作成され、import が解決される

### Requirement: RenderがLPアプリをビルド・配信できる
Renderの設定でRoot Directoryが`apps/lp`に設定され、masterブランチへのマージ後も継続してLPがデプロイされなければならない（SHALL）。

#### Scenario: productionマージ後にRenderが自動デプロイする
- **WHEN** `master`を`production`ブランチにマージする（Renderダッシュボードの設定変更済みであること）
- **THEN** RenderがRoot Directory `apps/lp` をビルドし、LPサイトが正常に表示される

