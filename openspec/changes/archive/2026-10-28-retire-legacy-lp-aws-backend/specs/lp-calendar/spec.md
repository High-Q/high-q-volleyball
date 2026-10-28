# lp-calendar Specification (delta)

## MODIFIED Requirements

### Requirement: APIからイベントを取得してカレンダーに表示する

Supabase `events` テーブルからイベント一覧を取得し、カレンダー上に表示しなければならない（SHALL）。データ取得には TanStack Query を使用しなければならない（SHALL）。LP が画面に出すのは `visibility = 'published'` かつ `start_at >= now()` の未来イベントのみとし、絞り込みは Supabase 側のクエリで明示しなければならない（MUST）。並び順は `start_at` の昇順（直近順）でなければならない（SHALL）。`venues` テーブルとの結合により、各イベントには会場名を `location` 文字列として付与しなければならない（SHALL）。

LP / events のデータ経路は Supabase 単一でなければならない（MUST）。レガシー LP イベント取得バックエンド（AWS API Gateway + Lambda + DynamoDB + 実行用 IAM role）は、コード上の参照が撤去されているだけでなく、AWS アカウント上の実体も退役されていなければならない（SHALL）。

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

#### Scenario: レガシー AWS バックエンドが実体として退役されている

- **WHEN** AWS アカウント（`ap-northeast-1`）でレガシー LP イベント取得スタックの構成リソース（API Gateway / Lambda / DynamoDB テーブル / 実行用 IAM role）の存在を確認する
- **THEN** いずれのリソースも存在しない（Python 3.10 ランタイムの Lambda はアカウントから消滅している）
