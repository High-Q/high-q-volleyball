-- =============================================================================
-- signup_pending テーブル + RLS（service_role 限定）
-- =============================================================================
-- 目的: 「ゼロ滞留」signup フロー（#189）の認証コード待ち payload 一時保管
-- 関連: openspec/changes/reservation-signup-zero-stale/
--   - design.md D3 (TTL 30 分 / コードハッシュ保管)
--   - specs/data-schema/spec.md (signup_pending テーブル要件)
--   - specs/rls-policies/spec.md (service_role 限定 RLS)
--
-- 設計ポイント:
--   - email を主キーとして同 email の同時保留行を 1 件に限定（再送は UPSERT で上書き）
--   - 6 桁コードは SHA-256 ハッシュで保管（原文は DB に置かない）
--   - 期限切れ行は Edge Function `verify-signup` がベストエフォートで掃除
--   - クライアント直接アクセスは RLS で完全禁止、service_role 経由のみ
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. signup_pending テーブル
-- -----------------------------------------------------------------------------

create table if not exists public.signup_pending (
  email          text        primary key,
  payload        jsonb       not null,
  code_hash      text        not null,
  attempt_count  integer     not null default 0,
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint signup_pending_attempt_count_nonneg
    check (attempt_count >= 0),
  constraint signup_pending_expires_after_created
    check (expires_at > created_at)
);

comment on table public.signup_pending is
  '#189 ゼロ滞留 signup フローの認証コード待ち payload 一時保管。TTL 30 分、service_role 限定アクセス。';

comment on column public.signup_pending.payload is
  '会員登録フォーム入力内容（氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意 ISO8601）。verify-signup 成功時に members へ INSERT される。';

comment on column public.signup_pending.code_hash is
  '6 桁認証コードの SHA-256 ハッシュ。原文は DB に保管しない。';


-- -----------------------------------------------------------------------------
-- 2. インデックス（期限切れ行スキャン用）
-- -----------------------------------------------------------------------------

create index if not exists signup_pending_expires_at_idx
  on public.signup_pending (expires_at);


-- -----------------------------------------------------------------------------
-- 3. updated_at トリガ（既存 set_updated_at() を流用）
-- -----------------------------------------------------------------------------

drop trigger if exists set_signup_pending_updated_at on public.signup_pending;
create trigger set_signup_pending_updated_at
before update on public.signup_pending
for each row
execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. RLS 有効化
-- -----------------------------------------------------------------------------

alter table public.signup_pending enable row level security;


-- -----------------------------------------------------------------------------
-- 5. RLS ポリシー（service_role 限定）
-- -----------------------------------------------------------------------------
-- anon / authenticated には一切のポリシーを置かない（既定で拒否）。
-- service_role は Postgres ロールとして RLS を bypass するため、
-- Edge Function（service_role キー使用）からのみ全 CRUD が可能。
-- 念のため明示的に「ポリシーがゼロ」になるよう、誤って付与されたポリシーを drop。
-- -----------------------------------------------------------------------------

drop policy if exists signup_pending_select_anyone   on public.signup_pending;
drop policy if exists signup_pending_select_self     on public.signup_pending;
drop policy if exists signup_pending_insert_anyone   on public.signup_pending;
drop policy if exists signup_pending_update_anyone   on public.signup_pending;
drop policy if exists signup_pending_delete_anyone   on public.signup_pending;


-- -----------------------------------------------------------------------------
-- 6. テーブル権限の明示的 REVOKE（多層防御）
-- -----------------------------------------------------------------------------
-- 20260429000000_table_grants.sql の `alter default privileges` により、
-- 新規 public schema テーブルには anon に SELECT、authenticated に全 CRUD が
-- 自動付与される。signup_pending は PII を含むため、両ロールから明示的に
-- 全権限を REVOKE し、RLS と GRANT の二重防御を成立させる。
-- service_role は Supabase の特権ロールとして REVOKE 対象に含めない。
-- -----------------------------------------------------------------------------

revoke all on public.signup_pending from anon;
revoke all on public.signup_pending from authenticated;


-- =============================================================================
-- 検証用クエリ
-- =============================================================================
-- RLS 有効化:
--   select relname, relrowsecurity from pg_class where relname = 'signup_pending';
--   → relrowsecurity = t であること
--
-- ポリシー一覧（0 件であるべき）:
--   select policyname from pg_policies
--   where schemaname = 'public' and tablename = 'signup_pending';
--   → 0 行
--
-- anon / authenticated からのアクセス禁止検証:
--   set role anon;
--   select * from public.signup_pending;
--   → permission denied for table signup_pending（または 0 行）
--   reset role;
