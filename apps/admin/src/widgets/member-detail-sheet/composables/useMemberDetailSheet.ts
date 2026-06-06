import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";
import { useMembersFilter } from "@/features/members-filter";
import {
  fetchMemberHistory,
  fetchMemberListRowById,
  type FetchErrorCode,
  type MemberHistoryRow,
  type MemberListRow,
} from "@/entities/member";

/**
 * 詳細 sheet のデータ取得 composable。
 *
 * `?detail=:id` クエリを購読し、対象 member の `MemberListRow` + 参加履歴を
 * 並列取得する。クエリが消えると state をクリアする。
 *
 * `source` 省略時は `useMembersFilter` を内部で使い、`/members` 画面の従来挙動を
 * そのまま保持する。`source` 指定時は注入された `detail` ref と `closeDetail`
 * を使うため、`/events/:id` 等の他ページから同じシートを再利用できる。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-members-list-screen/design.md (D6, D8)
 *   openspec/changes/link-event-participants-to-member-detail/design.md (D2)
 */

export interface MemberDetailSource {
  detail: ComputedRef<string | undefined>;
  closeDetail: () => Promise<void>;
}

export interface UseMemberDetailSheet {
  isOpen: Ref<boolean>;
  member: Ref<MemberListRow | null>;
  history: Ref<ReadonlyArray<MemberHistoryRow>>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  errorCode: Ref<FetchErrorCode | null>;
  close: () => Promise<void>;
  /** 楽観的更新: メモ保存後にローカル state の admin_note を書き換える。 */
  patchAdminNote: (next: string | null) => void;
  refetch: () => Promise<void>;
}

function defaultSource(): MemberDetailSource {
  const f = useMembersFilter();
  return {
    detail: computed<string | undefined>(() => f.filter.value.detail),
    closeDetail: f.closeDetail,
  };
}

export function useMemberDetailSheet(
  source?: MemberDetailSource,
): UseMemberDetailSheet {
  const { detail: detailRef, closeDetail } = source ?? defaultSource();

  const isOpen = ref<boolean>(false);
  const member = ref<MemberListRow | null>(null);
  const history = ref<ReadonlyArray<MemberHistoryRow>>([]) as Ref<
    ReadonlyArray<MemberHistoryRow>
  >;
  const isPending = ref<boolean>(false);
  const isError = ref<boolean>(false);
  const errorCode = ref<FetchErrorCode | null>(null);

  let requestSeq = 0;

  async function load(id: string): Promise<void> {
    const seq = ++requestSeq;
    isPending.value = true;
    isError.value = false;
    errorCode.value = null;

    const memberId = id as unknown as MemberId;
    const [memberRes, historyRes] = await Promise.all([
      fetchMemberListRowById(memberId),
      fetchMemberHistory(memberId),
    ]);

    if (seq !== requestSeq) return;

    if (!memberRes.ok) {
      isError.value = true;
      errorCode.value = memberRes.error.code;
      isPending.value = false;
      return;
    }
    if (memberRes.value === null) {
      isError.value = true;
      errorCode.value = "NOT_FOUND";
      member.value = null;
      history.value = [];
      isPending.value = false;
      return;
    }
    member.value = memberRes.value;

    if (!historyRes.ok) {
      isError.value = true;
      errorCode.value = historyRes.error.code;
      history.value = [];
      isPending.value = false;
      return;
    }
    history.value = historyRes.value;
    isPending.value = false;
  }

  function clear(): void {
    requestSeq++;
    member.value = null;
    history.value = [];
    isPending.value = false;
    isError.value = false;
    errorCode.value = null;
  }

  watch(
    () => detailRef.value,
    (id) => {
      if (id) {
        isOpen.value = true;
        void load(id);
      } else {
        isOpen.value = false;
        clear();
      }
    },
    { immediate: true },
  );

  async function close(): Promise<void> {
    await closeDetail();
  }

  function patchAdminNote(next: string | null): void {
    if (member.value) {
      member.value = { ...member.value, admin_note: next };
    }
  }

  async function refetch(): Promise<void> {
    const id = detailRef.value;
    if (id) {
      await load(id);
    }
  }

  return {
    isOpen,
    member,
    history,
    isPending,
    isError,
    errorCode,
    close,
    patchAdminNote,
    refetch,
  };
}
