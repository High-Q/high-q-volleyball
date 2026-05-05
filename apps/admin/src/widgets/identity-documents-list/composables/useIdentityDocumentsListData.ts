import { ref, watch, type Ref } from "vue";
import {
  useIdentityDocumentsFilter,
  PER_PAGE,
} from "@/features/identity-documents-filter";
import {
  fetchIdentityDocumentsList,
  type IdentityDocumentListRow,
  type FetchErrorCode,
} from "@/entities/identity-document";

/**
 * /identity-documents 画面のデータ取得 composable。
 *
 * - useIdentityDocumentsFilter から filter を読み、変更を watch して fetch を発火
 * - search 入力は 200ms debounce
 * - requestSeq ガードで古いリクエスト結果を捨てる (race condition 防止)
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D2)
 */

const DEBOUNCE_MS = 200;

export interface UseIdentityDocumentsListData {
  data: Ref<ReadonlyArray<IdentityDocumentListRow>>;
  total: Ref<number>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  errorCode: Ref<FetchErrorCode | null>;
  refetch: () => Promise<void>;
}

export function useIdentityDocumentsListData(): UseIdentityDocumentsListData {
  const { filter } = useIdentityDocumentsFilter();

  const data = ref<ReadonlyArray<IdentityDocumentListRow>>([]) as Ref<
    ReadonlyArray<IdentityDocumentListRow>
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

    const result = await fetchIdentityDocumentsList({
      status: filter.value.status,
      q: filter.value.search,
      page: filter.value.page,
      per: PER_PAGE,
    });

    if (seq !== requestSeq) return; // 古い結果は捨てる

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

  // 初回マウント時 + filter 変更時に再 fetch
  watch(
    () => filter.value,
    (next, prev) => {
      // search のみ変更なら debounce、それ以外は即時
      const onlySearchChanged =
        prev !== undefined &&
        next.status === prev.status &&
        next.page === prev.page &&
        next.search !== prev.search;
      schedule(!onlySearchChanged);
    },
    { immediate: true, deep: true },
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
