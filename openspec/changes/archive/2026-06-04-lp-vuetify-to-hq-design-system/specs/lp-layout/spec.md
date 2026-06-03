## MODIFIED Requirements

### Requirement: ハードコードされたカラー値が CSS 内に存在しない

LP の Vue コンポーネント・スタイルブロック・SCSS には、ハードコードされたカラー値（hex / rgb / hsl / 名前指定の色）を含めてはならない（SHALL NOT）。すべての色は **HQ デザイントークン経由**（CSS 変数 `var(--hq-color-*)` または `@high-q/tailwind-preset` 由来の Tailwind utility）で参照されなければならない（SHALL）。例外として `@high-q/design-tokens` パッケージ自体（トークン定義の真実の源）は値定義のためのハードコードを許可する。

#### Scenario: LP の widgets / pages / shared/ui にハードコード色が存在しない
- **WHEN** `grep -rnE "#[0-9a-fA-F]{3,8}\\b" apps/lp/src/widgets apps/lp/src/pages apps/lp/src/shared apps/lp/src/App.vue` を実行する
- **THEN** マッチ件数が 0 件である（HQ デザイントークンの CSS 変数経由のみが許可される）

#### Scenario: トークン経由での色参照
- **WHEN** コンポーネントが任意の色を必要とするとき
- **THEN** `var(--hq-color-paper)` / `var(--hq-color-ink)` 等の CSS 変数、または `bg-paper` / `text-ink` 等の `@high-q/tailwind-preset` 由来 utility 経由で参照される

### Requirement: 全セクションの横幅がヘッダーと揃う

LP の各セクション（Hero・Concept・Activities・Event）の横幅はヘッダーと同幅でなければならない（SHALL）。Hero は背景画像をフル幅で表示するが、テキスト・CTA は中央寄せの最大幅コンテナ内に収める（実装は Tailwind utility の `max-w-screen-*` + `mx-auto` または同等のレイアウト構造）。

#### Scenario: セクション横幅の一致
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ヘッダー・コンセプト・アクティビティ・イベント各セクションのコンテンツ左右端が揃って表示される

#### Scenario: コンテナ層の実装方式
- **WHEN** LP の各セクションの実装を確認する
- **THEN** 中央寄せ最大幅コンテナは Tailwind utility または同等の CSS で実装されており、`v-container` を含む Vuetify 由来のコンポーネントには依存しない

### Requirement: X (Twitter) アイコンは公式ロゴで統一される

LP 内の X 関連 SNS リンクは、X 公式ロゴ（"X" 字形のカスタム inline SVG）で表示されなければならない（SHALL）。鳥アイコン（旧 Twitter ロゴ）や、Vuetify / Material Design Icons 系の `mdi-twitter` 等の外部アイコンフォントに依存する表現を含めてはならない（SHALL NOT）。

#### Scenario: ヘッダー X アイコンの表示
- **WHEN** ユーザーがヘッダーの SNS ボタンを見たとき
- **THEN** 鳥アイコンや MDI 由来のアイコンではなく、X の "X" 字形 inline SVG が表示される

#### Scenario: フッター X アイコンの表示
- **WHEN** ユーザーがフッターの SNS ボタンを見たとき
- **THEN** X の "X" 字形 inline SVG が表示される

#### Scenario: Activities セクション X アイコンの表示
- **WHEN** ユーザーが Activities セクションの SNS ボタンを見たとき
- **THEN** X の "X" 字形 inline SVG が表示される

#### Scenario: 外部アイコンフォント非依存
- **WHEN** LP の widgets / pages / shared/ui を `grep -rn "mdi-\|@mdi/\|fa-\|@fortawesome/" apps/lp/src/` で検索する
- **THEN** マッチ件数が 0 件である（X 含む全アイコンが inline SVG で実装されている）
