## ADDED Requirements

### Requirement: events.vol 採番カラム

`events` テーブルは回号を表す `vol`（`smallint NULL`）列を持つ MUST。`vol` は `events.name` から独立した回号の単一の真実であり、回号を name 文字列に埋め込んで運用してはならない MUST NOT。NULL は未採番（パース不能 / 採番対象外 / 解放済み）を表す。

`vol` の有効値（非 NULL かつ `status <> 'cancelled'`）には部分一意制約を課す MUST: `create unique index events_vol_unique on public.events (vol) where vol is not null and status <> 'cancelled'`。具体的な採番規則（過去凍結 / 未開催シフト / 中止解放）は `event-vol-numbering` capability が規定する。

#### Scenario: vol 列の存在と型
- **WHEN** `events` テーブルのスキーマを確認する
- **THEN** `vol smallint` 列が存在し、NULL を許容する

#### Scenario: 有効な vol の一意性
- **WHEN** 非中止イベント 2 件に同一の vol を割り当てようとする
- **THEN** 部分一意 index `events_vol_unique` 違反でエラーになる（NULL / cancelled は重複許容）

### Requirement: event_list_view / event_detail_view の vol 列

`event_list_view` および `event_detail_view` は `events.vol` を `vol`（smallint）列として返す MUST。これにより admin 一覧 / 詳細および会員サイトの取得経路が単一クエリで回号を取得できる。両 view の `SECURITY INVOKER` / RLS 継承およびその他の集計列の定義は従来どおり維持する MUST。

#### Scenario: event_list_view が vol を返す
- **WHEN** `SELECT vol FROM event_list_view LIMIT 1` を実行する
- **THEN** 当該イベントの `events.vol`（NULL 含む）が返る

#### Scenario: event_detail_view が vol を返す
- **WHEN** `SELECT vol FROM event_detail_view WHERE id = X` を実行する
- **THEN** 当該イベントの `events.vol`（NULL 含む）が返る
