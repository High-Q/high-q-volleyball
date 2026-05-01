<script setup lang="ts">
import { computed, toRef } from "vue";
import { useRouter } from "vue-router";
import { RemainBar } from "@high-q/ui";
import type { EventId } from "@high-q/shared";
import { EventParticipantsWidget } from "@/widgets/event-participants";
import { useEventDetailData } from "../composables/useEventDetailData";
import EventDetailTopBar from "./EventDetailTopBar.vue";
import EventStatCards from "./EventStatCards.vue";
import EventDetailTabs from "./EventDetailTabs.vue";
import EventDetailSkeleton from "./EventDetailSkeleton.vue";
import EventDetailErrorState from "./EventDetailErrorState.vue";

/**
 * /events/:id 画面のメイン Widget。
 *
 * - 4 状態出し分け: Loading / Error (event_not_found / network) / Success
 *   - 参加者ゼロは Success 配下で EventParticipantsWidget が描画
 * - StatCards + RemainBar (capacity ありの時のみ) + Tabs + EventParticipantsWidget
 * - チェックイン optimistic 反映を StatCard 連携（applyDeltas）
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const props = defineProps<{
  eventId: EventId | null;
}>();

const router = useRouter();

const eventIdRef = toRef(props, "eventId");

const detail = useEventDetailData(eventIdRef);

const view = computed<"loading" | "error" | "success">(() => {
  if (detail.isError.value) return "error";
  if (detail.isPending.value && detail.data.value === null) return "loading";
  if (detail.data.value === null) return "loading";
  return "success";
});

const TAB_ITEMS = computed(() => [
  {
    id: "participants" as const,
    label: "参加者一覧",
    count: detail.data.value?.reserved_count ?? 0,
  },
  {
    id: "wait" as const,
    label: "キャンセル待ち",
    count: detail.data.value?.waitlist_count ?? 0,
    disabled: true,
    comingSoon: "Coming soon (MVP2)",
  },
  {
    id: "checkin" as const,
    label: "当日チェックイン",
    disabled: true,
    comingSoon: "Coming soon (MVP2)",
  },
]);

function onClickEdit(): void {
  if (props.eventId === null) return;
  void router.push({ name: "events-edit", params: { id: props.eventId as unknown as string } });
}

function onRetry(): void {
  void detail.refetch();
}

function onGoBack(): void {
  void router.push({ name: "events" });
}

function onCheckinChanged(delta: number): void {
  detail.applyDeltas({ checkin: delta });
  // 背景で view を再取得して整合性を取る（D3）
  void detail.refetch();
}

function onReservationCancelled(): void {
  detail.applyDeltas({ reserved: -1 });
  void detail.refetch();
}
</script>

<template>
  <div class="flex h-full flex-col">
    <EventDetailSkeleton v-if="view === 'loading'" />

    <EventDetailErrorState
      v-else-if="view === 'error' && detail.errorCode.value !== null"
      :error-code="detail.errorCode.value"
      @retry="onRetry"
      @go-back="onGoBack"
    />

    <template v-else-if="view === 'success' && detail.data.value !== null">
      <EventDetailTopBar :row="detail.data.value" @click-edit="onClickEdit" />

      <div class="px-hq-8 pt-hq-5">
        <EventStatCards :row="detail.data.value" />
        <div v-if="detail.data.value.capacity !== null" class="mt-hq-3">
          <RemainBar
            :capacity="detail.data.value.capacity"
            :taken="detail.data.value.reserved_count"
          />
        </div>
      </div>

      <div class="mt-hq-5">
        <EventDetailTabs active="participants" :items="TAB_ITEMS" />
      </div>

      <div
        :id="`tabpanel-participants`"
        role="tabpanel"
        class="flex-1 overflow-hidden flex flex-col"
      >
        <EventParticipantsWidget
          :event-id="eventId"
          @checkin-changed="onCheckinChanged"
          @reservation-cancelled="onReservationCancelled"
        />
      </div>
    </template>
  </div>
</template>
