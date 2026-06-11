-- =============================================================================
-- DEV / STAGING ONLY — #278 予約詳細の参加者ニックネーム一覧の動作確認用 seed
-- =============================================================================
-- ⚠️  本番 Supabase で実行禁止。Render プレビュー / ローカル / staging 専用。
--
-- 目的:
--   reservation の /reservations/:id 画面で参加者ニックネーム一覧
--   (get_event_participant_nicknames RPC) を確認するため、
--   `dev_event_detail_seed.sql` で投入済みのテスト 5 名の reservations を
--   「翔太郎くん本人 (high.q.volleyball@gmail.com) が閲覧できる未来イベント」
--   に集約する。
--
--   RPC は「auth.uid() がその event に有効予約 (reserved / attended) を持つ」
--   場合のみ集合を返すため、本人の予約も同イベントに reserved で揃える。
--
-- 投入後の参加者一覧 (created_at ASC):
--   - 本人 (たろ)        → 「あなた」マーカー
--   - 田中 美咲 (みさきち) / 佐藤 健太 (けんちゃん) / 中村 あかり (Aka)
--   - 高橋 直樹 / 鈴木 翔太郎 → nickname NULL =「参加メンバー」マスク
--   - 同伴者: 佐藤 +1 / 高橋 +1 → 同伴者サマリ 1+ 表示
--
-- 前提:
--   1. `dev_event_detail_seed.sql` + `dev_nickname_seed.sql` 実行済み
--      (テスト member 5 名 + nickname 3 名分が存在すること)
--   2. 未来日付の published / scheduled event が 1 件以上存在すること
--   3. #278 の migration (get_event_participant_nicknames) が apply 済みであること
--
-- 関連:
--   openspec/changes/show-event-participant-nicknames/
--   supabase/migrations/20260607172803_create_event_participant_nicknames_rpc.sql
--   supabase/seed/dev_event_detail_seed.sql
--   supabase/seed/dev_nickname_seed.sql
--
-- 使い方:
--   pnpm exec supabase db query --linked --file supabase/seed/dev_reservation_participants_seed.sql
--
-- ロールバック:
--   ファイル末尾「-- ROLLBACK」セクション参照
-- =============================================================================

begin;

do $$
declare
  target_event_id uuid;
  owner_member_id uuid;
begin
  -- 翔太郎くん本人の member id
  select m.id into owner_member_id
  from public.members m
  join auth.users u on u.id = m.id
  where u.email = 'high.q.volleyball@gmail.com';

  if owner_member_id is null then
    raise exception '本人会員 (high.q.volleyball@gmail.com) が見つかりません。';
  end if;

  -- 未来日付の published event のうち最も start_at が早いもの
  select id into target_event_id
  from public.events
  where visibility = 'published'
    and status = 'scheduled'
    and start_at >= now()
  order by start_at asc
  limit 1;

  if target_event_id is null then
    raise exception '未来日付の published event がありません。admin /events/new で作成してください。';
  end if;

  -- テスト 5 名の reservations を一旦削除して target に作り直す (冪等)。
  -- 鈴木の過去 attended 履歴 (初回バッジ off 用) は残す。
  delete from public.reservations
  where member_id::text like '11111111-aaaa%'
    and not (status = 'attended' and event_id in (
      select id from public.events where start_at < now()
    ));

  insert into public.reservations (event_id, member_id, status, guest_count, checked_in_at, created_at)
  values
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'reserved', 0, null, now() - interval '3 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'reserved', 1, null, now() - interval '4 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03', 'reserved', 0, null, now() - interval '5 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04', 'reserved', 1, null, now() - interval '2 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05', 'reserved', 0, null, now() - interval '1 day')
  on conflict (event_id, member_id) do update
    set status = excluded.status, guest_count = excluded.guest_count;

  -- 本人の予約を同イベントに reserved で揃える (cancelled なら復活)
  insert into public.reservations (event_id, member_id, status, guest_count, created_at)
  values (target_event_id, owner_member_id, 'reserved', 0, now() - interval '6 day')
  on conflict (event_id, member_id) do update
    set status = 'reserved';

  raise notice 'seeded participants into event % (owner member %)', target_event_id, owner_member_id;
end $$;

commit;

-- =============================================================================
-- 検証クエリ
-- =============================================================================
-- select r.event_id, m.display_name, m.nickname, r.status, r.guest_count, r.created_at
-- from public.reservations r join public.members m on m.id = r.member_id
-- where r.event_id = (
--   select id from public.events
--   where visibility = 'published' and status = 'scheduled' and start_at >= now()
--   order by start_at asc limit 1
-- )
-- order by r.created_at;

-- =============================================================================
-- ROLLBACK (テストデータ削除)
-- =============================================================================
-- begin;
-- delete from public.reservations
-- where member_id::text like '11111111-aaaa%'
--   and status = 'reserved';
-- commit;
-- (本人の予約は元から存在するため削除しない)
