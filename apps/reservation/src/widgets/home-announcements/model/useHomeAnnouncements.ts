import { ref, shallowRef, type Ref } from "vue";
import { fetchMemberAnnouncements, type Announcement } from "@/entities/announcement";

/**
 * 会員ホームのお知らせ取得 composable（自前 ref + reload 流儀・TanStack 不使用）。
 * features/event-listing/composables/useUpcomingEvents.ts を手本にする。
 *
 * 掲示は非クリティカルなので、取得失敗時は error を保持しつつ items は空に保ち、
 * 呼び出し側（HomeAnnouncements.vue）は何も描画しない（fail-silent）。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/reservation-announcements/spec.md
 */
export type HomeAnnouncementsState = {
  items: Ref<Announcement[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reload: () => Promise<void>;
};

export function useHomeAnnouncements(): HomeAnnouncementsState {
  const items = shallowRef<Announcement[]>([]);
  const loading = ref<boolean>(true);
  const error = ref<Error | null>(null);

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      items.value = await fetchMemberAnnouncements();
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  void reload();

  return { items, loading, error, reload };
}
