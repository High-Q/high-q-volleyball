import { ref, shallowRef, type Ref } from "vue";
import { fetchUpcomingEvents, type EventListItem } from "@/entities/event";

export type UpcomingEventsState = {
  events: Ref<EventListItem[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reload: () => Promise<void>;
};

export function useUpcomingEvents(): UpcomingEventsState {
  const events = shallowRef<EventListItem[]>([]);
  const loading = ref<boolean>(true);
  const error = ref<Error | null>(null);

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      events.value = await fetchUpcomingEvents();
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
      events.value = [];
    } finally {
      loading.value = false;
    }
  }

  void reload();

  return { events, loading, error, reload };
}
