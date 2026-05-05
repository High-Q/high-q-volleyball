<script setup lang="ts">
import { computed } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import {
  useIdentityDocumentMaskDelete,
  getMaskDeleteErrorMessage,
} from "../composables/useIdentityDocumentMaskDelete";

/**
 * マスク漏れ即時削除 AlertDialog (#171)。
 *
 * マイナンバーカード書類のみで表示される (props.disabled で制御)。
 * 2 段階モード:
 *   - editing/submitting: 確認文言固定 + 「削除する」
 *   - success: success メッセージ + mailto: リンク + 「閉じる」
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: マスク漏れ即時削除アクション)
 *   openspec/changes/admin-identity-document-review/design.md (D10, D23)
 */

const props = defineProps<{
  documentId: IdentityDocumentId;
  adminMemberId: MemberId;
  memberId: MemberId;
  memberName: string;
  storagePaths: { front: string | null; back: string | null };
  disabled?: boolean;
}>();

const emit = defineEmits<{
  maskDeleted: [];
}>();

const {
  isOpen,
  phase,
  maskDeleteError,
  reviewSuccess,
  mailtoHref,
  open,
  cancel,
  submit,
  closeAfterMail,
} = useIdentityDocumentMaskDelete(
  props.documentId,
  props.adminMemberId,
  props.memberId,
  props.storagePaths,
);

const errorMessage = computed(() =>
  maskDeleteError.value ? getMaskDeleteErrorMessage(maskDeleteError.value) : null,
);

function onClose() {
  closeAfterMail(() => emit("maskDeleted"));
}

defineExpose({ open });
</script>

<template>
  <slot name="trigger" :open="open" :is-open="isOpen" :disabled="disabled">
    <button
      type="button"
      :disabled="disabled"
      :aria-disabled="disabled"
      :aria-label="`${memberName} のマイナンバー画像をマスク漏れ削除`"
      class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
      @click="open"
    >
      マスク漏れ削除
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
      <template v-if="phase !== 'success'">
        <AlertDialogHeader>
          <AlertDialogTitle>この画像を Storage から完全削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            個人番号のマスクが不十分な可能性があるため、Storage から完全削除し、
            ユーザーに再提出を依頼します。<br />
            この操作は元に戻せません。当該会員の予約 (reserved / waitlist) も自動でキャンセルされます。
          </AlertDialogDescription>
        </AlertDialogHeader>

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
            :disabled="phase === 'submitting'"
            :aria-busy="phase === 'submitting'"
            class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
            @click="submit"
          >
            {{ phase === "submitting" ? "処理中…" : "削除する" }}
          </button>
        </AlertDialogFooter>
      </template>

      <template v-else-if="reviewSuccess">
        <AlertDialogHeader>
          <AlertDialogTitle>削除が完了しました</AlertDialogTitle>
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
