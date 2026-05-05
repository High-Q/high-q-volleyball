<script setup lang="ts">
import { Skeleton } from "@/shared/ui";

/**
 * /identity-documents 一覧の Loading 状態 (6 行 skeleton)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 4 状態 / Loading)
 */
</script>

<template>
  <div class="px-hq-8 py-hq-6" aria-busy="true" aria-live="polite">
    <div class="flex flex-col gap-hq-3">
      <Skeleton v-for="i in 6" :key="i" class="h-10 w-full" />
    </div>
  </div>
</template>
