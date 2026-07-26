## Context

`public.event_availability_view` は「RLS で自分の予約しか見えない `reservations` を、所有者権限（definer）で全件集計し、`event_id`/`capacity`/`reserved_count` の3列のみ返す」DTO。LP（anon）と reservation（authenticated）が PostgREST 経由で `.from()` して残席を出している。個人情報は構造的に非露出で実害は無いが、Supabase Advisor は definer view を一律 Critical 判定する。放置による**アラート疲れ**を避けるため、集計挙動を保ったまま definer view を消す。

現状:
- `event_availability_view` だけが `security_invoker = false`（他の view は全て true）。
- 参照は LP `availabilityQueries.ts`、reservation `myReservations.ts` / `myReservation.ts` の3箇所（いずれも `select("event_id, capacity, reserved_count").in("event_id", ids)`）。
- 既存に definer 関数の先例あり: `get_event_participant_nicknames`（`SECURITY DEFINER` + `set search_path = public`、`.rpc()` 呼び出し）。

## Goals / Non-Goals

**Goals:**
- Advisor の `event_availability_view` SECURITY DEFINER Critical を解消する
- 残席の集計挙動・返却列・セキュリティ姿勢を変更前と同値に保つ
- 破壊的 DB 変更（view DROP）を live 環境で安全にロールアウトする

**Non-Goals:**
- admin view / `reservations` RLS / 集計ロジックの変更
- 非正規化（トリガでカウント列を維持する案 B）の採用
- 残席以外の機能変更

## Decisions

### D1: private view は作らず「関数のみ」に集約する
- B2 のスケッチは「private スキーマへ view 退避 + 公開関数」だったが、関数が同じ集計 SQL を内包すれば **private view は不要**。オブジェクトを増やさず表面積を最小化するため、`get_event_availability` 関数のみとし、`event_availability_view` は DROP する。
- **代替案**: private view + 関数 → 冗長。view 反転 → 機能破壊（anon が集計取得不可・会員が自分分のみ）で却下。

### D2: `SECURITY DEFINER` + `search_path` 固定関数として定義する
- `public.get_event_availability(p_event_ids uuid[])` を `language sql` / `security definer` / `set search_path = public` で定義。全オブジェクトをスキーマ修飾（`public.events` / `public.reservations`）。既存 `get_event_participant_nicknames` の規約に準拠。
- `set search_path` を固定するため Advisor の `function_search_path_mutable`（warn）も踏まない。
- 権限: `revoke all ... from public` の上で `grant execute ... to anon, authenticated`。service_role は既定で実行可。
- **なぜ definer が必要か**: 集計対象の `reservations` は RLS で「自分の予約のみ」。全件集計には所有者権限が要る。返却列は集計のみで個人情報を含まないため、view と同じく漏洩リスクは構造的に無い。

### D3: 返却は view と同値（events 全件 LEFT JOIN、要求 id で絞り込み）
```
returns table (event_id uuid, capacity int, reserved_count int)
  select e.id, e.capacity::int,
         coalesce(sum(1 + r.guest_count)
           filter (where r.status in ('reserved','attended')), 0)::int
  from public.events e
  left join public.reservations r on r.event_id = e.id
  where e.id = any(p_event_ids)
  group by e.id, e.capacity
```
- 予約0件イベントも `reserved_count = 0` の行で返る（LEFT JOIN + coalesce）。既存 view の LATERAL と同値。
- view は「events 全行」を返す契約だったが、呼び出し側は常に `in(ids)` で絞っていたため、関数は `p_event_ids` 引数で受ける（過剰スキャン削減、挙動は呼び出し側から見て同一）。
- **代替案**: 引数なしで全 events 返す → 呼び出し側が毎回全件取得しクライアント側で絞る現状を温存できるが、非効率。ids 引数化が素直。

