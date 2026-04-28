## MODIFIED Requirements

### Requirement: admin・reservation・sharedのスケルトンが存在する
`apps/admin/`・`apps/reservation/`・`packages/shared/`・`packages/design-tokens/`・`packages/ui/` が各自の `package.json` を持ち、pnpm ワークスペースに認識されなければならない（SHALL）。

#### Scenario: スケルトンパッケージがワークスペースリストに表示される
- **WHEN** `pnpm list -r --depth 0` を実行する
- **THEN** `@high-q/lp`・`@high-q/admin`・`@high-q/reservation`・`@high-q/shared`・`@high-q/design-tokens`・`@high-q/ui` がすべて一覧に表示される

#### Scenario: 新規パッケージが workspace 依存として解決できる
- **WHEN** `apps/admin` または `apps/reservation` の `package.json` で `"@high-q/design-tokens": "workspace:*"` および `"@high-q/ui": "workspace:*"` を宣言し `pnpm install` を実行する
- **THEN** 各 `node_modules` 配下に対応する symlink が作成され、import が解決される
