<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Input プリミティブ。HQ デザイントークン経由で着色する。
 *
 * 関連:
 *   openspec/changes/admin-reservation-ui-foundation/specs/shadcn-vue-integration/spec.md
 *   apps/admin/tailwind.config.ts （HQ preset 適用）
 */

interface Props {
  modelValue?: string | number | undefined;
  type?: string;
  placeholder?: string | undefined;
  disabled?: boolean;
  id?: string | undefined;
  name?: string | undefined;
  autocomplete?: string | undefined;
  ariaInvalid?: boolean | undefined;
  ariaDescribedby?: string | undefined;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
}>();

const value = computed({
  get: () => props.modelValue ?? "",
  set: (v) => emit("update:modelValue", v),
});
</script>

<template>
  <input
    :id="id"
    :name="name"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedby"
    v-model="value"
    :class="
      cn(
        'flex h-10 w-full rounded-hq-md border border-hairline bg-paper px-hq-3 py-hq-2 font-jp text-base text-ink',
        'placeholder:text-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger',
        props.class,
      )
    "
  />
</template>
