<script setup lang="ts">
import { computed } from "vue";
import { Button, Kicker } from "@high-q/ui";
import type { EventDetailRow } from "@/entities/event-detail";

/**
 * /events/:id 画面のヘッダ TopBar。
 * タイトル + パンくず + サブタイトル + 編集 CTA。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const props = defineProps<{
  row: EventDetailRow;
}>();

const emit = defineEmits<{
  clickEdit: [];
}>();

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateMD(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd} ${WEEKDAY[d.getDay()]}`;
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${WEEKDAY[d.getDay()]}`;
}

function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (iso: string): string => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

const breadcrumbDate = computed(() => formatDateMD(props.row.start_at));
const subtitle = computed(
  () =>
    `${formatDateFull(props.row.start_at)} · ${formatTimeRange(props.row.start_at, props.row.end_at)}` +
    (props.row.venue_name ? ` · ${props.row.venue_name}` : ""),
);
</script>

<template>
  <header
    class="flex items-center justify-between border-b border-hairline bg-paper px-hq-8 py-hq-3"
  >
    <div>
      <Kicker color="muted">— {{ breadcrumbDate }}</Kicker>
      <h1 class="font-jp-display text-xl text-ink">{{ row.name }}</h1>
      <p class="font-jp text-xs text-muted mt-hq-1">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-hq-2">
      <Button variant="ink" size="sm" @click="emit('clickEdit')">
        編集
      </Button>
    </div>
  </header>
</template>
