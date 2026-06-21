-- =============================================================================
-- events.email_note 列追加 (reservation-email-day-details)
-- =============================================================================
-- 目的:
--   予約完了 / 予約内容変更メールに掲載する、イベント固有の任意追記メッセージを
--   保持する列を events に追加する。懇親会の案内や当日の集合補足など、会場固有の
--   注意事項 (venues.access_note) には収まらないイベントごとの案内に使う。
--
--   会員向けメールにそのまま掲載される自由文であり、AWS Legacy ID マーカー埋め込み
--   用途の `description` とは独立した列とする (data-schema spec)。NULL / 空文字は
--   メールに当該セクションを描画しない運用 (アプリ層 / レンダラで出し分け)。
--
-- 影響:
--   既存テーブルへの列追加のみ。既存行は NULL のまま (デフォルト NULL)。RLS は
--   既存 events ポリシーをそのまま継承するため変更不要。event_list_view 等の
--   既存ビューは列を明示列挙しており email_note を参照しないため再定義不要。
--
-- 関連:
--   openspec/changes/reservation-email-day-details/specs/data-schema/spec.md
--   openspec/changes/reservation-email-day-details/specs/reservation-notification-email/spec.md
--
-- ROLLBACK: 列を削除して元に戻すには下記を実行する:
--   alter table public.events drop column if exists email_note;
-- =============================================================================

alter table public.events
  add column if not exists email_note text;

comment on column public.events.email_note is
  '予約完了/変更メールに掲載するイベント固有の任意追記メッセージ。NULL/空文字は非掲載。会場固有の注意事項は venues.access_note を使う。';
