# admin-events-list Specification

## Purpose

admin アプリの `/events` 画面の責務を規定する: DataTable 列構成 / フィルタ・検索・ソート契約 / 4 状態 (Loading / Empty / Error / Success) / 残席バー表示 / 「新規作成」CTA / ページネーション / URL クエリ同期 / FSD レイヤー配置 / アクセシビリティ。データ取得は単一 SQL view `event_list_view` 経由とし、N+1 と RLS 漏れを回避する。
## Requirements
### Requirement: `/events` 画面の DataTable 列構成

`apps/admin` の `/events` 画面は、以下の列を持つ DataTable で events を一覧表示しなければならない（SHALL）:

1. **日付** — `events.start_at` を `YYYY/MM/DD (曜)` 形式で表示
2. **タイトル** — `events.name`
3. **会場** — `venues.name`（join 取得）。施設種別末尾（「スポーツセンター」等）を削った主要部のみ表示し、元の名前は `title` 属性で hover 時に確認可能
4. **時間** — `events.start_at` 〜 `events.end_at` を `HH:mm-HH:mm` 形式で表示
5. **予約・残席バー** — `@high-q/ui` の `RemainBar`。`taken = reserved_count`、`capacity = events.capacity`。capacity が NULL の場合は `N 件` のテキスト表示にフォールバック
6. **ステータス** — `events.visibility` を `公開中`（published）/ `下書き`（draft）/ `限定公開`（private）に翻訳した Badge。さらに `events.status = 'cancelled'` の場合は `中止`、`status = 'closed'` または `end_at < now()` の場合は `終了` を上書き優先で表示
7. **操作** — 行ごとの「編集」リンク。クリックで `/events/:id/edit`（admin-events-crud capability で実装）に遷移する

「定員」列は MVP1 で削除（フォームからも capacity フィールドを外したため、表示の必要性が無い。capacity 自体は DB 列としては残るが、UI の責務外）。

全テーブルセルは `whitespace-nowrap` で改行抑止し、画面幅を超えた場合は `<Table>` の `overflow-auto` で横スクロールに自動対応する SHALL（モバイルで縦長改行で UI が崩れる現象の抑止）。

#### Scenario: 列順序が仕様どおり
- **WHEN** `/events` を Success 状態で描画
- **THEN** 上記 1〜7 の列が左から順に表示される（「定員」列は存在しない）

#### Scenario: 残席バーが capacity 未設定で fallback する
- **WHEN** capacity が NULL の event 行を描画
- **THEN** RemainBar の代わりに「N 件」のテキストが表示される

#### Scenario: 会場名は短縮表示
- **WHEN** `venue_name = "亀戸スポーツセンター"` の行を描画
- **THEN** セルには「亀戸」が表示され、cell の title 属性に "亀戸スポーツセンター" 全体が保持される

#### Scenario: 終了済みイベントのステータス
- **WHEN** `events.end_at < now()` かつ `visibility = 'published'`
- **THEN** ステータス列は `終了` Badge で表示される（公開中ではなく）

#### Scenario: 編集リンクからの遷移
- **WHEN** ユーザーが行の「編集」リンクを押下
- **THEN** router が `/events/:id/edit` に push され、admin-events-crud capability が実装する Edit 画面が表示される

### Requirement: フィルタ・検索・ソート

`/events` 画面は、以下のフィルタ・検索・ソートを SHALL 提供する:

- **期間フィルタ**: 「今後」（start_at >= now()）/「今月」（current calendar month）/「先月」/「過去すべて」（end_at < now()）/「すべて」。デフォルトは「今後」
- **会場フィルタ**: venues 一覧から単一選択。デフォルトは「すべて」
- **ステータスフィルタ**: 「公開中」/「下書き」/「限定公開」/「すべて」。`status = 'cancelled'` / `'closed'` は別軸のため UI には含めない
- **検索**: タイトル（events.name）または会場（venues.name）に部分一致（ILIKE）。デフォルトは空文字列（無効）
- **ソート**: 列ヘッダクリックで「日付」「ステータス」を asc/desc トグル。デフォルトは「日付 asc（今後フィルタ時）」「日付 desc（過去フィルタ時）」

