<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Textarea プリミティブ。Input と同じ HQ デザイントークン経由で
 * 着色する。aria-invalid=true のときのみ border-danger / focus ring-danger に
 * 切り替わる。
 *
 * 必ず `FormField` でラップし、`error` prop でエラー状態を駆動すること
 * (シングル真実: 初期表示は赤枠ではなく grey で hairline ボーダー)。
 *
 * 関連:
 *   apps/admin/src/shared/ui/FormField.vue (HQ グローバルフォームバリデーション規約)
 *   apps/admin/src/shared/ui/Input.vue (同パターン)
 */

interface Props {
  modelValue?: string | undefined;
  placeholder?: string | undefined;
  disabled?: boolean;
  rows?: number;
  maxlength?: number | undefined;
  id?: string | undefined;
  name?: string | undefined;
  ariaInvalid?: boolean | undefined;
  ariaDescribedby?: string | undefined;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const value = computed({
  get: () => props.modelValue ?? "",
  set: (v: string) => emit("update:modelValue", v),
});
</script>

<template>
  <textarea
    :id="id"
    :name="name"
    :rows="rows"
    :maxlength="maxlength"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-invalid="ariaInvalid"
    :aria-describedby="ariaDescribedby"
    v-model="value"
    :class="
      cn(
        'flex w-full rounded-hq-md border border-hairline bg-paper px-hq-3 py-hq-2 font-jp text-base text-ink',
        'placeholder:text-muted resize-y',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger',
        props.class,
      )
    "
  />
</template>
