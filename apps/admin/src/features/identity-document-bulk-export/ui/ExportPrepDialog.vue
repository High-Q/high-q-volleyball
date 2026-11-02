<script setup lang="ts">
import { ref, watch } from "vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Label,
  Input,
} from "@/shared/ui";
import { Button } from "@high-q/ui";
import type { ExportDialogMember } from "../model/dialog.types";

/**
 * #172 エクスポート準備ダイアログ。選択会員を一覧し、氏名（読み取り専用）と
 * 電話番号（DB プリフィル・編集可）を確認する。**住所の入力欄は設けない**
 * （住所は CSV に空欄列で出力し、エクスポート後に補記する）。
 *
 * 関連: openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 */
const props = defineProps<{
  open: boolean;
  members: ReadonlyArray<ExportDialogMember>;
  busy?: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 確認済み電話番号（member id → 値）を渡してダウンロードを開始する。 */
  submit: [phoneOverrides: Record<string, string>];
}>();

// 編集中の電話番号（member id → 値）
const phones = ref<Record<string, string>>({});

watch(
  () => props.open,
  (next) => {
    if (next) {
      const init: Record<string, string> = {};
      for (const m of props.members) init[m.id] = m.phone;
      phones.value = init;
    }
  },
  { immediate: true },
);

function onDownload(): void {
  if (props.busy) return;
  emit("submit", { ...phones.value });
}

function close(): void {
  emit("update:open", false);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>会員名簿と本人確認書類をダウンロード</DialogTitle>
        <DialogDescription>
          選択した {{ props.members.length }} 名の電話番号を確認してください。住所は CSV に空欄で出力され、エクスポート後に補記します。
        </DialogDescription>
      </DialogHeader>

      <form
        class="flex max-h-[60vh] flex-col gap-hq-3 overflow-auto"
        @submit.prevent="onDownload"
      >
        <div
          v-for="m in props.members"
          :key="m.id"
          class="grid grid-cols-[1fr_1fr] items-center gap-hq-3 border-b border-hairline pb-hq-2"
        >
          <span class="font-jp text-sm text-ink">{{ m.name }}</span>
          <FormField>
            <Label :html-for="`export-phone-${m.id}`" class="sr-only">
              {{ m.name }} の電話番号
            </Label>
            <Input
              :id="`export-phone-${m.id}`"
              v-model="phones[m.id]"
              type="tel"
              :disabled="props.busy"
              placeholder="電話番号"
            />
          </FormField>
        </div>
      </form>

      <DialogFooter>
        <Button
          variant="ghost"
          type="button"
          :disabled="props.busy"
          @click="close"
        >キャンセル</Button>
        <Button
          variant="primary"
          type="button"
          :disabled="props.busy"
          :aria-busy="props.busy ? 'true' : undefined"
          @click="onDownload"
        >{{ props.busy ? "作成中…" : "ダウンロード" }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
