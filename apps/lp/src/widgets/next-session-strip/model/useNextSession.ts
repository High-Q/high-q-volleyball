import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  availabilityQueryOptions,
  eventQueryOptions,
  formatAvailability,
} from "@entities/event";
import type { LpEvent } from "@entities/event/api/eventQueries";

export function useNextSession() {
  const { data, isPending, isError } = useQuery(eventQueryOptions.list());

  const nextEvent = computed<LpEvent | null>(() => {
    const list = (data.value ?? []) as LpEvent[];
    return list.length > 0 ? list[0]! : null;
  });

  // 直近イベントの残席のみ取得。失敗してもストリップ自体は壊さない
  // (グレースフル劣化): availabilityMap が undefined のままなら availability は null。
  const nextEventIds = computed(() =>
    nextEvent.value ? [nextEvent.value.id] : [],
  );
  const { data: availabilityMap } = useQuery(
    computed(() => availabilityQueryOptions.byIds(nextEventIds.value)),
  );

  const availability = computed(() => {
    if (!nextEvent.value) return null;
    return formatAvailability(
      availabilityMap.value?.get(nextEvent.value.id) ?? null,
    );
  });

  const isEmpty = computed(
    () => !isPending.value && !isError.value && nextEvent.value === null,
  );

  return { nextEvent, availability, isPending, isError, isEmpty };
}
