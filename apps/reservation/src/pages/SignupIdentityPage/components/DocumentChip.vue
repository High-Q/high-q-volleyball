<script setup lang="ts">
import { computed } from "vue";
import type { DocumentType } from "@/entities/identity-document";

interface Props {
  type: DocumentType;
  label: string;
  selected: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  select: [type: DocumentType];
}>();

const isMyNumber = computed(
  () => props.type === "my_number_card_masked",
);

function onClick() {
  if (props.disabled) return;
  emit("select", props.type);
}
</script>

<template>
  <button
    type="button"
    role="radio"
    :aria-checked="props.selected"
    :disabled="props.disabled"
    :class="[
      'flex items-center gap-hq-2 rounded-md border px-hq-3 py-hq-2.5 text-left',
      'min-h-[44px] cursor-pointer transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.selected
        ? 'border-accent bg-accent-soft'
        : 'border-hairline bg-paper-warm',
    ]"
    @click="onClick"
  >
    <span
      :class="[
        'flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full border-[1.5px]',
        props.selected
          ? 'border-accent bg-accent shadow-[inset_0_0_0_2px_var(--hq-paper)]'
          : 'border-muted bg-transparent',
      ]"
    />
    <span
      class="flex-1 font-jp text-[12.5px]"
      :class="props.selected ? 'text-accent font-medium' : 'text-ink'"
    >
      {{ props.label }}
    </span>
    <span
      v-if="isMyNumber"
      class="rounded-sm bg-danger/10 px-hq-1.5 py-[2px] font-mono text-[8.5px] tracking-[0.12em] text-danger"
    >
      注意
    </span>
  </button>
</template>
