## Why

Supabase Advisor が `public.event_availability_view` を **SECURITY DEFINER view（Critical）** として検知している。この view は「RLS 制限された `reservations` を全件集計しつつ、返す列は集計3列のみで個人情報を含まない」という意図的な設計だが、Advisor はこのニュアンスを見ずに一律 Critical にする。**実害は無いものの、未解消の Critical を放置するとアラート疲れ（狼少年化）で本物の重大アラートを見逃す運用リスク**があるため、機能を壊さずに Advisor を緑にする。

## What Changes

| 観点 | 変更前 | 変更後 |
|------|--------|--------|
| 残席集計の提供 | `SECURITY DEFINER` の `event_availability_view`（PostgREST で `.from()`） | `search_path` 固定の `SECURITY DEFINER` **関数** `get_event_availability(ids)`（`.rpc()`） |
| Advisor | definer view = Critical（未解消） | definer view 消滅 → Critical 解消（関数は search_path 固定で lint 対象外） |
| 集計挙動 | 全件ライブ集計 / 集計3列のみ | **同一**（全件ライブ集計 / `event_id`・`capacity`・`reserved_count` のみ） |
| anon / 会員の残席表示 | view 経由 | 関数経由（挙動同値） |
| セキュリティ姿勢 | 個人情報非露出 | **同一**（個人情報非露出・全件集計を definer で実行） |

- `public.get_event_availability(p_event_ids uuid[])` を **`SECURITY DEFINER` + `set search_path = public`** で新設し、`event_id` / `capacity` / `reserved_count` のみを返す（既存 view と同一の集計ロジック）
- `anon` / `authenticated` に `execute` を付与、`public` からは `revoke`
- LP / reservation の残席取得 3 箇所を `.from("event_availability_view")` → `.rpc("get_event_availability", …)` に切替
- `public.event_availability_view` を **DROP**（これが Critical を解消する本体）**BREAKING**（PostgREST 経路の破壊的変更 → デプロイ順序を design で管理）
- ロールアウト窓での劣化を無害化するため、LP の残席取得を「失敗時は空 Map で握りつぶし」に統一（現在は throw）

## Capabilities

### New Capabilities
（なし）

### Modified Capabilities
- `data-schema`: `event_availability_view ビュー` 要件を「view」から「`get_event_availability` 関数（RPC）」ベースへ改める（集計仕様・返却列は不変）。
- `rls-policies`: `event_availability_view の RLS と権限` / `event_availability_view の呼び出し契約` 要件を、関数の `execute` 権限境界・呼び出し契約へ改める。

## Impact

### 影響するコンポーネント・ファイル
- `supabase/migrations/`: `get_event_availability` 関数の新設（definer + search_path 固定 + grant execute）、`event_availability_view` の DROP
- `apps/lp/src/entities/event/api/availabilityQueries.ts`（+ spec）: `.rpc()` 化・失敗時 graceful 化
- `apps/reservation/src/entities/reservation/api/myReservations.ts`（+ spec）: `.rpc()` 化
- `apps/reservation/src/entities/reservation/api/myReservation.ts`（+ spec）: `.rpc()` 化
- 型・コメント参照（`event.types.ts` 等）: view 名参照コメントの追随（機能変更なし）
- `openspec/specs/lp-calendar/spec.md`: 残席の出所を view 名で記述している箇所を sync 時に関数名へ追随（要件の規範内容＝表示ルールは不変）

### 影響しない範囲（Non-Goals）
- admin 用 `event_list_view` / `event_detail_view`（`SECURITY INVOKER`）は **改変しない**
- `reservations` の既存 SELECT RLS（自分の予約のみ）は **改変しない**
- 残席の集計ロジック（`SUM(1 + guest_count) FILTER (status IN ('reserved','attended'))`、cancelled 除外）は **不変**
- 非正規化（events へのカウント列追加・トリガ方式 = 案 B）は今回採らない

## 制約・前提条件
- **live 稼働中**: LP / reservation は本番稼働。破壊的 DB 変更（view DROP）を含むため、prd migration 適用（承認ゲート付き CI）と Render デプロイの**順序**を design で管理する
- definer 関数は `set search_path = public` を必須とし、全オブジェクトをスキーマ修飾する（既存 `get_event_participant_nicknames` に準拠）
- `service_role` のクライアント露出禁止・関数 grant は最小権限（`anon` / `authenticated` のみ execute）

## 成功基準
- [ ] Supabase Advisor から `event_availability_view` の SECURITY DEFINER Critical が消える
- [ ] LP（anon）と会員画面（authenticated）の残席表示が変更前と同値（全件集計）で表示される
- [ ] 関数は `event_id` / `capacity` / `reserved_count` のみを返し、個人情報列を含まない
- [ ] admin view・`reservations` RLS・集計ロジックが不変であることを確認
- [ ] ロールアウト窓で残席取得が失敗しても、両アプリが error UI を出さず graceful に劣化する
