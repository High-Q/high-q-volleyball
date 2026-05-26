# RLS Policies Spec

## Purpose

High Q の Supabase PostgreSQL 全テーブルに対する Row Level Security ポリシーを規定する。`is_admin()` ヘルパー関数を中心に、anon / authenticated / admin の 3 段階で SELECT/INSERT/UPDATE/DELETE を制御する。Storage バケット (identity-documents) のオブジェクトレベル RLS も含む。
## Requirements
### Requirement: 全テーブル RLS 有効化

システムは Phase 1 で作成する全テーブル (events / members / reservations / venues / identity_documents) に加え、本 change で追加する `signup_pending` に対して `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` を適用 MUST する。RLS なしのテーブルが本番に存在することを禁止 SHALL する。

#### Scenario: RLS 有効化の検証
- **WHEN** `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('events','members','reservations','venues','identity_documents','signup_pending')`
- **THEN** すべての行で `relrowsecurity = true` が返る

### Requirement: events の閲覧と編集ポリシー

システムは MUST `events` テーブルに以下のポリシーを適用する:
- SELECT: 誰でも可（`USING (true)`）。LP / Reservation での公開カレンダー表示を許可
- INSERT / UPDATE / DELETE: `auth.jwt() ->> 'role' = 'admin'` または `members.role = 'admin'` を満たすユーザーのみ可

#### Scenario: 公開ユーザーが events を閲覧
- **WHEN** 未認証ユーザー（anon）が `select * from events` を実行
- **THEN** 全 events の行が返る

#### Scenario: 一般会員が events を作成しようとする
- **WHEN** `role = 'member'` のユーザーが `insert into events ...` を実行
- **THEN** RLS 違反で 0 行 INSERT（または明示的なエラー）

#### Scenario: 管理者が events を作成
- **WHEN** `role = 'admin'` のユーザーが events を INSERT
- **THEN** 行が作成される

### Requirement: members の閲覧と編集ポリシー

システムは MUST `members` テーブルに以下のポリシーを適用する:
- SELECT: ログイン中のユーザーは自分の行のみ可。管理者は全件可
- UPDATE: ログイン中のユーザーは自分の行のうち `display_name` / `nickname` / `phone` / `experience_level` / `profile` のみ可（`role` / `admin_note` は変更不可）。管理者は全件・全列可
- INSERT: トリガーから system_role 経由でのみ可（クライアント直接 INSERT を禁止）
- DELETE: 管理者のみ可

本 change で `admin_note` 列が追加されたため、UPDATE WITH CHECK 句で「本人が `admin_note` を変更しようとした場合は拒否」を明示 MUST する。`admin_note` は admin 専用の運営メモであり、本人の閲覧経路（reservation アプリ）では明示的列指定 SELECT で除外する運用ルールを採用 SHALL する。reservation 側の `members` 取得経路（`useAuthSession` / プロフィール取得 / その他 member 行 fetch）は `from('members').select('*')` を使わず、必要列のみを明示列指定 SELECT で取得 MUST する。grep で `from('members').select('*')` の検出件数が 0 件であることを CI / 手動レビューで担保 SHALL する。

#### Scenario: 自分の members 行を取得
- **WHEN** ログイン中の member が `select * from members where id = auth.uid()`
- **THEN** 1 行返る（admin_note も含めて返るが、reservation アプリ側は列指定 SELECT で除外する）

#### Scenario: 他人の members 行を取得
- **WHEN** ログイン中の member が他人の `id` を指定して SELECT
- **THEN** 0 行返る（RLS で除外）

#### Scenario: role の自己昇格を防ぐ
- **WHEN** member が自分の行に `update members set role = 'admin' where id = auth.uid()` を試みる
- **THEN** RLS の UPDATE WITH CHECK 句により `role` 列の変更が拒否される

#### Scenario: 本人による admin_note の更新を拒否
- **WHEN** member が自分の行に `update members set admin_note = '...' where id = auth.uid()` を試みる
- **THEN** RLS の UPDATE WITH CHECK 句により拒否される

