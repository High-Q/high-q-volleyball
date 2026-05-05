<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@high-q/ui";
import { formatFee } from "@/shared/lib/format-date";

const props = defineProps<{
  fee: number | null;
}>();

const showPendingMessage = ref<boolean>(false);
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function handleProceed(): void {
  showPendingMessage.value = true;
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
  }
  pendingTimer = setTimeout(() => {
    showPendingMessage.value = false;
  }, 3000);
}
</script>

<template>
  <div
    class="sticky bottom-0 left-0 right-0 bg-paper border-t border-hairline px-hq-5 py-hq-4 flex flex-col gap-hq-2"
    role="region"
    aria-label="予約アクション"
  >
    <p
      v-if="showPendingMessage"
      class="font-jp text-xs text-ink-soft m-0 bg-accent-soft border border-hairline rounded-hq-sm px-hq-3 py-hq-2 text-center"
      role="status"
      aria-live="polite"
    >
      予約機能は準備中です
    </p>

    <div class="flex items-center justify-between gap-hq-4">
      <span class="font-mono text-sm text-ink-soft">
        {{ formatFee(props.fee) }}
      </span>
      <Button variant="primary" size="md" @click="handleProceed">
        予約に進む
      </Button>
    </div>
  </div>
</template>
