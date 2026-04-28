## ADDED Requirements

### Requirement: 共有 UI パッケージが `@high-q/ui` として公開される
新パッケージ `packages/ui` は、`package.json` の `name` を `@high-q/ui` とし、Vue 3 SFC で実装された UI プリミティブを named export で公開しなければならない（SHALL）。`main` / `types` / `exports` は `./src/index.ts` を直接指し、SFC コンパイルは consumer の `@vitejs/plugin-vue` / `vue-tsc` に委ねる（build 工程なし）。Vue 3 は `peerDependencies` として宣言する。

#### Scenario: アプリから named import できる
- **WHEN** consumer が `import { Button, Kicker, Badge, Photo, RemainBar } from '@high-q/ui'` を実行する
- **THEN** すべて Vue 3 コンポーネントとして解決され、テンプレート内で利用できる

#### Scenario: workspace から解決できる
- **WHEN** `apps/admin/package.json` に `"@high-q/ui": "workspace:*"` を追加し `pnpm install` を実行する
- **THEN** `apps/admin` 配下から `@high-q/ui` の import が成功する

### Requirement: Button プリミティブが提供される
`Button` コンポーネントは、ピル型（`border-radius` 999）の CTA ボタンとして 4 つの variant と 2 つのサイズを提供しなければならない（SHALL）。

- variant: `primary`（ink 背景・paper 文字） / `secondary`（透明背景・hairline 枠 / ink 文字） / `ghost`（透明背景・枠なし / ink 文字） / `danger`（accent 背景・paper 文字）
- size: `sm`（高さ 36px 相当） / `md`（高さ 48px 相当・デフォルト）
- 状態: default / hover / focus-visible / disabled / loading

#### Scenario: variant プロパティが見た目に反映される
- **WHEN** `<Button variant="primary">` を render する
- **THEN** 背景色が `var(--hq-color-ink)`、文字色が `var(--hq-color-paper)` で表示される

#### Scenario: disabled 時にクリックイベントが発火しない
- **WHEN** `<Button disabled>` をクリックする
- **THEN** `click` イベントがエミットされず、`aria-disabled="true"` が付与される

#### Scenario: loading 時にスピナーが表示されラベルが置き換わる
- **WHEN** `<Button :loading="true">確認</Button>` を render する
- **THEN** スピナーが描画され、ボタンは `aria-busy="true"` を持ちクリックは無効化される

### Requirement: Kicker プリミティブが提供される
`Kicker` コンポーネントは、mono フォント・大文字・トラッキング広めの小さなラベル（セクション見出しの上に置く "kicker"）を表示しなければならない（SHALL）。

#### Scenario: デフォルトで accent 色が適用される
- **WHEN** `<Kicker>EVENT</Kicker>` を render する
- **THEN** `font-family: var(--hq-font-mono)`、`text-transform: uppercase`、`color: var(--hq-color-accent)` で表示される

#### Scenario: color prop で色を上書きできる
- **WHEN** `<Kicker color="ink">EVENT</Kicker>` を render する
- **THEN** 文字色が `var(--hq-color-ink)` に変わる

### Requirement: Badge プリミティブが提供される
`Badge` コンポーネントは、6 種類の tone を持つステータスバッジを表示しなければならない（SHALL）。tone: `neutral` / `accent` / `success` / `warn` / `danger` / `draft`。

#### Scenario: tone ごとに配色が切り替わる
- **WHEN** `<Badge tone="success">承認済</Badge>` と `<Badge tone="danger">却下</Badge>` を render する
- **THEN** それぞれ tone に対応する背景色・文字色が適用され、両者が視覚的に区別できる

#### Scenario: 未指定時は neutral tone になる
- **WHEN** `<Badge>下書き</Badge>` を tone 指定なしで render する
- **THEN** neutral tone（hairline 枠 / ink 文字 / paperWarm 背景）で表示される

### Requirement: Photo プレースホルダープリミティブが提供される
`Photo` コンポーネントは、写真未投入時のプレースホルダーとして、温かいトーンの斜めストライプ背景に右下のラベルを表示しなければならない（SHALL）。

#### Scenario: width / height / radius / label を props で制御できる
- **WHEN** `<Photo :h="240" w="100%" :radius="12" label="EVENT_001" />` を render する
- **THEN** 高さ 240px・幅 100%・border-radius 12px のボックスが斜め 135deg のストライプで描画され、右下に `[ EVENT_001 ]` がモノフォントで表示される

