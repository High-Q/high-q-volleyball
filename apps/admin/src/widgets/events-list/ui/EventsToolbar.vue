<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type { Period } from "@/entities/event";
import type { FilterState } from "@/features/events-filter";
import type { EventVisibility, VenueId } from "@high-q/shared";

/**
 * Events 一覧の Toolbar。検索 / 期間 / 会場 / ステータス / 「新規作成」CTA を配置。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 */

const props = defineProps<{
  filter: FilterState;
  venues: ReadonlyArray<{ id: VenueId; name: string }>;
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:period": [value: Period];
  "update:venue": [value: VenueId | undefined];
  "update:visibility": [value: EventVisibility | undefined];
  clickNew: [];
}>();

const VENUE_ALL = "__all__";
const VISIBILITY_ALL = "__all__";

const PERIOD_OPTIONS: ReadonlyArray<{ value: Period; label: string }> = [
  { value: "upcoming", label: "今後" },
  { value: "this-month", label: "今月" },
  { value: "last-month", label: "先月" },
  { value: "past-all", label: "過去すべて" },
  { value: "all", label: "すべて" },
];

const VISIBILITY_OPTIONS: ReadonlyArray<{ value: EventVisibility; label: string }> =
  [
    { value: "published", label: "公開中" },
    { value: "draft", label: "下書き" },
    { value: "private", label: "限定公開" },
  ];

const venueValue = computed<string>(() =>
  props.filter.venueId ?? VENUE_ALL,
);

const visibilityValue = computed<string>(() =>
  props.filter.visibility ?? VISIBILITY_ALL,
);

function onSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:search", target.value);
}

function onPeriodChange(value: string): void {
  emit("update:period", value as Period);
}

function onVenueChange(value: string): void {
  emit("update:venue", value === VENUE_ALL ? undefined : (value as VenueId));
}

function onVisibilityChange(value: string): void {
  emit(
    "update:visibility",
    value === VISIBILITY_ALL ? undefined : (value as EventVisibility),
  );
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-hq-3 border-b border-hairline bg-paper px-hq-8 py-hq-3"
  >
    <div class="w-60">
      <Input
        type="search"
        :model-value="filter.search"
        placeholder="タイトル・会場で検索…"
        aria-label="イベント検索"
        @input="onSearchInput"
      />
    </div>

    <Select :model-value="filter.period" @update:model-value="onPeriodChange">
      <SelectTrigger class="w-32" aria-label="期間フィルタ">
        <SelectValue placeholder="期間" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="opt in PERIOD_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select :model-value="venueValue" @update:model-value="onVenueChange">
      <SelectTrigger class="w-48" aria-label="会場フィルタ">
        <SelectValue placeholder="会場" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="VENUE_ALL">すべての会場</SelectItem>
        <SelectItem v-for="v in venues" :key="v.id" :value="v.id">
          {{ v.name }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select
      :model-value="visibilityValue"
      @update:model-value="onVisibilityChange"
    >
      <SelectTrigger class="w-32" aria-label="ステータスフィルタ">
        <SelectValue placeholder="ステータス" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="VISIBILITY_ALL">すべて</SelectItem>
        <SelectItem
          v-for="opt in VISIBILITY_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <div class="ml-auto">
      <Button variant="primary" size="sm" @click="emit('clickNew')">
        新規作成
      </Button>
    </div>
  </div>
</template>
