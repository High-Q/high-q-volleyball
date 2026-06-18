# admin-responsive-shell Specification

## Purpose
TBD - created by archiving change admin-mobile-responsive. Update Purpose after archive.
## Requirements
### Requirement: 共通レイアウトシェルの適用範囲

`apps/admin` は MUST 認証配下ルート（ダッシュボード / イベント / 会員 / 会場 / 本人確認書類 およびそれらの子画面）を共通レイアウトシェル `widgets/admin-shell` で包んで描画する。シェルは画面幅に応じて、デスクトップ（≥ `md` = 768px）では左固定サイドバー、モバイル（< `md`）ではアプリバー + ドロワーを提供する。

公開ルート（`/login` / `/mfa` / `/mfa/setup` / `/auth/callback`）は MUST シェル無しで描画する（ログイン前にナビを露出しない）。

#### Scenario: 認証配下ルートはシェルで包まれる
- **WHEN** AAL2 + admin ユーザーが `/` または `/events` 等の認証配下ルートを開く
- **THEN** 画面はシェル（サイドバー or アプリバー + ドロワー）を伴って描画される

#### Scenario: 公開ルートはシェル無し
- **WHEN** 未認証ユーザーが `/login` を開く
- **THEN** サイドバー / アプリバー / ドロワーは描画されない

### Requirement: デスクトップのサイドバーナビ

デスクトップ（≥ `md`）では、シェルは MUST 画面左に固定幅のサイドバーを表示する。サイドバーは MUST ブランド表記、グローバルナビ項目、最下部にユーザー表示 + ログアウトを含む。現在ルートに対応するナビ項目は MUST アクティブ状態で強調される。着色は HQ デザイントークン（`var(--hq-*)` / Tailwind preset utility）経由のみとし、リテラル色を用いない SHALL。

#### Scenario: デスクトップでサイドバーが常時表示される
- **WHEN** 画面幅 1280px で認証配下ルートを開く
- **THEN** 左サイドバーが常時表示され、ナビ項目・ログアウトが操作可能である

#### Scenario: 現在ルートのアクティブ強調
- **WHEN** `/events` を開いている
- **THEN** サイドバーの「イベント」項目がアクティブ状態で強調される

### Requirement: モバイルのアプリバーとドロワー

モバイル（< `md`）では、シェルは MUST サイドバーを隠し、上部にアプリバー（ハンバーガー + 画面タイトル + 主要アクション 1 つの領域）を表示する。ハンバーガー押下で MUST ドロワー（左からスライド + スクリム）を開き、サイドバーと同じ全ナビ項目 + ログアウトにアクセスできる。画面タイトルは `route.meta.title` から取得する SHALL。

各画面の「主要アクション 1 つ」は MUST アプリバー右の Teleport 領域に表示できる（デスクトップでは各ページの TopBar 内に描画する）。横スクロールは MUST 発生させない。

#### Scenario: モバイルでアプリバーに集約される
- **WHEN** 画面幅 375px で認証配下ルートを開く
- **THEN** サイドバーは表示されず、上部にハンバーガー + 画面タイトルを持つアプリバーが表示される

#### Scenario: ハンバーガーでドロワーを開く
- **WHEN** モバイルでハンバーガーを押下する
- **THEN** 左からドロワーがスライド表示され、全ナビ項目とログアウトが操作できる

#### Scenario: ナビ項目選択でドロワーが閉じ遷移する
- **WHEN** ドロワー内のナビ項目を選択する
- **THEN** 当該ルートへ遷移し、ドロワーは閉じる

### Requirement: グローバルナビ項目の集約

シェルは MUST 以下の実在ルートをグローバルナビ項目として提供する: ダッシュボード（`/`）/ イベント（`/events`）/ 会員（`/members`）/ 会場（`/venues`）/ 本人確認書類（`/identity-documents`）。本人確認書類項目には MUST pending 件数 Badge を表示する。ログアウトは MUST サイドバー/ドロワーから常時実行できる。

