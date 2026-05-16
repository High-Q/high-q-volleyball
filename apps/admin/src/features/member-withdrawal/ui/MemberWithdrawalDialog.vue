<script setup lang="ts">
import { computed } from "vue";
import type { MemberId } from "@high-q/shared";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import { Input, Label } from "@/shared/ui";
import {
  useMemberWithdrawal,
  getWithdrawErrorMessage,
} from "../composables/useMemberWithdrawal";

/**
 * 会員強制削除 Dialog。danger AlertDialog でメール再入力一致を要求する。
 *
 * 関連:
 *   openspec/changes/member-withdrawal-flow/specs/admin-members-list/spec.md
 *     "Requirement: 削除確認 AlertDialog"
 */

const props = defineProps<{
  memberId: MemberId;
  targetEmail: string;
  /** 削除に伴い自動キャンセルされる未来予約件数 */
  upcomingReservationCount: number;
  /** 過去予約として匿名化される件数 */
  pastReservationCount: number;
}>();

const emit = defineEmits<{
  withdrawn: [];
}>();

const withdrawal = useMemberWithdrawal({
  memberId: props.memberId,
  targetEmail: props.targetEmail,
  onSuccess: () => emit("withdrawn"),
});

const errorMessage = computed(() =>
  withdrawal.withdrawError.value
    ? getWithdrawErrorMessage(withdrawal.withdrawError.value)
    : null,
);

const emailInputId = "member-withdrawal-email-confirm";

defineExpose({ open: withdrawal.open });
</script>

<template>
  <slot
    name="trigger"
    :open="withdrawal.open"
    :is-open="withdrawal.isOpen.value"
  />
  <AlertDialog
    :open="withdrawal.isOpen.value"
    @update:open="
      (next) => {
        if (!next) withdrawal.cancel();
      }
    "
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>この会員を削除しますか？</AlertDialogTitle>
        <AlertDialogDescription>
          以下のデータが完全に削除されます。元に戻せません。
        </AlertDialogDescription>
      </AlertDialogHeader>

      <ul
        class="space-y-hq-1 font-jp text-sm text-ink list-disc pl-hq-5"
        aria-label="削除対象"
      >
        <li>会員の基本情報（氏名・メール・連絡先・経験レベル・運営メモ）</li>
        <li>本人確認書類が提出済みの場合、画像オブジェクトを含めて連鎖削除</li>
        <li>認証アカウント（Auth user）</li>
        <li v-if="pastReservationCount > 0">
          過去予約 {{ pastReservationCount }} 件は匿名化したまま残ります
          （電話番号・メモは消去）
        </li>
      </ul>

      <p
        v-if="upcomingReservationCount > 0"
        class="font-jp text-sm text-ink rounded-hq-sm bg-paper-warm px-hq-3 py-hq-2"
      >
        未来予約 {{ upcomingReservationCount }} 件は退会前に自動キャンセルされます。
      </p>

      <div class="space-y-hq-1">
        <Label :for="emailInputId">
          確認のため対象会員のメールアドレスを入力してください
        </Label>
        <Input
          :id="emailInputId"
          v-model="withdrawal.emailInput.value"
          type="email"
          autocomplete="off"
          :placeholder="targetEmail"
          :disabled="withdrawal.isWithdrawing.value"
        />
        <p class="font-mono text-xs text-muted">
          期待値: <span class="select-text">{{ targetEmail }}</span>
        </p>
      </div>

      <p
        v-if="errorMessage"
        role="alert"
        class="font-jp text-sm text-danger bg-danger-soft border border-danger/40 rounded-hq-sm px-hq-3 py-hq-2"
      >
        {{ errorMessage }}
      </p>

      <AlertDialogFooter>
        <button
          type="button"
          :disabled="withdrawal.isWithdrawing.value"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0"
          @click="withdrawal.cancel"
        >
          キャンセル
        </button>
        <button
          type="button"
          :disabled="!withdrawal.isEmailMatched.value || withdrawal.isWithdrawing.value"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
          @click="withdrawal.confirm"
        >
          {{ withdrawal.isWithdrawing.value ? "削除中…" : "削除する" }}
        </button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