#### Scenario: admin による admin_note の更新
- **WHEN** admin が `update members set admin_note = '...' where id = :id` を実行
- **THEN** 1 行更新される（admin の UPDATE 権限は全件・全列）

#### Scenario: 本人 SELECT 経路の列指定
- **WHEN** reservation アプリのコードベースを `grep "from('members').select('\\*')"` で検索
- **THEN** マッチが 0 件である（すべて明示列指定 SELECT に統一されている）

### Requirement: reservations の閲覧と編集ポリシー

システムは MUST `reservations` テーブルに以下のポリシーを適用する:
- SELECT: 自分の予約のみ可。管理者は全件可
- INSERT: 自分の `member_id` を指定する場合のみ可
- UPDATE: 自分の予約のうち `status` が `'reserved'` または `'cancelled'` の範囲に収まる行に対して、本人が編集可能な列 (`status` の `'reserved' ↔ 'cancelled'` 切替 / `guest_count` / `note`) の UPDATE を可とする。`status` を `'attended'` / `'no_show'` / `'waitlist'` 等の管理者専用ステータスへ遷移させることは不可。管理者は全件・全列・全 status へ変更可
- DELETE: 管理者のみ可

`guest_count` / `note` の本人編集を許容するのは、予約詳細画面からの後追い編集動線 (同伴者数・連絡事項の修正) を提供するため。`status` 切替を `'reserved' ↔ 'cancelled'` の範囲に閉じる制約は WITH CHECK 句で担保される MUST。

#### Scenario: 自分の予約を一覧
- **WHEN** ログイン中の member が `select * from reservations where member_id = auth.uid()`
- **THEN** 該当の予約のみ返る

#### Scenario: 他人を予約させようとする
- **WHEN** member が `insert into reservations(event_id, member_id) values (?, '<other-member-id>')`
- **THEN** RLS WITH CHECK で拒否

#### Scenario: 予約をキャンセル
- **WHEN** member が `update reservations set status = 'cancelled' where id = ? and member_id = auth.uid() and status = 'reserved'`
- **THEN** 1 行更新

#### Scenario: 自分の予約の同伴者数を編集
- **WHEN** member が自分の `status='reserved'` 予約に対して `update reservations set guest_count = 1 where id = ? and member_id = auth.uid() and status = 'reserved'`
- **THEN** 1 行更新（本人による後追い編集動線として許容される）

#### Scenario: 自分の予約の連絡事項を編集
- **WHEN** member が自分の `status='reserved'` 予約に対して `update reservations set note = '...' where id = ? and member_id = auth.uid() and status = 'reserved'`
- **THEN** 1 行更新

#### Scenario: 他人の予約の編集試行
- **WHEN** member A が member B の予約に対して `update reservations set guest_count = 5 where id = '<B の予約>'`
- **THEN** RLS により 0 行更新となり、変更は反映されない

#### Scenario: 本人による attended 切替の試行
- **WHEN** member が自分の予約に対して `update reservations set status = 'attended' where id = ? and member_id = auth.uid()`
- **THEN** WITH CHECK 句により拒否される（管理者専用ステータスへの遷移は不可）

#### Scenario: 管理者が attended に更新
- **WHEN** admin が任意の予約の status を `'attended'` に UPDATE
- **THEN** 行が更新される

### Requirement: 管理者判定ヘルパー関数

システムは MUST RLS ポリシー内で繰り返し使用する管理者判定を `is_admin()` SQL 関数として `security definer` で定義する。

#### Scenario: 関数の使用
- **WHEN** ポリシー内で `is_admin()` を呼ぶ
- **THEN** `auth.uid()` の users.role が `'admin'` のとき true、それ以外 false を返す

#### Scenario: 関数の権限
- **WHEN** 任意のロールから `is_admin()` を実行
- **THEN** SECURITY DEFINER により所有者権限で members を読めるが、他のテーブルへの副作用はない

