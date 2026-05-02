-- =============================================================================
-- DEV / STAGING ONLY — admin /events/:id 画面の動作確認用 seed (Issue #87)
-- =============================================================================
-- ⚠️  本番 Supabase で実行禁止。Render プレビュー / ローカル / staging 専用。
--
-- 目的:
--   admin の /events/:id 画面 (Issue #87) のデザイン・操作感を確認するための
--   テストデータを投入する。auth.users (5 名) → on_auth_user_created トリガー
--   経由で members 行を自動作成 → members を UPDATE で経験レベル等を埋める →
--   既存 events から「未来日付の最初の published event 1 件」に reservations
--   を 5 件 INSERT する。
--
-- 投入されるデータの構成:
--   - 5 名のテスト member (display_name 別 / experience_level 混在 / role=member)
--   - 既存 1 イベントへの reservations 5 件:
--       * 3 件 status='reserved' (未チェックイン) — うち 1 件は guest_count=1
--       * 2 件 status='attended' (チェックイン済) — checked_in_at セット済
--   - うち 1 名 (テスト鈴木) には別イベントでの過去 attended 履歴を仕込む
--     → /events/:id 画面で「初回バッジ」が他 4 名に付く / 鈴木には付かない
--       が確認できる
--
-- 関連:
--   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
--   supabase/migrations/20260501210240_event_detail_views.sql
--
-- 使い方 (Supabase Dashboard SQL Editor):
--   1. 事前に admin が `/events/new` で 2 件以上の published event を作成済み
--      であること (1 件は当日以降、もう 1 件は過去日付。後者は鈴木の過去 attended
--      履歴用。両方とも管理画面から作成可)
--   2. 本ファイル全体をコピーして Dashboard SQL Editor で RUN
--   3. 出力に「seeded 5 members + 5 reservations into <event-name>」が出れば成功
--   4. /events/:id にアクセスして 5 名の参加者一覧を確認
--
-- ロールバック (テストデータ削除):
--   ファイル末尾「-- ROLLBACK」セクション参照
--
-- 注意:
--   - auth.users への INSERT は service_role 権限が必要 (Dashboard SQL Editor は
--     service_role で動くので OK)
--   - email は example.invalid (RFC 2606 reserved TLD) を使用してメール送信が
--     起きても本物の宛先に届かないことを担保
--   - encrypted_password は pgcrypto の crypt + bcrypt でダミーセット
--     (実際に Auth でログインさせる用途ではない)
-- =============================================================================

begin;

-- pgcrypto は Supabase デフォルトで有効
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Step 1: テスト用 auth.users 5 名を INSERT
--   → on_auth_user_created トリガーで members に自動 INSERT される
-- -----------------------------------------------------------------------------

-- 既存テストユーザーがいたら一旦削除 (CASCADE で members も消える)
delete from auth.users where email like '%@dev-event-detail.example.invalid';

-- 5 名 INSERT
-- 固定 UUID を使い、再実行で安定して同じユーザー / member / 予約が再現できるようにする
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    'authenticated', 'authenticated',
    'tanaka@dev-event-detail.example.invalid',
    crypt('dev-only-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    'authenticated', 'authenticated',
    'sato@dev-event-detail.example.invalid',
    crypt('dev-only-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03',
    'authenticated', 'authenticated',
    'nakamura@dev-event-detail.example.invalid',
    crypt('dev-only-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04',
    'authenticated', 'authenticated',
    'takahashi@dev-event-detail.example.invalid',
    crypt('dev-only-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05',
    'authenticated', 'authenticated',
    'suzuki@dev-event-detail.example.invalid',
    crypt('dev-only-password', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false
  );

-- -----------------------------------------------------------------------------
-- Step 2: members の display_name / experience_level を UPDATE
--   トリガーが email の @ 前を仮 display_name にしているのでオーバーライド
-- -----------------------------------------------------------------------------

update public.members set display_name = '田中 美咲',   experience_level = 'beginner'      where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01';
update public.members set display_name = '佐藤 健太',   experience_level = 'experienced'   where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02';
update public.members set display_name = '中村 あかり', experience_level = 'intermediate'  where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03';
update public.members set display_name = '高橋 直樹',   experience_level = 'beginner'      where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04';
update public.members set display_name = '鈴木 翔太郎', experience_level = 'experienced'   where id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05';

-- -----------------------------------------------------------------------------
-- Step 3: 対象 event を選定
--   未来日 (start_at >= now) の published event のうち最も start_at が早いもの
-- -----------------------------------------------------------------------------

do $$
declare
  target_event_id uuid;
  past_event_id uuid;
begin
  select id into target_event_id
  from public.events
  where visibility = 'published'
    and status = 'scheduled'
    and start_at >= now()
  order by start_at asc
  limit 1;

  if target_event_id is null then
    raise exception 'シードする対象イベントが見つかりません。先に admin /events/new で未来日付の published event を作成してください。';
  end if;

  -- 過去 attended 履歴用 event (鈴木さんに過去参加履歴を持たせて初回バッジが
  -- 付かないことを確認するため)。なければ「過去履歴なし」として進める。
  select id into past_event_id
  from public.events
  where visibility = 'published'
    and start_at < now()
  order by start_at desc
  limit 1;

  -- 既存テスト reservations を一旦削除 (再実行で安定)
  delete from public.reservations where member_id in (
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04',
    '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05'
  );

  -- ---------------------------------------------------------------------------
  -- Step 4: 対象 event への reservations 5 件を INSERT
  --   - 田中 (初回): reserved
  --   - 佐藤 (経験者): attended (チェックイン済) + 同伴 1 名
  --   - 中村 (中級): attended (チェックイン済)
  --   - 高橋 (初回): reserved + 同伴 1 名
  --   - 鈴木 (経験者): reserved (過去 attended 履歴あり → 初回バッジ off)
  -- ---------------------------------------------------------------------------

  insert into public.reservations (event_id, member_id, status, guest_count, checked_in_at, created_at)
  values
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01', 'reserved', 0, null,            now() - interval '3 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02', 'attended', 1, now() - interval '1 hour', now() - interval '4 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03', 'attended', 0, now() - interval '30 minute', now() - interval '5 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04', 'reserved', 1, null,            now() - interval '2 day'),
    (target_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05', 'reserved', 0, null,            now() - interval '1 day');

  -- 鈴木さんに過去 attended 履歴を仕込む (初回判定 false 化)
  if past_event_id is not null then
    insert into public.reservations (event_id, member_id, status, guest_count, checked_in_at, created_at)
    values (past_event_id, '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05', 'attended', 0, now() - interval '14 day', now() - interval '20 day')
    on conflict (event_id, member_id) do nothing;
  end if;

  raise notice 'seeded 5 members + 5 reservations into event %', target_event_id;
end $$;

commit;

-- =============================================================================
-- ROLLBACK (テストデータ削除)
-- =============================================================================
-- Dashboard SQL Editor で下記をコピー実行すると、本 seed が投入した全データを
-- 削除する。reservations → members → auth.users の順で CASCADE 含めて削除。
--
-- begin;
-- delete from public.reservations where member_id in (
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa03',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa04',
--   '11111111-aaaa-4aaa-8aaa-aaaaaaaaaa05'
-- );
-- delete from auth.users where email like '%@dev-event-detail.example.invalid';
-- -- on delete cascade で members も自動削除される (members.id ON DELETE CASCADE 制約)
-- commit;
