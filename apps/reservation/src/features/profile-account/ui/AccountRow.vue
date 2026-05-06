<script setup lang="ts">
defineProps<{
  label: string;
  /** 表示値。null/空文字なら placeholder を表示 */
  value: string | null;
  placeholder?: string;
  /** true で行末の編集ボタンを描画 */
  editable?: boolean;
  ariaEditLabel?: string;
}>();

const emit = defineEmits<{
  edit: [];
}>();
</script>

<template>
  <div
    class="grid items-center gap-hq-3 px-hq-4 py-hq-3 border-t border-hairline first:border-t-0"
    style="grid-template-columns: 92px 1fr auto;"
  >
    <span
      class="font-mono text-xs text-muted self-center"
      style="letter-spacing: 0.14em;"
    >{{ label }}</span>
    <span
      class="font-jp text-sm m-0 truncate"
      :class="value === null || value.length === 0 ? 'text-muted' : 'text-ink'"
    >{{ value !== null && value.length > 0 ? value : (placeholder ?? '未設定') }}</span>
    <button
      v-if="editable"
      type="button"
      :aria-label="ariaEditLabel ?? `${label} を編集`"
      class="font-jp text-xs text-accent hover:underline underline-offset-2 transition"
      @click="emit('edit')"
    >編集</button>
  </div>
</template>
