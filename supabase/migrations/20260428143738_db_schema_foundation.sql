-- =============================================================================
-- High Q DB スキーマ拡張 (Issue #147)
-- =============================================================================
-- 目的: MVP1 の admin (#84-#87, #171) / reservation (#89-#92, #148, #91) を
--       実装するための DB 基盤拡張。
--
-- 関連: openspec/changes/db-schema-foundation/
--   - proposal.md  Why / What / Capabilities
--   - design.md    D1〜D12 設計判断 / R1〜R5 リスク
--   - specs/data-schema/spec.md   テーブル要件
--   - specs/rls-policies/spec.md  RLS 要件
--
-- 主な変更:
--   1. 新テーブル: venues / identity_documents
--   2. events 拡張: venue_id (NOT NULL FK), fee, visibility, cancel_deadline
--                   ※ 既存 location 列は DROP (本番 DB 空のため互換維持不要)
--   3. members 拡張: birthday, phone, experience_level
--   4. reservations 拡張: guest_count, phone_at_booking, checked_in_at,
--                          cancelled_at + status enum に 'waitlist' 追加
--   5. RLS: 新 2 テーブル + 既存 RLS 拡張
--   6. Storage: identity-documents バケット + RLS
--   7. seed: 5 会場 (亀戸 / 東砂 / 深川 / 深川北 / 有明会場 [校名秘匿])
--
-- 適用方法 (Phase 1 暫定):
--   Supabase Dashboard → SQL Editor に本ファイル全体を貼り付けて RUN
--   先行 migration 20260426000000_init_high_q.sql が適用済みであることが前提
--
-- ロールバック:
--   本 migration の逆順を SQL Editor で個別実行する手順を末尾コメントに記載
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. venues テーブル (会場マスタ)
-- -----------------------------------------------------------------------------
-- イベント開催地のマスタデータ。is_primary は最大 1 件 (partial unique index)。
-- map_url は MVP1 では NULL、admin が #151 (会場マスタ CRUD・MVP2) で設定。
-- -----------------------------------------------------------------------------

create table if not exists public.venues (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null unique,
  address       text,
  default_fee   integer,
  access_note   text,
  map_url       text,
  is_primary    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint venues_default_fee_non_negative
    check (default_fee is null or default_fee >= 0)
);

-- メイン会場フラグは最大 1 件 (partial unique index)
create unique index if not exists venues_single_primary_idx
  on public.venues (is_primary)
  where is_primary = true;

-- updated_at トリガー
drop trigger if exists set_venues_updated_at on public.venues;
create trigger set_venues_updated_at
before update on public.venues
for each row
execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. venues seed データ (5 会場)
-- -----------------------------------------------------------------------------
-- 江東区健康スポーツ公社 4 施設 + 有明会場 (校名秘匿・駅住所のみ)。
-- メイン会場は有明会場。
-- ON CONFLICT (name) DO NOTHING で再適用安全。
--
-- ★ events.venue_id NOT NULL 化の前に必ず実行する (FK 違反防止)。
-- -----------------------------------------------------------------------------

insert into public.venues (name, address, default_fee, access_note, is_primary)
values
  (
    '亀戸スポーツセンター',
    '〒136-0071 東京都江東区亀戸 8-22-1',
    1000,
    '東武亀戸線「亀戸水神」駅 徒歩 3 分 / JR 総武線「亀戸」駅 徒歩 15 分 / 21:30 完全撤収',
    false
  ),
  (
    '東砂スポーツセンター',
    '〒136-0074 東京都江東区東砂 4-24-1',
    1000,
    '都営バス「東砂四丁目」徒歩 5 分 / 東京メトロ東西線「南砂町」駅 徒歩 20 分 / 21:30 完全撤収',
    false
  ),
  (
    '深川スポーツセンター',
    '〒135-0044 東京都江東区越中島 1-2-18',
    1000,
    'JR 京葉線「越中島」駅 徒歩 2 分 / 東京メトロ東西線・都営大江戸線「門前仲町」駅 徒歩 5 分 / 21:30 完全撤収',
    false
  ),
  (
    '深川北スポーツセンター',
    '〒135-0023 東京都江東区平野 3-2-20',
    1000,
    '東京メトロ東西線「木場」駅 徒歩 10 分 / 東京メトロ半蔵門線・都営大江戸線「清澄白河」駅 徒歩 12 分 / 21:30 完全撤収 (夏季 21:45)',
    false
  ),
  (
    '有明会場',
    '〒135-0063 東京都江東区有明 1-8-14 先',
    500,
    'ゆりかもめ「有明テニスの森」駅 / 詳細な会場位置は予約確定後にメールで通知',
    true
  )
on conflict (name) do nothing;


-- -----------------------------------------------------------------------------
-- 3. events テーブル拡張
-- -----------------------------------------------------------------------------
-- 既存 location 列を DROP し、venue_id NOT NULL FK で venues マスタに一本化。
-- visibility (公開ステータス) と status (実施ステータス) を独立列にする。
-- fee NULL は venues.default_fee を継承する想定 (アプリ層で解決)。
-- -----------------------------------------------------------------------------

-- 既存 location 列を DROP (本番 DB は空のため互換維持不要)
alter table public.events drop column if exists location;

-- 列追加: venue_id (一旦 NULL 許可で追加 → seed 後に NOT NULL 化)
alter table public.events
  add column if not exists venue_id        uuid,
  add column if not exists fee             integer,
  add column if not exists visibility      text not null default 'draft',
  add column if not exists cancel_deadline timestamptz;

-- FK 制約 (ON DELETE RESTRICT で会場削除時に events 経由で防ぐ)
alter table public.events
  drop constraint if exists events_venue_id_fkey;
alter table public.events
  add constraint events_venue_id_fkey
  foreign key (venue_id) references public.venues(id) on delete restrict;

-- visibility CHECK 制約
alter table public.events
  drop constraint if exists events_visibility_check;
alter table public.events
  add constraint events_visibility_check
  check (visibility in ('draft', 'published', 'private'));

-- fee CHECK 制約 (非負数)
alter table public.events
  drop constraint if exists events_fee_non_negative;
alter table public.events
  add constraint events_fee_non_negative
  check (fee is null or fee >= 0);

-- venue_id NOT NULL 化 (seed 投入後・本番 DB は空なので即時可)
alter table public.events alter column venue_id set not null;

-- index: venue_id (会場別フィルタ)
create index if not exists events_venue_id_idx
  on public.events (venue_id);


-- -----------------------------------------------------------------------------
-- 4. members テーブル拡張
-- -----------------------------------------------------------------------------
-- birthday (生年月日 NOT NULL), phone (任意), experience_level (enum) を追加。
-- birthday は placeholder default current_date で先行 INSERT 可能にする
-- (auth トリガー対応・design.md D4)。
-- -----------------------------------------------------------------------------

alter table public.members
  add column if not exists birthday         date,
  add column if not exists phone            text,
  add column if not exists experience_level text not null default 'beginner';

-- birthday placeholder で NOT NULL 化 (既存行があれば current_date で埋まる)
update public.members set birthday = current_date where birthday is null;
alter table public.members alter column birthday set not null;
alter table public.members alter column birthday set default current_date;

-- experience_level CHECK 制約
alter table public.members
  drop constraint if exists members_experience_level_check;
alter table public.members
  add constraint members_experience_level_check
  check (experience_level in ('beginner', 'intermediate', 'experienced'));


-- -----------------------------------------------------------------------------
-- 5. reservations テーブル拡張
-- -----------------------------------------------------------------------------
-- guest_count, phone_at_booking, checked_in_at, cancelled_at を追加。
-- status enum に 'waitlist' を追加 (#154 キャンセル待ち管理 MVP2 用)。
-- cancelled_at は status='cancelled' へ遷移時にトリガーで自動設定。
-- -----------------------------------------------------------------------------

alter table public.reservations
  add column if not exists guest_count       smallint    not null default 0,
  add column if not exists phone_at_booking  text,
  add column if not exists checked_in_at     timestamptz,
  add column if not exists cancelled_at      timestamptz;

-- guest_count CHECK 制約 (0 〜 5)
alter table public.reservations
  drop constraint if exists reservations_guest_count_range;
alter table public.reservations
  add constraint reservations_guest_count_range
  check (guest_count >= 0 and guest_count <= 5);

-- status CHECK 制約を 5 値に拡張 (waitlist 追加)
alter table public.reservations
  drop constraint if exists reservations_status_check;
alter table public.reservations
  add constraint reservations_status_check
  check (status in ('reserved', 'cancelled', 'attended', 'no_show', 'waitlist'));

-- index: (event_id, status) — 満員判定 / waitlist 抽出用
create index if not exists reservations_event_status_idx
  on public.reservations (event_id, status);

-- cancelled_at 自動設定トリガー
create or replace function public.set_reservations_cancelled_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelled' and (old.status is distinct from 'cancelled') then
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_reservations_cancelled_at on public.reservations;
create trigger set_reservations_cancelled_at
before update on public.reservations
for each row
execute function public.set_reservations_cancelled_at();


-- -----------------------------------------------------------------------------
-- 6. identity_documents テーブル
-- -----------------------------------------------------------------------------
-- 本人確認書類のメタデータ (#92 / #171)。画像本体は Storage `identity-documents`
-- バケットに storage_path で参照。マイナンバーカードはマスク済みのみ受付
-- (design.md D8)。通知カードは enum に存在しない。
-- -----------------------------------------------------------------------------

create table if not exists public.identity_documents (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid        not null references public.members(id) on delete cascade,
  document_type     text        not null,
  storage_path      text        not null,
  status            text        not null default 'pending',
  rejection_reason  text,
  uploaded_at       timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid        references public.members(id) on delete set null,

  constraint identity_documents_document_type_check
    check (document_type in (
      'drivers_license',
      'driving_history_cert',
      'residence_certificate',
      'disability_certificate',
      'residence_card',
      'special_permanent_resident_cert',
      'student_id',
      'passport',
      'my_number_card_masked',
      'health_insurance_cert'
    )),
  constraint identity_documents_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

-- インデックス
create index if not exists identity_documents_member_id_idx
  on public.identity_documents (member_id);

create index if not exists identity_documents_pending_idx
  on public.identity_documents (uploaded_at desc)
  where status = 'pending';


-- -----------------------------------------------------------------------------
-- 7. RLS 有効化 (新テーブル)
-- -----------------------------------------------------------------------------

alter table public.venues             enable row level security;
alter table public.identity_documents enable row level security;


-- -----------------------------------------------------------------------------
-- 8. venues RLS ポリシー
-- -----------------------------------------------------------------------------
-- SELECT: 誰でも可 (公開会場情報)
-- INSERT/UPDATE/DELETE: 管理者のみ可
-- -----------------------------------------------------------------------------

drop policy if exists venues_select_public on public.venues;
create policy venues_select_public
on public.venues
for select
to anon, authenticated
using (true);

drop policy if exists venues_insert_admin on public.venues;
create policy venues_insert_admin
on public.venues
for insert
to authenticated
with check (public.is_admin());

drop policy if exists venues_update_admin on public.venues;
create policy venues_update_admin
on public.venues
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists venues_delete_admin on public.venues;
create policy venues_delete_admin
on public.venues
for delete
to authenticated
using (public.is_admin());


-- -----------------------------------------------------------------------------
-- 9. identity_documents RLS ポリシー
-- -----------------------------------------------------------------------------
-- SELECT: 自分の行のみ。admin は全件可。
-- INSERT: 自分の member_id を指定する場合のみ。
-- UPDATE: メンバーは storage_path のみ可 (再アップロード)。
--         admin は status / rejection_reason / reviewed_at / reviewed_by 可。
-- DELETE: 自分の行は可 (再アップロード時の置換)。admin は全件可
--         (マスク漏れ削除 SOP 用)。
-- -----------------------------------------------------------------------------

drop policy if exists identity_documents_select_self on public.identity_documents;
create policy identity_documents_select_self
on public.identity_documents
for select
to authenticated
using (member_id = auth.uid() or public.is_admin());

drop policy if exists identity_documents_insert_self on public.identity_documents;
create policy identity_documents_insert_self
on public.identity_documents
for insert
to authenticated
with check (member_id = auth.uid());

drop policy if exists identity_documents_update_self on public.identity_documents;
create policy identity_documents_update_self
on public.identity_documents
for update
to authenticated
using (member_id = auth.uid() or public.is_admin())
with check (
  -- 管理者は status / rejection_reason / reviewed_at / reviewed_by を更新可
  public.is_admin()
  -- 一般会員は自分の行で、status / rejection_reason / reviewed_* を変更しない場合のみ可
  or (
    member_id = auth.uid()
    and status = (select status from public.identity_documents
                   where id = identity_documents.id)
    and (rejection_reason is not distinct from
         (select rejection_reason from public.identity_documents
          where id = identity_documents.id))
    and (reviewed_at is not distinct from
         (select reviewed_at from public.identity_documents
          where id = identity_documents.id))
    and (reviewed_by is not distinct from
         (select reviewed_by from public.identity_documents
          where id = identity_documents.id))
  )
);

drop policy if exists identity_documents_delete_self_or_admin on public.identity_documents;
create policy identity_documents_delete_self_or_admin
on public.identity_documents
for delete
to authenticated
using (member_id = auth.uid() or public.is_admin());


-- -----------------------------------------------------------------------------
-- 10. Storage バケット identity-documents
-- -----------------------------------------------------------------------------
-- private バケット (公開アクセス禁止)。オブジェクト名は
-- <member_id>/<document_id>-(front|back).(jpg|png|heic) 形式 (design.md D7)。
-- 既存バケットがあれば再作成しない (idempotent)。
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('identity-documents', 'identity-documents', false)
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 11. Storage RLS ポリシー
-- -----------------------------------------------------------------------------
-- パスの先頭セグメント (member_id) と auth.uid() の一致で制御。
-- admin は全件可。
-- -----------------------------------------------------------------------------

drop policy if exists identity_docs_select_self_or_admin on storage.objects;
create policy identity_docs_select_self_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'identity-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists identity_docs_insert_self on storage.objects;
create policy identity_docs_insert_self
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'identity-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists identity_docs_update_self_or_admin on storage.objects;
create policy identity_docs_update_self_or_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'identity-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists identity_docs_delete_self_or_admin on storage.objects;
create policy identity_docs_delete_self_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'identity-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);


-- =============================================================================
-- 検証用クエリ (RUN 後に手動で確認)
-- =============================================================================
-- 全テーブルで RLS が有効か:
--   select relname, relrowsecurity from pg_class
--   where relname in ('events','members','reservations','venues','identity_documents');
--   → すべて t (true) であること
--
-- venues seed が投入されているか:
--   select name, default_fee, is_primary from public.venues order by name;
--   → 5 行返り、有明会場のみ is_primary=true
--
-- events.location が存在しないか:
--   select column_name from information_schema.columns
--   where table_name = 'events' and column_name = 'location';
--   → 0 行 (DROP されている)
--
-- ポリシー一覧:
--   select schemaname, tablename, policyname, cmd
--   from pg_policies where schemaname in ('public', 'storage')
--   order by tablename, policyname;
--
-- Storage バケット:
--   select id, name, public from storage.buckets where id = 'identity-documents';
--   → 1 行、public = false

-- =============================================================================
-- ロールバック手順 (緊急時のみ・Phase 1 暫定)
-- =============================================================================
-- 1) Storage RLS / バケット削除:
--    drop policy identity_docs_delete_self_or_admin on storage.objects;
--    drop policy identity_docs_update_self_or_admin on storage.objects;
--    drop policy identity_docs_insert_self on storage.objects;
--    drop policy identity_docs_select_self_or_admin on storage.objects;
--    delete from storage.buckets where id = 'identity-documents';
--
-- 2) identity_documents 削除:
--    drop policy identity_documents_delete_self_or_admin on public.identity_documents;
--    drop policy identity_documents_update_self on public.identity_documents;
--    drop policy identity_documents_insert_self on public.identity_documents;
--    drop policy identity_documents_select_self on public.identity_documents;
--    drop table public.identity_documents;
--
-- 3) reservations 列削除 / 制約復元:
--    drop trigger set_reservations_cancelled_at on public.reservations;
--    drop function public.set_reservations_cancelled_at();
--    drop index reservations_event_status_idx;
--    alter table public.reservations
--      drop constraint reservations_status_check,
--      drop constraint reservations_guest_count_range,
--      drop column cancelled_at,
--      drop column checked_in_at,
--      drop column phone_at_booking,
--      drop column guest_count;
--    alter table public.reservations
--      add constraint reservations_status_check
--      check (status in ('reserved', 'cancelled', 'attended', 'no_show'));
--
-- 4) members 列削除:
--    alter table public.members
--      drop constraint members_experience_level_check,
--      drop column experience_level,
--      drop column phone,
--      drop column birthday;
--
-- 5) events 列削除 / location 復元:
--    drop index events_venue_id_idx;
--    alter table public.events
--      drop constraint events_fee_non_negative,
--      drop constraint events_visibility_check,
--      drop constraint events_venue_id_fkey,
--      drop column cancel_deadline,
--      drop column visibility,
--      drop column fee,
--      drop column venue_id,
--      add column location text;
--
-- 6) venues 削除:
--    drop policy venues_delete_admin on public.venues;
--    drop policy venues_update_admin on public.venues;
--    drop policy venues_insert_admin on public.venues;
--    drop policy venues_select_public on public.venues;
--    drop trigger set_venues_updated_at on public.venues;
--    drop index venues_single_primary_idx;
--    drop table public.venues;
-- =============================================================================
