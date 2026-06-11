## ADDED Requirements

### Requirement: 参加者ニックネーム取得 RPC の権限境界

`public.get_event_participant_nicknames(p_event_id uuid)` 関数は `SECURITY DEFINER` モードで定義され、`search_path` を `public` に固定する MUST。本関数は呼び出し元の `auth.uid()` が `p_event_id` に対して `reservations.status IN ('reserved', 'attended')` の有効な予約を 1 行以上持つときのみ非空の集合を SHALL 返し、それ以外は空集合を SHALL 返す (例外を投げない)。

戻り値の対象集合は当該イベントの `reservations.status IN ('reserved', 'attended')` の行のみとし、`'cancelled'` / `'no_show'` は除外する MUST。

戻り値の各行は以下を MUST 含む:

- `member_id`: 当該予約の会員 ID
- `nickname`: `members.nickname` (NULL 可)
- `is_self`: `member_id = auth.uid()` のとき `true`
- `guest_count`: 当該 `reservations.guest_count`

戻り値は MUST NOT 含む:

- メールアドレス / 電話番号 / 本名 / 生年月日 / 経験レベル / 認証情報

並び順は `reservations.created_at ASC` を SHALL とする。既存退会フロー (`reservations.member_id` は `ON DELETE SET NULL`) で member_id が NULL になった行は、戻り値から SHALL 除外する (`r.member_id IS NOT NULL` フィルタ)。

`EXECUTE` 権限は `authenticated` ロールにのみ SHALL GRANT する。`anon` および `service_role` には GRANT しない MUST NOT。

#### Scenario: 自分が予約しているイベントの参加者一覧取得
- **WHEN** 会員 A が自分の有効予約があるイベント `E1` の `event_id` で本関数を呼ぶ
- **THEN** イベント `E1` に有効予約を持つ全会員の `nickname` / `is_self` / `guest_count` が `reservations.created_at ASC` の順で返り、A の行は `is_self = true` となる

#### Scenario: 自分が予約していないイベントへの呼び出し
- **WHEN** 会員 A が予約していないイベント `E2` の `event_id` で本関数を呼ぶ
- **THEN** 関数は空集合を返し、エラーを発生 SHALL NOT

#### Scenario: 個人特定情報の非露出
- **WHEN** 本関数の戻り値スキーマ (`returns table (...)`) を確認する
- **THEN** メール / 電話番号 / 本名 / 生年月日 / 経験レベルのカラムは含まれない

#### Scenario: anon / service_role への GRANT 不在
- **WHEN** 関数の権限を `\df+ public.get_event_participant_nicknames` 等で確認
- **THEN** `EXECUTE` 権限は `authenticated` のみに付与され、`anon` および `service_role` には付与されていない

#### Scenario: cancelled / no_show は対象外
- **WHEN** 同じイベントに `status='reserved'` の予約 3 件と `status='cancelled'` の予約 1 件が存在する状態で本関数を呼ぶ
- **THEN** 戻り値は `'reserved'` の 3 件のみで、`'cancelled'` の 1 件は含まれない

#### Scenario: 退会済み参加者の除外
- **WHEN** 同じイベントに `status='reserved'` の予約 3 件があり、うち 1 件は退会フローで `member_id IS NULL` になっている状態で本関数を呼ぶ
- **THEN** 戻り値は `member_id IS NOT NULL` の 2 件のみで、退会済み参加者の行は含まれない