### Requirement: venues の閲覧と編集ポリシー

システムは `venues` テーブルに以下のポリシーを適用 MUST する:
- SELECT: 誰でも可 (`USING (true)`)。LP / Reservation で会場情報を表示するため
- INSERT / UPDATE / DELETE: `is_admin()` を満たすユーザーのみ可

#### Scenario: 公開ユーザーが venues を閲覧
- **WHEN** 未認証ユーザーが `select * from venues` を実行
- **THEN** 全 venues の行が返る

#### Scenario: 一般会員が venues を作成しようとする
- **WHEN** `role = 'member'` のユーザーが venues を INSERT
- **THEN** RLS 違反で 0 行 INSERT (または明示的なエラー)

#### Scenario: 管理者が venues を作成
- **WHEN** `role = 'admin'` のユーザーが venues を INSERT
- **THEN** 行が作成される

### Requirement: identity_documents の閲覧と編集ポリシー

システムは `identity_documents` テーブルに以下のポリシーを適用 MUST する:
- SELECT: 自分の行 (`member_id = auth.uid()`) のみ可。`is_admin()` のユーザーは全件可
- INSERT: 自分の `member_id` を指定する場合のみ可
- UPDATE: 自分の行のうち `storage_path` の差し替え (再アップロード) のみ可。`is_admin()` のユーザーは `status` / `rejection_reason` / `reviewed_at` / `reviewed_by` を更新可
- DELETE: 自分の行は可 (再アップロード時の置き換え)。`is_admin()` のユーザーは全件可 (マスク漏れ削除 SOP のため)

#### Scenario: 自分の書類を一覧
- **WHEN** ログイン中の member が `select * from identity_documents where member_id = auth.uid()`
- **THEN** 該当の書類のみ返る

#### Scenario: 他人の書類を取得
- **WHEN** member が他人の `member_id` を指定して SELECT
- **THEN** 0 行返る (RLS で除外)

#### Scenario: 管理者が pending を取得
- **WHEN** admin が `select * from identity_documents where status = 'pending'`
- **THEN** 全 member の pending 書類が返る

#### Scenario: 自己承認を防ぐ
- **WHEN** member が自分の identity_documents の `status` を `'approved'` に UPDATE しようとする
- **THEN** WITH CHECK 句により拒否される (status は admin のみ変更可)

#### Scenario: 管理者が承認操作
- **WHEN** admin が任意の identity_documents の status を `'approved'` または `'rejected'` に UPDATE
- **THEN** 行が更新される

#### Scenario: 管理者によるマスク漏れ削除
- **WHEN** admin がマイナンバー画像のマスク漏れを発見し DELETE を実行
- **THEN** RLS で許可される (Storage 側オブジェクト削除はアプリ層から別途呼ぶ)

### Requirement: Storage バケット identity-documents のアクセスポリシー

システムは Storage バケット `identity-documents` に以下の RLS を適用 MUST する (storage.objects テーブル):
- SELECT: パスの先頭ディレクトリが `auth.uid()::text` と一致するオブジェクトのみ可。`is_admin()` のユーザーは全件可
- INSERT: パスの先頭ディレクトリが `auth.uid()::text` と一致する場合のみ可
- UPDATE / DELETE: SELECT と同条件
- 公開アクセス: バケットの public フラグは false で、未認証アクセスを禁止 SHALL

#### Scenario: 他人の画像を直接 URL で取得
- **WHEN** ユーザーが他人の `member_id/<file>` への signed URL を持たない状態で直接アクセス
- **THEN** 403 が返る

#### Scenario: 自分のディレクトリへの upload
- **WHEN** ログイン中の member が `<auth.uid()>/<doc_id>-front.jpg` に upload
- **THEN** RLS で許可される

#### Scenario: 他人のディレクトリへの upload
- **WHEN** member が `<other_user_id>/<doc_id>-front.jpg` に upload を試みる
- **THEN** RLS で拒否される

### Requirement: event_list_view の RLS と権限

