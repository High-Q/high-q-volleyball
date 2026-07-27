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

`apps/admin/`・`apps/reservation/`・`packages/shared/`・`packages/design-tokens/`・`packages/ui/`・`packages/tailwind-preset/` が各自の `package.json` を持ち、pnpm ワークスペースに認識されなければならない（SHALL）。

#### Scenario: スケルトンパッケージがワークスペースリストに表示される

- **WHEN** `pnpm list -r --depth 0` を実行する
- **THEN** `@high-q/lp`・`@high-q/admin`・`@high-q/reservation`・`@high-q/shared`・`@high-q/design-tokens`・`@high-q/ui`・`@high-q/tailwind-preset` がすべて一覧に表示される

#### Scenario: 新規パッケージが workspace 依存として解決できる

- **WHEN** `apps/admin` または `apps/reservation` の `package.json` で `"@high-q/design-tokens": "workspace:*"`、`"@high-q/ui": "workspace:*"`、`"@high-q/tailwind-preset": "workspace:*"` を宣言し `pnpm install` を実行する
- **THEN** 各 `node_modules` 配下に対応する symlink が作成され、import が解決される

### Requirement: RenderがLPアプリをビルド・配信できる
Renderの設定でRoot Directoryが`apps/lp`に設定され、masterブランチへのマージ後も継続してLPがデプロイされなければならない（SHALL）。

#### Scenario: productionマージ後にRenderが自動デプロイする
- **WHEN** `master`を`production`ブランチにマージする（Renderダッシュボードの設定変更済みであること）
- **THEN** RenderがRoot Directory `apps/lp` をビルドし、LPサイトが正常に表示される

### Requirement: 新規パッケージ `@high-q/tailwind-preset` が `pnpm -r` 系コマンドに追従する

`packages/tailwind-preset` は、ルートで `pnpm -r typecheck` および `pnpm -r test` を実行した際に、自動的に対象に含まれていなければならない（SHALL）。

#### Scenario: ルートからの一括コマンドで対象に入る

- **WHEN** リポジトリルートで `pnpm -r typecheck` を実行する
- **THEN** `@high-q/tailwind-preset` の `typecheck` script が呼び出され、エラーなく通過する

#### Scenario: ルートテストにも組み込まれる

- **WHEN** リポジトリルートで `pnpm -r test` を実行する
- **THEN** `@high-q/tailwind-preset` の vitest 実行が含まれ、エラーなく通過する

### Requirement: 孫依存のセキュリティ脆弱性はルートの依存解決オーバーライドで解消する

いずれかのアプリ／パッケージの `package.json` に直接現れない孫依存（開発ツールチェーン経由の transitive dependency）にセキュリティ脆弱性が報告され、かつアプリケーションコードの変更を伴わずに解消できる場合、ルート `package.json` の `pnpm.overrides` で当該パッケージをパッチ版へ寄せて解消しなければならない（SHALL）。オーバーライド先は、現在インストールされているメジャー系統を跨いではならない（SHALL NOT）。同名パッケージが複数のメジャー系統で併存する場合は、脆弱範囲に該当する系統のみを対象とするようバージョン系統を限定したセレクタを用いなければならない（SHALL）。

適用後は `pnpm-lock.yaml` が更新され、全アプリのビルドと全テストが緑であることをもって解消の受け入れ条件とする（SHALL）。

#### Scenario: 孫依存の脆弱性をオーバーライドで解消する

- **WHEN** 開発ツールチェーン経由の孫依存に脆弱性が報告され、ルート `package.json` の `pnpm.overrides` に当該パッケージのパッチ版を追記して `pnpm install` を実行する
- **THEN** `pnpm-lock.yaml` の当該パッケージが指定パッチ版に解決され、該当するセキュリティアラートが解消される

#### Scenario: メジャー系統を跨ぐオーバーライドを行わない

- **WHEN** 同名パッケージが複数のメジャー系統で併存し、その一系統のみが脆弱範囲に該当する
- **THEN** バージョン系統を限定したセレクタで対象系統のみをパッチ版へ寄せ、無関係な旧メジャー系統は元のバージョンのまま保持される

#### Scenario: バンドラ peer に固定された孫依存は本手段の対象外

- **WHEN** 孫依存がバンドラ本体のメジャー版に peer として固定されており、単独オーバーライドがバンドラ内部の呼び出しを壊すおそれがある
- **THEN** 当該孫依存は依存解決オーバーライドの対象とせず、バンドラ本体のメジャー更新による解消へ委譲する

