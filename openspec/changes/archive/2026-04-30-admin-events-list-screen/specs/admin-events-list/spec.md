# admin-events-list Specification

## ADDED Requirements

### Requirement: `/events` 画面の DataTable 列構成

`apps/admin` の `/events` 画面は、以下の列を持つ DataTable で events を一覧表示しなければならない（SHALL）:

1. **日付** — `events.start_at` を `YYYY/MM/DD (曜)` 形式で表示
2. **タイトル** — `events.name`
3. **会場** — `venues.name`（join 取得）
4. **時間** — `events.start_at` 〜 `events.end_at` を `HH:mm-HH:mm` 形式で表示
5. **定員** — `events.capacity`（NULL の場合は `—`）
6. **予約・残席バー** — `@high-q/ui` の `RemainBar`。`taken = reserved_count`、`capacity = events.capacity`。capacity が NULL の場合は `予約 N 件` のテキスト表示にフォールバック
7. **ステータス** — `events.visibility` を `公開中`（published）/ `下書き`（draft）/ `限定公開`（private）に翻訳した Badge。さらに `events.status = 'cancelled'` の場合は `中止`、`status = 'closed'` または `end_at < now()` の場合は `終了` を上書き優先で表示
8. **操作** — 行ごとの「編集」リンク（`/events/:id/edit` への遷移）。本 change ではプレースホルダ遷移でよい（実装は #86）

#### Scenario: 列順序が仕様どおり
- **WHEN** `/events` を Success 状態で描画
- **THEN** 上記 1〜8 の列が左から順に表示される

#### Scenario: 残席バーが capacity 未設定で fallback する
- **WHEN** capacity が NULL の event 行を描画
- **THEN** RemainBar の代わりに「予約 N 件」のテキストが表示される

#### Scenario: 終了済みイベントのステータス
- **WHEN** `events.end_at < now()` かつ `visibility = 'published'`
- **THEN** ステータス列は `終了` Badge で表示される（公開中ではなく）

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

`/events` 画面のヘッダ右側に、「新規作成」CTA を SHALL 配置する。クリックで `/events/new` に遷移する（編集画面の実装は #86 で行うが、ルート予約は本 change で実施）。

#### Scenario: CTA からの遷移
- **WHEN** ユーザーが「新規作成」ボタンを押下
- **THEN** router が `/events/new` に push される

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
