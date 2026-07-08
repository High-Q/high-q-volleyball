## ADDED Requirements

### Requirement: 一覧に回号 vol を表示する

`/events` 一覧の各イベント行は、`event_list_view.vol`（回号）が非 NULL のとき `vol.NN` 形式で表示する SHALL。`vol` が NULL（未採番）のときは回号を表示しない MUST。回号は `EventListRow.vol` を直接用い、`name` 文字列からパースしてはならない MUST NOT。表示はデスクトップ DataTable・モバイルカードの両方で行い、色・書体は HQ デザイントークン utility 経由とする MUST。

#### Scenario: 採番済みイベントは vol.NN を表示
- **WHEN** `vol = 74` のイベント行が一覧に描画される
- **THEN** 当該行に `vol.74` が表示される

#### Scenario: 未採番イベントは回号を表示しない
- **WHEN** `vol = null` のイベント行が一覧に描画される
- **THEN** 当該行に回号は表示されない