各フィルタ・検索・ソート状態は URL クエリ（`?period=`/`?venue=`/`?status=`/`?q=`/`?sort=`/`?dir=`）で同期 SHALL し、ブラウザのリロード・戻る/進む操作で復元できる。

#### Scenario: 期間フィルタの適用
- **WHEN** ユーザーが期間「今月」を選択
- **THEN** URL に `?period=this-month` が追加され、当月の start_at に該当する events のみ表示される

#### Scenario: 検索とフィルタの組み合わせ
- **WHEN** 期間「今後」+ 検索文字列「ゆる練」を入力
- **THEN** 今後の events のうち name に「ゆる練」を含む行のみ表示される

#### Scenario: ソート方向の切替
- **WHEN** 「日付」ヘッダを 2 回クリック
- **THEN** 1 回目で desc、2 回目で asc に切り替わり、URL クエリ `sort=date&dir=desc` → `dir=asc` で同期する

#### Scenario: URL クエリからの復元
- **WHEN** `/events?period=last-month&venue=v_kameido&q=練習` を直接開く
- **THEN** フィルタ UI が当該値で初期化され、対応する一覧が表示される

### Requirement: ページネーション

`/events` 画面は、サーバサイドの offset / limit ページネーションを SHALL 提供する。1 ページあたりの件数は **25 件**固定とし、`page` パラメータで現在ページを管理する。`?page=N` を URL クエリで同期する。

#### Scenario: ページ送り
- **WHEN** ページ 2 のリンクをクリック
- **THEN** URL が `?page=2` になり、26 〜 50 番目の events が表示される

#### Scenario: ページ範囲外
- **WHEN** `?page=999` を直接開く（実データは少ない）
- **THEN** Empty 状態が表示される（エラーではない）

### Requirement: 4 状態の網羅

`/events` 画面は、以下の 4 状態を MUST 表示し分けなければならない:

- **Loading**: 初回マウント中またはフィルタ変更中。`Skeleton` プリミティブで 6 行分の skeleton bar を描画
- **Empty**: クエリ結果が 0 件。「イベントがまだありません」「最初のイベントを作るか、テンプレートから複製してください」のメッセージと `[新規作成]` CTA を表示
- **Error**: クエリ失敗。エラーコード（例: `ERR · supabase / events.list · 503`）と「再試行」CTA を表示。`role="alert"` 必須
- **Success**: 1 件以上。DataTable + Pagination 表示

#### Scenario: Loading skeleton の表示
- **WHEN** ページ初回マウントでクエリが pending
- **THEN** Skeleton が 6 行表示され、DataTable のヘッダは表示済み

#### Scenario: Empty 状態の CTA
- **WHEN** クエリ結果が 0 件
- **THEN** 「新規作成」ボタンが表示され、押下で `/events/new` に遷移する

#### Scenario: Error 状態のロール属性
- **WHEN** クエリが失敗
- **THEN** Error メッセージのコンテナに `role="alert"` が付与され、「再試行」ボタンが表示される

#### Scenario: Error 状態からの再試行
- **WHEN** Error 状態で「再試行」を押下
- **THEN** クエリが refetch され、Loading → Success/Error に遷移する

### Requirement: 「新規作成」CTA

`/events` 画面のヘッダ右側に、「新規作成」CTA を SHALL 配置する。クリックで `/events/new` に遷移する。遷移先の Create 画面は admin-events-crud capability で実装される。

#### Scenario: CTA からの遷移
- **WHEN** ユーザーが「新規作成」ボタンを押下
- **THEN** router が `/events/new` に push され、admin-events-crud capability が実装する Create 画面が表示される

### Requirement: 認証下のルート

`/events` および `/events/new` は admin 認証下のルートでなければならない（SHALL）。未認証ユーザーは `/login` に redirect、AAL1 ユーザーは `/mfa` または `/mfa/setup` に redirect、非 admin ユーザーは `/login?reason=not-admin` に redirect される（既存の auth guard を流用）。

#### Scenario: 未認証アクセス
- **WHEN** 未認証ユーザーが `/events` にアクセス
- **THEN** `/login` にリダイレクトされる

