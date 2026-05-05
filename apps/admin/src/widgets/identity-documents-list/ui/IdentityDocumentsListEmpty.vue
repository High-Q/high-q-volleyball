<script setup lang="ts">
defineProps<{
  /** 現在のフィルタ状態。空状態でフィルタ変更を誘導するため。 */
  filterStatus: "pending" | "approved" | "rejected" | "all";
}>();

defineEmits<{
  resetFilter: [];
}>();

/**
 * /identity-documents 一覧の Empty 状態。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 4 状態 / Empty)
 */
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-hq-3 px-hq-8 py-hq-12 text-center"
    role="status"
  >
    <p class="font-jp text-base text-ink">該当する書類がありません</p>
    <p
      v-if="filterStatus !== 'all'"
      class="font-jp text-sm text-muted"
    >
      フィルタを「すべて」に変更すると確認できます。
    </p>
    <p v-else class="font-jp text-sm text-muted">
      まだ会員からの提出がありません。
    </p>
    <button
      v-if="filterStatus !== 'all'"
      type="button"
      class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      @click="$emit('resetFilter')"
    >
      フィルタをリセット
    </button>
  </div>
</template>
