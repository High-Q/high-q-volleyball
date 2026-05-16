<script setup lang="ts">
import { ref } from "vue";
import AccountDeletionDialog from "./AccountDeletionDialog.vue";

/**
 * `/profile` 最下部の「アカウント削除」セクション。danger tone でボタンと
 * 説明文を表示し、押下で確認 Dialog を開く。
 *
 * 関連:
 *   openspec/changes/member-withdrawal-flow/specs/reservation-profile-page/spec.md
 */

const props = defineProps<{
  upcomingReservationCount: number;
}>();

const dialogRef = ref<InstanceType<typeof AccountDeletionDialog> | null>(null);

function open(): void {
  dialogRef.value?.open();
}
</script>

<template>
  <section
    class="flex flex-col gap-hq-3 rounded-hq-lg border border-danger/30 bg-surface p-hq-4"
    aria-labelledby="account-deletion-heading"
  >
    <h2
      id="account-deletion-heading"
      class="font-jp-display text-sm text-danger"
    >
      アカウント削除
    </h2>
    <p class="font-jp text-sm text-muted m-0">
      会員データを完全に削除します。元に戻せません。
    </p>
    <button
      type="button"
      class="inline-flex h-10 items-center justify-center self-start rounded-hq-md border border-danger bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger"
      @click="open"
    >
      アカウントを削除する
    </button>
    <AccountDeletionDialog
      ref="dialogRef"
      :upcoming-reservation-count="props.upcomingReservationCount"
    />
  </section>
</template>
