<script setup lang="ts">
import { computed } from "vue";
import { Kicker } from "@high-q/ui";
import {
  formatReservationNumber,
  type Reservation,
} from "@/entities/reservation";
import type { EventDetail } from "@/entities/event";
import {
  formatFee,
  formatJaDate,
  formatTimeRange,
} from "@/shared/lib/format-date";
import {
  HIGH_Q_OPEN_CHAT_NAME,
  HIGH_Q_OPEN_CHAT_URL,
} from "@/shared/lib/contact-channels";

/**
 * 予約完了画面の予約サマリ + 次アクション。
 *
 * - 予約番号は `#HQ-XXXX-XXXX` 形式 (生 UUID は出さない)
 * - 「会場マップを開く」は venues.map_url が存在するときのみ
 * - メール送信完了案内は薄く 1 行で表示する (送信先 + 迷惑メール確認の促し)。
 *   送信失敗は UI に出さず、別 capability `reservation-notification-email` の
 *   Edge Function ログに集約する。
 * - .ics / カレンダー追加リンクは出さない (MVP1 スコープアウト)
 *
 * 関連:
 *   openspec/changes/reservation-completion-email/specs/reservation-booking-flow/spec.md
 */

const props = defineProps<{
  reservation: Reservation;
  event: EventDetail;
  memberEmail: string | null;
}>();

const reservationNumber = computed(() =>
  formatReservationNumber(props.reservation.id),
);

const dateLabel = computed(() => formatJaDate(props.event.startAt));
const timeLabel = computed(() =>
  formatTimeRange(props.event.startAt, props.event.endAt),
);
const feeLabel = computed(() => `${formatFee(props.event.fee)} · 当日現金`);

const hasMapUrl = computed(
  () => props.event.mapUrl !== null && props.event.mapUrl.length > 0,
);

const emit = defineEmits<{
  (e: "request-cancel"): void;
}>();
</script>

<template>
  <div class="flex flex-col gap-hq-6">
    <div class="text-center flex flex-col items-center gap-hq-3">
      <div
        class="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-accent"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <Kicker>— Confirmed</Kicker>
      <h1
        class="font-jp-display text-2xl font-medium text-ink leading-snug m-0"
      >
        予約が完了しました。
      </h1>
    </div>

    <section
      class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-3"
      aria-label="予約サマリ"
    >
      <div class="flex items-baseline justify-between gap-hq-3">
        <Kicker>— RESERVATION</Kicker>
        <span
          class="font-mono text-xs text-muted tracking-widest"
          data-testid="reservation-number"
        >
          {{ reservationNumber }}
        </span>
      </div>
      <h2
        class="font-jp-display text-lg font-medium text-ink m-0"
      >
        {{ event.name }}
      </h2>
      <dl class="grid grid-cols-[70px_1fr] gap-x-hq-4 gap-y-hq-2 m-0">
        <dt class="font-mono text-xs text-muted tracking-widest">DATE</dt>
        <dd class="font-jp text-sm text-ink m-0">{{ dateLabel }}</dd>
        <dt class="font-mono text-xs text-muted tracking-widest">TIME</dt>
        <dd class="font-jp text-sm text-ink m-0">{{ timeLabel }}</dd>
        <dt class="font-mono text-xs text-muted tracking-widest">VENUE</dt>
        <dd class="font-jp text-sm text-ink m-0">{{ event.venueName }}</dd>
        <dt class="font-mono text-xs text-muted tracking-widest">FEE</dt>
        <dd class="font-jp text-sm text-ink m-0">{{ feeLabel }}</dd>
      </dl>
    </section>

    <p
      v-if="memberEmail !== null && memberEmail.length > 0"
      class="font-jp text-xs text-muted leading-relaxed m-0"
      data-testid="email-sent-note"
    >
      予約完了メールを {{ memberEmail }} 宛にお送りしました。<br />
      届かない場合は迷惑メールフォルダもご確認ください。
    </p>

    <section
      class="flex flex-col gap-hq-3"
      aria-label="次にできること"
    >
      <Kicker>— NEXT</Kicker>
      <a
        v-if="hasMapUrl"
        :href="event.mapUrl ?? '#'"
        target="_blank"
        rel="noopener noreferrer"
        class="bg-surface border border-hairline rounded-hq-md px-hq-4 py-hq-3 flex items-center justify-between gap-hq-3 text-ink no-underline"
        data-testid="map-link"
      >
        <div class="flex flex-col gap-hq-1">
          <span class="font-jp text-sm font-medium">会場マップを開く</span>
          <span class="font-jp text-xs text-muted">
            {{ event.venueName }}
          </span>
        </div>
        <span class="text-muted" aria-hidden="true">›</span>
      </a>

      <a
        :href="HIGH_Q_OPEN_CHAT_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="bg-surface border border-hairline rounded-hq-md px-hq-4 py-hq-3 flex items-center justify-between gap-hq-3 text-ink no-underline"
        data-testid="open-chat-link"
      >
        <div class="flex flex-col gap-hq-1">
          <span class="font-jp text-sm font-medium">
            当日の連絡は LINE オープンチャットへ
          </span>
          <span class="font-jp text-xs text-muted">
            {{ HIGH_Q_OPEN_CHAT_NAME }}
          </span>
        </div>
        <span class="text-muted" aria-hidden="true">›</span>
      </a>

      <button
        type="button"
        class="bg-surface border border-hairline rounded-hq-md px-hq-4 py-hq-3 flex items-center justify-between gap-hq-3 text-left text-ink"
        data-testid="cancel-trigger"
        @click="emit('request-cancel')"
      >
        <div class="flex flex-col gap-hq-1">
          <span class="font-jp text-sm font-medium">予約をキャンセル</span>
          <span class="font-jp text-xs text-muted">
            開催前であればキャンセル可能
          </span>
        </div>
        <span class="text-muted" aria-hidden="true">›</span>
      </button>
    </section>
  </div>
</template>
