<script setup lang="ts">
interface Props {
  label: string;
  disabled: boolean;
  spinner?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  spinner: false,
});

const emit = defineEmits<{
  click: [];
}>();

function onClick() {
  if (props.disabled) return;
  emit("click");
}
</script>

<template>
  <div class="border-t border-hairline bg-paper px-hq-6 py-hq-4">
    <div class="mx-auto w-full max-w-md">
      <button
        type="button"
        :disabled="props.disabled"
        :aria-disabled="props.disabled"
        :class="[
          'flex w-full items-center justify-center gap-hq-2 rounded-full bg-ink px-hq-6 py-hq-4 font-jp text-[14px] font-medium tracking-wide text-paper',
          'min-h-[48px] transition-opacity',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          props.disabled
            ? 'cursor-not-allowed opacity-45'
            : 'cursor-pointer hover:opacity-90',
        ]"
        @click="onClick"
      >
        <span
          v-if="props.spinner"
          class="h-[14px] w-[14px] animate-spin rounded-full border-2 border-paper/30 border-t-paper"
        />
        {{ props.label }}
      </button>
    </div>
  </div>
</template>