#### Scenario: 非 admin アクセス
- **WHEN** AAL2 だが `role != 'admin'` のユーザーが `/events` にアクセス
- **THEN** 自動サインアウトされ `/login?reason=not-admin` にリダイレクトされる

### Requirement: FSD レイヤー構成

`/events` 画面の実装は、FSD アーキテクチャに準拠し以下のレイヤーに配置 MUST する:

- `pages/EventsListPage.vue` — ルートエントリ。widget をマウントするのみ
- `widgets/events-list/` — DataTable + Toolbar + Pagination + 4 状態の出し分けを担う複合 widget
- `features/events-filter/` — フィルタ・検索・ソート・ページ状態の管理（URL クエリ同期含む）composable
- `entities/event/` — `Event` ドメイン型（`EventId` / `VenueId` を再利用）と Supabase queryOptions（`event_list_view` を fetch）
- `shared/ui/Table.vue` / `Select.vue` / `Skeleton.vue` — shadcn-vue から取り込むプリミティブ

依存方向は `pages → widgets → features → entities → shared` の一方向のみ。各スライスは `index.ts` 経由で Public API を露出する。

#### Scenario: FSD 配置の検証
- **WHEN** `apps/admin/src` 配下の新規ファイルを確認
- **THEN** 上記レイヤー配置のとおり配置されており、`features/events-filter` が `widgets/events-list` から import されない（依存方向違反がない）

### Requirement: デザイントークン準拠

`/events` 画面の全コンポーネントは、HQ デザイントークン（`@high-q/tailwind-preset` の utility または `var(--hq-*)` CSS 変数）経由でのみ着色 SHALL する。リテラル色（`#xxxxxx` / `rgb()`）、リテラル spacing（`px-[12px]` 等の任意値クラス）、リテラル font-family の埋め込みを禁止する。

#### Scenario: マジックナンバー検査
- **WHEN** `apps/admin/src/{pages,widgets,features,entities,shared/ui}/**/*.vue` を `#[0-9a-f]{3,6}\b` および `\[\d+px\]` で grep
- **THEN** マッチが 0 件である

### Requirement: アクセシビリティ

`/events` 画面は、WCAG 2.1 AA レベルの a11y を MUST 満たす:

- DataTable は `role="table"` / 行 `role="row"` / セル `role="cell"` 相当を `<table>` セマンティクスで提供
- ソート可能な列ヘッダは `aria-sort="ascending" | "descending" | "none"` を反映
- 「新規作成」「再試行」等の操作可能要素は `aria-label` を持つ
- フィルタ select は `<label>` と関連付けられた `<select>` または radix-vue の Listbox で実装し、キーボード操作（Tab / Enter / 方向キー / Esc）で操作可能
- Error 状態のコンテナは `role="alert"`
- フォーカス順序は Toolbar → Table → Pagination の順

#### Scenario: aria-sort の反映
- **WHEN** 「日付」列を asc でソートしている
- **THEN** 「日付」列ヘッダ要素に `aria-sort="ascending"` が付与され、それ以外の列ヘッダは `aria-sort="none"` または未設定

#### Scenario: キーボードナビゲーション
- **WHEN** Tab キーで Toolbar の最初の要素にフォーカスし、繰り返し Tab で進める
- **THEN** Toolbar の各コントロール → Table の各操作リンク → Pagination のリンクの順にフォーカスが移る

### Requirement: 残席集計の取得方法

`/events` 画面の残席バー表示用の `reserved_count` は、SQL view `event_list_view` 経由で events と同一行で取得 SHALL する。クライアント側で events と reservations を別クエリして join する実装は禁止する（N+1 と RLS 漏れのリスクを回避）。

#### Scenario: 単一クエリでの取得
- **WHEN** `/events` の一覧クエリを発行
- **THEN** Supabase クライアントは `event_list_view` を 1 回だけ SELECT し、各行に `reserved_count` 列が含まれる

### Requirement: テスト

`/events` 画面は、以下のテストを SHALL 持つ:

