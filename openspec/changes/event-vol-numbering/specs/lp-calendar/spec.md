## ADDED Requirements

### Requirement: LP イベントに回号 vol を付与・表示する

LP のイベント取得は `events.vol`（回号）を取得し、各イベントの view-model に `vol`（`number | null`）として付与する SHALL。取得は Supabase クエリの SELECT に `vol` を明示的に含める MUST。回号を `name` 文字列からパースして得てはならない MUST NOT。

LP のイベント表示箇所（Hero 直下の次回開催 NEXT ストリップ・Schedule セクションのイベントカード）は、`vol` が非 NULL のとき回号を `vol.NN` 形式で表示する SHALL。`vol` が NULL（未採番）のときは回号を表示しない MUST。表示色・書体は HQ デザイントークン（`var(--hq-*)`）経由とする MUST。

#### Scenario: vol が SELECT に含まれる
- **WHEN** LP のイベント取得クエリが発行される
- **THEN** SELECT 句に `vol` が含まれ、各イベントの view-model に `vol` が付与される

#### Scenario: 採番済みイベントは vol.NN を表示する
- **WHEN** `vol = 74` のイベントが Schedule カードまたは NEXT ストリップに描画される
- **THEN** 当該箇所に `vol.74` が表示される

#### Scenario: 未採番イベントは回号を表示しない
- **WHEN** `vol = null` のイベントが描画される
- **THEN** 回号は表示されない
