<script setup lang="ts">
import {
  DOCUMENT_TYPE_LABELS,
  IDENTITY_DOCUMENT_STATUS_LABELS,
} from "@high-q/shared";
import type { IdentityDocumentDetail } from "@/entities/identity-document";

/**
 * /identity-documents/:id 詳細画面の TopBar (会員サマリ + Badge)。
 *
 * パンくずは Page 側の PageBreadcrumb widget が担う (本 widget では実装しない)。
 * → admin 全体の統一ルール: パンくずは Page header の PageBreadcrumb のみ、
 *    Widget 側で独自に <nav aria-label="パンくず"> を書かない。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 詳細画面の TopBar 構成)
 *   docs/05-インターフェース/01-UI設計方針.md (admin ナビゲーション規約)
 */

const props = defineProps<{
  detail: IdentityDocumentDetail;
}>();

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}
</script>

<template>
  <header
    class="flex flex-wrap items-center gap-hq-3 border-b border-hairline bg-paper px-hq-8 py-hq-3"
  >
    <h2 class="font-jp text-base font-medium text-ink">
      {{ props.detail.member.display_name }}
    </h2>
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
    <span class="ml-auto font-mono text-xs text-muted">
      提出 {{ formatUploadedAt(props.detail.uploaded_at) }}
    </span>
  </header>
</template>
