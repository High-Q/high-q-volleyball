<script setup lang="ts">
import { Button, Kicker } from "@high-q/ui";

/**
 * Events 一覧の Empty 状態。
 * - 一覧自体が空（isFiltered=false）→ 「イベントがまだありません」+ 新規作成 CTA
 * - フィルタ後に 0 件（isFiltered=true）  → 「該当するイベントがありません」+ フィルタリセット
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 */

defineProps<{ isFiltered: boolean }>();

const emit = defineEmits<{
  clickNew: [];
  clickReset: [];
}>();
</script>

<template>
  <div
    class="mx-auto my-hq-14 max-w-md rounded-hq-md border border-dashed border-hairline bg-paper-warm px-hq-6 py-hq-8 text-center"
  >
    <Kicker class="mb-hq-2" color="muted">— Empty</Kicker>

    <template v-if="!isFiltered">
      <h3 class="font-jp-display text-lg text-ink">
        イベントがまだありません
      </h3>
      <p class="mt-hq-2 font-jp text-sm text-muted">
        最初のイベントを作って、参加者を募集しましょう。
      </p>
      <div class="mt-hq-6">
        <Button variant="primary" size="sm" @click="emit('clickNew')">
          新規作成
        </Button>
      </div>
    </template>

    <template v-else>
      <h3 class="font-jp-display text-lg text-ink">
        該当するイベントがありません
      </h3>
      <p class="mt-hq-2 font-jp text-sm text-muted">
        条件を変えるか、フィルタをリセットしてください。
      </p>
      <div class="mt-hq-6">
        <Button variant="outline" size="sm" @click="emit('clickReset')">
          フィルタをリセット
        </Button>
      </div>
    </template>
  </div>
</template>
