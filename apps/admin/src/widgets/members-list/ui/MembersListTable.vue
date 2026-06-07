<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@high-q/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import {
  EXPERIENCE_LABEL,
  type MemberListRow,
  type MembersListSortKey,
} from "@/entities/member";
import type { SortDir } from "@/features/members-filter";
import type { ExperienceLevel } from "@high-q/shared";

/**
 * /members の DataTable（Success 状態）。7 列（名前 / メール / 経験 / 初回参加 /
 * 累計 / 最終参加 / メモ）+ 行クリックで詳細 sheet を開く。
 *
 * 関連: openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 */

const props = defineProps<{
  rows: ReadonlyArray<MemberListRow>;
  sort: MembersListSortKey;
  dir: SortDir;
}>();

const emit = defineEmits<{
  "click-row": [memberId: string];
  "update:sort": [sort: MembersListSortKey, dir: SortDir];
}>();

const EXPERIENCE_TONE: Record<
  ExperienceLevel,
  "neutral" | "accent" | "success"
> = {
  beginner: "neutral",
  intermediate: "accent",
  experienced: "success",
};

interface DisplayedRow extends MemberListRow {
  __initial: string;
  __firstLabel: string;
  __lastLabel: string;
  __notePreview: string;
  __highlightCount: boolean;
}

const NOTE_PREVIEW_MAX = 40;

function formatDate(iso: string | null): string {
  if (iso === null) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function trimNote(value: string | null): string {
  if (value === null) return "—";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "—";
  if (trimmed.length <= NOTE_PREVIEW_MAX) return trimmed;
  return `${trimmed.slice(0, NOTE_PREVIEW_MAX)}…`;
}

function initial(name: string): string {
  return name.length > 0 ? name.charAt(0) : "?";
}

const displayedRows = computed<DisplayedRow[]>(() =>
  props.rows.map((row) => ({
    ...row,
    __initial: initial(row.display_name),
    __firstLabel: formatDate(row.first_attended_at),
    __lastLabel: formatDate(row.last_attended_at),
    __notePreview: trimNote(row.admin_note),
    __highlightCount: row.attended_count >= 10,
  })),
);

function ariaSortFor(col: MembersListSortKey): "ascending" | "descending" | "none" {
  if (props.sort !== col) return "none";
  return props.dir === "asc" ? "ascending" : "descending";
}

function toggleSort(col: MembersListSortKey): void {
  const nextDir: SortDir =
    props.sort === col && props.dir === "desc" ? "asc" : "desc";
  emit("update:sort", col, nextDir);
}

function onHeaderKeyDown(col: MembersListSortKey, event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleSort(col);
  }
}

function onRowClick(memberId: string): void {
  emit("click-row", memberId);
}

function onRowKeyDown(memberId: string, event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    emit("click-row", memberId);
  }
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead
          :aria-sort="ariaSortFor('display_name')"
          tabindex="0"
          role="columnheader"
          class="cursor-pointer select-none"
          @click="toggleSort('display_name')"
          @keydown="onHeaderKeyDown('display_name', $event)"
        >
          名前
        </TableHead>
        <TableHead>メール</TableHead>
        <TableHead>経験</TableHead>
        <TableHead
          :aria-sort="ariaSortFor('first_attended_at')"
          tabindex="0"
          role="columnheader"
          class="cursor-pointer select-none"
          @click="toggleSort('first_attended_at')"
          @keydown="onHeaderKeyDown('first_attended_at', $event)"
        >
          初回参加
        </TableHead>
        <TableHead
          :aria-sort="ariaSortFor('attended_count')"
          tabindex="0"
          role="columnheader"
          class="cursor-pointer select-none text-right"
          @click="toggleSort('attended_count')"
          @keydown="onHeaderKeyDown('attended_count', $event)"
        >
          累計
        </TableHead>
        <TableHead
          :aria-sort="ariaSortFor('last_attended_at')"
          tabindex="0"
          role="columnheader"
          class="cursor-pointer select-none"
          @click="toggleSort('last_attended_at')"
          @keydown="onHeaderKeyDown('last_attended_at', $event)"
        >
          最終参加
        </TableHead>
        <TableHead>メモ</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow
        v-for="row in displayedRows"
        :key="row.id"
        tabindex="0"
        role="button"
        :aria-label="`${row.display_name} の詳細`"
        class="cursor-pointer hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        @click="onRowClick(row.id as unknown as string)"
        @keydown="onRowKeyDown(row.id as unknown as string, $event)"
      >
        <TableCell class="font-jp text-sm text-ink whitespace-nowrap">
          <span class="inline-flex items-center gap-hq-2">
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-hairline bg-paper-warm font-jp text-xs text-muted"
              aria-hidden="true"
            >
              {{ row.__initial }}
            </span>
            <span class="font-medium">{{ row.display_name }}</span>
            <Badge
              v-if="row.correction_request_count > 0"
              tone="warn"
              data-testid="correction-badge"
            >修正依頼 {{ row.correction_request_count }}</Badge>
            <Badge
              v-if="!row.has_identity_document"
              tone="neutral"
              data-testid="incomplete-signup-badge"
              aria-label="本人確認書類が未提出"
            >書類未提出</Badge>
          </span>
        </TableCell>
        <TableCell class="font-mono text-xs text-muted whitespace-nowrap">
          {{ row.email }}
        </TableCell>
        <TableCell class="whitespace-nowrap">
          <Badge :tone="EXPERIENCE_TONE[row.experience_level]">
            {{ EXPERIENCE_LABEL[row.experience_level] }}
          </Badge>
        </TableCell>
        <TableCell class="font-mono text-xs text-muted whitespace-nowrap">
          {{ row.__firstLabel }}
        </TableCell>
        <TableCell
          class="text-right font-mono text-xs whitespace-nowrap"
          :class="
            row.__highlightCount
              ? 'font-medium text-accent'
              : 'text-muted'
          "
        >
          {{ row.attended_count }} 回
        </TableCell>
        <TableCell class="font-mono text-xs text-muted whitespace-nowrap">
          {{ row.__lastLabel }}
        </TableCell>
        <TableCell class="font-jp text-xs text-muted">
          <span :title="row.admin_note ?? undefined">{{ row.__notePreview }}</span>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
