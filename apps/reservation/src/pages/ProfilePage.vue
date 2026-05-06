<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Button } from "@high-q/ui";
import { useAuthSession } from "@/features/auth";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { ProfileHeader } from "@/widgets/profile-header";
import { LevelEditSection } from "@/features/profile-level-edit";
import { StatsSection } from "@/features/profile-stats";
import {
  fetchMyReservations,
  type MyReservationItem,
} from "@/entities/reservation";

const session = useAuthSession();
const member = computed(() => session.member.value);

const reservations = ref<MyReservationItem[]>([]);
const loading = ref<boolean>(true);
const fetchError = ref<string | null>(null);

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
  // G5 で実装する。一旦 console に流す。
  void item;
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
            { label: 'プロフィール' },
          ]"
        />
        <span class="font-jp-display text-lg text-ink mt-hq-1">High Q</span>
      </div>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-6">
      <template v-if="member !== null">
        <ProfileHeader :member="member" />

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

        <div v-if="loading" class="bg-surface border border-hairline rounded-hq-lg h-32 animate-pulse" aria-label="読み込み中" />
        <StatsSection
          v-else
          :reservations="reservations"
          @request-cancel="onRequestCancel"
        />
      </template>
    </section>
  </main>
</template>
