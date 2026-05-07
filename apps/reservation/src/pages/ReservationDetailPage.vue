<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import { useAuthSession } from "@/features/auth";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { CancelBookingDialog, useCancelBooking } from "@/features/booking";
import {
  fetchMyReservation,
  formatReservationNumber,
  type MyReservationDetail,
} from "@/entities/reservation";
import {
  CalendarExportButton,
  type BuildIcsInput,
} from "@/features/calendar-export";
import { VenueMapLink } from "@/features/venue-map-link";
import {
  CancelPolicyBox,
  DarkFactCard,
  ReservationMetaTable,
} from "@/widgets/reservation-detail-card";

/**
 * 予約詳細画面 (`/reservations/:reservationId`)。
 *
 * 認証済 + プロフィール完成 + 本人確認書類提出済の正規会員のみアクセス可能。
 * 4 状態 (Loading / 404 / Error / Success) を持ち、他会員の予約 ID を踏んだケース (RLS 0 行) も
 * 404 として吸収する。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 */

const route = useRoute();
const router = useRouter();
const session = useAuthSession();

const reservation = ref<MyReservationDetail | null>(null);
const loading = ref<boolean>(true);
const fetchError = ref<string | null>(null);
const notFound = ref<boolean>(false);

const successNotice = ref<string | null>(null);
let successTimer: ReturnType<typeof setTimeout> | null = null;

const reservationIdParam = computed(() => {
  const v = route.params.reservationId;
  return typeof v === "string" ? v : "";
});

async function load(): Promise<void> {
  const member = session.member.value;
  if (member === null) return;
  loading.value = true;
  fetchError.value = null;
  notFound.value = false;
  try {
    const result = await fetchMyReservation(reservationIdParam.value, member.id);
    if (result === null) {
      notFound.value = true;
    } else {
      reservation.value = result;
    }
  } catch (cause) {
    fetchError.value =
      cause instanceof Error
        ? cause.message
        : "予約を取得できませんでした。";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

const reservationNumber = computed(() =>
  reservation.value === null
    ? ""
    : formatReservationNumber(reservation.value.id),
);

const icsInput = computed<BuildIcsInput | null>(() => {
  const r = reservation.value;
  if (r === null) return null;
  return {
    reservationId: r.id as unknown as string,
    reservationNumber: reservationNumber.value,
    eventName: r.event.name,
    startAt: r.event.startAt,
    endAt: r.event.endAt,
    venueName: r.event.venueName,
    venueAddress: r.event.venueAddress,
  };
});

const venueInput = computed(() => {
  const r = reservation.value;
  if (r === null) return null;
  return {
    name: r.event.venueName,
    address: r.event.venueAddress,
    mapUrl: r.event.venueMapUrl,
  };
});

const cancelDialogOpen = ref<boolean>(false);
const {
  submitting: cancelSubmitting,
  error: cancelError,
  cancel,
  reset: resetCancel,
} = useCancelBooking();

const cancelErrorMessage = computed(() => {
  switch (cancelError.value) {
    case "rls":
      return "この予約はキャンセルできません。";
    case "network":
      return "通信エラーが発生しました。再試行してください。";
    case "duplicate":
    case "not_cancellable":
    case "unknown":
      return "キャンセル処理に失敗しました。";
    case null:
      return undefined;
  }
  return undefined;
});

const isCancelButtonVisible = computed(() => {
  const r = reservation.value;
  if (r === null) return false;
  return r.status === "reserved";
});

function openCancelDialog(): void {
  resetCancel();
  cancelDialogOpen.value = true;
}

async function onConfirmCancel(): Promise<void> {
  const r = reservation.value;
  if (r === null) return;
  const ok = await cancel(r.id);
  if (ok) {
    cancelDialogOpen.value = false;
    showSuccess("予約をキャンセルしました。");
    void router.replace({ name: "history" });
  }
}

function showSuccess(message: string): void {
  successNotice.value = message;
  if (successTimer !== null) clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successNotice.value = null;
  }, 4000);
}

function goBack(): void {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.replace({ name: "history" });
  }
}

