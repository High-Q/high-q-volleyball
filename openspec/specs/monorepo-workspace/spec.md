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

### Requirement: ビルド・テストツールチェーン本体はサポート対象のメジャー版に追随する

ワークスペースが用いるバンドラ（vite）およびテストランナー（vitest）本体にセキュリティ脆弱性が報告され、その解消がパッチ更新や孫依存オーバーライドでは行えずメジャー更新を要する場合、当該ツールをサポート対象のメジャー版へ引き上げなければならない（SHALL）。更新はワークスペース内の全対象パッケージ（アプリおよびパッケージ）を同一のメジャー系統へ揃えて行わなければならず（SHALL）、旧メジャーと新メジャーを併存させたまま完了してはならない（SHALL NOT）。

メジャー更新に伴う破壊的変更への対応は、ビルド・テスト設定 API の追随に限定し、テスト・ビルドの挙動（テスト対象範囲・実行環境・カバレッジ計測方針）を等価に維持しなければならない（SHALL）。バンドラ本体のメジャー更新は、#360 でバンドラ peer に固定されていたため依存解決オーバーライドの対象外とした孫依存の脆弱性を、新しい解決版によって併せて解消しなければならない（SHALL）。

適用後は `pnpm-lock.yaml` が更新され、全アプリのビルド、`pnpm -r test` による全テスト、`pnpm -r typecheck`、Lint、CI 全ジョブが緑であることをもって受け入れ条件とする（SHALL）。

#### Scenario: ツールチェーン本体をメジャー更新して脆弱性を解消する

- **WHEN** バンドラまたはテストランナー本体に、メジャー更新でしか解消できない脆弱性が報告され、対象パッケージ全体をサポート対象のメジャー版へ揃えて更新し `pnpm install` を実行する
- **THEN** `pnpm-lock.yaml` の当該ツールが指定メジャー系統に解決され、該当するセキュリティアラートが解消される

#### Scenario: ワークスペース全体で同一メジャーに揃える

- **WHEN** ワークスペース内の複数パッケージが同一のバンドラ／テストランナーに依存している状態でメジャー更新を行う
- **THEN** 全対象パッケージが同一メジャー系統へ揃えられ、旧メジャーと新メジャーが併存したまま残らない

#### Scenario: バンドラ更新で peer 固定の孫依存アラートが連動解消する

- **WHEN** バンドラ本体をメジャー更新して `pnpm install` を実行する
- **THEN** 従前バンドラの旧メジャーに peer 固定されていた孫依存（依存解決オーバーライドの対象外としていたもの）が、新しい解決版へ更新され該当アラートが解消される

#### Scenario: 破壊的変更への対応で挙動を変えない

- **WHEN** メジャー更新に伴い削除・改名された設定オプションや既定値変更に追随して `vite.config` / `vitest.config` を修正する
- **THEN** テスト対象範囲・実行環境・カバレッジ計測方針は等価に維持され、全アプリのビルドと `pnpm -r test` が緑になる

