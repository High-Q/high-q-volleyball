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
import type { MemberHistoryRow } from "@/entities/member";
import type { ReservationStatus } from "@high-q/shared";

const props = defineProps<{ rows: ReadonlyArray<MemberHistoryRow> }>();

const STATUS_LABEL: Record<ReservationStatus, string> = {
  reserved: "予約中",
  cancelled: "キャンセル",
  attended: "参加済",
  no_show: "不参加",
  waitlist: "キャンセル待ち",
};

const STATUS_TONE: Record<
  ReservationStatus,
  "neutral" | "accent" | "success" | "warn" | "danger" | "draft"
> = {
  reserved: "accent",
  cancelled: "neutral",
  attended: "success",
  no_show: "warn",
  waitlist: "draft",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const wd = WEEKDAYS[d.getDay()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} (${wd}) ${hh}:${mm}`;
}

const displayed = computed(() =>
  props.rows.map((row) => ({
    ...row,
    __dateLabel: formatDateTime(row.start_at),
    __guestLabel: row.guest_count > 0 ? `+${row.guest_count}` : "—",
  })),
);
</script>

<template>
  <section v-if="rows.length === 0" class="rounded-hq-sm border border-dashed border-hairline bg-paper-warm px-hq-3 py-hq-6 text-center">
    <p class="font-jp text-sm text-muted">参加履歴がありません</p>
  </section>

  <Table v-else>
    <TableHeader>
      <TableRow>
        <TableHead>日付</TableHead>
        <TableHead>イベント</TableHead>
        <TableHead>会場</TableHead>
        <TableHead>状態</TableHead>
        <TableHead class="text-right">同伴</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow v-for="row in displayed" :key="row.reservation_id">
        <TableCell class="font-mono text-xs text-muted whitespace-nowrap">
          {{ row.__dateLabel }}
        </TableCell>
        <TableCell class="font-jp text-sm text-ink whitespace-nowrap">
          <span class="inline-flex items-center gap-hq-2">
            <span>{{ row.event_name }}</span>
            <Badge v-if="row.is_first_time" tone="accent">初回</Badge>
          </span>
        </TableCell>
        <TableCell class="font-jp text-sm text-muted whitespace-nowrap">
          {{ row.venue_name ?? "—" }}
        </TableCell>
        <TableCell class="whitespace-nowrap">
          <Badge :tone="STATUS_TONE[row.status]">
            {{ STATUS_LABEL[row.status] }}
          </Badge>
        </TableCell>
        <TableCell class="text-right font-mono text-xs text-muted whitespace-nowrap">
          {{ row.__guestLabel }}
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
