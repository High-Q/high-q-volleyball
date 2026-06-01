<script setup lang="ts">
import { computed } from "vue";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type {
  AttendedRange,
  ExperienceFilter,
  LastPeriod,
} from "@/entities/member";
import type { MembersFilterState } from "../types";

/**
 * /members 画面の Toolbar。検索 / 経験 / 累計レンジ / 最終参加期間 を配置。
 *
 * 関連: openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *       openspec/changes/admin-members-list-screen/design.md (D9)
 */

defineProps<{ filter: MembersFilterState; total: number }>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:exp": [value: ExperienceFilter | undefined];
  "update:attendedRange": [value: AttendedRange | undefined];
  "update:lastPeriod": [value: LastPeriod | undefined];
}>();

const ALL = "__all__";

const EXP_OPTIONS: ReadonlyArray<{ value: ExperienceFilter; label: string }> = [
  { value: "beginner", label: "初回" },
  { value: "intermediate", label: "中級" },
  { value: "experienced", label: "経験者" },
];

const RANGE_OPTIONS: ReadonlyArray<{ value: AttendedRange; label: string }> = [
  { value: "first", label: "初回のみ" },
  { value: "2-5", label: "2-5 回" },
  { value: "6-10", label: "6-10 回" },
  { value: "11+", label: "11 回以上" },
];

const PERIOD_OPTIONS: ReadonlyArray<{ value: LastPeriod; label: string }> = [
  { value: "this-month", label: "今月" },
  { value: "3m", label: "3 ヶ月以内" },
  { value: "6m+", label: "半年以上前" },
];

function selectValue(v: string | undefined): string {
  return v ?? ALL;
}

function pick<T extends string>(value: string): T | undefined {
  return value === ALL ? undefined : (value as T);
}

function onSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:search", target.value);
}

const totalLabel = computed<string>(() => `${0} 〜 ${0}`);
void totalLabel.value; // 将来の表示用、現状未使用警告抑止
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-hq-3 border-b border-hairline bg-paper px-hq-8 py-hq-3"
  >
    <div class="w-60">
      <Input
        type="search"
        :model-value="filter.search"
        placeholder="名前・メール・メモで検索…"
        aria-label="会員検索"
        @input="onSearchInput"
      />
    </div>

    <Select
      :model-value="selectValue(filter.exp)"
      @update:model-value="(v) => emit('update:exp', pick<ExperienceFilter>(v as string))"
    >
      <SelectTrigger class="w-32" aria-label="経験フィルタ">
        <SelectValue placeholder="経験" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">すべて</SelectItem>
        <SelectItem v-for="opt in EXP_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select
      :model-value="selectValue(filter.attendedRange)"
      @update:model-value="(v) => emit('update:attendedRange', pick<AttendedRange>(v as string))"
    >
      <SelectTrigger class="w-36" aria-label="累計レンジフィルタ">
        <SelectValue placeholder="累計" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">すべて</SelectItem>
        <SelectItem v-for="opt in RANGE_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select
      :model-value="selectValue(filter.lastPeriod)"
      @update:model-value="(v) => emit('update:lastPeriod', pick<LastPeriod>(v as string))"
    >
      <SelectTrigger class="w-40" aria-label="最終参加期間フィルタ">
        <SelectValue placeholder="最終参加" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">すべて</SelectItem>
        <SelectItem v-for="opt in PERIOD_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <div
      class="ml-auto font-mono text-xs tracking-widest text-muted"
      aria-live="polite"
    >
      {{ total }} MEMBERS
    </div>
  </div>
</template>