ルートが存在しない項目（設定 等）は MUST ナビに表示しない。各ページは自前のグローバルナビ行を持たず、ページ header はパンくず + タイトル + ページ固有アクションのみに縮約する SHALL。

#### Scenario: ナビ項目は実在ルートのみ
- **WHEN** シェルのナビを描画する
- **THEN** ダッシュボード / イベント / 会員 / 会場 / 本人確認書類 の 5 項目が表示され、未実装の「設定」項目は表示されない

#### Scenario: 本人確認書類の pending Badge
- **WHEN** pending な本人確認書類が 1 件以上存在する
- **THEN** 本人確認書類ナビ項目に件数 Badge が表示される

### Requirement: レスポンシブ表示規約

シェル配下の全画面は MUST 以下の規約に従う:

- モバイル / デスクトップの境界は Tailwind の `md`（768px）とし、中間調整は `lg`（1024px）で行う SHALL。カスタム screens は追加しない。
- データ一覧は MUST デスクトップで Table、モバイル（< `md`）でカード縦積みに切り替える。**横スクロールは使わない**。デスクトップで表示される全項目を MUST カード内に保持し（ラベル: 値）、重要状態（チェックイン済 等）は色で表現する。
- 統計カードグリッド / 本文 2 カラム / フォームのラベル列・入力列・行内グリッドは MUST モバイルで縦積みになる。
- タップ操作の主要要素は MUST 最小 44px のヒット領域を確保する。
- 375 / 768 / 1280px の各幅で、対象画面は MUST 横スクロールなしで破綻せず表示される。
- 着色は HQ デザイントークン経由のみとし、リテラル色 / リテラル spacing を用いない SHALL。

#### Scenario: 375px で横スクロールが発生しない
- **WHEN** 任意の対象画面を画面幅 375px で描画する
- **THEN** 横スクロールバーは発生せず、レイアウトは縦積みで破綻しない

#### Scenario: 一覧はモバイルでカード化される
- **WHEN** データ一覧画面を画面幅 375px で描画する
- **THEN** Table ではなくカード縦積みで表示され、デスクトップの全項目が各カード内で確認できる

### Requirement: ドロワーのアクセシビリティ

ドロワーは MUST 以下のアクセシビリティを満たす: ハンバーガーに `aria-expanded`、ドロワーに `aria-modal` 相当（フォーカストラップ）、Esc キーで閉じる、スクリム外タップで閉じる、開いている間は背景のスクロールをロックする、閉じた時にフォーカスをハンバーガーへ返す。これらは MUST shadcn-vue の `Sheet`（reka-ui ベース）プリミティブに委譲して実現する。

#### Scenario: キーボードとスクリムで閉じる
- **WHEN** ドロワーが開いている状態で Esc を押す、またはスクリムをタップする
- **THEN** ドロワーが閉じ、フォーカスがハンバーガーへ戻る

#### Scenario: 開いている間はフォーカスが内側に保たれる
- **WHEN** ドロワーが開いている状態で Tab を繰り返す
- **THEN** フォーカスはドロワー内の要素に保たれ、背面のページ要素へ抜けない

### Requirement: FSD レイヤー配置

シェルは MUST `widgets/admin-shell` に配置し、Public API（`index.ts`）経由で `App.vue`（app 層）から利用する。テーブル→カード変換の共通枠は MUST `shared/ui`（例: `DataCardList`）または `widgets` に配置し、Supabase client を import しない。ドロワー用 `Sheet` プリミティブは MUST `apps/admin/src/shared/ui/` に配置する。レイヤー境界（`eslint-plugin-boundaries`）と Public API 経由を満たす SHALL。

#### Scenario: シェルは widgets 層に配置される
- **WHEN** `admin-shell` を import する
- **THEN** `@/widgets/admin-shell` の Public API 経由で参照され、レイヤー境界違反が `eslint-plugin-boundaries` で検出されない

