# monorepo-workspace Spec Delta

## MODIFIED Requirements

### Requirement: admin・reservation・sharedのスケルトンが存在する

`apps/admin/`・`apps/reservation/`・`packages/shared/`・`packages/design-tokens/`・`packages/ui/`・`packages/tailwind-preset/` が各自の `package.json` を持ち、pnpm ワークスペースに認識されなければならない（SHALL）。

#### Scenario: スケルトンパッケージがワークスペースリストに表示される

- **WHEN** `pnpm list -r --depth 0` を実行する
- **THEN** `@high-q/lp`・`@high-q/admin`・`@high-q/reservation`・`@high-q/shared`・`@high-q/design-tokens`・`@high-q/ui`・`@high-q/tailwind-preset` がすべて一覧に表示される

#### Scenario: 新規パッケージが workspace 依存として解決できる

- **WHEN** `apps/admin` または `apps/reservation` の `package.json` で `"@high-q/design-tokens": "workspace:*"`、`"@high-q/ui": "workspace:*"`、`"@high-q/tailwind-preset": "workspace:*"` を宣言し `pnpm install` を実行する
- **THEN** 各 `node_modules` 配下に対応する symlink が作成され、import が解決される

## ADDED Requirements

### Requirement: 新規パッケージ `@high-q/tailwind-preset` が `pnpm -r` 系コマンドに追従する

`packages/tailwind-preset` は、ルートで `pnpm -r typecheck` および `pnpm -r test` を実行した際に、自動的に対象に含まれていなければならない（SHALL）。

#### Scenario: ルートからの一括コマンドで対象に入る

- **WHEN** リポジトリルートで `pnpm -r typecheck` を実行する
- **THEN** `@high-q/tailwind-preset` の `typecheck` script が呼び出され、エラーなく通過する

#### Scenario: ルートテストにも組み込まれる

- **WHEN** リポジトリルートで `pnpm -r test` を実行する
- **THEN** `@high-q/tailwind-preset` の vitest 実行が含まれ、エラーなく通過する
