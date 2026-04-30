import { ref, watch, type Ref } from "vue";
import { useEventsFilter } from "@/features/events-filter";
import {
  fetchEventsList,
  type EventListRow,
  type FetchErrorCode,
} from "@/entities/event";

/**
 * /events 画面のデータ取得 composable。
 *
 * `useEventsFilter` から filter を読み、変更を watch して `fetchEventsList`
 * を発火する。検索文字列は連打抑制のため 200ms の debounce を効かせる。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *       openspec/changes/admin-events-list-screen/design.md (§4)
 */

const PER_PAGE = 25;
const DEBOUNCE_MS = 200;

export interface UseEventsListData {
  data: Ref<ReadonlyArray<EventListRow>>;
  total: Ref<number>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  errorCode: Ref<FetchErrorCode | null>;
  refetch: () => Promise<void>;
}

export function useEventsListData(): UseEventsListData {
  const { filter } = useEventsFilter();

  const data = ref<ReadonlyArray<EventListRow>>([]) as Ref<
    ReadonlyArray<EventListRow>
  >;
  const total = ref<number>(0);
  const isPending = ref<boolean>(false);
  const isError = ref<boolean>(false);
  const errorCode = ref<FetchErrorCode | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestSeq = 0;

  async function load(): Promise<void> {
    const seq = ++requestSeq;
    isPending.value = true;
    isError.value = false;
    errorCode.value = null;

    const result = await fetchEventsList({
      ...filter.value,
      per: PER_PAGE,
    });

    // 古いリクエストが返ってきても state を上書きしない
    if (seq !== requestSeq) return;

    if (result.ok) {
      data.value = result.value.rows;
      total.value = result.value.total;
    } else {
      isError.value = true;
      errorCode.value = result.error.code;
    }
    isPending.value = false;
  }

  function schedule(immediate: boolean): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (immediate) {
      void load();
    } else {
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void load();
      }, DEBOUNCE_MS);
    }
  }

  // 初回ロード
  void load();

  // search の変更は debounce
  watch(
    () => filter.value.search,
    () => schedule(false),
  );
  // それ以外のフィルタ変更は即時。配列ではなく concat 文字列で比較し、
  // 全フィールド同値時の false-positive trigger を回避する。
  watch(
    () =>
      [
        filter.value.period,
        filter.value.venueId ?? "",
        filter.value.visibility ?? "",
        filter.value.sort,
        filter.value.dir,
        filter.value.page,
      ].join("|"),
    () => schedule(true),
  );

  return {
    data,
    total,
    isPending,
    isError,
    errorCode,
    refetch: load,
  };
}