`event_list_view` ビューは `SECURITY INVOKER` で作成 MUST し、参照される events / venues / reservations 各テーブルの既存 RLS ポリシーを継承する。view 自体への明示的な RLS ポリシーは持たないが、anon ロールへの SELECT 権限は MUST 付与しない（admin アプリ専用ビューとして契約）。authenticated ロールには SELECT を許可 SHALL する。

実態としての行レベル制御は参照テーブルの RLS で行われる:
- events / venues は anon 含めて全件 SELECT 可（既存）
- reservations は自分の予約のみ SELECT 可、admin は全件可（既存）→ admin で view を呼ぶと `reserved_count` は正しい全件 COUNT、非 admin で呼ぶと自分の予約分のみ COUNT になる

#### Scenario: anon ロールは event_list_view を SELECT できない

- **WHEN** anon JWT で `SELECT * FROM event_list_view`
- **THEN** GRANT 不在により権限エラーが返る

#### Scenario: authenticated ロールは event_list_view を SELECT できる

- **WHEN** AAL2 admin が `SELECT * FROM event_list_view`
- **THEN** events × venues × reservations 集計の結果が返る

#### Scenario: 非 admin authenticated の reserved_count

- **WHEN** AAL2 だが `role = 'member'` のユーザーが `SELECT id, reserved_count FROM event_list_view`
- **THEN** events 行は anon と同等に全件返るが、reserved_count はその member 自身の予約分のみが COUNT される（仕様上の制約。クライアント側で当該ロールから呼ばないことを契約）

### Requirement: event_list_view への admin アプリからの呼び出し契約

`event_list_view` は admin アプリ（`apps/admin`）からのみ呼び出される MUST 契約とする。LP / reservation アプリ・anon ユーザーは本 view を呼び出してはならない。本契約の遵守は仕様上の責務であり、技術的には GRANT で anon を排除することで多層防御する。

#### Scenario: 呼び出し元の限定

- **WHEN** `apps/admin` 以外のソースで `event_list_view` を SELECT する import / SQL が含まれていないか grep する
- **THEN** マッチが 0 件である

### Requirement: event_detail_view の権限契約

システムは MUST `event_detail_view` に対して以下の権限を設定する:

- `revoke all on public.event_detail_view from anon`（未認証ユーザーは SELECT 不可。admin アプリ専用ビューであることを契約として明示）
- `grant select on public.event_detail_view to authenticated`（認証済ユーザーは SELECT 可。実際の行レベル制御は参照テーブルの RLS を継承）

view 自体は `SECURITY INVOKER` で作成されるため、参照テーブル（events / venues / reservations）の RLS が呼び出し元の権限で評価される。`reservations` の SELECT RLS（`auth.uid() = member_id OR is_admin()`）により、admin で SELECT すると `reserved_count` / `checked_in_count` / `first_time_count` / `waitlist_count` が全 reservations を母集団とした正しい値で返り、非 admin で SELECT すると自分の予約のみを母集団とした不完全な値が返る。

本 view は MUST admin アプリ（`/events/:id`）でのみ呼ばれる契約とする SHALL。非 admin に呼ばれた場合の挙動は「集計値が部分的に過小になる」という形で安全側に倒れる（情報漏洩はない）。

#### Scenario: 未認証ユーザーは SELECT 不可
- **WHEN** anon ロールで `SELECT * FROM event_detail_view` を実行
- **THEN** permission denied エラーが返る

#### Scenario: admin が SELECT
- **WHEN** `is_admin()` が true のユーザーが `SELECT * FROM event_detail_view WHERE id = '<uuid>'` を実行
- **THEN** 1 行返り、reserved_count / checked_in_count / first_time_count / waitlist_count はすべて全 reservations を母集団とした正しい集計値となる

#### Scenario: 一般会員が SELECT した場合の安全性
- **WHEN** `role = 'member'` のユーザーが `SELECT * FROM event_detail_view WHERE id = '<uuid>'` を実行
- **THEN** 行は返るが、reservations の RLS により集計対象が「自分の予約のみ」に縮退する。他の member の予約情報は一切漏洩しない（reserved_count 等が過小評価されるだけ）

