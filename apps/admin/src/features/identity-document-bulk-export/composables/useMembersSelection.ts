import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";

/**
 * #172 会員一覧の複数選択状態を保持する composable。
 *
 * 選択は `Set<MemberId>` で保持し、ページ送り / フィルタ変更をまたいでも維持する
 * （state をページ変更で破棄しないため、呼び出し側が本 composable を一覧 widget の
 * スコープに置けば自然に保持される）。現ページ全選択 / indeterminate 判定は、
 * 呼び出し側が「選択可能な現ページの id 群」を渡して判定する。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-members-list/spec.md
 *   同 design.md (D7)
 */
export interface UseMembersSelection {
  /** 選択中 id の集合（読み取り用途。変更は提供メソッド経由で行う）。 */
  selectedIds: Ref<Set<MemberId>>;
  /** 選択件数。 */
  count: ComputedRef<number>;
  isSelected: (id: MemberId) => boolean;
  toggle: (id: MemberId) => void;
  add: (id: MemberId) => void;
  remove: (id: MemberId) => void;
  clear: () => void;
  /** 現ページの選択可能 id 群をまとめて選択 / 解除する。 */
  setPageSelection: (pageIds: MemberId[], selected: boolean) => void;
  /** 現ページの選択可能 id が全て選択済みか（空ページは false）。 */
  pageAllSelected: (pageIds: MemberId[]) => boolean;
  /** 現ページが一部のみ選択か（全選択ヘッダの indeterminate 判定、空ページは false）。 */
  pageIndeterminate: (pageIds: MemberId[]) => boolean;
  /** 選択 id を配列で取得する。 */
  toArray: () => MemberId[];
}

export function useMembersSelection(): UseMembersSelection {
  const selectedIds = ref<Set<MemberId>>(new Set<MemberId>());

  const count = computed(() => selectedIds.value.size);

  function isSelected(id: MemberId): boolean {
    return selectedIds.value.has(id);
  }

  function add(id: MemberId): void {
    selectedIds.value.add(id);
  }

  function remove(id: MemberId): void {
    selectedIds.value.delete(id);
  }

  function toggle(id: MemberId): void {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
  }

  function clear(): void {
    selectedIds.value.clear();
  }

  function setPageSelection(pageIds: MemberId[], selected: boolean): void {
    for (const id of pageIds) {
      if (selected) {
        selectedIds.value.add(id);
      } else {
        selectedIds.value.delete(id);
      }
    }
  }

  function pageAllSelected(pageIds: MemberId[]): boolean {
    if (pageIds.length === 0) return false;
    return pageIds.every((id) => selectedIds.value.has(id));
  }

  function pageIndeterminate(pageIds: MemberId[]): boolean {
    if (pageIds.length === 0) return false;
    const selectedOnPage = pageIds.filter((id) =>
      selectedIds.value.has(id),
    ).length;
    return selectedOnPage > 0 && selectedOnPage < pageIds.length;
  }

  function toArray(): MemberId[] {
    return [...selectedIds.value];
  }

  return {
    selectedIds,
    count,
    isSelected,
    toggle,
    add,
    remove,
    clear,
    setPageSelection,
    pageAllSelected,
    pageIndeterminate,
    toArray,
  };
}
