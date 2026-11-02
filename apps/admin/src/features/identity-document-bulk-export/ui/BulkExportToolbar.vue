<script setup lang="ts">
import { Button } from "@high-q/ui";

/**
 * #172 一括アクションツールバー。1 件以上選択時のみ表示（表示条件は親が制御）。
 * 選択件数 / ダウンロード起点 / 選択解除 を持つ。取得中は disabled + aria-busy。
 *
 * 関連: openspec/changes/admin-identity-document-bulk-export/specs/admin-members-list/spec.md
 */
const props = defineProps<{
  count: number;
  busy?: boolean;
}>();

const emit = defineEmits<{
  download: [];
  clear: [];
}>();
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-hq-3 border-b border-hairline bg-paper-warm px-hq-4 py-hq-3"
    role="region"
    aria-label="選択中の会員の一括操作"
  >
    <span class="font-jp text-sm font-medium text-ink">
      {{ props.count }} 名選択中
    </span>
    <div class="ml-auto flex items-center gap-hq-2">
      <Button
        variant="ghost"
        type="button"
        :disabled="props.busy"
        @click="emit('clear')"
      >選択を解除</Button>
      <Button
        variant="primary"
        type="button"
        :disabled="props.busy"
        :aria-busy="props.busy ? 'true' : undefined"
        @click="emit('download')"
      >{{ props.busy ? "作成中…" : "会員名簿と本人確認書類をダウンロード" }}</Button>
    </div>
  </div>
</template>