### Requirement: event_participants_view の権限契約

システムは MUST `event_participants_view` に対して以下の権限を設定する:

- `revoke all on public.event_participants_view from anon`
- `grant select on public.event_participants_view to authenticated`

view は `SECURITY INVOKER` で作成され、参照テーブル（reservations / members / events）の RLS が呼び出し元の権限で評価される。`reservations` の SELECT RLS と `members` の SELECT RLS（`id = auth.uid() OR is_admin()`）の AND により、admin で SELECT すると全 member の参加者行が返り、非 admin で SELECT すると自分の予約 × 自分の member 行のみが返る（つまり「自分が予約しているイベントの自分の行のみ」）。

本 view も MUST admin アプリ（`/events/:id`）でのみ呼ばれる契約とする SHALL。非 admin が呼んでも他人の参加者情報（display_name / email / experience_level）は一切漏れない。

#### Scenario: 未認証ユーザーは SELECT 不可
- **WHEN** anon ロールで `SELECT * FROM event_participants_view` を実行
- **THEN** permission denied エラーが返る

#### Scenario: admin が SELECT
- **WHEN** `is_admin()` が true のユーザーが `SELECT * FROM event_participants_view WHERE event_id = '<uuid>'` を実行
- **THEN** 当該 event の全参加者行（status NOT IN ('cancelled')）が返り、display_name / email / experience_level / is_first_time すべてが含まれる

#### Scenario: 一般会員が SELECT した場合の安全性
- **WHEN** `role = 'member'` のユーザーが `SELECT * FROM event_participants_view WHERE event_id = '<uuid>'` を実行
- **THEN** 自分が当該 event に予約していれば自分の 1 行のみが返る。他の member の display_name / email / experience_level は一切漏洩しない

### Requirement: 既存 reservations RLS の流用契約

本 change では `reservations` テーブルの RLS ポリシーを **変更しない**。既存ポリシーで MUST 以下が保証されている:

- SELECT: 自分の予約のみ可、admin は全件可
- UPDATE: member は自分の予約の `'reserved' → 'cancelled'` のみ可、admin は全件・全 status へ可
- DELETE: admin のみ可

これにより、本画面の **個別チェックイン**（status を `'reserved' ⇄ 'attended'` に UPDATE）と **個別キャンセル代行**（status を `'cancelled'` に UPDATE）は admin の既存 UPDATE 権限の範囲内で動作 SHALL。新規ポリシー追加は不要。

#### Scenario: admin によるチェックイン UPDATE
- **WHEN** admin が `UPDATE reservations SET status = 'attended', checked_in_at = now() WHERE id = '<uuid>' AND status = 'reserved'` を実行
- **THEN** 既存 RLS により 1 行更新される（admin は全件・全 status 操作可）

#### Scenario: admin によるキャンセル代行 UPDATE
- **WHEN** admin が `UPDATE reservations SET status = 'cancelled' WHERE id = '<uuid>'` を実行
- **THEN** 既存 RLS により 1 行更新され、トリガー `set_reservations_cancelled_at` が `cancelled_at = now()` を自動設定する

#### Scenario: 非 admin による他人の予約 UPDATE
- **WHEN** `role = 'member'` のユーザーが他人の reservation_id を指定して同じ UPDATE を実行
- **THEN** 既存 RLS により 0 行更新（拒否）。本画面は admin guard 配下のため通常はここに到達しないが、API 直叩きでも安全

### Requirement: signup_pending の RLS は service_role 限定

システムは MUST `signup_pending` テーブルに RLS を有効化し、SELECT / INSERT / UPDATE / DELETE のすべてを **service_role からのみ可** とする。anon / authenticated の両ロールからのすべてのアクセスを SHALL NOT 許可する。Supabase Edge Function は内部的に service_role キーを使用してアクセスする SHALL。

