<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";
import { formatAvailability, type EventAvailability } from "@/entities/event";
import type { ReservationStatus } from "@/entities/reservation";
import { formatFee } from "@/shared/lib/format-date";

/**
 * イベント詳細画面の sticky bottom CTA。
 *
 * 非満員時は「予約に進む」を表示し `proceed` を emit する。満員時は当該会員の
 * 自己予約状態で分岐する:
 *   - 未登録 (selfResolved=true かつ status が reserved/waitlist 以外): 押下可能な
 *     「キャンセル待ちに登録」を表示し `waitlist` を emit
 *   - キャンセル待ち登録済み (status='waitlist'): 「キャンセル待ち登録済み」(無効)
 *   - 予約済み (status='reserved') / 自己状態未確定 (selfResolved!=true): 安全側の
 *     「予約締切」(無効)。reserved は通常一覧から予約詳細へ誘導され本画面に到達しない
 *
 * 関連:
 *   openspec/changes/reservation-waitlist-registration/specs/reservation-waitlist-registration/spec.md
 *   openspec/changes/reservation-waitlist-registration/specs/reservation-events-and-booking/spec.md
 */

const props = defineProps<{
  fee: number | null;
  /** capacity あり、reservedCount >= capacity で満員。null は通常表示 */
  availability?: EventAvailability | null;
  /** 当該会員の当該イベントに対する予約ステータス (null = 未登録) */
  selfStatus?: ReservationStatus | null;
  /** 自己予約状態が確定済みか。false の間は満員時に安全側 (予約締切) に倒す */
  selfResolved?: boolean;
}>();

const emit = defineEmits<{
  (e: "proceed"): void;
  (e: "waitlist"): void;
}>();

const isFull = computed(
  () => formatAvailability(props.availability ?? null).isFull,
);

type CtaState = "book" | "full_disabled" | "waitlist" | "waitlisted";

const ctaState = computed<CtaState>(() => {
  if (!isFull.value) return "book";
  // 満員。自己予約状態が未確定なら安全側 (従来の無効「予約締切」)
  if (props.selfResolved !== true) return "full_disabled";
  if (props.selfStatus === "waitlist") return "waitlisted";
  if (props.selfStatus === "reserved") return "full_disabled";
  // 未登録 (null / cancelled 等) → キャンセル待ち登録導線
  return "waitlist";
});

function onClick(): void {
  if (ctaState.value === "book") emit("proceed");
  else if (ctaState.value === "waitlist") emit("waitlist");
}
</script>

<template>
  <div
    class="sticky bottom-0 left-0 right-0 bg-paper border-t border-hairline px-hq-5 py-hq-4 flex flex-col gap-hq-2"
    role="region"
    aria-label="予約アクション"
  >
    <div class="flex items-center justify-between gap-hq-4">
      <span class="font-mono text-sm text-ink-soft">
        {{ formatFee(props.fee) }}
      </span>
      <Button
        v-if="ctaState === 'book'"
        variant="primary"
        size="md"
        data-testid="cta-proceed"
        @click="onClick"
      >
        予約に進む
      </Button>
      <Button
        v-else-if="ctaState === 'waitlist'"
        variant="primary"
        size="md"
        data-testid="cta-waitlist"
        @click="onClick"
      >
        キャンセル待ちに登録
      </Button>
      <Button
        v-else-if="ctaState === 'waitlisted'"
        variant="primary"
        size="md"
        disabled
        data-testid="cta-waitlisted"
      >
        キャンセル待ち登録済み
      </Button>
      <Button
        v-else
        variant="primary"
        size="md"
        disabled
        data-testid="cta-full"
      >
        予約締切
      </Button>
    </div>
  </div>
</template>
