<script setup lang="ts">
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type { StatusFilter } from "@/entities/identity-document";
import type { FilterState } from "@/features/identity-documents-filter";

/**
 * /identity-documents 画面の Toolbar。検索 + ステータスフィルタ。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: ステータスフィルタと URL クエリ同期 / 検索)
 */

const props = defineProps<{
  filter: FilterState;
}>();

const emit = defineEmits<{
  "update:search": [value: string];
  "update:status": [value: StatusFilter];
}>();

const STATUS_OPTIONS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "pending", label: "未対応" },
  { value: "approved", label: "承認済" },
  { value: "rejected", label: "差し戻し" },
  { value: "all", label: "すべて" },
];

function onSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:search", target.value);
}

function onStatusChange(value: string): void {
  emit("update:status", value as StatusFilter);
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-hq-3 border-b border-hairline bg-paper px-hq-8 py-hq-3"
  >
    <div class="w-60">
      <Input
        type="search"
        :model-value="props.filter.search"
        placeholder="氏名・メールで検索…"
        aria-label="本人確認書類の検索"
        @input="onSearchInput"
      />
    </div>

    <Select
      :model-value="props.filter.status"
      @update:model-value="onStatusChange"
    >
      <SelectTrigger class="w-36" aria-label="ステータスフィルタ">
        <SelectValue placeholder="ステータス" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="option in STATUS_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