`signup_pending` には氏名 / 電話 / 生年月日 / メールアドレスといった個人情報を含む payload が一時保管されるため、ブラウザクライアントから直接読み書きできてはならない。

#### Scenario: anon から SELECT 試行
- **WHEN** anon ロールが `select * from signup_pending` を試みる
- **THEN** 0 行返る（または明示的な権限エラー）

#### Scenario: authenticated から SELECT 試行
- **WHEN** ログイン中の `authenticated` ロールが `select * from signup_pending where email = 'self@example.com'` を試みる
- **THEN** 0 行返る（自分のメールであっても直接アクセス不可）

#### Scenario: anon から INSERT / UPDATE / DELETE 試行
- **WHEN** anon ロールが `signup_pending` に INSERT / UPDATE / DELETE を試みる
- **THEN** すべて RLS により拒否される

#### Scenario: service_role からの SELECT / INSERT / UPDATE / DELETE
- **WHEN** Supabase Edge Function が service_role キーで `signup_pending` に対して SELECT / INSERT（UPSERT）/ UPDATE / DELETE を発行する
- **THEN** すべて成功する（Edge Function は本テーブルを完全に管理できる）

#### Scenario: RLS 有効化の検証
- **WHEN** `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'signup_pending'` を実行
- **THEN** `relrowsecurity = true` が返る

### Requirement: 退会済み会員の予約行のアクセス制御

システムは `reservations.member_id IS NULL` の行（退会済み会員の過去予約）に対するアクセス制御を MUST 規定する:

- SELECT: admin のみ可。一般会員はそもそも `member_id = auth.uid()` で SELECT するため NULL 行はマッチせず、結果的に閲覧不可
- INSERT: MUST NOT 許容（WITH CHECK 句で `member_id IS NOT NULL` を強制し、新規予約で NULL になる経路を遮断）
- UPDATE: admin のみ可。一般会員は `member_id = auth.uid()` の WHERE 句で対象外
- DELETE: admin のみ可

退会経路（`withdraw-member` Edge Function）からの ON DELETE SET NULL による NULL 化は RLS 評価を経由しない（`service_role` 権限）ため、本ポリシーの制約を受けない。

#### Scenario: 一般会員からは退会済み行が見えない
- **WHEN** `role = 'member'` のユーザーが `SELECT * FROM reservations WHERE member_id IS NULL` を実行
- **THEN** 結果は 0 行（RLS の `member_id = auth.uid()` で除外）

#### Scenario: admin からは退会済み行が見える
- **WHEN** `is_admin()` のユーザーが `SELECT * FROM reservations WHERE member_id IS NULL` を実行
- **THEN** 退会済み会員の過去予約が全件返る

#### Scenario: 一般会員による NULL 行の INSERT は拒否
- **WHEN** 一般会員が `INSERT INTO reservations (event_id, member_id, ...) VALUES (..., NULL, ...)` を試みる
- **THEN** RLS WITH CHECK 句で拒否される

#### Scenario: 一般会員による NULL 行 UPDATE は無効
- **WHEN** 一般会員が `UPDATE reservations SET status = 'cancelled' WHERE member_id IS NULL` を実行
- **THEN** USING 句 (`member_id = auth.uid()`) によりマッチする行が無く、UPDATE は 0 行に終わる

### Requirement: `withdraw-member` Edge Function の認可と権限

システムは `withdraw-member` Edge Function に対して以下の認可契約を MUST 提供する:

- Function は `service_role` キーで Supabase Client を初期化し、RLS を bypass して `members` / `reservations` / `identity_documents` / Storage / `auth.users` を操作する
- Function 内で呼び出し元 JWT（Authorization ヘッダ）を Supabase Auth で検証し、`auth.uid()` を取得 MUST する
- 取得した `auth.uid()` が `target_member_id` と一致する（本人）か、または当該 `auth.uid()` を持つ `members` 行の `role = 'admin'` である（admin）場合のみ削除を実行 MUST する。それ以外は 403 を返す
- 認可検証で取得する admin 判定は、`is_admin()` ヘルパー関数を Function 内で SQL 呼び出しせず、`SELECT role FROM members WHERE id = :auth_uid` の直接クエリで判定 SHALL する（Function は service_role なので RLS なしで取得可能）
- Function の呼び出し成功・失敗・実行者・対象 member_id は Function ログに MUST 記録する

