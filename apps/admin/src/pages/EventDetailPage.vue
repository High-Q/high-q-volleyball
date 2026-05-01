<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { EventId } from "@high-q/shared";
import { Kicker } from "@high-q/ui";
import { EventDetailWidget } from "@/widgets/event-detail";
import { useAuthSession } from "@/features/auth";

/**
 * /events/:id のルートエントリページ。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const route = useRoute();
const router = useRouter();
const session = useAuthSession();

const eventId = computed<EventId | null>(() => {
  const raw = route.params.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (typeof id !== "string" || id.length === 0) return null;
  return id as unknown as EventId;
});

async function onSignOut(): Promise<void> {
  await session.signOut();
  await router.replace({ name: "login" });
}
</script>

<template>
  <main class="flex h-screen flex-col bg-paper text-ink font-jp">
    <header
      class="flex items-center justify-between border-b border-hairline bg-paper px-hq-8 py-hq-3"
    >
      <div>
        <Kicker color="muted">— Workspace · Events</Kicker>
        <h1 class="font-jp-display text-lg text-ink">イベント詳細</h1>
      </div>
      <button
        type="button"
        class="font-jp text-sm text-muted hover:text-ink"
        @click="onSignOut"
      >
        ログアウト
      </button>
    </header>

    <div class="flex-1 overflow-hidden">
      <EventDetailWidget :event-id="eventId" />
    </div>
  </main>
</template>
