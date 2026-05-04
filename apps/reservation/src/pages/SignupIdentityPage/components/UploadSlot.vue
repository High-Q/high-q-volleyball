<script setup lang="ts">
import { computed } from "vue";
import type { SlotData } from "@/entities/identity-document";
import type { Side } from "@/features/identity-document";

interface Props {
  side: Side;
  data: SlotData;
  required: boolean;
  label: string;
  helpText?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [side: Side, file: File];
  remove: [side: Side];
}>();

const inputId = computed(() => `upload-slot-${props.side}`);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit("select", props.side, file);
  }
  input.value = "";
}

function onRemove() {
  emit("remove", props.side);
}

const showProgressBar = computed(() => props.data.state === "uploading");
const progressLabel = computed(() => `${props.data.progress}%`);
</script>

<template>
  <div>
    <div class="flex items-baseline gap-hq-2">
      <span class="font-jp text-[12.5px] font-medium text-ink/80">
        {{ props.label }}
      </span>
      <span
        v-if="props.required"
        class="rounded-sm bg-danger/10 px-hq-1.5 py-[2px] font-mono text-[8.5px] tracking-[0.12em] text-danger"
      >
        必須
      </span>
      <span
        v-else
        class="rounded-sm bg-hairline/40 px-hq-1.5 py-[2px] font-mono text-[8.5px] tracking-[0.12em] text-muted"
      >
        任意
      </span>
    </div>
    <p
      v-if="props.helpText"
      class="mt-[2px] font-jp text-[11px] leading-[1.6] text-muted"
    >
      {{ props.helpText }}
    </p>

    <!-- empty / validating -->
    <label
      v-if="
        props.data.state === 'empty' || props.data.state === 'validating'
      "
      :for="inputId"
      class="mt-hq-2 flex aspect-[85/54] cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-dashed border-hairline bg-paper-warm transition-colors hover:border-accent/50"
    >
      <div class="text-center font-jp text-[12px] text-muted">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          class="mx-auto mb-hq-1 block"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M21 15l-5-5-9 9" />
        </svg>
        <template v-if="props.data.state === 'validating'">
          確認中…
        </template>
        <template v-else>
          画像を選択 / 撮影<br />
          <span class="text-[10.5px] text-muted">
            jpg · png · heic ／ 最大 10MB
          </span>
        </template>
      </div>
    </label>

    <!-- ready / uploaded -->
    <div
      v-else-if="
        props.data.state === 'ready' || props.data.state === 'uploaded'
      "
      :class="[
        'relative mt-hq-2 flex aspect-[85/54] items-end justify-between overflow-hidden rounded-xl border-[1.5px] p-hq-2',
        props.data.state === 'uploaded'
          ? 'border-success bg-paper-warm'
          : 'border-accent bg-paper-warm',
      ]"
    >
      <div
        v-if="props.data.state === 'uploaded'"
        class="absolute right-2 top-2 flex h-[28px] w-[28px] items-center justify-center rounded-full bg-success text-white shadow-md"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 7.5L6 10.5L11.5 4.5"
            stroke="#fff"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div
        class="rounded-sm bg-ink/60 px-hq-1.5 py-[3px] font-mono text-[10px] tracking-[0.08em] text-paper"
      >
        {{ props.data.file?.name ?? "" }}
      </div>
      <button
        v-if="props.data.state === 'ready'"
        type="button"
        class="rounded-md border border-hairline bg-paper px-hq-2 py-hq-1 font-jp text-[11px] text-ink hover:border-danger hover:text-danger"
        @click="onRemove"
      >
        削除
      </button>
    </div>

    <!-- uploading -->
    <div
      v-else-if="props.data.state === 'uploading'"
      class="relative mt-hq-2 flex aspect-[85/54] items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-accent bg-paper-warm"
    >
      <div class="absolute inset-0 bg-ink/35" />
      <div class="relative text-center font-jp text-[12px] text-paper">
        <div
          class="mx-auto mb-hq-2 h-1 w-[140px] overflow-hidden rounded-full bg-paper/30"
        >
          <div
            class="h-full bg-paper transition-all"
            :style="{ width: `${props.data.progress}%` }"
          />
        </div>
        アップロード中… <span class="font-mono text-[11px]">{{ progressLabel }}</span>
      </div>
    </div>

    <!-- error -->
    <div
      v-else
      class="mt-hq-2 flex aspect-[85/54] items-center justify-center rounded-xl border-[1.5px] border-danger bg-danger/[0.05]"
    >
      <div class="text-center font-jp text-danger">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          class="mx-auto mb-hq-1 block"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
        <div class="text-[12.5px] font-medium">
          {{ props.data.errorMessage ?? "エラー" }}
        </div>
        <button
          type="button"
          class="mt-hq-1 font-mono text-[10.5px] text-muted underline"
          @click="onRemove"
        >
          リセット
        </button>
      </div>
    </div>

    <input
      :id="inputId"
      type="file"
      accept="image/jpeg,image/png,image/heic,image/heif,image/*"
      capture="environment"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>
