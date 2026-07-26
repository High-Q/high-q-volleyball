# lp-calendar Specification

## Purpose

LP（ランディングページ）のイベント表示（HERO 直下の次回開催ストリップとイベント一覧）が、Supabase から取得したイベント・回号(vol)・残席集計をどう表示するかを定義する。取得条件・並び順、Loading / Empty / Error / Success の 4 状態、回号表現、残席表現（募集中・満員・無制限）と取得失敗時のグレースフル劣化を規定する。

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

### Requirement: イベントに残席表現を表示する

LP のイベント表示は、各イベントに予約サイトと統一した残席表現を表示しなければならない（SHALL）。対象はイベント一覧と、HERO 直下の次回開催ストリップ（直近イベントを1件出す帯）の両方とする（SHALL）。残席は `get_event_availability` が返す集計（定員 `capacity` と予約数 `reserved_count`）のみから算出し、予約者の個人情報（個人名・予約者の特定）・待ち人数を表示してはならない（MUST NOT）。文言・トーンは予約サイトの残席表現規則に完全準拠する（MUST）— すなわち募集中は「あと N 名 募集」、満員は「満員」、定員無制限は「N 名 予約中」とし、「席」表記は使わない。LP 固有の表現分岐を設けてはならない（MUST NOT）。

#### Scenario: 募集中の残席数が表示される
- **WHEN** 定員が設定されたイベントで予約数が定員未満
- **THEN** 残り人数（定員 − 予約数）が「あと N 名 募集」として表示される

#### Scenario: 満員が表示される
- **WHEN** 予約数が定員以上
- **THEN** 「満員」が表示される

#### Scenario: 次回開催ストリップにも残席が表示される
- **WHEN** HERO 直下の次回開催ストリップが直近イベントを表示している
- **THEN** 当該イベントの残席表現が一覧と同じ規則・文言で表示される

#### Scenario: 定員無制限のイベントは予約人数が表示される
- **WHEN** 定員が未設定（無制限）のイベントが一覧に表示される
- **THEN** 予約人数が「N 名 予約中」として表示される（予約者の個人情報は含まない）

### Requirement: 満員イベントの遷移と CTA

満員イベントでも、予約サイト（キャンセル待ち登録が可能）への遷移は維持しなければならない（SHALL）。満員時の CTA 文言は、キャンセル待ちに向かうことが分かる表現でなければならず（SHALL）、空きがあるかのような誤解を与えてはならない（MUST NOT）。

#### Scenario: 満員イベントの CTA はキャンセル待ちへ誘導する
- **WHEN** 満員イベントの CTA が表示される
- **THEN** CTA 文言はキャンセル待ちへ向かうことを示し、押下すると当該イベントの予約サイトへ遷移する

### Requirement: 残席取得失敗時のグレースフル劣化

残席集計の取得が失敗したイベントは、残席表現を伏せてイベント本体を通常どおり表示しなければならない（SHALL）。残席の欠如を理由に一覧全体を Error 状態にしてはならない（MUST NOT）。

#### Scenario: 残席取得が失敗してもイベントは表示される
- **WHEN** 残席集計の取得が失敗する
- **THEN** 当該イベントは残席表現なしで表示され、一覧は Error 状態にならない

#### Scenario: イベント取得自体の失敗は従来どおり Error
- **WHEN** イベント本体の取得（events テーブル）が失敗する
- **THEN** 既存の Error 状態（カレンダー非表示・エラー表示）が維持される

