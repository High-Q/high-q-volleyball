<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useEventsFilter } from "@/features/events-filter";
import { useEventsListData } from "../composables/useEventsListData";
import { useVenues } from "@/entities/venue";
import EventsToolbar from "./EventsToolbar.vue";
import EventsTable from "./EventsTable.vue";
import EventsTableSkeleton from "./EventsTableSkeleton.vue";
import EventsEmptyState from "./EventsEmptyState.vue";
import EventsErrorState from "./EventsErrorState.vue";
import EventsPagination from "./EventsPagination.vue";

/**
 * /events 画面のメイン widget。Toolbar + 4 状態の出し分け + Pagination を統合する。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *       openspec/changes/admin-events-list-screen/design.md (§4)
 */

const router = useRouter();

const {
  filter,
  isFiltered,
  setPeriod,
  setVenue,
  setVisibility,
  setSearch,
  setSort,
  setPage,
  reset,
} = useEventsFilter();

const { data, total, isPending, isError, errorCode, refetch } =
  useEventsListData();

const { venues } = useVenues();

const PER_PAGE = 25;

const view = computed<"loading" | "empty" | "error" | "success">(() => {
  if (isError.value) return "error";
  if (isPending.value && data.value.length === 0) return "loading";
  if (data.value.length === 0) return "empty";
  return "success";
});

function goNew(): void {
  void router.push({ name: "events-new" });
}
</script>

<template>
  <div class="flex h-full flex-col">
    <EventsToolbar
      :filter="filter"
      :venues="venues"
      @update:search="setSearch"
      @update:period="setPeriod"
      @update:venue="setVenue"
      @update:visibility="setVisibility"
      @click-new="goNew"
    />

    <div class="flex-1 overflow-auto">
      <EventsTableSkeleton v-if="view === 'loading'" />

      <EventsErrorState
        v-else-if="view === 'error' && errorCode !== null"
        :error-code="errorCode"
        @retry="refetch"
      />

      <EventsEmptyState
        v-else-if="view === 'empty'"
        :is-filtered="isFiltered"
        @click-new="goNew"
        @click-reset="reset"
      />

      <EventsTable
        v-else
        :rows="data"
        :sort="filter.sort"
        :dir="filter.dir"
        @update:sort="setSort"
      />
    </div>

    <EventsPagination
      v-if="view === 'success'"
      :page="filter.page"
      :total="total"
      :per="PER_PAGE"
      @update:page="setPage"
    />
  </div>
</template>
