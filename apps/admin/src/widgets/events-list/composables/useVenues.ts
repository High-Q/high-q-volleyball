import { onMounted, ref, type Ref } from "vue";
import { getSupabase } from "@/shared/api/supabase";
import type { VenueId } from "@high-q/shared";

/**
 * Toolbar の会場フィルタ用に venues 一覧を取得する軽量 composable。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *
 * NOTE: venues 全体のドメイン抽象は将来 `entities/venue` に昇格する候補。
 *       本 change では filter dropdown の DTO 用途のみで widget 層に閉じる。
 */

export interface VenueOption {
  id: VenueId;
  name: string;
}

export interface UseVenues {
  venues: Ref<ReadonlyArray<VenueOption>>;
  reload: () => Promise<void>;
}

export function useVenues(): UseVenues {
  const venues = ref<ReadonlyArray<VenueOption>>([]) as Ref<
    ReadonlyArray<VenueOption>
  >;

  async function reload(): Promise<void> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("venues")
      .select("id, name")
      .order("name", { ascending: true });
    if (!error && Array.isArray(data)) {
      venues.value = data as VenueOption[];
    }
  }

  onMounted(() => {
    void reload();
  });

  return { venues, reload };
}
