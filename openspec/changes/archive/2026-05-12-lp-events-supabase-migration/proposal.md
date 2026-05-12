## Why

LP (`apps/lp`) のイベント一覧はいまだに AWS API Gateway + DynamoDB から取得しており、admin / reservation が参照する Supabase `events` テーブルと**二重のデータソース**になっている。LP 刷新 (#160) で reservation サイトへの deep-link を組む際にもイベント識別子の整合性が必要になるため、本切替を #160 の前提条件として先行整備する。

## What Changes

- LP のイベント取得経路を AWS API Gateway から Supabase `events` テーブル直結へ切替える
- LP にも admin / reservation と同様の Supabase クライアントを配置し、3 アプリで**単一の真実の源**を共有する
- LP に表示するのは**未来イベントのみ**（直近開催日から昇順）に絞り込む。過去イベントは LP では表示しない方針を明文化する
- 公開向けに `visibility = 'published'` の行のみを返すフィルタを query 側で明示する（RLS 上は anon が全件取得可能でも、UI 契約として draft / private を出さない）
- LP のテストを「`global.fetch` モック」から「Supabase クライアントモック」へ書き換え、Loading / Empty / Error / Success の 4 状態を担保する
- AWS API Gateway 向けの Vite dev proxy 設定 (`/api/event` リライト) を撤去する
- **BREAKING**: なし（外部仕様は維持。`eventQueryOptions.list().queryFn()` の返り値の shape は現状の `{ id, name, start, end, location }` を保つ）

### スコープ外

- LP の UI 刷新（#160 で扱う）
- AWS DynamoDB のデータを Supabase へ移行する作業（別 Issue D）
- AWS API Gateway / Lambda / DynamoDB の停止判断（移行完了後の運用判断）
- reservation 側 deep-link 入口（分割 Issue C）

## Capabilities

### New Capabilities

- なし

### Modified Capabilities

- `lp-fsd-structure`: LP に `shared/api/` レイヤーを正式に導入し、Supabase クライアントをここに置く方針を Requirement として追加する
- `lp-calendar`: イベント取得経路を「AWS API Gateway」から「Supabase `events` テーブル」へ差し替え、`visibility = 'published'` フィルタと未来イベント絞り込みの契約を Requirement として更新する

## Impact

- **コード**: `apps/lp/src/entities/event/api/eventQueries.js` と同 spec、`apps/lp/src/shared/api/`（新設）、`apps/lp/vite.config.js`（proxy 撤去）、`apps/lp/package.json`（`@high-q/shared` workspace 依存追加）
- **環境変数**: LP の dev / prd Render サービスに `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` を設定（admin / reservation と同じ値）。※ Issue 文中の `VITE_SUPABASE_ANON_KEY` 表記は旧形式、現プロジェクト規約に合わせ `VITE_SUPABASE_PUBLISHABLE_KEY` に統一する
- **DB**: 既存 `events` テーブルの RLS は変更なし（anon は select 可能と確認済み）。本 change で migration は発生しない
- **依存**: `@high-q/shared`（既に admin / reservation で使用中）を LP の `dependencies` に追加。Supabase クライアント自体は `@high-q/shared` 経由で取得するため LP の直接依存追加は不要
- **ドキュメント**: `docs/03-アーキテクチャ` 配下に LP も Supabase を参照する旨を反映（sync フェーズ）
