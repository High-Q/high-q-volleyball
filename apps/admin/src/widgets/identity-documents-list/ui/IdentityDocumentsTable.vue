<script setup lang="ts">
import { RouterLink } from "vue-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DataCardList,
} from "@/shared/ui";
import {
  DOCUMENT_TYPE_LABELS,
  IDENTITY_DOCUMENT_STATUS_LABELS,
  type IdentityDocumentStatus,
  type DocumentType,
} from "@high-q/shared";
import type { IdentityDocumentListRow } from "@/entities/identity-document";

/**
 * /identity-documents 一覧 DataTable (6 列)。
 *
 * 列: 提出日時 / ユーザー名 / メール / 書類種別 Badge / ステータス Badge / 詳細リンク
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 一覧 DataTable の列構成)
 */

defineProps<{
  rows: ReadonlyArray<IdentityDocumentListRow>;
}>();

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function avatarLetter(name: string): string {
  return name.charAt(0) || "?";
}

const STATUS_BADGE_CLASS: Record<IdentityDocumentStatus, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
};

function isMyNumber(type: DocumentType): boolean {
  return type === "my_number_card_masked";
}

function statusLabel(status: IdentityDocumentStatus): string {
  return IDENTITY_DOCUMENT_STATUS_LABELS[status];
}

function documentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type];
}
</script>

<template>
  <!-- デスクトップ: DataTable (#155 モバイルはカード縦積みに切替) -->
  <div class="hidden overflow-x-auto md:block">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="whitespace-nowrap">提出日時</TableHead>
          <TableHead class="whitespace-nowrap">ユーザー名</TableHead>
          <TableHead class="whitespace-nowrap">メール</TableHead>
          <TableHead class="whitespace-nowrap">書類種別</TableHead>
          <TableHead class="whitespace-nowrap">ステータス</TableHead>
          <TableHead class="whitespace-nowrap text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in rows" :key="row.id">
          <TableCell class="whitespace-nowrap font-mono text-xs text-muted">
            {{ formatUploadedAt(row.uploaded_at) }}
          </TableCell>
          <TableCell class="whitespace-nowrap">
            <span class="inline-flex items-center gap-hq-2">
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper-warm font-jp text-sm font-medium text-ink"
                aria-hidden="true"
              >
                {{ avatarLetter(row.member.display_name) }}
              </span>
              <span class="font-jp text-sm text-ink">
                {{ row.member.display_name }}
              </span>
            </span>
          </TableCell>
          <TableCell class="whitespace-nowrap font-mono text-xs text-muted">
            {{ row.member.email }}
          </TableCell>
          <TableCell class="whitespace-nowrap">
            <span
              :class="
                isMyNumber(row.document_type)
                  ? 'inline-flex items-center rounded-hq-sm bg-danger-soft text-danger px-hq-2 py-hq-1 text-xs font-jp font-medium'
                  : 'inline-flex items-center rounded-hq-sm bg-paper-warm text-ink px-hq-2 py-hq-1 text-xs font-jp font-medium'
              "
            >
              {{ documentTypeLabel(row.document_type) }}
            </span>
          </TableCell>
          <TableCell class="whitespace-nowrap">
            <span
              :class="`inline-flex items-center rounded-hq-sm px-hq-2 py-hq-1 text-xs font-jp font-medium ${STATUS_BADGE_CLASS[row.status]}`"
            >
              {{ statusLabel(row.status) }}
            </span>
          </TableCell>
          <TableCell class="whitespace-nowrap text-right">
            <RouterLink
              :to="{ name: 'identity-document-detail', params: { id: row.id } }"
              class="inline-flex h-7 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-3 text-xs font-jp text-ink hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              :aria-label="`${row.member.display_name} の書類詳細`"
            >
              詳細
            </RouterLink>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>

  <!-- モバイル: カード縦積み (#155)。全項目を保持し横スクロールしない -->
  <DataCardList class="p-hq-4">
    <li
      v-for="row in rows"
      :key="row.id"
      class="rounded-hq-md border border-hairline bg-surface p-hq-4"
    >
      <div class="flex flex-wrap items-center gap-hq-2">
        <span
          class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-paper-warm font-jp text-sm font-medium text-ink"
          aria-hidden="true"
          >{{ avatarLetter(row.member.display_name) }}</span
        >
        <span class="font-jp text-base font-medium text-ink">{{
          row.member.display_name
        }}</span>
        <span
          :class="
            isMyNumber(row.document_type)
              ? 'inline-flex items-center rounded-hq-sm bg-danger-soft text-danger px-hq-2 py-hq-1 text-xs font-jp font-medium'
              : 'inline-flex items-center rounded-hq-sm bg-paper-warm text-ink px-hq-2 py-hq-1 text-xs font-jp font-medium'
          "
          >{{ documentTypeLabel(row.document_type) }}</span
        >
        <span
          :class="`inline-flex items-center rounded-hq-sm px-hq-2 py-hq-1 text-xs font-jp font-medium ${STATUS_BADGE_CLASS[row.status]}`"
          >{{ statusLabel(row.status) }}</span
        >
      </div>
      <dl
        class="mt-hq-3 grid grid-cols-[5rem_1fr] gap-x-hq-3 gap-y-hq-2 font-jp text-sm"
      >
        <dt class="text-muted">提出日時</dt>
        <dd class="font-mono text-xs text-muted">
          {{ formatUploadedAt(row.uploaded_at) }}
        </dd>
        <dt class="text-muted">メール</dt>
        <dd class="min-w-0 truncate font-mono text-xs text-muted">
          {{ row.member.email }}
        </dd>
      </dl>
      <div class="mt-hq-3 flex justify-end">
        <RouterLink
          :to="{ name: 'identity-document-detail', params: { id: row.id } }"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 text-sm font-jp text-ink hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          :aria-label="`${row.member.display_name} の書類詳細`"
          >詳細</RouterLink
        >
      </div>
    </li>
  </DataCardList>
</template>