function goHistory(): void {
  void router.push({ name: "history" });
}
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp flex flex-col">
    <header
      class="px-hq-5 py-hq-4 flex flex-col gap-hq-2 border-b border-hairline"
    >
      <PageBreadcrumb
        :items="[
          { label: 'マイページ', to: { name: 'events-list' } },
          { label: '履歴', to: { name: 'history' } },
          { label: '予約詳細' },
        ]"
      />
      <div class="flex items-center gap-hq-3">
        <button
          type="button"
          class="text-ink hover:text-accent transition-colors"
          aria-label="戻る"
          data-testid="detail-back-button"
          @click="goBack"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span class="font-jp-display text-lg text-ink m-0">予約詳細</span>
      </div>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-6">
      <!-- Loading -->
      <div
        v-if="session.member.value === null || loading"
        class="flex flex-col gap-hq-4"
        aria-label="予約を読み込み中"
        data-testid="detail-loading"
      >
        <div class="bg-surface border border-hairline rounded-hq-lg h-16 animate-pulse" />
        <div class="bg-ink rounded-hq-md h-32 animate-pulse opacity-30" />
        <div class="bg-surface border border-hairline rounded-hq-lg h-40 animate-pulse" />
      </div>

      <!-- 404 -->
      <div
        v-else-if="notFound"
        class="bg-surface border border-hairline rounded-hq-lg px-hq-5 py-hq-6 flex flex-col items-center gap-hq-3 text-center"
        data-testid="detail-not-found"
      >
        <p class="font-jp text-sm text-ink m-0">予約が見つかりません。</p>
        <p class="font-jp text-xs text-muted m-0">
          すでにキャンセル済か、他のアカウントの予約の可能性があります。
        </p>
        <div class="flex gap-hq-3">
          <Button variant="secondary" size="sm" type="button" @click="load">
            再試行
          </Button>
          <Button variant="primary" size="sm" type="button" @click="goHistory">
            履歴に戻る
          </Button>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="fetchError !== null"
        role="alert"
        class="bg-surface border border-hairline rounded-hq-lg p-hq-4 flex items-center justify-between gap-hq-3"
        data-testid="detail-error"
      >
        <p class="font-jp text-sm text-ink m-0">予約を取得できませんでした。</p>
        <Button variant="secondary" size="sm" type="button" @click="load">
          再試行
        </Button>
      </div>

      <!-- Success -->
      <template v-else-if="reservation !== null">
        <!-- Reservation Header -->
        <div class="flex flex-col gap-hq-2">
          <Kicker color="muted">— Reservation {{ reservationNumber }}</Kicker>
          <h1
            class="font-jp-display text-2xl font-medium text-ink m-0 leading-snug"
            data-testid="detail-event-name"
          >{{ reservation.event.name }}</h1>
        </div>

        <!-- Success notice -->
        <p
          v-if="successNotice !== null"
          role="status"
          class="bg-accent-soft text-accent border border-accent rounded-hq-md px-hq-4 py-hq-3 font-jp text-sm m-0"
          data-testid="detail-success-notice"
        >{{ successNotice }}</p>

        <!-- Dark Fact Card -->
        <DarkFactCard
          :start-at="reservation.event.startAt"
          :end-at="reservation.event.endAt"
          :venue-name="reservation.event.venueName"
        />

        <!-- Meta -->
        <ReservationMetaTable
          :fee="reservation.event.fee"
          :guest-count="reservation.guestCount"
          :experience-level="reservation.member.experienceLevel"
          :reserved-at="reservation.createdAt"
        />

        <!-- Actions -->
        <div class="flex flex-col gap-hq-3">
          <CalendarExportButton v-if="icsInput !== null" :input="icsInput" />
          <VenueMapLink v-if="venueInput !== null" :venue="venueInput" />
        </div>

        <!-- Cancel Policy -->
        <CancelPolicyBox />

        <!-- Cancel CTA -->
        <Button
          v-if="isCancelButtonVisible"
          variant="danger"
          size="md"
          type="button"
          class="w-full"
          data-testid="detail-cancel-button"
          @click="openCancelDialog"
        >
          予約をキャンセル
        </Button>
      </template>
    </section>

    <CancelBookingDialog
      v-if="reservation !== null"
      :open="cancelDialogOpen"
      :event-start-at="reservation.event.startAt"
      :submitting="cancelSubmitting"
      :error-message="cancelErrorMessage"
      @update:open="cancelDialogOpen = $event"
      @confirm="onConfirmCancel"
    />
  </main>
</template>
