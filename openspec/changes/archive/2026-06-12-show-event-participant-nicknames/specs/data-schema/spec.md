## ADDED Requirements

### Requirement: 参加者ニックネーム取得 RPC の関数定義と migration

`supabase/migrations/` 配下に `public.get_event_participant_nicknames(p_event_id uuid)` 関数の定義と `EXECUTE` 権限付与を行う SQL マイグレーションを SHALL 追加する。マイグレーション SQL は以下を MUST 含む:

- `CREATE OR REPLACE FUNCTION public.get_event_participant_nicknames(p_event_id uuid) RETURNS TABLE (member_id uuid, nickname text, is_self boolean, guest_count smallint) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;`
- 関数本体での前提チェック: `auth.uid()` が `reservations.event_id = p_event_id AND reservations.status IN ('reserved', 'attended') AND reservations.member_id = auth.uid()` の行を 1 件以上持たないときは早期 RETURN
- 戻り値の対象: `reservations.status IN ('reserved', 'attended') AND reservations.member_id IS NOT NULL` の行のみ (`'cancelled'` / `'no_show'` および退会フローで member_id が NULL になった行は除外)
- 戻り値の `is_self` は `member_id = auth.uid()` の比較結果
- 並び順 `reservations.created_at ASC`
- `GRANT EXECUTE ON FUNCTION public.get_event_participant_nicknames(uuid) TO authenticated;`
- `REVOKE EXECUTE ON FUNCTION public.get_event_participant_nicknames(uuid) FROM anon, public;` (デフォルト権限の安全側への明示)
- `-- ROLLBACK: drop function public.get_event_participant_nicknames(uuid);` コメント

マイグレーションファイル名は `supabase/migrations/<YYYYMMDDhhmmss>_create_event_participant_nicknames_rpc.sql` 形式とする MUST。

#### Scenario: マイグレーションファイルの存在
- **WHEN** `supabase/migrations/` 配下を確認
- **THEN** `_create_event_participant_nicknames_rpc.sql` 相当のファイルが存在し、上記要素をすべて含む

#### Scenario: SECURITY DEFINER と search_path
- **WHEN** マイグレーション SQL を確認
- **THEN** 関数定義は `SECURITY DEFINER` および `SET search_path = public` を含む

#### Scenario: authenticated への GRANT EXECUTE
- **WHEN** マイグレーション SQL を確認
- **THEN** `GRANT EXECUTE ON FUNCTION public.get_event_participant_nicknames(uuid) TO authenticated;` を含む

#### Scenario: anon / public からの REVOKE
- **WHEN** マイグレーション SQL を確認
- **THEN** `REVOKE EXECUTE ON FUNCTION public.get_event_participant_nicknames(uuid) FROM anon, public;` を含む

#### Scenario: ROLLBACK コメントの存在
- **WHEN** マイグレーション SQL を確認
- **THEN** `-- ROLLBACK:` で始まり関数 DROP 文を含むコメントが存在する

### Requirement: 参加者ニックネーム取得関数の TypeScript 型

`packages/shared/api/` (または `apps/reservation/src/entities/event/api/`) 配下に本 RPC の戻り値型 `EventParticipantNickname` を SHALL 定義する。型は以下を MUST 含む:

- `memberId: MemberId` (Branded Type)
- `nickname: string | null`
- `isSelf: boolean`
- `guestCount: number`

クライアント API 関数 `fetchEventParticipantNicknames(eventId: EventId): Promise<Result<EventParticipantNickname[]>>` を SHALL 提供する。本関数は Supabase RPC のみ呼び出し、`reservations` / `members` の直接 SELECT は MUST NOT 行う。

#### Scenario: 戻り値型の定義
- **WHEN** 型定義ファイルを確認
- **THEN** `EventParticipantNickname` 型が定義され、`memberId` は Branded Type / `nickname` は string \| null / `isSelf` は boolean / `guestCount` は number を持つ

#### Scenario: クライアント API の Supabase RPC 利用
- **WHEN** `fetchEventParticipantNicknames` 実装を確認
- **THEN** Supabase クライアントの `.rpc('get_event_participant_nicknames', ...)` 呼び出しのみが含まれ、`from('reservations')` / `from('members')` の直接 SELECT は含まれない
