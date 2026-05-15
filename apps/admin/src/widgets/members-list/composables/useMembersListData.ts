import { ref, watch, type Ref } from "vue";
import { useMembersFilter } from "@/features/members-filter";
import {
  fetchMembersList,
  type FetchErrorCode,
  type MemberListRow,
} from "@/entities/member";

/**
 * /members 画面のデータ取得 composable。
 *
 * `useMembersFilter` から filter を読み、変更を watch して `fetchMembersList`
 * を発火する。検索文字列は連打抑制のため 200ms の debounce を効かせる。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 */

const PER_PAGE = 25;
const DEBOUNCE_MS = 200;

export interface UseMembersListData {
  rows: Ref<ReadonlyArray<MemberListRow>>;
  total: Ref<number>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  errorCode: Ref<FetchErrorCode | null>;
  refetch: () => Promise<void>;
  /** 楽観的更新用: 一覧キャッシュのメモ列を書き換える。 */
  patchAdminNote: (memberId: string, next: string | null) => void;
}

export function useMembersListData(): UseMembersListData {
  const { filter } = useMembersFilter();

  const rows = ref<ReadonlyArray<MemberListRow>>([]) as Ref<
    ReadonlyArray<MemberListRow>
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

    const f = filter.value;
    const result = await fetchMembersList(
      {
        exp: f.exp,
        attendedRange: f.attendedRange,
        lastPeriod: f.lastPeriod,
        q: f.search,
      },
      { key: f.sort, dir: f.dir },
      { page: f.page, perPage: PER_PAGE },
    );

    if (seq !== requestSeq) return;

    if (result.ok) {
      rows.value = result.value.rows;
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

  function patchAdminNote(memberId: string, next: string | null): void {
    rows.value = rows.value.map((r) =>
      (r.id as unknown as string) === memberId
        ? { ...r, admin_note: next }
        : r,
    );
  }

  void load();

  watch(
    () => filter.value.search,
    () => schedule(false),
  );
  watch(
    () =>
      [
        filter.value.exp ?? "",
        filter.value.attendedRange ?? "",
        filter.value.lastPeriod ?? "",
        filter.value.sort,
        filter.value.dir,
        filter.value.page,
      ].join("|"),
    () => schedule(true),
  );

  return {
    rows,
    total,
    isPending,
    isError,
    errorCode,
    refetch: load,
    patchAdminNote,
  };
}
