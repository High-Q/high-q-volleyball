import { ref, shallowRef, watch, type Ref } from "vue";
import { fetchEventDetail, type EventDetail } from "@/entities/event";

export type EventDetailState = {
  event: Ref<EventDetail | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  notFound: Ref<boolean>;
  reload: () => Promise<void>;
};

export function useEventDetail(idRef: Ref<string>): EventDetailState {
  const event = shallowRef<EventDetail | null>(null);
  const loading = ref<boolean>(true);
  const error = ref<Error | null>(null);
  const notFound = ref<boolean>(false);

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    notFound.value = false;
    event.value = null;
    try {
      const result = await fetchEventDetail(idRef.value);
      if (result === null) {
        notFound.value = true;
      } else {
        event.value = result;
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
    } finally {
      loading.value = false;
    }
  }

  watch(idRef, () => {
    void reload();
  }, { immediate: true });

  return { event, loading, error, notFound, reload };
}
