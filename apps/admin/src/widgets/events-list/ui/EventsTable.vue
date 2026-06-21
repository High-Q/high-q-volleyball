<script setup lang="ts">
import { computed } from "vue";
import { Badge, RemainBar } from "@high-q/ui";
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
  formatDateLabel,
  formatTimeRange,
  resolveDisplayStatus,
  type DisplayStatus,
  type EventListRow,
  type SortDir,
  type SortKey,
} from "@/entities/event";
import { shortenVenueName } from "@/entities/venue";

/**
 * Events 一覧の DataTable 本体（Success 状態専用）。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *       openspec/changes/admin-events-list-screen/design.md (§4)
 */

const props = defineProps<{
  rows: ReadonlyArray<EventListRow>;
  sort: SortKey;
  dir: SortDir;
  /** 現在時刻（テスト容易性のため注入可能） */
  now?: Date;
}>();

const emit = defineEmits<{
  "update:sort": [sort: SortKey, dir: SortDir];
}>();

const referenceNow = computed<Date>(() => props.now ?? new Date());

interface DisplayedRow extends EventListRow {
  __display: DisplayStatus;
  __dateLabel: string;
  __timeLabel: string;
  __venueShort: string;
}

const displayedRows = computed<DisplayedRow[]>(() =>
  props.rows.map((row) => ({
    ...row,
    __display: resolveDisplayStatus(row, referenceNow.value),
    __dateLabel: formatDateLabel(row.start_at),
    __timeLabel: formatTimeRange(row.start_at, row.end_at),
    // モバイル / 一覧の限られた幅で改行しないよう、施設種別末尾を削った主要部
    // のみ表示する（例: "亀戸スポーツセンター" → "亀戸"）。
    __venueShort: row.venue_name ? shortenVenueName(row.venue_name) : "—",
  })),
);

const STATUS_LABEL: Record<DisplayStatus, string> = {
  published: "公開中",
  draft: "下書き",
  private: "限定公開",
  cancelled: "中止",
  closed: "終了",
};

const STATUS_TONE: Record<
  DisplayStatus,
  "accent" | "neutral" | "draft" | "danger"
> = {
  published: "accent",
  draft: "draft",
  private: "neutral",
  cancelled: "danger",
  closed: "neutral",
};

function ariaSortFor(col: SortKey): "ascending" | "descending" | "none" {
  if (props.sort !== col) return "none";
  return props.dir === "asc" ? "ascending" : "descending";
}

function toggleSort(col: SortKey): void {
  const nextDir: SortDir =
    props.sort === col && props.dir === "asc" ? "desc" : "asc";
  emit("update:sort", col, nextDir);
}

function onHeaderKeyDown(col: SortKey, event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleSort(col);
  }
}
</script>

