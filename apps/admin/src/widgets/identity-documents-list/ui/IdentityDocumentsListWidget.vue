<script setup lang="ts">
import { computed, onMounted } from "vue";
import {
  useIdentityDocumentsFilter,
  PER_PAGE,
} from "@/features/identity-documents-filter";
import { useIdentityDocumentsListData } from "../composables/useIdentityDocumentsListData";
import IdentityDocumentsToolbar from "./IdentityDocumentsToolbar.vue";
import IdentityDocumentsTable from "./IdentityDocumentsTable.vue";
import IdentityDocumentsListSkeleton from "./IdentityDocumentsListSkeleton.vue";
import IdentityDocumentsListEmpty from "./IdentityDocumentsListEmpty.vue";
import IdentityDocumentsListError from "./IdentityDocumentsListError.vue";
import IdentityDocumentsPagination from "./IdentityDocumentsPagination.vue";

/**
 * /identity-documents 画面のメイン widget。Toolbar + 4 状態の出し分け + Pagination。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D2, D3)
 */

const {
  filter,
  setStatus,
  setSearch,
  setPage,
  reset,
  ensureDefaultUrl,
} = useIdentityDocumentsFilter();

const { data, total, isPending, isError, errorCode, refetch } =
  useIdentityDocumentsListData();

// 初回マウント時に URL 自動補完 (?status=pending) を確実に行う
onMounted(() => {
  void ensureDefaultUrl();
});

const view = computed<"loading" | "empty" | "error" | "success">(() => {
  if (isError.value) return "error";
  if (isPending.value && data.value.length === 0) return "loading";
  if (data.value.length === 0) return "empty";
  return "success";
});
</script>

<template>
  <div class="flex h-full flex-col">
    <IdentityDocumentsToolbar
      :filter="filter"
      @update:search="setSearch"
      @update:status="setStatus"
    />

    <div class="flex-1 overflow-auto">
      <IdentityDocumentsListSkeleton v-if="view === 'loading'" />
      <IdentityDocumentsListError
        v-else-if="view === 'error'"
        :error-code="errorCode"
        @retry="refetch"
      />
      <IdentityDocumentsListEmpty
        v-else-if="view === 'empty'"
        :filter-status="filter.status"
        @reset-filter="reset"
      />
      <IdentityDocumentsTable v-else :rows="data" />
    </div>

    <IdentityDocumentsPagination
      v-if="view === 'success'"
      :page="filter.page"
      :total="total"
      :per="PER_PAGE"
      @update:page="setPage"
    />
  </div>
</template>
