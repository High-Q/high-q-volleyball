<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Button } from "@high-q/ui";
import { useRouter } from "vue-router";
import { useAuthSession } from "@/features/auth";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { HistoryStatsStrip } from "@/widgets/history-stats-strip";
import { computeHistoryStats } from "@/features/history-stats-strip";
import { HistoryGroup, splitReservations } from "@/features/history-list";
import { CancelBookingDialog, useCancelBooking } from "@/features/booking";
import {
  fetchMyReservations,
  type MyReservationItem,
} from "@/entities/reservation";

/**
 * 予約履歴画面 (/history)。
 *
 * 認証済 + プロフィール完成 + 本人確認書類提出済の正規会員のみアクセス可能。
 * Stats Strip (TOTAL / NEXT / STREAK) + 予約中グループ + 過去グループの 3 セクション構成。
 *
 * 設計参照: docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx の ScreenRHistory
 */

const session = useAuthSession();
const router = useRouter();
const member = computed(() => session.member.value);

const reservations = ref<MyReservationItem[]>([]);
const loading = ref<boolean>(true);
const fetchError = ref<string | null>(null);

const cancelTarget = ref<MyReservationItem | null>(null);
const cancelDialogOpen = ref<boolean>(false);
const { submitting: cancelSubmitting, error: cancelError, cancel } =
  useCancelBooking();

const successNotice = ref<string | null>(null);
let successTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<void> {
  if (member.value === null) return;
  loading.value = true;
  fetchError.value = null;
  try {
    reservations.value = await fetchMyReservations(member.value.id);
  } catch (cause) {
    fetchError.value =
      cause instanceof Error
        ? cause.message
        : "履歴を取得できませんでした。";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

const stats = computed(() => computeHistoryStats(reservations.value));
const groups = computed(() => splitReservations(reservations.value));
const isEmpty = computed(
  () => !loading.value && fetchError.value === null && reservations.value.length === 0,
);

function onRequestCancel(item: MyReservationItem): void {
  cancelTarget.value = item;
  cancelDialogOpen.value = true;
}

async function onConfirmCancel(): Promise<void> {
  const target = cancelTarget.value;
  if (target === null) return;
  const ok = await cancel(target.id);
  if (ok) {
    reservations.value = reservations.value.map((r) =>
      r.id === target.id ? { ...r, status: "cancelled" } : r,
    );
    cancelDialogOpen.value = false;
    cancelTarget.value = null;
    showSuccess("予約をキャンセルしました。");
  }
}

function showSuccess(message: string): void {
  successNotice.value = message;
  if (successTimer !== null) clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successNotice.value = null;
  }, 4000);
}

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

function goEvents(): void {
  void router.push({ name: "events-list" });
}
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp flex flex-col">
    <header
      class="px-hq-5 py-hq-4 flex items-start justify-between gap-hq-4 border-b border-hairline"
    >
      <div class="flex flex-col gap-hq-1">
        <PageBreadcrumb
          :items="[
            { label: 'マイページ', to: { name: 'events-list' } },
            { label: '履歴' },
          ]"
        />
        <span class="font-jp-display text-lg text-ink mt-hq-1">High Q</span>
      </div>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-6">
      <!-- Loading -->
      <div
        v-if="member === null || loading"
        class="flex flex-col gap-hq-4"
        aria-label="履歴を読み込み中"
        data-testid="history-loading"
      >
        <div class="bg-surface border border-hairline rounded-hq-lg h-12 animate-pulse" />
        <div class="bg-surface border border-hairline rounded-hq-lg h-20 animate-pulse" />
        <div class="bg-surface border border-hairline rounded-hq-lg h-32 animate-pulse" />
      </div>

      <template v-else>
        <!-- Header section: 「履歴」 + {N} ENTRIES -->
        <div class="flex items-baseline gap-hq-3">
          <h1
            class="font-jp-display text-2xl text-ink m-0"
            style="letter-spacing: 0.04em;"
          >履歴</h1>
          <span
            class="font-mono text-[10px] text-muted"
            style="letter-spacing: 0.18em;"
            data-testid="history-entries"
          >{{ reservations.length }} ENTRIES</span>
        </div>

        <!-- Success notice -->
        <p
          v-if="successNotice !== null"
          role="status"
          class="bg-accent-soft text-accent border border-accent rounded-hq-md px-hq-4 py-hq-3 font-jp text-sm m-0"
          data-testid="history-success-notice"
        >{{ successNotice }}</p>

        <!-- Error banner -->
        <div
          v-if="fetchError !== null"
          role="alert"
          class="bg-surface border border-hairline rounded-hq-lg p-hq-4 flex items-center justify-between gap-hq-3"
          data-testid="history-error"
        >
          <p class="font-jp text-sm text-ink m-0">
            履歴を取得できませんでした。
          </p>
          <Button variant="secondary" size="sm" type="button" @click="load">再試行</Button>
        </div>

        <!-- Stats Strip -->
        <HistoryStatsStrip :stats="stats" />

        <!-- Empty state -->
        <div
          v-if="isEmpty"
          class="bg-surface border border-hairline rounded-hq-lg px-hq-4 py-hq-6 flex flex-col items-center gap-hq-3 text-center"
          data-testid="history-empty"
        >
          <p class="font-jp text-sm text-muted m-0">
            まだ予約がありません。最初の予約を取りましょう。
          </p>
          <Button variant="primary" size="sm" type="button" @click="goEvents">イベントを探す</Button>
        </div>

        <!-- Upcoming group -->
        <HistoryGroup
          v-if="groups.upcoming.length > 0"
          label="予約中"
          :items="groups.upcoming"
          :show-cancel="true"
          @request-cancel="onRequestCancel"
        />

        <!-- Past group -->
        <HistoryGroup
          v-if="groups.past.length > 0"
          label="過去"
          :items="groups.past"
        />
      </template>
    </section>

    <CancelBookingDialog
      v-if="cancelTarget !== null"
      :open="cancelDialogOpen"
      :event-start-at="cancelTarget.event.startAt"
      :submitting="cancelSubmitting"
      :error-message="cancelErrorMessage"
      @update:open="cancelDialogOpen = $event"
      @confirm="onConfirmCancel"
    />
  </main>
</template>
