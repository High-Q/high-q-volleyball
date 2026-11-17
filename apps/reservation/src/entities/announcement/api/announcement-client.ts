import { unsafeAnnouncementId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { Announcement } from "../model/types";

/**
 * 会員向けお知らせの取得。
 *
 * entities/event/api/event-client.ts を手本にした自前 fetch 関数（TanStack 不使用）。
 * 出す相手が members / all の行だけを掲載開始の新しい順に取得する。掲載期間内かどうか・
 * 掲載前/終了後の非表示は RLS が担保するため、ここでは now 比較を行わない。
 * 認証済み会員として読むため特別な認証処理は不要（getSupabase 共有インスタンスが
 * authenticated トークンを保持する）。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/reservation-announcements/spec.md
 */

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  publish_start: string;
};

function rowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: unsafeAnnouncementId(row.id),
    title: row.title,
    body: row.body,
    publishStart: row.publish_start,
  };
}

/** 会員向け（members / all）の掲載中お知らせを掲載開始の新しい順で取得する。 */
export async function fetchMemberAnnouncements(): Promise<Announcement[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, publish_start")
    .in("audience", ["members", "all"])
    .order("publish_start", { ascending: false });
  if (error) {
    throw error;
  }
  if (data === null) {
    return [];
  }
  return (data as unknown as AnnouncementRow[]).map(rowToAnnouncement);
}
