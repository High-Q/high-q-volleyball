# AWS → Supabase イベント移行マッピング

## AWS 側スキーマ（既存 LP の `eventQueries.js` から確認できる範囲）

エンドポイント: `https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event`
レスポンス：`{ body: <JSON string> }` を JSON.parse して以下フィールドを含む配列。

| AWS フィールド | 型 | 備考 |
|---|---|---|
| `id` | string | DynamoDB のレコード ID |
| `title` | string | イベント名 |
| `start_time` | ISO 8601 string | 開始日時 |
| `end_time` | ISO 8601 string | 終了日時 |
| `location` | string（フリーテキスト） | 会場名のフリーテキスト（venues 正規化なし） |

※ description / fee / capacity / visibility / status 等の属性は AWS 側に存在しない見込み。移行スクリプト実行時に dev で実データ取得して最終確認する（tasks 2.3）。

## Supabase 側スキーマ（`openspec/specs/data-schema/spec.md` から）

`events` テーブル必須列：
- `id` (UUID PK)
- `name` (text NOT NULL)
- `description` (text NULL)
- `start_at` (timestamptz NOT NULL)
- `end_at` (timestamptz NOT NULL)
- `venue_id` (uuid NOT NULL references venues(id))
- `fee` (integer NULL) — NULL は会場 default_fee を継承
- `capacity` (smallint NULL)
- `visibility` (text in `draft`/`published`/`private`、default `draft`)
- `status` (text in `scheduled`/`cancelled`/`closed`、default `scheduled`)
- `cancel_deadline` (timestamptz NULL)
- `created_at` / `updated_at` (timestamptz)
- `created_by` (uuid references auth.users)

## マッピング表

| AWS フィールド | Supabase フィールド | 変換ルール |
|---|---|---|
| `id` | `description` に追記 `[Legacy ID: <id>]` | 専用カラム新設は本 change では行わない。冪等性のために移行スクリプト側で「description に同一の Legacy ID 文字列を含む行」を再投入時にスキップする |
| `title` | `name` | そのままコピー |
| `start_time` | `start_at` | ISO 8601 のまま、Supabase の timestamptz として保存。タイムゾーンが UTC でない場合は dev 移行で要確認 |
| `end_time` | `end_at` | 同上 |
| `location` | `venue_id` | 別途 venues テーブルとの解決が必要。下記「venue 解決」参照 |
| なし | `visibility` | 過去イベントは `published`（公開済み）、未来イベントも `published` で取り込む（admin が必要なら手動で `private`/`draft` に） |
| なし | `status` | 過去イベント（now() より前の end_at）は `closed`、未来は `scheduled` |
| なし | `description` | Legacy ID 注記のみ。本文は空文字 |
| なし | `fee` | NULL（会場 default_fee を継承） |
| なし | `capacity` | NULL（無制限扱い） |
| なし | `cancel_deadline` | NULL |
| なし | `created_by` | NULL（auth.users への参照なし） |

### venue 解決ルール（AWS `location` → Supabase `venue_id`）

1. 移行スクリプト実行時、AWS から取得した全イベントの `location` 文字列のユニーク集合を作る
2. 各 location について Supabase `venues.name` で完全一致検索
3. 一致するなら `venue_id` に解決する
4. 一致しないなら、`venues` に新規行を INSERT（`name = <AWS location>`、その他は最小限のデフォルト）して、新しい `venue_id` を取得する
5. 一致しない venue を作る場合の最小デフォルト値は `venues` テーブル仕様（別 spec 参照）に従う。NOT NULL 列が必須なら、`address` 等は `'(unknown)'` などのプレースホルダーで埋める。dev 移行で要確認

### 冪等性

- 移行スクリプトは `description` に埋めた `[Legacy ID: <id>]` を見て、既に Supabase 側に存在するかを判定する
- 存在すれば SKIP、存在しなければ INSERT
- これにより複数回実行しても重複しない

## dev 移行で最終確認するポイント（tasks 2.3 で実施）

- AWS から取得できる実データのフィールド一覧（上記推測と一致するか）
- タイムゾーン表現（`start_time` / `end_time` が UTC か JST か）
- ユニーク `location` 文字列の件数と内容
- venues テーブルの NOT NULL 必須列（address 等）の取扱い
- 過去/未来の境界判定での status 振り分けの妥当性

## Open Question

- description に Legacy ID を埋める方式は admin / reservation の UI 表示に影響しないか（小さな文字列なので大きな問題はないと予想）
- 本変更のスコープが「LP 用」ではあるものの、`venues` テーブルへの行追加は admin / reservation の選択肢に影響する。事前に翔太郎くんと内容確認をする方が安全
