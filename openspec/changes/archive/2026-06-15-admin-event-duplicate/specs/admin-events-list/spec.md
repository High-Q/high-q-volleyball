## MODIFIED Requirements

### Requirement: `/events` 画面の DataTable 列構成

`apps/admin` の `/events` 画面は、以下の列を持つ DataTable で events を一覧表示しなければならない（SHALL）:

1. **日付** — `events.start_at` を `YYYY/MM/DD (曜)` 形式で表示
2. **タイトル** — `events.name`
3. **会場** — `venues.name`（join 取得）。施設種別末尾（「スポーツセンター」等）を削った主要部のみ表示し、元の名前は `title` 属性で hover 時に確認可能
4. **時間** — `events.start_at` 〜 `events.end_at` を `HH:mm-HH:mm` 形式で表示
5. **予約・残席バー** — `@high-q/ui` の `RemainBar`。`taken = reserved_count`、`capacity = events.capacity`。capacity が NULL の場合は `N 件` のテキスト表示にフォールバック
6. **ステータス** — `events.visibility` を `公開中`（published）/ `下書き`（draft）/ `限定公開`（private）に翻訳した Badge。さらに `events.status = 'cancelled'` の場合は `中止`、`status = 'closed'` または `end_at < now()` の場合は `終了` を上書き優先で表示
7. **操作** — 行ごとの「編集」リンクと「複製」リンクを並べて表示する。「編集」はクリックで `/events/:id/edit`（admin-events-crud capability で実装）に遷移する。「複製」はクリックで `/events/new?from=:id`（admin-event-duplicate capability で実装）に遷移し、当該行を複製元とした新規作成を開始する。両リンクは行タイトルのストレッチリンク（行クリックで詳細へ遷移）より上に乗せる SHALL（行クリックと取り違えないようにする）。「複製」リンクには対象が分かる `aria-label`（例: 「<イベント名> を複製して新規作成」）を付与する SHALL。両リンクの色・余白は HQ デザイントークン経由のみで着色し、リテラル色 / リテラル spacing を用いない SHALL

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

#### Scenario: 複製リンクからの遷移
- **WHEN** ユーザーが行の「複製」リンクを押下
- **THEN** router が `/events/new?from=:id` に push され、admin-event-duplicate capability が実装する複製シード付きの新規作成画面が表示される
