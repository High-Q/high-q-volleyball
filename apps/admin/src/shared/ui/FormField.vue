<script setup lang="ts">
import { type HTMLAttributes, computed, useId } from "vue";
import { cn } from "@/shared/lib/utils";
import Label from "./Label.vue";

/**
 * label + slot（input 等）+ error/hint のミニマルラッパー。
 *
 * vee-validate などフォームライブラリ統合は後続 #84 (Login) で判断する。
 * ここでは「ラベルと入力の関連付け」「エラー/ヒントの aria-describedby」
 * のような a11y の最小要件を担保する。
 */

interface Props {
  label?: string | undefined;
  htmlFor?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const autoId = useId();
const fieldId = computed(() => props.htmlFor ?? autoId);
const messageId = computed(() => `${fieldId.value}-message`);
const hasMessage = computed(() => Boolean(props.error || props.hint));
</script>

<template>
  <div :class="cn('flex flex-col gap-hq-2', props.class)">
    <Label v-if="label" :html-for="fieldId">{{ label }}</Label>
    <slot
      :field-id="fieldId"
      :message-id="hasMessage ? messageId : undefined"
      :aria-invalid="Boolean(error)"
    />
    <p
      v-if="error"
      :id="messageId"
      role="alert"
      class="font-jp text-xs text-danger"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="messageId"
      class="font-jp text-xs text-muted"
    >
      {{ hint }}
    </p>
  </div>
</template>
