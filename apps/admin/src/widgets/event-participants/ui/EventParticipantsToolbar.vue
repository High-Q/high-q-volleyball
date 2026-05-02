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
import type { ExperienceLevel } from "@high-q/shared";
import type {
  CheckinState,
  ParticipantsFilter,
} from "@/features/participants-filter";

/**
 * 参加者一覧の Toolbar。検索 + 経験フィルタ + 状態フィルタ + 件数サマリ。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const props = defineProps<{
  filter: ParticipantsFilter;
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:experience": [value: ExperienceLevel | undefined];
  "update:checkinState": [value: CheckinState | undefined];
}>();

const ALL = "__all__";

const EXP_OPTIONS: ReadonlyArray<{ value: ExperienceLevel; label: string }> = [
  { value: "beginner", label: "初回" },
  { value: "intermediate", label: "中級" },
  { value: "experienced", label: "経験者" },
];

const CK_OPTIONS: ReadonlyArray<{ value: CheckinState; label: string }> = [
  { value: "unchecked", label: "未チェックイン" },
  { value: "checked", label: "チェックイン済" },
];

const expValue = computed(() => props.filter.experience ?? ALL);
const ckValue = computed(() => props.filter.checkinState ?? ALL);

function onSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:search", target.value);
}

function onExpChange(value: string): void {
  emit("update:experience", value === ALL ? undefined : (value as ExperienceLevel));
}

function onCkChange(value: string): void {
  emit("update:checkinState", value === ALL ? undefined : (value as CheckinState));
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-hq-3 border-b border-hairline bg-paper px-hq-8 py-hq-3"
  >
    <div class="w-60">
      <Input
        type="search"
        :model-value="filter.q"
        placeholder="名前・メールで検索…"
        aria-label="参加者検索"
        @input="onSearchInput"
      />
    </div>

    <Select :model-value="expValue" @update:model-value="onExpChange">
      <SelectTrigger class="w-32" aria-label="経験フィルタ">
        <SelectValue placeholder="経験" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">経験: すべて</SelectItem>
        <SelectItem
          v-for="opt in EXP_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select :model-value="ckValue" @update:model-value="onCkChange">
      <SelectTrigger class="w-40" aria-label="チェックイン状態フィルタ">
        <SelectValue placeholder="状態" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">状態: すべて</SelectItem>
        <SelectItem
          v-for="opt in CK_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

  </div>
</template>
