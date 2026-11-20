import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { announcementQueryOptions } from "@entities/announcement";
import type { LpAnnouncement } from "@entities/announcement";

/**
 * 公開お知らせ取得のラッパー composable（general-announcements / #395）。
 *
 * 掲載期間の判定は RLS が担保するため、ここでは取得した行をそのまま並べる。
 * hasItems は「読み込み完了 かつ エラーなし かつ 1 件以上」のときだけ true。
 */
export function useAnnouncements() {
  const { data, isPending, isError } = useQuery(announcementQueryOptions.list());

  const items = computed(() => (data.value ?? []) as LpAnnouncement[]);
  const hasItems = computed(
    () => !isPending.value && !isError.value && items.value.length > 0,
  );

  return { items, isPending, isError, hasItems };
}
