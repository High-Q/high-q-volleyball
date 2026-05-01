<script setup lang="ts">
import {
  ToastProvider,
  type ToastProviderProps,
  useForwardProps,
} from "radix-vue";

/**
 * shadcn-vue / radix-vue 由来の Toast Provider。アプリの root（App.vue）に
 * 1 度だけマウントする。<Toaster /> から間接的に使われるため通常は直接
 * マウントしない。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/shadcn-vue-integration/spec.md
 */

const props = defineProps<ToastProviderProps>();
const forwarded = useForwardProps(props);
</script>

<template>
  <ToastProvider v-bind="forwarded">
    <slot />
  </ToastProvider>
</template>
