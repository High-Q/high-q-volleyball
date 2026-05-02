## ADDED Requirements

### Requirement: 一覧から詳細画面への遷移動線

`/events` 画面の DataTable の **タイトル列**（`events.name`）は MUST `/events/:id`（admin-event-detail capability）への `<router-link>` として描画される。リンク化はタイトル列のみ SHALL とし、行全体クリックは行わない（同一行に「編集」リンクが既に存在し、誤操作リスクを避けるため）。

タイトルリンクのテキストは MUST `events.name` をそのまま使用し、追加のアイコンや視覚装飾は付けない。hover で下線などの視覚フィードバックを SHALL 提供する。

#### Scenario: タイトルクリックで詳細画面に遷移
- **WHEN** ユーザーが events 行のタイトル（events.name）を押下
- **THEN** router が `/events/:id` に push され、admin-event-detail capability が実装する詳細画面が表示される

#### Scenario: 編集リンクは引き続き機能
- **WHEN** ユーザーが events 行末の「編集」リンクを押下
- **THEN** router が `/events/:id/edit` に push される（既存挙動を維持）

#### Scenario: 行全体は非リンク
- **WHEN** ユーザーがタイトル列・編集リンク列以外のセル（日付 / 会場 / 時間 / 残席バー / ステータス）をクリック
- **THEN** 何も起きない（行全体は `<router-link>` で wrap しない）

#### Scenario: キーボード遷移
- **WHEN** Tab キーで Toolbar から進めると、各行のタイトルリンク → 編集リンクの順にフォーカスが当たる
- **THEN** Enter キーでそれぞれ `/events/:id` / `/events/:id/edit` へ遷移する
