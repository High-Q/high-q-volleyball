import { queryOptions } from "@tanstack/vue-query";
import { getSupabase } from "@shared/api";
import type { LpAnnouncement } from "../model/types";

/**
 * LP の公開お知らせ取得（general-announcements / #395）。
 *
 * 出す相手が public / all のお知らせを掲載開始の新しい順で取得する。
 * **掲載期間の絞り込みは RLS が担保**するため、クライアントでは now 比較を書かない
 * （audience の絞り込みと並び順のみ）。手本: entities/event/api/eventQueries.ts。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/lp-announcements/spec.md
 */

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  publish_start: string;
}

async function fetchPublicAnnouncements(): Promise<LpAnnouncement[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, publish_start")
    .in("audience", ["public", "all"])
    .order("publish_start", { ascending: false });

  if (error) {
    throw new Error(error.message || "failed to fetch announcements");
  }
  return ((data ?? []) as unknown as AnnouncementRow[]).map((row) => ({
    id:           row.id,
    title:        row.title,
    body:         row.body,
    publishStart: new Date(row.publish_start),
  }));
}

export const announcementQueryOptions = {
  list: () =>
    queryOptions({
      queryKey: ["announcements"] as const,
      queryFn:  fetchPublicAnnouncements,
    }),
};
