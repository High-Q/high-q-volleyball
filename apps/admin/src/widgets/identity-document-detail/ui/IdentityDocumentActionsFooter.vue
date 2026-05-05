<script setup lang="ts">
import { computed } from "vue";
import type { MemberId } from "@high-q/shared";
import { IdentityDocumentApproveDialog } from "@/features/identity-document-approve";
import { IdentityDocumentRejectDialog } from "@/features/identity-document-reject";
import { IdentityDocumentMaskDeleteDialog } from "@/features/identity-document-mask-delete";
import type { IdentityDocumentDetail } from "@/entities/identity-document";

/**
 * 詳細画面のアクションフッター。承認 / 差し戻し / マスク漏れ削除の 3 ボタン。
 *
 * 二重承認防御 (design D11):
 *   `status !== 'pending'` のときは全アクションボタン disabled。
 *
 * マスク漏れ削除はマイナンバーカードのときのみ表示。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 承認 / 差し戻し / マスク漏れ削除 / 二重承認防御)
 */

const props = defineProps<{
  detail: IdentityDocumentDetail;
  adminMemberId: MemberId;
}>();

const emit = defineEmits<{
  reviewed: [];
}>();

const isAlreadyReviewed = computed(() => props.detail.status !== "pending");
const isMyNumber = computed(
  () => props.detail.document_type === "my_number_card_masked",
);

const storagePaths = computed(() => ({
  front: props.detail.storage_path_front,
  back: props.detail.storage_path_back,
}));

function onReviewed() {
  emit("reviewed");
}
</script>

<template>
  <footer
    class="flex flex-wrap items-center justify-end gap-hq-3 border-t border-hairline bg-paper px-hq-8 py-hq-4"
  >
    <p
      v-if="isAlreadyReviewed"
      class="font-mono text-xs uppercase tracking-widest text-muted"
    >
      確定済 (再操作不可)
    </p>

    <IdentityDocumentRejectDialog
      :document-id="props.detail.id"
      :admin-member-id="props.adminMemberId"
      :member-id="props.detail.member_id"
      :member-name="props.detail.member.display_name"
      :disabled="isAlreadyReviewed"
      @rejected="onReviewed"
    />

    <IdentityDocumentMaskDeleteDialog
      v-if="isMyNumber"
      :document-id="props.detail.id"
      :admin-member-id="props.adminMemberId"
      :member-id="props.detail.member_id"
      :member-name="props.detail.member.display_name"
      :storage-paths="storagePaths"
      :disabled="isAlreadyReviewed"
      @mask-deleted="onReviewed"
    />

    <IdentityDocumentApproveDialog
      :document-id="props.detail.id"
      :admin-member-id="props.adminMemberId"
      :member-name="props.detail.member.display_name"
      :document-type-label="props.detail.document_type"
      :disabled="isAlreadyReviewed"
      @approved="onReviewed"
    />
  </footer>
</template>
