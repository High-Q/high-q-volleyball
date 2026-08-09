-- =============================================================================
-- court_availability_notifications: 通知済みの空き枠を記録し重複通知を防ぐ
-- =============================================================================
-- 背景: Issue #286 江東区スポーツネットの土日祝バレー空き枠 crawl（Playwright）が
--       検知して通知した空き枠を記録し、同一枠の重複通知を防ぐ。埋まった枠は行を
--       削除し、再オープン時に新たな空き枠として再通知できる状態に戻す。
--       オーナー個人向けの通知状態であり会員（anon / authenticated）には露出しない。
--       crawl ジョブ（GitHub Actions + Playwright）が service_role で読み書きする。
-- 参照: openspec/changes/koto-court-availability-crawler/specs/data-schema/spec.md
--       CLAUDE.md Pillar 4 / docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md
-- 検証: supabase db query --linked --file supabase/tests/verify_grants.sql
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. テーブル作成
-- -----------------------------------------------------------------------------

create table if not exists public.court_availability_notifications (
  id          uuid        primary key default gen_random_uuid(),

  facility    text        not null,   -- 施設アダプタ識別子（例: koto-sports）
  venue_name  text        not null,   -- 会場・体育室名（例: スポーツ会館 大体育室 半面）
  slot_date   date        not null,   -- 枠の日付
  start_at    timestamptz not null,   -- 枠の開始時刻
  end_at      timestamptz not null,   -- 枠の終了時刻
  reserve_url text        not null,   -- 予約 URL

  notified_at timestamptz not null default now(),  -- 通知時刻
  created_at  timestamptz not null default now(),

  -- 枠署名の一意性（同一空き枠の重複記録を防止）
  constraint court_availability_notifications_slot_signature_key
    unique (facility, venue_name, slot_date, start_at, end_at)
);

comment on table public.court_availability_notifications is
  '江東区スポーツネット等の crawl で通知済みの空き枠を記録し重複通知を防ぐ（オーナー個人向け・会員非公開・service_role のみ読み書き）';


-- -----------------------------------------------------------------------------
-- 2. RLS 有効化
-- -----------------------------------------------------------------------------
-- High Q では RLS なしテーブルを許容しない（CLAUDE.md Pillar 4）。

alter table public.court_availability_notifications enable row level security;


-- -----------------------------------------------------------------------------
-- 3. RLS ポリシー
-- -----------------------------------------------------------------------------
-- 本テーブルは crawl ジョブ（service_role）のみが読み書きする。
-- anon / authenticated には policy を作らず GRANT も付与しないため、既定で全拒否
-- （会員向けの露出禁止 = data-schema spec「会員ロールからの露出禁止」シナリオ）。
-- service_role は RLS をバイパスするが、アクセス主体を明示するため policy を定義する。

create policy "court_availability_notifications_service_all"
  on public.court_availability_notifications
  for all
  to service_role
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 4. GRANT（3 ロール明示付与）
-- -----------------------------------------------------------------------------
-- Supabase の Data API 仕様変更（2026-10-30 enforce）に備え、
-- `alter default privileges` の自動付与には頼らず 3 ロールを明示的に扱う。

-- 4.1 anon（未認証）— 付与しない。既定付与が残っていても確実に剥奪する。
revoke all on public.court_availability_notifications from anon;

-- 4.2 authenticated（ログイン会員）— 付与しない。会員個人には露出しない。
revoke all on public.court_availability_notifications from authenticated;

-- 4.3 service_role（crawl ジョブ用、特権・必須）
grant select, insert, update, delete on public.court_availability_notifications to service_role;


-- =============================================================================
-- ROLLBACK（緊急時のみ手動で実行）
-- =============================================================================
-- ROLLBACK: revoke all on public.court_availability_notifications from service_role;
-- ROLLBACK: drop policy if exists "court_availability_notifications_service_all" on public.court_availability_notifications;
-- ROLLBACK: drop table if exists public.court_availability_notifications;