#### Scenario: 本人呼び出しの認可成功
- **WHEN** 認証済み一般会員が自分の `member_id` を引数に Function を呼ぶ
- **THEN** `auth.uid() === target_member_id` が成立し、削除が実行される

#### Scenario: admin 呼び出しの認可成功
- **WHEN** `role = 'admin'` のユーザーが他人の `member_id` を引数に Function を呼ぶ
- **THEN** admin 判定 SQL で `role = 'admin'` が確認され、削除が実行される

#### Scenario: 第三者からの呼び出し拒否
- **WHEN** `role = 'member'` のユーザーが他人の `member_id` を引数に Function を呼ぶ
- **THEN** Function は 403 を返し、DB / Storage / Auth に対する操作を実行しない

#### Scenario: 未認証呼び出しの拒否
- **WHEN** Authorization ヘッダなしで Function を呼ぶ
- **THEN** Function は 401 を返す

### Requirement: event_availability_view の RLS と権限

`event_availability_view` ビューは `SECURITY DEFINER` で作成 MUST する。関数所有者（postgres ロール）の権限で `reservations` を全件集計し、認証済ユーザー（会員 / admin 共通）に対して当該イベントの予約埋まり具合の集計のみを返す。

権限設定:

- `revoke all on public.event_availability_view from anon` — 未認証ユーザーは SELECT 不可
- `grant select on public.event_availability_view to authenticated` — 認証済ユーザーは SELECT 可

view が返す列は集計 (`event_id`, `capacity`, `reserved_count`) のみで、個別予約行・予約者 ID 等の個人情報を含まない MUST。これにより `SECURITY DEFINER` でも個人情報漏洩リスクを構造的に排除する。

`reservations` テーブルの既存 SELECT RLS（`auth.uid() = member_id OR is_admin()`）は本変更で **改変 SHALL NOT**。会員ロールからの直接 SELECT は引き続き自分の予約のみが返る。会員が全件集計を得る経路は `event_availability_view` のみに集約する MUST。

#### Scenario: anon は event_availability_view を SELECT できない
- **WHEN** anon JWT で `SELECT * FROM event_availability_view`
- **THEN** 権限エラーで拒否される

#### Scenario: 会員ロールでの SELECT が全件集計を返す
- **WHEN** AAL2 の `role = 'member'` ユーザーが `SELECT event_id, reserved_count FROM event_availability_view`
- **THEN** 当該会員以外の予約も含めた全件集計が返る（view が `SECURITY DEFINER` であるため）

#### Scenario: admin ロールでの SELECT も全件集計を返す
- **WHEN** AAL2 の `is_admin() = true` ユーザーが `SELECT event_id, reserved_count FROM event_availability_view`
- **THEN** 全件集計が返る（admin で呼んでも会員で呼んでも同じ結果）

#### Scenario: reservations の直接 SELECT 経路は会員自身分のみ
- **WHEN** 会員ロールで `SELECT * FROM reservations`
- **THEN** 自分の予約のみが返る（既存 RLS 維持。view 追加によって直接アクセス経路は緩和されていない）

### Requirement: event_availability_view の呼び出し契約

`event_availability_view` は `apps/reservation` および `apps/admin` から呼び出される MUST 契約とする。LP / anon ユーザーは本 view を呼び出してはならない MUST NOT。本契約の遵守は仕様上の責務であり、技術的には GRANT で anon を排除することで多層防御する。

#### Scenario: 呼び出し元の契約
- **WHEN** `apps/lp` 配下のソースで `event_availability_view` を SELECT する import / SQL が含まれていないか grep する
- **THEN** ヒット 0 件

