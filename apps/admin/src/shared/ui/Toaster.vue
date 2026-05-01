<script setup lang="ts">
/**
 * Toast をホストするコンポーネント。アプリ root（App.vue）に 1 度だけ
 * マウントする。useToast() で発行された Toast がここで描画される。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/design.md (D7)
 */

import ToastProvider from "./ToastProvider.vue";
import ToastViewport from "./ToastViewport.vue";
import Toast from "./Toast.vue";
import ToastTitle from "./ToastTitle.vue";
import ToastDescription from "./ToastDescription.vue";
import ToastClose from "./ToastClose.vue";
import { useToast } from "./useToast";

const { toasts, dismiss } = useToast();
</script>

<template>
  <ToastProvider>
    <Toast
      v-for="t in toasts"
      :key="t.id"
      :variant="t.variant"
      :duration="t.duration"
      :open="t.open"
      :role="t.variant === 'destructive' ? 'alert' : 'status'"
      @update:open="(open: boolean) => !open && dismiss(t.id)"
    >
      <div class="grid gap-hq-1">
        <ToastTitle v-if="t.title">{{ t.title }}</ToastTitle>
        <ToastDescription v-if="t.description">{{
          t.description
        }}</ToastDescription>
      </div>
      <ToastClose />
    </Toast>
    <ToastViewport />
  </ToastProvider>
</template>
