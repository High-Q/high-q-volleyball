<script setup lang="ts">
import { computed } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import FormField from "@/shared/ui/FormField.vue";
import Textarea from "@/shared/ui/Textarea.vue";
import {
  useIdentityDocumentReject,
  getRejectErrorMessage,
  MAX_REASON_LENGTH,
} from "../composables/useIdentityDocumentReject";

/**
 * 差し戻し AlertDialog (#171 admin-identity-document-review)。
 *
 * 2 段階モード:
 *   - editing: 理由テキストエリア (必須・最大 500 字) + 文字数カウンター + 「差し戻す」disabled 制御
 *   - success: success メッセージ + mailto: リンク + 「閉じる」
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 差し戻しアクション / 再提出依頼メール / 連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D8, D9, D23)
 */

const props = defineProps<{
  documentId: IdentityDocumentId;
  adminMemberId: MemberId;
  memberId: MemberId;
  memberName: string;
  /** すでに pending 以外の場合は trigger を disabled にする (二重承認防御) */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  rejected: [];
}>();

const {
  isOpen,
  phase,
  reason,
  rejectError,
  reviewSuccess,
  reasonLength,
  isReasonInvalid,
  canSubmit,
  mailtoHref,
  open,
  cancel,
  submit,
  closeAfterMail,
} = useIdentityDocumentReject(
  props.documentId,
  props.adminMemberId,
  props.memberId,
);

const errorMessage = computed(() =>
  rejectError.value ? getRejectErrorMessage(rejectError.value) : null,
);

const isOverLimit = computed(() => reasonLength.value > MAX_REASON_LENGTH);

function onClose() {
  closeAfterMail(() => emit("rejected"));
}

defineExpose({ open });
</script>

<template>
  <slot name="trigger" :open="open" :is-open="isOpen" :disabled="disabled">
    <button
      type="button"
      :disabled="disabled"
      :aria-disabled="disabled"
      :aria-label="`${memberName} の本人確認書類を差し戻し`"
      class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
      @click="open"
    >
      差し戻し
    </button>
  </slot>

  <AlertDialog
    :open="isOpen"
    @update:open="
      (next) => {
        if (!next) {
          if (phase === 'success') onClose();
          else cancel();
        }
      }
    "
  >
    <AlertDialogContent>
      <!-- editing / submitting フェーズ -->
      <template v-if="phase !== 'success'">
        <AlertDialogHeader>
          <AlertDialogTitle>この書類を差し戻しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            {{ memberName }} さんに再提出を依頼します。<br />
            差し戻し時は当該会員の予約 (reserved / waitlist) も自動でキャンセルされます。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <FormField
          label="差し戻し理由 (必須)"
          html-for="reject-reason"
          :error="isOverLimit ? '500 文字以内で入力してください' : undefined"
          :hint="
            !isOverLimit
              ? `${reasonLength} / ${MAX_REASON_LENGTH} 文字`
              : undefined
          "
        >
          <template #default="{ fieldId, messageId, ariaInvalid }">
            <Textarea
              :id="fieldId"
              v-model="reason"
              :rows="4"
              :maxlength="MAX_REASON_LENGTH + 50"
              :aria-invalid="ariaInvalid"
              :aria-describedby="messageId"
              placeholder="例: 画像が不鮮明で氏名・住所が読み取れません"
            />
          </template>
        </FormField>

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
            :disabled="phase === 'submitting'"
            class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0"
            @click="cancel"
          >
            キャンセル
          </button>
          <button
            type="button"
            :disabled="!canSubmit"
            :aria-busy="phase === 'submitting'"
            class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
            @click="submit"
          >
            {{ phase === "submitting" ? "処理中…" : "差し戻す" }}
          </button>
        </AlertDialogFooter>
      </template>

      <!-- success フェーズ: mailto: リンク表示 -->
      <template v-else-if="reviewSuccess">
        <AlertDialogHeader>
          <AlertDialogTitle>差し戻しが完了しました</AlertDialogTitle>
          <AlertDialogDescription>
            {{ memberName }} さんに再提出依頼メールを送信してください。<br />
            <template v-if="reviewSuccess.cancelledCount > 0">
              本人確認の再提出が必要となったため、お持ちの予約 {{ reviewSuccess.cancelledCount }} 件もキャンセルされました。
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <a
          v-if="mailtoHref"
          :href="mailtoHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center rounded-hq-sm bg-accent px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          ユーザーへ再提出依頼メールを送信
        </a>

        <AlertDialogFooter>
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            @click="onClose"
          >
            閉じる
          </button>
        </AlertDialogFooter>
      </template>
    </AlertDialogContent>
  </AlertDialog>
</template>
