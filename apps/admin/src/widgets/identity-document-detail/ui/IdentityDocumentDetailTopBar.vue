<script setup lang="ts">
import { RouterLink } from "vue-router";
import {
  DOCUMENT_TYPE_LABELS,
  IDENTITY_DOCUMENT_STATUS_LABELS,
} from "@high-q/shared";
import type { IdentityDocumentDetail } from "@/entities/identity-document";

/**
 * /identity-documents/:id 詳細画面の TopBar (パンくず + サマリ + Badge)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 詳細画面の TopBar 構成)
 */

const props = defineProps<{
  detail: IdentityDocumentDetail;
}>();

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};
</script>

<template>
  <header
    class="flex flex-col gap-hq-2 border-b border-hairline bg-paper px-hq-8 py-hq-3"
  >
    <nav aria-label="パンくず" class="font-mono text-xs text-muted">
      <RouterLink
        :to="{ name: 'identity-documents' }"
        class="hover:text-ink"
      >
        本人確認書類
      </RouterLink>
      <span class="px-hq-2">›</span>
      <span>{{ formatUploadedAt(props.detail.uploaded_at) }}</span>
    </nav>

    <div class="flex flex-wrap items-center gap-hq-4">
      <h1 class="font-jp text-xl font-medium text-ink">
        {{ props.detail.member.display_name }}
      </h1>
      <p class="font-mono text-sm text-muted">
        {{ props.detail.member.email }}
      </p>
      <span
        :class="
          props.detail.document_type === 'my_number_card_masked'
            ? 'inline-flex items-center rounded-hq-sm bg-danger-soft text-danger px-hq-2 py-hq-1 text-xs font-jp font-medium'
            : 'inline-flex items-center rounded-hq-sm bg-paper-warm text-ink px-hq-2 py-hq-1 text-xs font-jp font-medium'
        "
      >
        {{ DOCUMENT_TYPE_LABELS[props.detail.document_type] }}
      </span>
      <span
        :class="`inline-flex items-center rounded-hq-sm px-hq-2 py-hq-1 text-xs font-jp font-medium ${STATUS_BADGE_CLASS[props.detail.status]}`"
      >
        {{ IDENTITY_DOCUMENT_STATUS_LABELS[props.detail.status] }}
      </span>
    </div>
  </header>
</template>
