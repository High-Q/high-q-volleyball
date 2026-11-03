<script setup lang="ts">
import { computed, ref } from "vue";
import type { MemberId } from "@high-q/shared";
import {
  MembersFilterToolbar,
  useMembersFilter,
} from "@/features/members-filter";
import { useAuthSession } from "@/features/auth";
import {
  useMembersSelection,
  useBulkExport,
  BulkExportToolbar,
  ExportResultDialog,
  type BulkExportResult,
} from "@/features/identity-document-bulk-export";
import { useMembersListData } from "../composables/useMembersListData";
import MembersListTable from "./MembersListTable.vue";
import MembersListPagination from "./MembersListPagination.vue";
import MembersTableSkeleton from "./MembersTableSkeleton.vue";
import MembersEmptyState from "./MembersEmptyState.vue";
import MembersErrorState from "./MembersErrorState.vue";

/**
 * /members 画面のメイン widget。Toolbar + 4 状態 + Pagination + 行クリック
 * で詳細 sheet を開く制御を統合する。
 *
 * #172: 会員の複数選択 + 役所提出用一括ダウンロード（ツールバーから直接起動 +
 * 結果ダイアログ）を統合する。
 *
 * 詳細 sheet 自体は `widgets/member-detail-sheet` で実装され、
 * Page で並列に配置される。本 widget は `?detail=:id` クエリの開閉のみ担う。
 *
 * 関連: openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *       openspec/changes/admin-identity-document-bulk-export/specs/admin-members-list/spec.md
 */

const {
  filter,
  isFiltered,
  setSearch,
  setExp,
  setAttendedRange,
  setLastPeriod,
  setSort,
  setPage,
  openDetail,
  reset,
} = useMembersFilter();

const { rows, total, isPending, isError, errorCode, refetch, patchAdminNote } =
  useMembersListData();

const PER_PAGE = 25;

// Page から sheet 保存後の楽観的更新を呼べるよう公開する。
defineExpose({ patchAdminNote, refetch });

const view = computed<"loading" | "empty" | "error" | "success">(() => {
  if (isError.value) return "error";
  if (isPending.value && rows.value.length === 0) return "loading";
  if (rows.value.length === 0) return "empty";
  return "success";
});

// ---------------------------------------------------------------------------
// #172 複数選択 + 一括ダウンロード
// ---------------------------------------------------------------------------
const session = useAuthSession();
const selection = useMembersSelection();
const bulkExport = useBulkExport();

// 現ページの選択可能 id（本人確認書類を 1 件以上持つ会員のみ選択可）
const pageSelectableIds = computed<MemberId[]>(() =>
  rows.value.filter((r) => r.has_identity_document).map((r) => r.id),
);

const selectedIdStrings = computed<ReadonlySet<string>>(
  () => selection.selectedIds.value as ReadonlySet<string>,
);
const allSelected = computed(() =>
  selection.pageAllSelected(pageSelectableIds.value),
);
const indeterminate = computed(() =>
  selection.pageIndeterminate(pageSelectableIds.value),
);

function onToggleSelect(memberId: string): void {
  selection.toggle(memberId as unknown as MemberId);
}

function onToggleSelectAll(): void {
  selection.setPageSelection(pageSelectableIds.value, !allSelected.value);
}

// 結果ダイアログ（準備ダイアログは廃止。電話は DB 値を直接出力し、ツールバーの
// 「ダウンロード」から即 ZIP を生成する）
const resultOpen = ref(false);
const exportResult = ref<BulkExportResult | null>(null);
const exportError = ref<string | null>(null);

const busy = computed(() => bulkExport.phase.value === "running");

async function runExport(): Promise<void> {
  if (busy.value) return;
  const ids = selection.toArray();
  if (ids.length === 0) return;
  const adminMemberId = session.session.value?.user.id as
    | MemberId
    | undefined;
  if (!adminMemberId) {
    exportError.value =
      "管理者セッションが確認できませんでした。再ログインしてください。";
    exportResult.value = null;
    resultOpen.value = true;
    return;
  }
  const result = await bulkExport.run({ selectedIds: ids, adminMemberId });
  if (result.ok) {
    exportResult.value = result.value;
    exportError.value = null;
  } else {
    exportResult.value = null;
    exportError.value = result.error.message;
  }
  resultOpen.value = true;
}

function onRetry(): void {
  resultOpen.value = false;
  void runExport();
}
</script>

<template>
  <div class="flex h-full flex-col">
    <MembersFilterToolbar
      :filter="filter"
      :total="total"
      @update:search="setSearch"
      @update:exp="setExp"
      @update:attended-range="setAttendedRange"
      @update:last-period="setLastPeriod"
    />

    <BulkExportToolbar
      v-if="selection.count.value > 0"
      :count="selection.count.value"
      :busy="busy"
      @download="runExport"
      @clear="selection.clear"
    />

    <div class="flex-1 overflow-auto">
      <MembersTableSkeleton v-if="view === 'loading'" />

      <MembersErrorState
        v-else-if="view === 'error' && errorCode !== null"
        :error-code="errorCode"
        @retry="refetch"
      />

      <MembersEmptyState
        v-else-if="view === 'empty'"
        :is-filtered="isFiltered"
        @click-reset="reset"
      />

      <MembersListTable
        v-else
        :rows="rows"
        :sort="filter.sort"
        :dir="filter.dir"
        show-selection
        :selected-ids="selectedIdStrings"
        :all-selected="allSelected"
        :indeterminate="indeterminate"
        @click-row="openDetail"
        @update:sort="setSort"
        @toggle-select="onToggleSelect"
        @toggle-select-all="onToggleSelectAll"
      />
    </div>

    <MembersListPagination
      v-if="view === 'success'"
      :page="filter.page"
      :total="total"
      :per="PER_PAGE"
      @update:page="setPage"
    />

    <ExportResultDialog
      :open="resultOpen"
      :result="exportResult"
      :error-message="exportError"
      @update:open="resultOpen = $event"
      @retry="onRetry"
    />
  </div>
</template>
