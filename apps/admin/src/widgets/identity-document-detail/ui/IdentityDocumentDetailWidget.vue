<script setup lang="ts">
import { computed } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { Kicker } from "@high-q/ui";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_REQUIREMENTS,
} from "@high-q/shared";
import type { MemberId } from "@high-q/shared";
import { Skeleton } from "@/shared/ui";
import { useIdentityDocumentDetailData } from "../composables/useIdentityDocumentDetailData";
import IdentityDocumentDetailTopBar from "./IdentityDocumentDetailTopBar.vue";
import IdentityDocumentMemberCard from "./IdentityDocumentMemberCard.vue";
import IdentityDocumentMynumberReminder from "./IdentityDocumentMynumberReminder.vue";
import IdentityDocumentImagePreview from "./IdentityDocumentImagePreview.vue";
import IdentityDocumentActionsFooter from "./IdentityDocumentActionsFooter.vue";

/**
 * /identity-documents/:id 詳細画面のメイン widget。
 *
 * 4 状態 (Loading / Empty=NOT_FOUND / Error / Success) を出し分ける。
 * Empty (0 件) は詳細画面では発生せず NOT_FOUND として扱う (design D14)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 詳細画面の 4 状態)
 */

const props = defineProps<{
  adminMemberId: MemberId;
}>();

const router = useRouter();

const {
  detail,
  isPending,
  isError,
  errorCode,
  frontSignedUrl,
  backSignedUrl,
  frontUrlError,
  backUrlError,
  refetchFrontUrl,
  refetchBackUrl,
  refetch,
} = useIdentityDocumentDetailData();

const view = computed<"loading" | "not-found" | "error" | "success">(() => {
  if (isPending.value) return "loading";
  if (isError.value && errorCode.value === "NOT_FOUND") return "not-found";
  if (isError.value) return "error";
  if (!detail.value) return "loading";
  return "success";
});

function onReviewed() {
  // 承認 / 差し戻し / マスク漏れ削除の完了後 → 一覧へ戻る
  void router.push({ name: "identity-documents" });
}

function isMyNumber(type: string): boolean {
  return type === "my_number_card_masked";
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Loading -->
    <div
      v-if="view === 'loading'"
      class="flex flex-col gap-hq-4 px-hq-8 py-hq-6"
      aria-busy="true"
    >
      <Skeleton class="h-8 w-1/2" />
      <Skeleton class="h-32 w-full" />
      <Skeleton class="h-64 w-full" />
      <Skeleton class="h-12 w-full" />
    </div>

    <!-- not-found -->
    <div
      v-else-if="view === 'not-found'"
      role="alert"
      class="flex flex-col items-center justify-center gap-hq-3 px-hq-8 py-hq-12 text-center"
    >
      <p class="font-jp text-base text-ink">書類が見つかりません</p>
      <p class="font-jp text-sm text-muted">
        削除済みの可能性があります。
      </p>
      <RouterLink
        :to="{ name: 'identity-documents' }"
        class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        一覧へ戻る
      </RouterLink>
    </div>

    <!-- generic error -->
    <div
      v-else-if="view === 'error'"
      role="alert"
      class="flex flex-col items-center justify-center gap-hq-3 px-hq-8 py-hq-12 text-center"
    >
      <p class="font-jp text-base text-danger">取得に失敗しました</p>
      <p class="font-mono text-xs text-muted">
        ERR · supabase / identity_documents.detail · {{ errorCode ?? "UNKNOWN" }}
      </p>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-accent px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        @click="refetch"
      >
        再試行
      </button>
    </div>

    <!-- success -->
    <template v-else-if="detail">
      <IdentityDocumentDetailTopBar :detail="detail" />

      <div class="flex flex-1 flex-col gap-hq-6 overflow-auto px-hq-8 py-hq-6">
        <IdentityDocumentMemberCard :member="detail.member" />

        <section
          class="flex flex-col gap-hq-3 rounded-hq-md border border-hairline bg-paper p-hq-6"
          aria-labelledby="document-info-kicker"
        >
          <Kicker id="document-info-kicker">— 書類情報</Kicker>
          <p class="font-jp text-base font-medium text-ink">
            {{ DOCUMENT_TYPE_LABELS[detail.document_type] }}
          </p>
          <p class="font-jp text-sm text-muted">
            <template v-if="isMyNumber(detail.document_type)">
              個人番号 12 桁が完全マスク済みであること
            </template>
            <template v-else>
              {{ DOCUMENT_TYPE_REQUIREMENTS[detail.document_type] }}
            </template>
          </p>
        </section>

        <IdentityDocumentMynumberReminder
          v-if="isMyNumber(detail.document_type)"
        />

        <IdentityDocumentImagePreview
          :document-type="detail.document_type"
          :storage-path-front="detail.storage_path_front"
          :storage-path-back="detail.storage_path_back"
          :front-signed-url="frontSignedUrl"
          :back-signed-url="backSignedUrl"
          :front-url-error="frontUrlError"
          :back-url-error="backUrlError"
          @retry-front="refetchFrontUrl"
          @retry-back="refetchBackUrl"
        />

        <section
          v-if="detail.rejection_reason"
          class="flex flex-col gap-hq-2 rounded-hq-md border border-danger/40 bg-danger-soft p-hq-4"
        >
          <p class="font-mono text-xs uppercase tracking-widest text-danger">
            差し戻し理由
          </p>
          <p class="font-jp text-sm text-danger whitespace-pre-wrap">
            {{ detail.rejection_reason }}
          </p>
        </section>
      </div>

      <IdentityDocumentActionsFooter
        :detail="detail"
        :admin-member-id="props.adminMemberId"
        @reviewed="onReviewed"
      />
    </template>
  </div>
</template>
