<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@high-q/ui";
import type { EventDetailRow } from "@/entities/event-detail";
import {
  ANNOUNCEMENT_CHANNELS,
  X_MAX_WEIGHTED,
  type AnnouncementChannel,
} from "@/entities/announcement-template";
import Dialog from "@/shared/ui/Dialog.vue";
import DialogContent from "@/shared/ui/DialogContent.vue";
import DialogHeader from "@/shared/ui/DialogHeader.vue";
import DialogTitle from "@/shared/ui/DialogTitle.vue";
import DialogDescription from "@/shared/ui/DialogDescription.vue";
import DialogFooter from "@/shared/ui/DialogFooter.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import { useAnnouncementDialog } from "../composables/useAnnouncementDialog";

/**
 * イベント詳細から開く告知文ダイアログ (#386)。
 *
 * LINE / X を切り替え、選択中チャネルのテンプレートを当該イベントで展開した告知文を
 * プレビューし、告知文をコピーできる（コピー操作はこの 1 つのみ。リンクは
 * テンプレートの差し込み項目で告知文に含める）。貼る前に日時・参加費を目で確認
 * できるよう、即コピーではなくプレビューを挟む。X 選択時は X の文字数を表示する。
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「告知文ダイアログ」
 */

const props = defineProps<{
  open: boolean;
  event: EventDetailRow;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const router = useRouter();
const channel = ref<AnnouncementChannel>("line");
const {
  state,
  message,
  xLength,
  fallbackText,
  load,
  copyMessage,
} = useAnnouncementDialog(toRef(props, "event"), channel);

const fallbackRef = ref<HTMLTextAreaElement | null>(null);

const xOverLimit = computed(
  () => xLength.value !== null && xLength.value > X_MAX_WEIGHTED,
);

watch(
  [() => props.open, channel],
  ([open]) => {
    if (open) void load();
  },
  { immediate: true },
);

// 開き直したときは LINE から始める
watch(
  () => props.open,
  (open) => {
    if (!open) channel.value = "line";
  },
);

// 書き込み失敗時は退避欄にフォーカスして全選択し、そのまま手動コピーできるようにする
watch(fallbackText, async (text) => {
  if (text === null) return;
  await nextTick();
  fallbackRef.value?.focus();
  fallbackRef.value?.select();
});

function goToTemplate(): void {
  emit("update:open", false);
  void router.push({
    name: "announcement-template",
    query: { channel: channel.value },
  });
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle>告知文</DialogTitle>
        <DialogDescription>
          内容を確認してコピーし、{{ channel === "line" ? "LINE オープンチャット" : "X" }}に貼り付けてください。
        </DialogDescription>
      </DialogHeader>

      <div
        role="tablist"
        aria-label="告知チャネル"
        class="inline-flex w-fit gap-hq-1 rounded-hq-md border border-hairline bg-paper-warm p-hq-1"
      >
        <button
          v-for="c in ANNOUNCEMENT_CHANNELS"
          :key="c.channel"
          type="button"
          role="tab"
          :aria-selected="channel === c.channel"
          :class="[
            'rounded-hq-sm px-hq-4 py-hq-1 font-jp text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            channel === c.channel ? 'bg-paper text-ink shadow-hq-sm' : 'text-muted hover:text-ink',
          ]"
          :data-testid="`announcement-channel-${c.channel}`"
          @click="channel = c.channel"
        >
          {{ c.label }}
        </button>
      </div>

      <div v-if="state === 'loading' || state === 'idle'" class="flex flex-col gap-hq-2">
        <Skeleton class="h-4 w-2/3" />
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-5/6" />
        <Skeleton class="h-4 w-1/2" />
      </div>

      <div
        v-else-if="state === 'empty'"
        class="flex flex-col gap-hq-3 rounded-hq-md border border-hairline bg-paper-warm p-hq-4"
        data-testid="announcement-empty"
      >
        <p class="font-jp text-sm text-ink m-0">告知テンプレートが未設定です。</p>
        <div>
          <Button variant="outline" size="sm" @click="goToTemplate">
            テンプレートを作成
          </Button>
        </div>
      </div>

      <div
        v-else-if="state === 'error'"
        role="alert"
        class="flex flex-col gap-hq-3 rounded-hq-md border border-hairline bg-paper-warm p-hq-4"
        data-testid="announcement-error"
      >
        <p class="font-jp text-sm text-danger m-0">
          テンプレートを読み込めませんでした。
        </p>
        <div>
          <Button variant="outline" size="sm" @click="load">再試行</Button>
        </div>
      </div>

      <pre
        v-else-if="fallbackText === null"
        aria-label="告知文プレビュー"
        class="m-0 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words rounded-hq-md border border-hairline bg-paper-warm p-hq-4 font-jp text-sm text-ink"
        data-testid="announcement-preview"
      >{{ message }}</pre>

      <p
        v-if="state === 'success' && xLength !== null"
        :role="xOverLimit ? 'status' : undefined"
        :class="['m-0 font-jp text-xs', xOverLimit ? 'text-danger' : 'text-muted']"
        data-testid="announcement-x-length"
      >
        X の文字数: {{ xLength }} / {{ X_MAX_WEIGHTED }}
        <template v-if="xOverLimit">（上限を超えています。X Premium 以外では投稿できません）</template>
      </p>

      <textarea
        v-if="fallbackText !== null"
        ref="fallbackRef"
        readonly
        rows="10"
        aria-label="コピー対象の文面"
        class="w-full resize-y rounded-hq-md border border-hairline bg-paper p-hq-3 font-jp text-sm text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        data-testid="announcement-fallback"
        :value="fallbackText"
      />

      <DialogFooter class="flex flex-col gap-hq-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button
          variant="ghost"
          size="sm"
          data-testid="announcement-edit-template"
          @click="goToTemplate"
        >
          テンプレートを編集
        </Button>
        <Button
          v-if="state === 'success'"
          variant="primary"
          size="sm"
          data-testid="announcement-copy-message"
          @click="copyMessage"
        >
          告知文をコピー
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