#### Scenario: label 未指定時はラベルを表示しない
- **WHEN** `<Photo :h="120" />` を label なしで render する
- **THEN** ラベル領域は描画されず、ストライプ背景のみが表示される

### Requirement: RemainBar プリミティブが提供される
`RemainBar` コンポーネントは、イベントの残席状況を視覚化する横方向のプログレスバー風コンポーネントを提供しなければならない（SHALL）。`capacity`（定員）と `taken`（予約済）を props で受け取り、残席に応じて配色を変化させる。

#### Scenario: 残席が多い場合は通常配色で表示される
- **WHEN** `<RemainBar :capacity="20" :taken="5" />` を render する（残席率 75%）
- **THEN** バーは ink トーンで描画され、残席ラベル（`残 15 / 20`）が ink で表示される

#### Scenario: 残席が少ない場合は警告配色になる
- **WHEN** `<RemainBar :capacity="20" :taken="18" />` を render する（残席率 10%）
- **THEN** バーが accent カラーに切り替わり、`aria-label` に「残りわずか」相当の状態が反映される

#### Scenario: 満席時は満席表示になる
- **WHEN** `<RemainBar :capacity="20" :taken="20" />` を render する
- **THEN** バーが満（100%）状態で描画され、ラベルが「満席」表示に切り替わる

### Requirement: 全プリミティブが HQ デザイントークンのみで着色される
`@high-q/ui` のプリミティブは、色・書体・spacing・radius について **CSS variables（`var(--hq-*)`）または `@high-q/design-tokens` の TS export 経由でのみ参照**しなければならない（SHALL）。マジックナンバー（直接 `#xxxxxx` や `px` 値の埋め込み）は禁止する。ただし bp（breakpoint）など token に存在しない数値はこの限りではない。

#### Scenario: コンポーネント実装に色のリテラルが含まれない
- **WHEN** `packages/ui/src/**/*.vue` の `<style>` 内で `#`・`rgb(`・`rgba(` のリテラル色を grep する
- **THEN** マッチが 0 件である（あるいは tokens.css 経由で正当化された箇所のみ）

### Requirement: 各プリミティブに component test が存在する
各プリミティブ（Button / Kicker / Badge / Photo / RemainBar）は、Vitest + `@vue/test-utils` で **最低 1 件以上の component test** を持たなければならない（SHALL）。テストは描画と props 反映を検証する。

#### Scenario: pnpm test が全プリミティブのテストを実行する
- **WHEN** `pnpm --filter @high-q/ui test` を実行する
- **THEN** Button / Kicker / Badge / Photo / RemainBar のテストがすべて pass する

### Requirement: showcase ページで全プリミティブの主要状態が確認できる
`packages/ui` は、開発用に **showcase ページ**（最小構成の Vite ページ）を提供しなければならない（SHALL）。すべてのプリミティブの主要な状態（default / hover / disabled / focus-visible / variant 別 / tone 別）が 1 ページに並ぶ。

#### Scenario: showcase 開発サーバーが起動する
- **WHEN** `pnpm --filter @high-q/ui dev` を実行する
- **THEN** Vite 開発サーバーが起動し、ブラウザでアクセスすると全プリミティブが描画される

#### Scenario: showcase が consumer の本番ビルドに混入しない
- **WHEN** `apps/admin` または `apps/reservation` の本番 Vite build を実行する
- **THEN** `package.json` の `exports` は `.` のみを公開しているため、`Button` / `Kicker` 等のプリミティブのみが consumer から import 可能で、playground 配下のファイルは consumer のバンドルに含まれない

### Requirement: パッケージが pnpm -r build / typecheck / test に追従する
新パッケージ `@high-q/ui` は、ルートで `pnpm -r build`・`pnpm -r typecheck`・`pnpm -r test` を実行した際に、各コマンドへ自動的に組み込まれていなければならない（SHALL）。

#### Scenario: ルートからの一括コマンドで対象に入る
- **WHEN** リポジトリルートで `pnpm -r typecheck` を実行する
- **THEN** `@high-q/ui` の `typecheck` script が呼び出され、エラーなく通過する
