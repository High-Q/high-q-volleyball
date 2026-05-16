<script setup lang="ts">
import { Button, Kicker } from "@high-q/ui";

defineProps<{ isFiltered: boolean }>();

const emit = defineEmits<{ clickReset: [] }>();
</script>

<template>
  <div
    class="mx-auto my-hq-14 max-w-md rounded-hq-md border border-dashed border-hairline bg-paper-warm px-hq-6 py-hq-8 text-center"
  >
    <Kicker class="mb-hq-2" color="muted">— Empty</Kicker>
    <template v-if="!isFiltered">
      <h3 class="font-jp-display text-lg text-ink">会員がまだいません</h3>
      <p class="mt-hq-2 font-jp text-sm text-muted">
        新規会員が登録すると、ここに表示されます。
      </p>
    </template>
    <template v-else>
      <h3 class="font-jp-display text-lg text-ink">条件に合う会員はいません</h3>
      <p class="mt-hq-2 font-jp text-sm text-muted">
        フィルタや検索ワードを見直してみてください。
      </p>
      <div class="mt-hq-6">
        <Button variant="secondary" size="sm" @click="emit('clickReset')">
          フィルタをリセット
        </Button>
      </div>
    </template>
  </div>
</template>
