## ADDED Requirements

### Requirement: get_event_availability の実行権限境界

`public.get_event_availability(p_event_ids uuid[])` 関数は `SECURITY DEFINER` モードで定義され、`search_path` を `public` に固定する MUST。関数所有者（postgres ロール）の権限で `reservations` を全件集計し、当該イベントの予約埋まり具合の集計のみを返す。本関数は個人情報を含まない集計のみを返すため、未認証ユーザー（anon）を含む全ロールに実行を許可する。

権限設定:

- `revoke all on function public.get_event_availability(uuid[]) from public` — 既定を最小化
- `grant execute on function public.get_event_availability(uuid[]) to anon` — 未認証ユーザー（LP 来訪者）も集計を取得可
- `grant execute on function public.get_event_availability(uuid[]) to authenticated` — 認証済ユーザーは取得可

関数が返す列は集計 (`event_id`, `capacity`, `reserved_count`) のみで、個別予約行・予約者 ID 等の個人情報を含まない MUST。これにより `SECURITY DEFINER` でも個人情報漏洩リスクを構造的に排除する。anon への公開は本「個人情報を含まない集計のみ」という不変条件に依存する MUST であり、本関数に個人情報に当たる列を追加してはならない MUST NOT。

`reservations` テーブルの既存 SELECT RLS（`auth.uid() = member_id OR is_admin()`）は本変更で **改変 SHALL NOT**。会員ロールからの直接 SELECT は引き続き自分の予約のみが返る。全件集計を得る経路は `get_event_availability` 関数のみに集約する MUST。

#### Scenario: anon は get_event_availability から集計を取得できる
- **WHEN** anon JWT で `get_event_availability(array[...])` を呼び出す
- **THEN** 各イベントの集計（定員・予約数）が返り、個別予約行・予約者 ID は含まれない

#### Scenario: 会員ロールでの呼び出しが全件集計を返す
- **WHEN** AAL2 の `role = 'member'` ユーザーが `get_event_availability` を呼び出す
- **THEN** 当該会員以外の予約も含めた全件集計が返る（関数が `SECURITY DEFINER` であるため）

#### Scenario: admin ロールでの呼び出しも全件集計を返す
- **WHEN** AAL2 の `is_admin() = true` ユーザーが `get_event_availability` を呼び出す
- **THEN** 全件集計が返る（admin で呼んでも会員で呼んでも同じ結果）

#### Scenario: reservations の直接 SELECT 経路は会員自身分のみ
- **WHEN** 会員ロールで `SELECT * FROM reservations`
- **THEN** 自分の予約のみが返る（既存 RLS 維持。関数公開によって直接アクセス経路は緩和されていない）

### Requirement: get_event_availability の呼び出し契約

`get_event_availability` は `apps/reservation`・`apps/lp` から `.rpc()` で呼び出される MUST 契約とする。`apps/lp` は未認証（anon）の来訪者に対し当該イベントの残席表現（募集中の残席数・満員）を出すために本関数を呼び出してよい。anon に公開してよいのは個人情報を含まない集計（`event_id`, `capacity`, `reserved_count`）に限る MUST であり、待ち人数・予約者 ID・ニックネーム等を anon に返してはならない MUST NOT。

#### Scenario: LP からの呼び出しは集計のみ
- **WHEN** `apps/lp` 配下のソースで `get_event_availability` を呼び出す
- **THEN** 取得列は `event_id`, `capacity`, `reserved_count` の集計のみであり、個人情報列を含まない

## REMOVED Requirements

### Requirement: event_availability_view の RLS と権限

**Reason**: definer view を関数化するため、権限境界は view の SELECT grant から関数の execute grant へ移る。集計挙動・非露出の不変条件は維持。
**Migration**: `grant select on public.event_availability_view to anon/authenticated` を廃し、`grant execute on function public.get_event_availability(uuid[]) to anon, authenticated` へ置換（ADDED: `get_event_availability の実行権限境界`）。

### Requirement: event_availability_view の呼び出し契約

**Reason**: 呼び出し経路が PostgREST の view SELECT から RPC 関数呼び出しへ変わる。
**Migration**: `event_availability_view` を `.from()` する契約を `get_event_availability` を `.rpc()` する契約へ置換（ADDED: `get_event_availability の呼び出し契約`）。admin アプリは本集計を使用しないため呼び出し元から除外する。