<template>
  <!-- デスクトップ: DataTable (#155 モバイルはカード縦積みに切替) -->
  <Table class="hidden md:block">
    <TableHeader>
      <TableRow>
        <TableHead
          :aria-sort="ariaSortFor('date')"
          tabindex="0"
          role="columnheader"
          class="cursor-pointer select-none"
          @click="toggleSort('date')"
          @keydown="onHeaderKeyDown('date', $event)"
        >
          日付
        </TableHead>
        <TableHead>タイトル</TableHead>
        <TableHead>会場</TableHead>
        <TableHead>時間</TableHead>
        <TableHead>予約</TableHead>
        <TableHead
          :aria-sort="ariaSortFor('status')"
          tabindex="0"
          role="columnheader"
          class="cursor-pointer select-none"
          @click="toggleSort('status')"
          @keydown="onHeaderKeyDown('status', $event)"
        >
          ステータス
        </TableHead>
        <TableHead class="text-right">操作</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow
        v-for="row in displayedRows"
        :key="row.id"
        class="relative"
      >
        <TableCell class="font-mono text-xs text-muted whitespace-nowrap">
          {{ row.__dateLabel }}
        </TableCell>
        <TableCell
          class="font-jp text-sm text-ink whitespace-nowrap"
          :title="row.name"
        >
          <router-link
            :to="{ name: 'events-detail', params: { id: row.id } }"
            class="block truncate max-w-[12rem] sm:max-w-xs hover:underline underline-offset-4 before:absolute before:inset-0 before:content-['']"
            :aria-label="`${row.name} の詳細を見る`"
          >{{ row.name }}</router-link>
        </TableCell>
        <TableCell
          class="font-jp text-sm text-muted whitespace-nowrap"
          :title="row.venue_name ?? undefined"
        >
          {{ row.__venueShort }}
        </TableCell>
        <TableCell class="font-mono text-xs text-muted whitespace-nowrap">
          {{ row.__timeLabel }}
        </TableCell>
        <TableCell class="w-40 whitespace-nowrap">
          <RemainBar
            v-if="row.capacity !== null"
            :capacity="row.capacity"
            :taken="row.reserved_count"
          />
          <span v-else class="font-mono text-xs text-muted">
            {{ row.reserved_count }} 名
          </span>
        </TableCell>
        <TableCell class="whitespace-nowrap">
          <Badge :tone="STATUS_TONE[row.__display]">
            {{ STATUS_LABEL[row.__display] }}
          </Badge>
        </TableCell>
        <TableCell class="relative text-right whitespace-nowrap">
          <span class="inline-flex items-center gap-hq-3">
            <router-link
              :to="`/events/${row.id}/edit`"
              class="relative z-10 font-jp text-sm text-accent underline-offset-4 hover:underline"
            >
              編集
            </router-link>
            <router-link
              :to="`/events/new?from=${row.id}`"
              class="relative z-10 font-jp text-sm text-accent underline-offset-4 hover:underline"
              :aria-label="`${row.name} を複製して新規作成`"
            >
              複製
            </router-link>
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>

  <!-- モバイル: カード縦積み (#155)。全項目をカード内に保持し横スクロールしない -->
  <DataCardList class="p-hq-4">
    <li
      v-for="row in displayedRows"
      :key="row.id"
      class="relative rounded-hq-md border border-hairline bg-surface p-hq-4"
    >
      <div class="flex items-baseline justify-between gap-hq-2">
        <span class="font-mono text-xs text-ink">{{ row.__dateLabel }}</span>
        <Badge :tone="STATUS_TONE[row.__display]">
          {{ STATUS_LABEL[row.__display] }}
        </Badge>
      </div>
      <router-link
        :to="{ name: 'events-detail', params: { id: row.id } }"
        class="mt-hq-2 block font-jp text-base font-medium text-ink underline-offset-4 hover:underline before:absolute before:inset-0 before:content-['']"
        :aria-label="`${row.name} の詳細を見る`"
        >{{ row.name }}</router-link
      >
      <p
        class="mt-hq-1 font-jp text-sm text-muted"
        :title="row.venue_name ?? undefined"
      >
        {{ row.__venueShort }} · {{ row.__timeLabel }}
      </p>
      <div class="mt-hq-3">
        <RemainBar
          v-if="row.capacity !== null"
          :capacity="row.capacity"
          :taken="row.reserved_count"
        />
        <span v-else class="font-mono text-xs text-muted"
          >{{ row.reserved_count }} 名</span
        >
      </div>
      <div
        class="mt-hq-3 flex items-center gap-hq-4 border-t border-hairline-soft pt-hq-3"
      >
        <router-link
          :to="`/events/${row.id}/edit`"
          class="relative z-10 font-jp text-sm text-accent underline-offset-4 hover:underline"
          >編集</router-link
        >
        <router-link
          :to="`/events/new?from=${row.id}`"
          class="relative z-10 font-jp text-sm text-accent underline-offset-4 hover:underline"
          :aria-label="`${row.name} を複製して新規作成`"
          >複製</router-link
        >
      </div>
    </li>
  </DataCardList>
</template>