- **Component test**（Vitest + @vue/test-utils）:
  - 4 状態（Loading / Empty / Error / Success）の出し分け
  - 列構成と表示フォーマット（日付・時間・ステータス Badge）
  - フィルタ・検索・ソート操作後の URL クエリ同期
  - ページネーションの遷移
  - 「新規作成」CTA の遷移
- **Composable unit test**（Vitest + MSW）:
  - `useEventsFilter` の URL クエリパース・直列化
  - `entities/event` の queryOptions が `event_list_view` を fetch すること（MSW スタブ）
- **E2E**（Playwright、上限 2 件 — CLAUDE.md ルール）:
  - happy path: 認証済み admin で `/events` にアクセス → 一覧が表示され、行が見える
  - filter 適用: 検索ボックスに文字列を入力 → URL が `?q=...` になり、絞り込まれた結果が表示される

#### Scenario: Component test の網羅
- **WHEN** `pnpm --filter @high-q/admin test` を実行
- **THEN** `EventsListPage` / `EventsListWidget` / `useEventsFilter` の component / composable test がすべて pass する

#### Scenario: E2E の通過
- **WHEN** `pnpm --filter @high-q/e2e test` を実行（admin プロジェクト）
- **THEN** 上記 happy path / filter 適用の 2 件が pass する

### Requirement: 一覧から詳細画面への遷移動線

`/events` 画面の DataTable は、**編集列を除く行全体**を `/events/:id`（admin-event-detail capability）への遷移トリガーとして SHALL 機能させる。各行（`<TableRow>`）内の主要セル（日付 / タイトル / 会場 / 時間 / 予約・残席バー / ステータス）のいずれをクリック / タップしても詳細画面に遷移する MUST。

「操作」列の「編集」リンクは独立した遷移先 `/events/:id/edit` を持ち、行クリック遷移の対象から MUST 除外される。編集リンクの押下時は詳細画面に遷移しない MUST NOT。

行クリック化は a11y セマンティクスを過剰に肥大化させない方式 SHALL とし、1 行あたりのリンク数は「詳細遷移 1 つ + 編集遷移 1 つ」に MUST 抑える（各セルを個別の `<router-link>` でラップする方式は採用しない）。

ソート可能列ヘッダー（日付・ステータス）のソートトグル動作は SHALL 維持される（行クリックの影響を受けない）。

行ホバー時の視覚フィードバック（背景色変化）は SHALL 提供する。キーボード操作は MUST 対応し、Tab で行の詳細遷移リンクに focus、Enter で `/events/:id` に遷移する。タイトル文字列がセル幅を超えて truncate された場合の元テキスト確認手段（`title` 属性または `aria-label`）は SHALL 維持する。

#### Scenario: 行内セル（編集列以外）クリックで詳細画面に遷移
- **WHEN** ユーザーが events 行の日付 / タイトル / 会場 / 時間 / 予約・残席バー / ステータスのいずれかのセルを押下
- **THEN** router が `/events/:id` に push され、admin-event-detail capability が実装する詳細画面が表示される

#### Scenario: 編集リンクは引き続き編集画面へ遷移
- **WHEN** ユーザーが events 行末の「編集」リンクを押下
- **THEN** router が `/events/:id/edit` に push される。詳細画面 `/events/:id` には遷移しない

#### Scenario: 行ホバー時の視覚フィードバック
- **WHEN** ユーザーが events 行に hover する
- **THEN** 行全体の背景色が `--hq-color-paper-warm` 相当に変化し、クリック可能であることが視覚的に伝わる

#### Scenario: キーボード遷移
- **WHEN** ユーザーが Tab キーで Toolbar から進める
- **THEN** 各行の詳細遷移リンク → 編集リンクの順に focus が当たり、Enter キーでそれぞれ `/events/:id` / `/events/:id/edit` へ遷移する

#### Scenario: ソート可能ヘッダー（日付・ステータス）の独立性
- **WHEN** ユーザーが「日付」または「ステータス」の列ヘッダを押下
- **THEN** ソート方向のトグルのみが発火し、`/events/:id` への遷移は起きない

#### Scenario: タイトル truncate 時の元テキスト確認手段
- **WHEN** タイトル文字列がセル幅を超えて truncate されている行に hover する
- **THEN** title 属性または aria-label でフルテキストが確認できる

