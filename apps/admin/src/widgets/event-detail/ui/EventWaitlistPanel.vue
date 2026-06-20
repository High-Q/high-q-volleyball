<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import type { EventId } from "@high-q/shared";
import {
  getEventParticipants,
  type ParticipantRow,
} from "@/entities/reservation";

/**
 * イベント詳細「キャンセル待ち」タブの read-only 待機者一覧パネル (#154)。
 *
 * - `event_participants_view` を取得し `status='waitlist'` のみを `created_at ASC`
 *   (= 繰り上げ順) で表示する。
 * - read-only。繰り上げは自動 (キャンセル発生時の promote-waitlist) のため、本パネル
 *   から手動操作は提供しない (誰が待っているかの可視化のみ)。
 *
 * 関連:
 *   openspec/changes/reservation-waitlist-promotion/specs/reservation-waitlist-promotion/spec.md
 */

const props = defineProps<{
  eventId: EventId | null;
}>();

const eventIdRef = toRef(props, "eventId");

const rows = ref<ReadonlyArray<ParticipantRow>>([]);
const isPending = ref<boolean>(false);
const isError = ref<boolean>(false);

let requestSeq = 0;

async function load(): Promise<void> {
  if (eventIdRef.value === null) {
    rows.value = [];
    return;
  }
  const seq = ++requestSeq;
  isPending.value = true;
  isError.value = false;
  const result = await getEventParticipants(eventIdRef.value);
  if (seq !== requestSeq) return;
  if (result.ok) {
    rows.value = result.value.filter((r) => r.status === "waitlist");
  } else {
    isError.value = true;
  }
  isPending.value = false;
}

watch(eventIdRef, () => void load(), { immediate: true });

const view = computed<"loading" | "empty" | "error" | "success">(() => {
  if (isError.value) return "error";
  if (isPending.value && rows.value.length === 0) return "loading";
  if (rows.value.length === 0) return "empty";
  return "success";
});

function displayName(r: ParticipantRow): string {
  return r.nickname && r.nickname.length > 0
    ? `${r.display_name}（${r.nickname}）`
    : r.display_name;
}

function formatJst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
</script>

<template>
  <div class="flex-1 overflow-auto px-hq-8 pt-hq-3">
    <p
      v-if="view === 'loading'"
      class="font-jp text-sm text-muted py-hq-8 text-center"
      aria-label="読み込み中"
    >
      読み込み中…
    </p>

    <p
      v-else-if="view === 'error'"
      role="alert"
      class="font-jp text-sm text-danger py-hq-8 text-center"
    >
      キャンセル待ちの取得に失敗しました。
      <button
        type="button"
        class="underline-offset-4 hover:underline ml-hq-2"
        @click="load()"
      >
        再試行
      </button>
    </p>

    <p
      v-else-if="view === 'empty'"
      class="font-jp text-sm text-muted py-hq-8 text-center"
      data-testid="waitlist-empty"
    >
      キャンセル待ちはいません。
    </p>

    <template v-else>
      <p class="font-jp text-xs text-muted mb-hq-3">
        キャンセルで枠が空くと、上から順に自動で繰り上がります（同伴者を含む人数が空きに収まる方から）。
      </p>
      <ol class="flex flex-col gap-hq-2" data-testid="waitlist-list">
        <li
          v-for="(r, i) in rows"
          :key="r.reservation_id as unknown as string"
          class="flex items-center gap-hq-3 bg-surface border border-hairline rounded-hq-md px-hq-4 py-hq-3"
          data-testid="waitlist-row"
        >
          <span
            class="font-mono text-sm text-muted w-6 shrink-0 text-right"
            aria-hidden="true"
          >{{ i + 1 }}</span>
          <span class="flex-1 min-w-0 font-jp text-sm text-ink truncate">
            {{ displayName(r) }}
          </span>
          <span class="font-jp text-xs text-muted shrink-0">
            同伴 {{ r.guest_count }} 名 / 計 {{ 1 + r.guest_count }} 名
          </span>
          <span class="font-mono text-[11px] text-muted shrink-0">
            {{ formatJst(r.created_at) }}
          </span>
        </li>
      </ol>
    </template>
  </div>
</template>
