<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

/**
 * Checkbox プリミティブ。HQ デザイントークン経由で着色する。
 *
 * shadcn-vue では radix-vue ベースだが、本プリミティブはネイティブ <input type="checkbox">
 * を class-variance-authority + Tailwind で装飾する軽量実装とする (a11y は標準で担保)。
 *
 * 関連:
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 */

interface Props {
  modelValue?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  ariaDescribedby?: string | undefined;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const checked = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});
</script>

<template>
  <input
    :id="id"
    :name="name"
    type="checkbox"
    :disabled="disabled"
    :required="required"
    :aria-describedby="ariaDescribedby"
    v-model="checked"
    :class="
      cn(
        'h-5 w-5 rounded border-2 border-hairline bg-paper text-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'checked:bg-accent checked:border-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'cursor-pointer',
        props.class,
      )
    "
  />
</template>
