<script setup lang="ts">
import { computed, nextTick, onMounted, ref, toRef, watch } from "vue";
import { Button, Kicker } from "@high-q/ui";
import type { MemberId } from "@high-q/shared";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_CHANNELS,
  ANNOUNCEMENT_PLACEHOLDERS,
  X_MAX_WEIGHTED,
  type AnnouncementChannel,
} from "@/entities/announcement-template";
import FormField from "@/shared/ui/FormField.vue";
import Textarea from "@/shared/ui/Textarea.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import { useAnnouncementTemplateForm } from "../composables/useAnnouncementTemplateForm";

/**
 * 告知テンプレート（LINE / X のうち 1 チャネル）の編集フォーム (#386)。
 *
 * 本文 / 差し込み項目（押下でカーソル位置に挿入）/ サンプル展開プレビュー / 保存。
 * X はサンプル展開後の X 文字数（上限 280）を表示する。
 * チャネル切り替えは親ページが担い、未保存確認のため `dirty` を通知する。
 * md 以上は「本文 | プレビュー」の 2 カラム、md 未満は縦積み。
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「告知テンプレート画面」
 */

const props = withDefaults(
  defineProps<{
    adminMemberId: MemberId | null;
    channel?: AnnouncementChannel;
  }>(),
  { channel: "line" },
);

const emit = defineEmits<{
  "update:dirty": [value: boolean];
}>();

const {
  status,
  isNew,
  body,
  updatedAt,
  remaining,
  bodyError,
  unknownPlaceholders,
  preview,
  previewXLength,
  isDirty,
  saving,
  load,
  save,
} = useAnnouncementTemplateForm(toRef(props, "adminMemberId"), props.channel);

watch(isDirty, (v) => emit("update:dirty", v), { immediate: true });

const channelLabel = computed(
  () => ANNOUNCEMENT_CHANNELS.find((c) => c.channel === props.channel)?.label ?? "",
);
const xOverLimit = computed(
  () => previewXLength.value !== null && previewXLength.value > X_MAX_WEIGHTED,
);

onMounted(() => {
  void load();
});

const editorRef = ref<HTMLElement | null>(null);

function textarea(): HTMLTextAreaElement | null {
  return editorRef.value?.querySelector("textarea") ?? null;
}

async function insertPlaceholder(token: string): Promise<void> {
  const el = textarea();
  const start = el?.selectionStart ?? body.value.length;
  const end = el?.selectionEnd ?? body.value.length;
  body.value = body.value.slice(0, start) + token + body.value.slice(end);
  await nextTick();
  if (el) {
    el.focus();
    const caret = start + token.length;
    el.setSelectionRange(caret, caret);
  }
}

const updatedAtLabel = computed(() => {
  if (updatedAt.value === null) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(updatedAt.value));
});

const counterLabel = computed(() =>
  remaining.value >= 0
    ? `残り ${remaining.value.toLocaleString("ja-JP")} 文字`
    : `${(-remaining.value).toLocaleString("ja-JP")} 文字オーバー`,
);

const hint = computed(
  () =>
    `${counterLabel.value}（上限 ${ANNOUNCEMENT_BODY_MAX.toLocaleString("ja-JP")} 文字）`,
);
</script>

