<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Button } from "@high-q/ui";
import { useAuthSession } from "@/features/auth";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { ProfileHeader } from "@/widgets/profile-header";
import { LevelEditSection } from "@/features/profile-level-edit";
import { StatsSection } from "@/features/profile-stats";
import { AccountSection } from "@/features/profile-account";
import { CancelBookingDialog, useCancelBooking } from "@/features/booking";
import {
  fetchMyReservations,
  type MyReservationItem,
} from "@/entities/reservation";

const session = useAuthSession();
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
        : "データの取得に失敗しました。";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function onRequestCancel(item: MyReservationItem): void {
  cancelTarget.value = item;
  cancelDialogOpen.value = true;
}

type EditField = "displayName" | "nickname" | "email" | "phone";
const editField = ref<EditField | null>(null);

function onEditAccount(field: EditField): void {
  editField.value = field;
}

function showSuccess(message: string): void {
  successNotice.value = message;
  if (successTimer !== null) clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successNotice.value = null;
  }, 4000);
}

async function onConfirmCancel(): Promise<void> {
  const target = cancelTarget.value;
  if (target === null) return;
  const ok = await cancel(target.id);
  if (ok) {
    // ローカルで対象行を 'cancelled' に書き換え (再 fetch 不要)
    reservations.value = reservations.value.map((r) =>
      r.id === target.id ? { ...r, status: "cancelled" } : r,
    );
    cancelDialogOpen.value = false;
    cancelTarget.value = null;
    showSuccess("予約をキャンセルしました。");
  }
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
            { label: 'プロフィール' },
          ]"
        />
        <span class="font-jp-display text-lg text-ink mt-hq-1">High Q</span>
      </div>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-6">
      <template v-if="member !== null">
        <ProfileHeader :member="member" />

        <p
          v-if="successNotice !== null"
          role="status"
          class="bg-accent-soft text-accent border border-accent rounded-hq-md px-hq-4 py-hq-3 font-jp text-sm m-0"
          data-testid="profile-success-notice"
        >{{ successNotice }}</p>

        <div
          v-if="fetchError !== null"
          role="alert"
          class="bg-surface border border-hairline rounded-hq-lg p-hq-4 flex items-center justify-between gap-hq-3"
        >
          <p class="font-jp text-sm text-ink m-0">
            データの取得に失敗しました。
          </p>
          <Button variant="secondary" size="sm" type="button" @click="load">再試行</Button>
        </div>

        <LevelEditSection
          :member-id="member.id"
          :initial-level="member.experienceLevel"
        />

        <AccountSection :member="member" @edit="onEditAccount" />

        <div v-if="loading" class="bg-surface border border-hairline rounded-hq-lg h-32 animate-pulse" aria-label="読み込み中" />
        <StatsSection
          v-else
          :reservations="reservations"
          @request-cancel="onRequestCancel"
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
