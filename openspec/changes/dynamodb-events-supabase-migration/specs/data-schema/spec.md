## ADDED Requirements

### Requirement: AWS Legacy 由来 events への Legacy ID マーカー埋め込み

システムは AWS DynamoDB から Supabase `events` へ移行されたイベント行について、`description` 列に `[Legacy ID: <aws_id>@<aws_start_time>]` の形式で AWS 側 ID と開始日時の複合キーを埋め込み MUST する。これは継続維持される列構造ではなく、一度きりの移行スクリプト (`scripts/migrate-aws-events-to-supabase.ts`) が冪等性判定に用いるマーカーである。

AWS DynamoDB 側で id 単独が一意性を保証していない（同一 id を複数イベントが共有しているケースがある）ため、id + 開始日時の複合キーで識別する SHALL。

#### Scenario: 本文なしの AWS イベント移行

- **WHEN** description が空の AWS イベントを Supabase へ INSERT する
- **THEN** `description = "[Legacy ID: <aws_id>@<aws_start_time>]"` の形式で 1 行だけ書き込まれる

#### Scenario: 同一 AWS id を共有する複数イベントの移行

- **WHEN** 同一 AWS id を持つ複数イベント（開始日時のみ異なる）を移行する
- **THEN** 各イベントは `description = "[Legacy ID: <aws_id>@<start_time_1>]"`、`[Legacy ID: <aws_id>@<start_time_2>]`、... と開始日時で区別された別個の行として INSERT される

#### Scenario: 再実行時の冪等性担保

- **WHEN** 移行スクリプトが同一 AWS id + 同一 start_time のイベントを再度処理しようとする
- **THEN** Supabase events を `description ILIKE '%[Legacy ID: <aws_id>@<aws_start_time>]%'` で検索しヒットすれば SKIP し、重複行を作らない

#### Scenario: admin による Legacy ID マーカー編集の許可

- **WHEN** admin ユーザーが events.description から `[Legacy ID: ...]` 文字列を削除する
- **THEN** スキーマ上の制約違反は起きない（マーカー保持は移行スクリプトの冪等性のためだけに必要で、保持の SHALL 要件はない）。ただし削除後は当該行が「Legacy 由来」と機械判定できなくなる

### Requirement: AWS イベント時刻の JST タイムゾーン補正

AWS DynamoDB の `start_time` / `end_time` はタイムゾーン designator を持たない ISO 8601 文字列（例: `2025-10-11T18:00:00`）であるが、High Q 運用上は JST 表記として扱われている。移行スクリプトは Supabase `timestamptz` への保存時に `+09:00` を補って正しい絶対時刻として保存 MUST する。

#### Scenario: TZ designator なしの AWS 時刻を JST として保存

- **WHEN** AWS の `start_time` が `2025-10-11T18:00:00` の形式（末尾に Z / ±HH:MM がない）
- **THEN** Supabase へは `2025-10-11T18:00:00+09:00` として書き込み、JST 18:00 開始の絶対時刻が正しく記録される

#### Scenario: TZ designator ありの AWS 時刻はそのまま使用

- **WHEN** AWS の `start_time` が `2025-10-11T18:00:00+09:00` または `2025-10-11T09:00:00Z` のように TZ designator を持つ
- **THEN** 補正は行わず、そのまま Supabase に保存する

### Requirement: 空 location イベントの移行スキップ

AWS DynamoDB に存在する `location` が空文字（`""`）または欠落のイベントについて、移行スクリプトは venue 解決が不可能なため SKIP し、警告ログを出力 MUST する。

#### Scenario: 空 location イベントの SKIP

- **WHEN** AWS イベントの `location` フィールドが空文字または未定義
- **THEN** スクリプトはそのイベントを INSERT せず、`[event] SKIP (empty location)` ログを出力し、サマリーの「SKIP（空 location）」件数に計上する

### Requirement: approved 対照表における `skip` アクションのサポート

`correspondence-venues-approved.md` の判定欄に `skip` を指定された AWS location について、移行スクリプトは当該 location を持つ全 AWS イベントを移行対象から除外 MUST する。これは「LP に表示すべきでないイベント（テスト用・運営内部用など）を移行時点で機械的に除外する」運用に用いる。

#### Scenario: skip 指定 location のイベントが除外される

- **WHEN** approved の行に `判定 = skip` の location が記載され、AWS にその location を持つイベントが存在する
- **THEN** 当該イベントは INSERT されず、`[event] SKIP (approved skip)` ログが出力され、サマリーの「SKIP（approved skip）」件数に計上される

### Requirement: 複数 AWS location の同一 venue への統合

`correspondence-venues-approved.md` で複数の AWS location が同じ `new` venue 名を指定された場合、移行スクリプトはそれら location を **同一の venue 行**として 1 度だけ INSERT し、すべての AWS location が同じ `venue_id` を共有 MUST する。これは「同じ会場の表記揺れを 1 つの venue に寄せる」用途や「駅集合のように場所を秘匿しつつ複数表記を統合する」用途で用いる。

#### Scenario: 異なる AWS location が同じ新規 venue に統合される

- **WHEN** approved に複数の `new` 行があり、いずれも同じ「Supabase venue 候補」名（例: `有明会場`）を指す
- **THEN** スクリプトは `venues` テーブルに 1 行だけ INSERT し、それら全ての AWS location のイベントは同一の `venue_id` を持つ events 行として書き込まれる
