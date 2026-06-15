<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { Kicker } from "@high-q/ui";
import {
  EventForm,
  resolveDuplicateName,
  seedFromEvent,
  suggestNextVolume,
  type EventFormState,
} from "@/widgets/event-form";
import { getEventById } from "@/entities/event";
import Skeleton from "@/shared/ui/Skeleton.vue";

/**
 * /events/new — 新規イベント作成ページ。
 *
 * `?from=<eventId>` 指定時は複製元を取得し、会場・時間・参加費を引き継いだ
 * シード state で作成フォームを開く（開催日は空）。取得失敗時はシードなしの
 * 通常作成にフォールバックして作成を継続できる。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-event-duplicate/specs/admin-event-duplicate/spec.md
 *   openspec/changes/admin-event-duplicate/design.md (D1, D5)
 */

const route = useRoute();

const from = route.query.from;
const hasFrom = typeof from === "string" && from.length > 0;

// from 指定時のみ複製元の非同期解決を待つ。指定なしは即座に通常フォームを描画
// （Skeleton フラッシュを出さない）。
const resolving = ref<boolean>(hasFrom);
const seed = ref<EventFormState | null>(null);
const sourceName = ref<string | null>(null);

async function resolveDuplicate(fromId: string): Promise<void> {
  const result = await getEventById(fromId as never);
  // 取得失敗 / 該当なし / 権限外 → シードなしの通常作成にフォールバック
  if (!result.ok || !result.value) return;
  const source = result.value;
  const nextVolume = await suggestNextVolume();
  seed.value = seedFromEvent(source, resolveDuplicateName(source, nextVolume));
  sourceName.value = source.name;
}

onMounted(async () => {
  if (hasFrom && typeof from === "string") {
    try {
      await resolveDuplicate(from);
    } catch {
      // best-effort: 失敗時もシードなしで作成を継続する
    }
  }
  resolving.value = false;
});
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp">
    <!-- 複製元の解決中（from 指定時のみ） -->
    <div v-if="resolving" class="px-hq-6 py-hq-8">
      <Kicker color="muted">— Workspace · Events / New</Kicker>
      <div class="mt-hq-4 flex flex-col gap-hq-4">
        <Skeleton class="h-8 w-1/2" />
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-32 w-full" />
      </div>
    </div>

    <EventForm
      v-else
      mode="create"
      :seed-event="seed"
      :duplicate-source-name="sourceName"
    />
  </main>
</template>
