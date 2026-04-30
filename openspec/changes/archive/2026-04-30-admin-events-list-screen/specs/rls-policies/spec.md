# rls-policies Spec Delta — admin-events-list-screen

## ADDED Requirements

### Requirement: event_list_view の RLS

`event_list_view` ビューは、PostgreSQL の view security barrier として機能し、参照される events / venues / reservations 各テーブルの既存 RLS ポリシーを継承する MUST。さらに、本 view は `SECURITY INVOKER` で作成し、呼び出し元（admin の Supabase セッション）の権限で評価される。

events.SELECT は anon でも許可されているため、view 自体に明示的な RLS ポリシーは不要だが、admin 用の集計 view であることを明確化するため、SELECT 権限を `authenticated` ロールに対してのみ GRANT する SHALL（anon ロールから view を SELECT できないようにする）。

実運用での閲覧者は admin のみ（クライアントから呼び出すのは admin アプリ）だが、本 view 自体に admin 限定 RLS ポリシーを追加するかは「reservations の SELECT が admin 限定であるため、reserved_count を含む view を非 admin が呼んでも reservations の COUNT が漏れる」かどうかで判断する。reservations の SELECT は既存仕様で「自分の予約のみ可。admin は全件可」なので、view を `SECURITY INVOKER` で作るとき、非 admin が呼ぶと自分の予約分しか reserved_count に算入されない（情報漏洩はないが、誤った値が返る）。これを避けるため、本 view は `is_admin()` 判定でフィルタする WHERE 句を持たず、代わりに admin アプリでのみ呼び出す前提を契約として明文化し、非 admin が誤って呼んだ場合の影響範囲は「reserved_count が 0 または自分の分のみ」である点を仕様として残す。

#### Scenario: anon ロールは event_list_view を SELECT できない

- **WHEN** anon JWT で `SELECT * FROM event_list_view`
- **THEN** GRANT 不在により権限エラー、または 0 行が返る

#### Scenario: authenticated ロールは event_list_view を SELECT できる

- **WHEN** AAL2 admin が `SELECT * FROM event_list_view`
- **THEN** events × venues × reservations 集計の結果が返る

#### Scenario: 非 admin authenticated の reserved_count

- **WHEN** AAL2 だが `role = 'member'` のユーザーが `SELECT id, reserved_count FROM event_list_view`
- **THEN** events 行は anon と同等に全件返るが、reserved_count はその member 自身の予約分のみが COUNT される（仕様上の制約。クライアント側で当該ロールから呼ばないことを契約）

### Requirement: event_list_view への admin アプリからの呼び出し契約

`event_list_view` は admin アプリ（`apps/admin`）からのみ呼び出される MUST 契約とする。LP / reservation アプリ・anon ユーザーは本 view を呼び出してはならない。本契約の遵守は仕様上の責務であり、技術的には GRANT で anon を排除する。

#### Scenario: 呼び出し元の限定

- **WHEN** `apps/admin` 以外のソースで `event_list_view` を SELECT する import / SQL が含まれていないか grep する
- **THEN** マッチが 0 件である
