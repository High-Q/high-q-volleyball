<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
}

withDefaults(defineProps<Props>(), {
  title: "アップロードが完了しました",
  description:
    "オーナーが内容を確認します (最長 3 日以内)。結果はメールでお知らせします。",
});
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="mt-hq-4 flex gap-hq-3 rounded-lg border border-success bg-success/[0.08] px-hq-4 py-hq-3"
  >
    <span
      class="mt-[2px] flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-success text-white"
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path
          d="M3 7.5L6 10.5L11.5 4.5"
          stroke="#fff"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
    <div>
      <div class="font-jp text-[12.5px] font-medium text-success">
        {{ title }}
      </div>
      <p
        class="mt-[2px] font-jp text-[11.5px] leading-[1.65] text-ink/80"
      >
        {{ description }}
      </p>
    </div>
  </div>
</template>
