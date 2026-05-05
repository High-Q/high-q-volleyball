<script setup lang="ts">
import { computed } from "vue";

/**
 * pending 件数 Badge。
 * count > 0 のときのみ赤系で表示、count === 0 のときは描画されない。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: pending 件数 Badge / TopNav / Dashboard サマリ)
 *   openspec/changes/admin-identity-document-review/design.md (D12, D17)
 */

interface Props {
  count: number;
}
const props = defineProps<Props>();

const visible = computed(() => props.count > 0);
const ariaLabel = computed(() => `未対応の書類 ${props.count} 件`);
</script>

<template>
  <span
    v-if="visible"
    :aria-label="ariaLabel"
    class="inline-flex items-center justify-center rounded-full bg-danger px-hq-2 py-hq-1 text-xs font-jp font-medium text-paper"
    role="status"
  >
    {{ count }}
  </span>
</template>