<template>
  <!-- Loading -->
  <div v-if="status === 'loading'" class="flex flex-col gap-hq-4" aria-label="読み込み中">
    <Skeleton class="h-6 w-1/3" />
    <Skeleton class="h-64 w-full" />
  </div>

  <!-- Error -->
  <div
    v-else-if="status === 'error'"
    role="alert"
    class="rounded-hq-md border border-danger/40 bg-danger-soft p-hq-6"
    data-testid="template-load-error"
  >
    <p class="font-jp text-sm text-danger m-0">
      告知テンプレートを読み込めませんでした。
    </p>
    <div class="mt-hq-4">
      <Button variant="outline" size="sm" @click="load">再試行</Button>
    </div>
  </div>

  <!-- Ready (未登録時は初期テンプレートを入れた状態) -->
  <form
    v-else
    class="flex flex-col gap-hq-6"
    novalidate
    @submit.prevent="save"
  >
    <p
      v-if="isNew"
      class="m-0 rounded-hq-md border border-hairline bg-paper-warm px-hq-4 py-hq-3 font-jp text-sm text-ink"
      data-testid="template-new-notice"
    >
      テンプレートはまだ保存されていません。初期テンプレートを編集して保存してください。
    </p>

    <div class="grid grid-cols-1 gap-hq-6 md:grid-cols-2">
      <!-- 本文 + 差し込み項目 -->
      <div ref="editorRef" class="flex flex-col gap-hq-4">
        <FormField
          :label="`${channelLabel} 告知テンプレート`"
          :error="bodyError ?? undefined"
          :hint="hint"
        >
          <template #default="{ fieldId, messageId, ariaInvalid }">
            <Textarea
              :id="fieldId"
              v-model="body"
              :rows="18"
              :aria-invalid="ariaInvalid"
              :aria-describedby="messageId"
              class="font-jp text-sm"
              data-testid="template-body"
            />
          </template>
        </FormField>
        <p
          v-if="bodyError"
          class="m-0 font-jp text-xs text-muted"
          data-testid="template-counter"
        >
          {{ hint }}
        </p>

        <p
          v-if="unknownPlaceholders.length > 0"
          role="status"
          class="m-0 rounded-hq-sm border border-hairline bg-paper-warm px-hq-3 py-hq-2 font-jp text-xs text-ink"
          data-testid="template-unknown-placeholders"
        >
          {{ unknownPlaceholders.join("、") }} は差し込み項目ではありません。そのまま告知文に残ります。
        </p>

        <section class="flex flex-col gap-hq-2" aria-labelledby="placeholder-heading">
          <Kicker id="placeholder-heading" color="muted">— 差し込み項目（押すとカーソル位置に挿入）</Kicker>
          <ul class="m-0 flex list-none flex-wrap gap-hq-2 p-0">
            <li v-for="p in ANNOUNCEMENT_PLACEHOLDERS" :key="p.token">
              <button
                type="button"
                class="inline-flex items-center rounded-hq-sm border border-hairline bg-paper px-hq-2 py-hq-1 font-jp text-xs text-ink hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                :title="p.description"
                :aria-label="`${p.token} を挿入（${p.description}）`"
                :data-testid="`insert-${p.token}`"
                @click="insertPlaceholder(p.token)"
              >
                {{ p.token }}
              </button>
            </li>
          </ul>
        </section>
      </div>

      <!-- プレビュー -->
      <section class="flex flex-col gap-hq-2" aria-labelledby="preview-heading">
        <Kicker id="preview-heading" color="muted">— プレビュー（サンプルのイベントで展開）</Kicker>
        <pre
          aria-label="告知文プレビュー"
          class="m-0 min-h-[12rem] whitespace-pre-wrap break-words rounded-hq-md border border-hairline bg-paper-warm p-hq-4 font-jp text-sm text-ink"
          data-testid="template-preview"
        >{{ preview }}</pre>
        <p
          v-if="previewXLength !== null"
          :role="xOverLimit ? 'status' : undefined"
          :class="['m-0 font-jp text-xs', xOverLimit ? 'text-danger' : 'text-muted']"
          data-testid="template-x-length"
        >
          X の文字数（サンプル展開後）: {{ previewXLength }} / {{ X_MAX_WEIGHTED }}
          <template v-if="xOverLimit">（上限を超えています。X Premium 以外では投稿できません）</template>
          <template v-else>。会場名が長い日は増えるので余裕をもたせてください</template>
        </p>
      </section>
    </div>

    <div class="flex flex-col-reverse items-stretch gap-hq-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="m-0 font-jp text-xs text-muted" data-testid="template-updated-at">
        {{ updatedAtLabel ? `最終更新: ${updatedAtLabel}` : "未保存" }}
      </p>
      <Button type="submit" variant="primary" size="md" :disabled="saving" data-testid="template-save">
        {{ saving ? "保存中…" : "保存する" }}
      </Button>
    </div>
  </form>
</template>
