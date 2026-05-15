<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";

/**
 * /members のページネーション。25 件 / ページ固定。
 *
 * 関連: openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 */

const props = defineProps<{
  page: number;
  total: number;
  per: number;
}>();

const emit = defineEmits<{ "update:page": [page: number] }>();

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.total / props.per)),
);
const isFirst = computed(() => props.page <= 1);
const isLast = computed(() => props.page >= totalPages.value);

const visiblePages = computed<number[]>(() => {
  const total = totalPages.value;
  const cur = props.page;
  const win = 5;
  let start = Math.max(1, cur - 2);
  let end = Math.min(total, start + win - 1);
  if (end - start < win - 1) {
    start = Math.max(1, end - win + 1);
  }
  const list: number[] = [];
  for (let i = start; i <= end; i++) list.push(i);
  return list;
});

function goPrev(): void {
  if (!isFirst.value) emit("update:page", props.page - 1);
}
function goNext(): void {
  if (!isLast.value) emit("update:page", props.page + 1);
}
function goTo(p: number): void {
  if (p !== props.page) emit("update:page", p);
}
</script>

<template>
  <nav
    class="flex items-center justify-between border-t border-hairline bg-paper px-hq-8 py-hq-3"
    aria-label="ページネーション"
  >
    <p class="font-mono text-xs uppercase tracking-widest text-muted">
      {{ total }} 名 · {{ page }} / {{ totalPages }} ページ
    </p>
    <div class="flex items-center gap-hq-2">
      <Button
        variant="ghost"
        size="sm"
        :disabled="isFirst"
        aria-label="前のページ"
        @click="goPrev"
      >
        前へ
      </Button>
      <Button
        v-for="p in visiblePages"
        :key="p"
        :variant="p === page ? 'primary' : 'ghost'"
        size="sm"
        :aria-current="p === page ? 'page' : undefined"
        :aria-label="`${p} ページ目`"
        @click="goTo(p)"
      >
        {{ p }}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :disabled="isLast"
        aria-label="次のページ"
        @click="goNext"
      >
        次へ
      </Button>
    </div>
  </nav>
</template>
