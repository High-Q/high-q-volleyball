# lp-calendar Specification

## Purpose

LP のイベント告知（次回開催の取得と 4 状態表示、および表示要素）を規定する。
## Requirements
### Requirement: イベント取得中にローディング状態が表示される

イベントデータの取得中、カレンダー領域にスケルトンローダーが表示されなければならない（SHALL）。

#### Scenario: API レスポンス待機中のローディング表示

- **WHEN** ページ読み込み直後で API レスポンスがまだ返っていない場合
- **THEN** カレンダー領域に `v-skeleton-loader` が表示される

### Requirement: イベントが0件のとき空状態が表示される

API からイベントが1件も返されなかった場合、「予定されているイベントはありません」というメッセージが表示されなければならない（SHALL）。

#### Scenario: 空のイベントリスト

- **WHEN** API が空配列を返した場合
- **THEN** カレンダーの代わりに空状態メッセージが表示される

### Requirement: API エラー時にエラー状態が表示される

Supabase からのデータ取得が失敗した場合、ユーザーにエラーメッセージが表示されなければならない（SHALL）。カレンダーは表示されない（SHALL）。エラーを空配列で握り潰してはならない（MUST NOT）— Loading / Empty / Error の 3 状態は厳密に区別する。

#### Scenario: Supabase 通信エラー

- **WHEN** Supabase クライアントが `error` を返す、または HTTP 5xx を受け取った場合
- **THEN** `v-alert type="error"` でエラーメッセージが表示され、カレンダーは表示されない

#### Scenario: Empty と Error が区別される

- **WHEN** Supabase が 0 件の `data` を返した場合
- **THEN** Empty 状態（"予定されているイベントはありません"）が表示され、Error 状態（`v-alert`）は表示されない

### Requirement: APIからイベントを取得してカレンダーに表示する

Supabase `events` テーブルからイベント一覧を取得し、カレンダー上に表示しなければならない（SHALL）。データ取得には TanStack Query を使用しなければならない（SHALL）。LP が画面に出すのは `visibility = 'published'` かつ `start_at >= now()` の未来イベントのみとし、絞り込みは Supabase 側のクエリで明示しなければならない（MUST）。並び順は `start_at` の昇順（直近順）でなければならない（SHALL）。`venues` テーブルとの結合により、各イベントには会場名を `location` 文字列として付与しなければならない（SHALL）。

#### Scenario: イベントがカレンダー上に表示される

- **WHEN** Supabase から1件以上の `visibility = 'published'` の未来イベントが返る
- **THEN** 各イベントが対応する日付のカレンダーセル上に表示される

#### Scenario: 公開フィルタが Supabase クエリで明示される

- **WHEN** LP のイベント取得クエリが発行される
- **THEN** `visibility = 'published'` の等価フィルタと `start_at >= now()` の範囲フィルタが Supabase 側で評価され、draft / private や過去イベントはクライアントに送られない

#### Scenario: 会場名が `location` として供給される

- **WHEN** Supabase からイベントが返る
- **THEN** 各イベントの `location` は `events.venue_id` が参照する `venues.name` の値である（venue が NULL の理論上のケースでは空文字列）

#### Scenario: AWS API Gateway 経路が残らない

- **WHEN** `apps/lp/` 配下に対し `ptfomh71x9.execute-api` または `/api/event` を grep する
- **THEN** マッチが 0 件である（Vite proxy 設定と URL ハードコードがいずれも撤去されている）

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

