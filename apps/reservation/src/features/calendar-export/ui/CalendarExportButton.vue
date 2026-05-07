<script setup lang="ts">
import { Button } from "@high-q/ui";
import { useIcsDownload } from "../composables/useIcsDownload";
import type { BuildIcsInput } from "../lib/build-ics";

/**
 * 「カレンダーに追加 (.ics)」CTA。
 * 押下時にクライアントで .ics を組み立て、ブラウザのダウンロード動作で保存させる。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 */

const props = defineProps<{
  input: BuildIcsInput;
}>();

const { download } = useIcsDownload();

function onClick(): void {
  download(props.input);
}
</script>

<template>
  <Button
    variant="primary"
    size="md"
    type="button"
    class="w-full"
    data-testid="calendar-export-button"
    @click="onClick"
  >
    カレンダーに追加 (.ics)
  </Button>
</template>
