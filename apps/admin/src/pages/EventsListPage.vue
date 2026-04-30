<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import { EventsListWidget } from "@/widgets/events-list";
import { useAuthSession } from "@/features/auth";
import { useRouter } from "vue-router";

/**
 * /events のルートエントリページ。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 */

const router = useRouter();
const session = useAuthSession();

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
        <h1 class="font-jp-display text-lg text-ink">イベント</h1>
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
      <EventsListWidget />
    </div>
  </main>
</template>
