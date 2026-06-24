-- =============================================================================
-- events.vol 回号の自動採番基盤 (event-vol-numbering / #158)
-- =============================================================================
-- 目的:
--   回号 (第N回 / vol.N) を events.name 埋め込みから独立カラム events.vol へ格上げ
--   し、開催日時順で自動採番する。開催済み (start_at <= now()) の回番号は永久固定、
--   未開催のみが日付順の割り込み・再スケジュールでシフトする。
--
-- 構成:
--   1. events.vol smallint 列 + 部分一意 index (非 NULL かつ非 cancelled のみ一意)
--   2. resequence_future_event_vols(): 未開催の vol を再計算する callable 関数
--      - 過去 (start_at <= now()) は対象外 = 凍結
--      - 未開催の中止は vol を NULL に解放、非中止は過去最大 vol からの連番
--      - 部分一意 index の transient 衝突を避けるため「未開催を一旦 NULL → 連番」の
--        two-step で UPDATE する
--   3. tg_resequence_event_vols(): 上記を呼ぶ statement-level トリガ関数
--      - AFTER INSERT/DELETE/UPDATE OF start_at, status で発火
--      - 再計算は vol 列のみ UPDATE するため UPDATE OF start_at,status に当たらず
--        再帰発火しない
--   4. 既存データ backfill: name の 第N回 / vol.NN をパースして vol へ移し name を
--      シリーズ名へ分離。最後に未開催分を resequence。
--
-- 影響 (重大):
--   本番 events 行の name を書き換え + vol を backfill する破壊的移行。適用前に prd
--   フルバックアップを取得すること。RLS は events 既存ポリシーを継承 (列追加のみ)。
--   採番関数は内部用途のため anon/public からは EXECUTE を REVOKE (RPC 非公開)。
--
-- 副作用:
--   resequence は未開催イベントの vol を更新するため、当該行の updated_at が
--   set_events_updated_at トリガで更新される (未開催は通常少数のため許容)。
--   INSERT 直後の RETURNING は vol=NULL を返す (AFTER STATEMENT で採番されるため)。
--   admin は保存後の再取得 / 編集画面で確定 vol を参照する。
--
-- 関連:
--   openspec/changes/event-vol-numbering/specs/event-vol-numbering/spec.md
--   openspec/changes/event-vol-numbering/specs/data-schema/spec.md
--   openspec/changes/event-vol-numbering/design.md (D1-D4)
--
-- ROLLBACK: 採番基盤を撤去して元に戻すには下記を実行する:
--   drop trigger if exists resequence_event_vols on public.events;
--   drop function if exists public.tg_resequence_event_vols();
--   drop function if exists public.resequence_future_event_vols();
--   drop index  if exists public.events_vol_unique;
--   alter table public.events drop column if exists vol;
--   -- name の回号分離は不可逆。name を元に戻すには適用前バックアップの events を
--   --   data restore する (vol drop 後に name を上書き)。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. vol 列
-- -----------------------------------------------------------------------------
alter table public.events
  add column if not exists vol smallint;

comment on column public.events.vol is
  '回号。開催日時順に自動採番 (event-vol-numbering)。NULL=未採番。name には埋め込まない。';

-- -----------------------------------------------------------------------------
-- 2. 再採番関数 (callable / void)
-- -----------------------------------------------------------------------------
create or replace function public.resequence_future_event_vols()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- (1) 未開催 (中止含む) の vol を一旦 NULL へ解放し、部分一意 index から外す。
  --     これにより以降の連番割当で transient な一意制約衝突が起きない。
  update public.events
     set vol = null
   where start_at > now()
     and vol is not null;

  -- (2) 未開催の非中止イベントを開催日時順に「過去の非中止最大 vol」からの連番で採番。
  with frozen as (
    select coalesce(max(vol), 0) as maxv
      from public.events
     where start_at <= now()
       and status <> 'cancelled'
       and vol is not null
  ), ordered as (
    select id,
           row_number() over (order by start_at, created_at) as rn
      from public.events
     where start_at > now()
       and status <> 'cancelled'
  )
  update public.events e
     set vol = frozen.maxv + ordered.rn
    from ordered, frozen
   where e.id = ordered.id;
end;
$$;

comment on function public.resequence_future_event_vols() is
  '未開催イベントの vol を開催日時順に再採番する (過去凍結 / 中止解放)。events 書き込みトリガから呼ばれる内部関数。';

revoke execute on function public.resequence_future_event_vols() from public;
revoke execute on function public.resequence_future_event_vols() from anon;

-- -----------------------------------------------------------------------------
-- 3. トリガ関数 + statement-level トリガ
-- -----------------------------------------------------------------------------
create or replace function public.tg_resequence_event_vols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.resequence_future_event_vols();
  return null;  -- AFTER STATEMENT トリガは戻り値を無視
end;
$$;

revoke execute on function public.tg_resequence_event_vols() from public;
revoke execute on function public.tg_resequence_event_vols() from anon;

drop trigger if exists resequence_event_vols on public.events;
create trigger resequence_event_vols
  after insert or delete or update of start_at, status on public.events
  for each statement
  execute function public.tg_resequence_event_vols();

-- -----------------------------------------------------------------------------
-- 4. 既存データ backfill: name の回号をパースして vol へ移し name を分離
-- -----------------------------------------------------------------------------
-- (a) 先頭「第N回」パターン (prod 標準)
update public.events
   set vol  = substring(name from '第\s*(\d+)\s*回')::smallint,
       name = trim(regexp_replace(name, '^\s*第\s*\d+\s*回\s*', ''))
 where name ~ '第\s*\d+\s*回';

-- (b) 末尾「vol.NN」パターン (第N回 で拾えなかったもの)
update public.events
   set vol  = substring(name from 'vol\.?\s*(\d+)\s*$')::smallint,
       name = trim(regexp_replace(name, '\s*vol\.?\s*\d+\s*$', '', 'i'))
 where vol is null
   and name ~* 'vol\.?\s*\d+\s*$';

-- (c) 未開催分を開催日時順で整える (過去の backfill 値はそのまま凍結)
select public.resequence_future_event_vols();

-- -----------------------------------------------------------------------------
-- 5. 部分一意 index (データ整合後に作成)
--    有効な回号 (非 NULL かつ非 cancelled) のみ一意。NULL / cancelled は重複許容。
-- -----------------------------------------------------------------------------
create unique index if not exists events_vol_unique
  on public.events (vol)
  where vol is not null and status <> 'cancelled';
