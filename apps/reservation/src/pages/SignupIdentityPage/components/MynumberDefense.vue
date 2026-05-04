<script setup lang="ts">
import { Checkbox } from "@/shared/ui";

interface Props {
  consented: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:consented": [value: boolean];
}>();

function onToggle(next: boolean) {
  emit("update:consented", next);
}
</script>

<template>
  <div class="mt-hq-4 flex flex-col gap-hq-3">
    <!-- 1. 赤帯アラート -->
    <div
      role="alert"
      class="flex gap-hq-3 rounded-lg border border-danger bg-danger/[0.08] px-hq-4 py-hq-3"
    >
      <span
        class="mt-[2px] flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-danger font-jp text-[13px] font-bold text-white"
      >
        !
      </span>
      <div>
        <div
          class="font-jp text-[12.5px] font-semibold leading-[1.6] text-danger"
        >
          個人番号 (裏面 12 桁) を完全に隠してください
        </div>
        <p class="mt-hq-1 font-jp text-[11.5px] leading-[1.75] text-ink/80">
          マスキングテープ・付箋などで確実に隠せていない画像は受け付けられません。
        </p>
      </div>
    </div>

    <!-- 2. サンプル比較 -->
    <div>
      <div class="font-mono text-[10px] tracking-[0.16em] text-muted">
        — SAMPLE
      </div>
      <div class="mt-hq-2 grid grid-cols-2 gap-hq-2.5">
        <!-- BAD -->
        <div>
          <div
            class="relative flex aspect-[85/54] flex-col justify-between overflow-hidden rounded-md border-2 border-danger bg-paper-warm p-hq-2"
          >
            <div
              class="font-mono text-[6px] tracking-[0.05em] text-muted"
            >
              個人番号
            </div>
            <div
              class="self-start rounded-sm bg-paper px-hq-1 py-[2px] font-mono text-[11px] tracking-[0.15em] text-ink"
            >
              1234 5678 9012
            </div>
            <div class="flex gap-hq-1">
              <div class="h-[20px] w-[16px] rounded-sm bg-hairline" />
              <div class="flex flex-1 flex-col justify-end gap-[2px]">
                <div class="h-[2px] w-[70%] bg-hairline" />
                <div class="h-[2px] w-[50%] bg-hairline" />
              </div>
            </div>
            <div
              class="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-danger font-jp text-[13px] font-bold text-white"
            >
              ×
            </div>
          </div>
          <div
            class="mt-hq-1.5 font-jp text-[11px] font-medium text-danger"
          >
            マスク不十分
          </div>
          <div class="mt-[2px] font-jp text-[10.5px] leading-[1.5] text-muted">
            数字が読み取れる
          </div>
        </div>

        <!-- GOOD -->
        <div>
          <div
            class="relative flex aspect-[85/54] flex-col justify-between overflow-hidden rounded-md border-2 border-success bg-paper-warm p-hq-2"
          >
            <div
              class="font-mono text-[6px] tracking-[0.05em] text-muted"
            >
              個人番号
            </div>
            <div class="h-[14px] w-[70%] rounded-sm bg-ink" />
            <div class="flex gap-hq-1">
              <div class="h-[20px] w-[16px] rounded-sm bg-hairline" />
              <div class="flex flex-1 flex-col justify-end gap-[2px]">
                <div class="h-[2px] w-[70%] bg-hairline" />
                <div class="h-[2px] w-[50%] bg-hairline" />
              </div>
            </div>
            <div
              class="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-success font-jp text-[12px] font-bold text-white"
            >
              ✓
            </div>
          </div>
          <div
            class="mt-hq-1.5 font-jp text-[11px] font-medium text-success"
          >
            マスク適切
          </div>
          <div class="mt-[2px] font-jp text-[10.5px] leading-[1.5] text-muted">
            黒帯で完全に覆う
          </div>
        </div>
      </div>
      <p class="mt-hq-2 font-jp text-[11px] leading-[1.65] text-muted">
        ※ 番号の一部でも見える画像は審査で差し戻されます。
      </p>
    </div>

    <!-- 3. 必須同意チェックボックス -->
    <label
      :class="[
        'flex cursor-pointer items-start gap-hq-3 rounded-lg border px-hq-4 py-hq-3 transition-colors',
        props.consented
          ? 'border-accent bg-accent-soft'
          : 'border-hairline bg-paper-warm',
      ]"
    >
      <Checkbox
        :model-value="props.consented"
        required
        aria-describedby="mynumber-consent-desc"
        class="mt-[2px]"
        @update:model-value="onToggle"
      />
      <span
        id="mynumber-consent-desc"
        class="font-jp text-[12.5px] leading-[1.65] text-ink"
      >
        個人番号を完全に隠して撮影したことを<br />
        確認しました <span class="text-accent">*</span>
      </span>
    </label>
  </div>
</template>