### D4: ロールアウト順序 — 1 PR + 短窓許容（推奨）／2 PR ゼロ窓
- 本プロジェクトは「PR merge → Render がアプリ自動デプロイ」「prd migration は承認ゲート付き CI job で別途適用」。両者は**同時ではない**ため、view DROP と `.rpc()` 化アプリのデプロイの間に**短い不整合窓**が生じうる。
- **推奨（1 PR）**: 関数追加 + view DROP + アプリ3箇所 `.rpc()` 化を1 PR。merge 後、prd migration 承認を**デプロイ直後に速やかに実行**して窓を最小化。低トラフィック（週末サークル運営規模）かつ残席は非クリティカル表示のため許容。
- 窓の劣化を無害化するため **D5** を同梱（両アプリとも残席取得失敗で error UI を出さず空表示に劣化）。
- **代替案（2 PR・ゼロ窓）**: PR-A で関数追加 + アプリ `.rpc()` 化（view 残置＝Critical 一時残存）→ prd 確認 → PR-B で view DROP（Critical 解消）。窓ゼロだが Critical 解消が2 PR 後になる。ship 時に翔太郎くんが選べるよう両案を残す。

### D5: 残席取得は両アプリとも「失敗時 graceful」に統一
- reservation 側は既に失敗時 空 Map で握りつぶし（残席 null 表示）。LP `availabilityQueries.ts` は現状 `throw` するため、**空 Map 返却に変更**。これによりロールアウト窓や一時的な RPC 失敗でも「残席が出ないだけ」で error 画面にならない。
- **代替案**: LP は throw のまま → 窓中に残席セクションが error 表示。UX 劣化のため却下。

## Risks / Trade-offs

- **[view DROP のデプロイ窓でアプリが一時的に残席取得失敗]** → D5 の graceful 化で error UI を回避（残席非表示に留める）。承認ゲートを即時実行して窓を最小化。ゼロ窓が必須なら D4 の2 PR 案。
- **[関数の返却型が view と微妙にズレてアプリが壊れる]** → `capacity::int`（既存 view は smallint、アプリは `number|null` 期待で互換）、`reserved_count::int`。返却列名・順序を view と一致させ、data-schema の既存シナリオ（reserved_count = 11 / 14 / 16 / 8）で同値検証。
- **[関数化で Advisor 別 lint（search_path）を踏む]** → `set search_path = public` 固定で回避。
- **[RLS 緩和と誤解される]** → `reservations` RLS も admin view も一切触らない。会員の直接 `SELECT * FROM reservations` は従来どおり自分分のみ。
- **[LP 実装ルール（LP は #310 まで機械検知対象外）]** → 変更は最小（`.from`→`.rpc` + graceful）。既存テストを追随。

## Migration Plan

1. migration: `public.get_event_availability(uuid[])` を定義（definer / search_path=public / grant execute to anon, authenticated）。同 migration で `drop view if exists public.event_availability_view;`。
2. dev 適用 → data-schema の既存シナリオ値（11 / 14 / 16 / 8、予約0件=0行、列は3列のみ）を `supabase db query --linked` で検証。`verify_grants.sql` 相当で関数 execute 権限を確認。
3. アプリ3箇所を `.rpc("get_event_availability", { p_event_ids: ids })` に切替 + LP graceful 化。各 spec を追随。
4. dev で LP / reservation の残席表示が同値であることを確認。
5. ロールアウト（D4 推奨: 1 PR）。merge → デプロイ → prd migration 承認を速やかに実行。
6. prd で Advisor を再実行し Critical 解消を確認。残席表示を確認。
- **ロールバック**: 関数を DROP し `event_availability_view` を旧定義（`security_invoker=false` + grant select to anon/authenticated）で再作成する SQL を migration 末尾コメントに記載。アプリは view 参照へ revert（前タグ）。

## Open Questions

- ship を **1 PR（短窓許容）** と **2 PR（ゼロ窓）** のどちらで行うか → 承認時に翔太郎くんへ確認（推奨は 1 PR + graceful）。
- 関数の SQL テストを pgTAP 等で恒久化するか、data-schema シナリオの手動検証に留めるか → apply 時に既存 `supabase/tests` の流儀へ合わせる。
