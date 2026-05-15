<script setup lang="ts">
import { computed } from "vue";
import {
  MembersFilterToolbar,
  useMembersFilter,
} from "@/features/members-filter";
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
 * 詳細 sheet 自体は `widgets/member-detail-sheet` で実装され、
 * Page で並列に配置される。本 widget は `?detail=:id` クエリの開閉のみ担う。
 *
 * 関連: openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
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
        @click-row="openDetail"
        @update:sort="setSort"
      />
    </div>

    <MembersListPagination
      v-if="view === 'success'"
      :page="filter.page"
      :total="total"
      :per="PER_PAGE"
      @update:page="setPage"
    />
  </div>
</template>
