import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { eventQueryOptions } from "@entities/event";
import type { LpEvent } from "@entities/event/api/eventQueries";

export function useNextSession() {
  const { data, isPending, isError } = useQuery(eventQueryOptions.list());

  const nextEvent = computed<LpEvent | null>(() => {
    const list = (data.value ?? []) as LpEvent[];
    return list.length > 0 ? list[0]! : null;
  });

  const isEmpty = computed(
    () => !isPending.value && !isError.value && nextEvent.value === null,
  );

  return { nextEvent, isPending, isError, isEmpty };
}
