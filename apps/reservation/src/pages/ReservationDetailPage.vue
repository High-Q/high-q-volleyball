<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { unsafeVenueId } from "@high-q/shared";
import { Button, Kicker } from "@high-q/ui";
import { useAuthSession } from "@/features/auth";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import {
  BookingSheet,
  CancelBookingDialog,
  isCancellable,
  useCancelBooking,
} from "@/features/booking";
import {
  fetchMyReservation,
  formatReservationNumber,
  type MyReservationDetail,
  type Reservation,
} from "@/entities/reservation";
import {
  fetchEventParticipantNicknames,
  type EventDetail,
  type EventParticipantNickname,
} from "@/entities/event";
import {
  CancelPolicyBox,
  DarkFactCard,
  ReservationAvailabilityStatus,
  ReservationMetaTable,
} from "@/widgets/reservation-detail-card";
import { ReservationParticipantsSection } from "@/widgets/reservation-participants";

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

// 参加者セクション (Issue #278)
const participants = ref<EventParticipantNickname[]>([]);
const participantsLoading = ref<boolean>(true);
const participantsError = ref<string | null>(null);

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
      void loadParticipants(result.event.id);
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

/**
 * 参加者セクション専用の取得処理 (Issue #278)。
 * 予約取得成功後、event_id で RPC を呼び出す。失敗は画面全体エラーに倒さず
 * セクション内エラー表示に留める (Meta / 予約状況 / Cancel Policy / CTA は通常描画)。
 */
async function loadParticipants(eventId: EventDetail["id"]): Promise<void> {
  participantsLoading.value = true;
  participantsError.value = null;
  try {
    participants.value = await fetchEventParticipantNicknames(eventId);
  } catch (cause) {
    participantsError.value = "参加者一覧を取得できませんでした。";
    // 詳細ログは Sentry 連携経路で拾う (本変更ではセクション単独エラーに留める)
    // eslint-disable-next-line no-console
    console.error("[reservation-detail] participants fetch failed", cause);
  } finally {
    participantsLoading.value = false;
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

const cancelDialogOpen = ref<boolean>(false);
const {
  submitting: cancelSubmitting,
  error: cancelError,
  cancel,
  cancelWaitlist,
  reset: resetCancel,
} = useCancelBooking();

const isWaitlistReservation = computed(
  () => reservation.value?.status === "waitlist",
);

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
  return r.status === "reserved" || r.status === "waitlist";
});

const cancelButtonLabel = computed(() =>
  isWaitlistReservation.value
    ? "キャンセル待ちを取り消す"
    : "予約をキャンセルする",
);

function openCancelDialog(): void {
  resetCancel();
  cancelDialogOpen.value = true;
}

async function onConfirmCancel(): Promise<void> {
  const r = reservation.value;
  if (r === null) return;
  const isWaitlist = r.status === "waitlist";
  const ok = isWaitlist ? await cancelWaitlist(r.id) : await cancel(r.id);
  if (ok) {
    cancelDialogOpen.value = false;
    showSuccess(
      isWaitlist
        ? "キャンセル待ちを取り消しました。"
        : "予約をキャンセルしました。",
    );
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

// ---------- 編集動線 ----------
const editSheetOpen = ref<boolean>(false);

const editButtonVisible = computed(() => {
  const r = reservation.value;
  if (r === null) return false;
  return r.status === "reserved";
});

const isEditable = computed(() => {
  const r = reservation.value;
  if (r === null) return false;
  return r.status === "reserved" && isCancellable(r.event.startAt);
});

/**
 * BookingSheet が要求する `EventDetail` 形に詰め替える。
 * edit モードでは venueId / meetingPoint / mapUrl は使われないため、
 * fetchMyReservation の戻り値に存在しないフィールドはダミー値で埋める。
 */
const editEvent = computed<EventDetail | null>(() => {
  const r = reservation.value;
  if (r === null) return null;
  return {
    id: r.event.id,
    name: r.event.name,
    startAt: r.event.startAt,
    endAt: r.event.endAt,
    fee: r.event.fee,
    venueId: unsafeVenueId(""),
    venueName: r.event.venueName,
    meetingPoint: "",
    mapUrl: null,
    vol: null,
    availability: null,
  };
});

function openEditSheet(): void {
  editSheetOpen.value = true;
}

function onEditSaved(updated: Reservation): void {
  // 楽観的にローカルキャッシュを差し替え。Meta テーブルが新値で再描画される。
  const r = reservation.value;
  if (r !== null) {
    reservation.value = {
      ...r,
      guestCount: updated.guestCount,
      note: updated.note ?? "",
    };
  }
  showSuccess("変更を保存しました。");
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
          <Button variant="outline" size="sm" type="button" @click="load">
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
        <Button variant="outline" size="sm" type="button" @click="load">
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
        />

        <!-- 予約状況セクション (Issue #305) -->
        <ReservationAvailabilityStatus
          :availability="reservation.event.availability"
        />

        <!-- 参加者セクション (Issue #278): 予約状況の下、Cancel Policy の上 -->
        <ReservationParticipantsSection
          :participants="participants"
          :loading="participantsLoading"
          :error-message="participantsError"
        />

        <!-- 編集 CTA: 前向きアクションをプライマリに昇格 (#215) -->
        <Button
          v-if="editButtonVisible"
          variant="primary"
          size="md"
          type="button"
          class="w-full"
          :disabled="!isEditable"
          data-testid="detail-edit-button"
          @click="openEditSheet"
        >
          予約内容を変更する
        </Button>

        <!-- Cancel Policy -->
        <CancelPolicyBox />

        <!-- Cancel CTA: 破壊的アクションは目立たせず、テキストリンク調に控える (#215 feedback) -->
        <Button
          v-if="isCancelButtonVisible"
          variant="ghost"
          size="sm"
          type="button"
          class="w-full text-muted"
          data-testid="detail-cancel-button"
          @click="openCancelDialog"
        >
          {{ cancelButtonLabel }}
        </Button>
      </template>
    </section>

    <CancelBookingDialog
      v-if="reservation !== null"
      :open="cancelDialogOpen"
      :event-start-at="reservation.event.startAt"
      :kind="isWaitlistReservation ? 'waitlist' : 'reservation'"
      :submitting="cancelSubmitting"
      :error-message="cancelErrorMessage"
      @update:open="cancelDialogOpen = $event"
      @confirm="onConfirmCancel"
    />

    <!-- 編集 Bottom Sheet (edit モード) -->
    <BookingSheet
      v-if="reservation !== null && editEvent !== null"
      :open="editSheetOpen"
      :event="editEvent"
      mode="edit"
      :edit="{
        reservationId: reservation.id,
        initialGuestCount: reservation.guestCount,
        initialNote: reservation.note,
      }"
      @update:open="editSheetOpen = $event"
      @saved="onEditSaved"
    />
  </main>
</template>
