<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import type { Event } from "@high-q/shared";
import {
  getEventById,
  type FetchError,
} from "@/entities/event";
import { getEventDetail } from "@/entities/event-detail";
import Skeleton from "@/shared/ui/Skeleton.vue";
import { EventForm } from "@/widgets/event-form";
import { EventDeleteDialog } from "@/features/event-delete";

/**
 * /events/:id/edit — 既存イベント編集ページ。
 *
 * Loading: Skeleton
 * Error  : 「一覧に戻る」CTA
 * Success: EventForm + EventDeleteDialog
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (§3.3, §6)
 */

const route = useRoute();

const status = ref<"loading" | "success" | "error">("loading");
const event = ref<Event | null>(null);
const fetchError = ref<FetchError | null>(null);
// 定員下限バリデーション用の現在の有効予約人数（本人 + 同伴）。取得失敗時は
// null のままにし、下限チェックをスキップさせる（縮退）。フォーム本体の取得を
// 妨げないよう event 取得とは独立に解決する。
const reservedCount = ref<number | null>(null);

async function load(id: string) {
  status.value = "loading";
  fetchError.value = null;
  reservedCount.value = null;
  const result = await getEventById(id as never);
  if (!result.ok) {
    fetchError.value = result.error;
    status.value = "error";
    return;
  }
  if (!result.value) {
    fetchError.value = { code: "SERVER_ERROR", message: "Event not found" };
    status.value = "error";
    return;
  }
  event.value = result.value;
  status.value = "success";
  // 予約数は補助情報。失敗してもフォームを Error にせず下限チェックを諦める。
  const detail = await getEventDetail(id as never);
  if (detail.ok && detail.value) {
    reservedCount.value = detail.value.reserved_count;
  }
}

onMounted(() => {
  const id = route.params.id;
  if (typeof id === "string") void load(id);
});

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") void load(id);
  },
);

const eventId = computed(() =>
  typeof route.params.id === "string" ? route.params.id : "",
);
</script>

<template>
  <!-- #155 シェルが <main> を所有するため root は <div>。min-h-full でシェル内に収める -->
  <div class="min-h-full bg-paper text-ink font-jp">
    <!-- Loading -->
    <div v-if="status === 'loading'" class="px-hq-6 py-hq-8">
      <Kicker color="muted">— Workspace · Events / Edit</Kicker>
      <div class="mt-hq-4 flex flex-col gap-hq-4">
        <Skeleton class="h-8 w-1/2" />
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-32 w-full" />
        <Skeleton class="h-32 w-full" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="px-hq-6 py-hq-8">
      <Kicker color="muted">— Workspace · Events / Edit</Kicker>
      <div
        role="alert"
        class="mt-hq-4 rounded-hq-md border border-danger/40 bg-danger-soft p-hq-6"
      >
        <h2 class="font-jp text-base font-medium text-danger">
          イベントを取得できませんでした
        </h2>
        <p class="mt-hq-2 font-jp text-sm text-danger">
          ERR · supabase / events.get · {{ fetchError?.code }}
        </p>
        <div class="mt-hq-4">
          <RouterLink to="/events">
            <Button variant="outline" size="sm">一覧へ戻る</Button>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Success -->
    <EventForm
      v-else
      mode="edit"
      :initial-event="event"
      :event-id="eventId"
      :reserved-count="reservedCount"
    >
      <template #headerActions>
        <EventDeleteDialog
          :event-id="eventId"
          :event-name="event?.name"
        />
      </template>
    </EventForm>
  </div>
</template>
