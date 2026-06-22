<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { useRouter } from "vue-router";
import { RemainBar } from "@high-q/ui";
import type { EventId, MemberId } from "@high-q/shared";
import { EventParticipantsWidget } from "@/widgets/event-participants";
import { useEventDetailData } from "../composables/useEventDetailData";
import EventDetailTopBar from "./EventDetailTopBar.vue";
import EventStatCards from "./EventStatCards.vue";
import EventDetailTabs from "./EventDetailTabs.vue";
import EventWaitlistPanel from "./EventWaitlistPanel.vue";
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

const emit = defineEmits<{
  /** 予約者一覧の氏名押下で発火。Page が `MemberDetailSheet` を開くため。 */
  "member-clicked": [memberId: MemberId];
}>();

const router = useRouter();

const eventIdRef = toRef(props, "eventId");

const detail = useEventDetailData(eventIdRef);

type TabId = "participants" | "wait" | "checkin";
const activeTab = ref<TabId>("participants");
function onTabChange(id: TabId): void {
  activeTab.value = id;
}

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
    // 待機者が 1 名以上いるときだけ件数を強調する
    emphasizeCount: (detail.data.value?.waitlist_count ?? 0) > 0,
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

// 各 mutation hook は **optimistic apply のみ** を担当 (即時 UI フィードバック)。
// DB と同期するための refetch は `onMutationSettled` で mutation 完了後に
// 直列実行する (`useEventDetailData` の requestSeq ガードで並列でも古い結果は
// 自動で捨てられる)。これで複数 admin 同時操作にも整合する。
function onCheckinChanged(delta: number): void {
  // チェックインで member 数も ±1 動く (1 件の reservation が
  // reserved/attended を行き来する。reserved_member_count は両方 active なので
  // 不変、checked_in_member_count のみ ±1)
  const memberDelta = delta > 0 ? 1 : -1;
  detail.applyDeltas({ checkin: delta, checkinMember: memberDelta });
}

function onReservationCancelled(reservedDelta: number, checkinDelta: number): void {
  // キャンセル代行で 1 件 reservation が active から外れる
  // → reserved_member_count -1、checked_in_member_count は元 attended なら -1
  detail.applyDeltas({
    reserved: reservedDelta,
    checkin: checkinDelta,
    reservedMember: -1,
    checkinMember: checkinDelta < 0 ? -1 : 0,
  });
}

function onGuestChanged(reservedDelta: number, checkinDelta: number): void {
  // 同伴編集は member 数 (本人数) は不変
  detail.applyDeltas({ reserved: reservedDelta, checkin: checkinDelta });
}

/**
 * EventParticipantsWidget からの「mutation 完了」を受けて、
 * event_detail_view を refetch し StatCard を真値で上書き。
 * UPDATE 完了後にのみ呼ばれるため、race condition なし。
 */
function onMutationSettled(): void {
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
        <EventDetailTabs
          :active="activeTab"
          :items="TAB_ITEMS"
          @change="onTabChange"
        />
      </div>

      <div
        v-show="activeTab === 'participants'"
        id="tabpanel-participants"
        role="tabpanel"
        class="flex-1 md:overflow-hidden flex flex-col"
      >
        <EventParticipantsWidget
          :event-id="eventId"
          @checkin-changed="onCheckinChanged"
          @reservation-cancelled="onReservationCancelled"
          @guest-changed="onGuestChanged"
          @mutation-settled="onMutationSettled"
          @member-clicked="(id) => emit('member-clicked', id)"
        />
      </div>

      <div
        v-if="activeTab === 'wait'"
        id="tabpanel-wait"
        role="tabpanel"
        class="flex-1 md:overflow-hidden flex flex-col"
      >
        <EventWaitlistPanel :event-id="eventId" />
      </div>
    </template>
  </div>
</template>
