<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";
import type { FetchErrorCode } from "@/entities/member";

const props = defineProps<{ errorCode: FetchErrorCode }>();
const emit = defineEmits<{ retry: [] }>();

const message = computed<{ title: string; body: string }>(() => {
  switch (props.errorCode) {
    case "NETWORK_ERROR":
      return {
        title: "通信に失敗しました",
        body: "ネットワーク状態を確認して、少し待ってから再試行してください。",
      };
    case "PERMISSION_DENIED":
      return {
        title: "アクセス権限がありません",
        body: "管理者権限が必要です。再度サインインしてください。",
      };
    case "NOT_FOUND":
      return {
        title: "会員が見つかりません",
        body: "URL を確認してください。",
      };
    case "SERVER_ERROR":
    default:
      return {
        title: "会員を読み込めませんでした",
        body: "サーバ側で問題が発生しています。少し待ってから再試行してください。",
      };
  }
});

const errCode = computed(
  () => `ERR · supabase / members.list · ${props.errorCode}`,
);
</script>

<template>
  <div
    role="alert"
    class="mx-auto my-hq-14 max-w-md rounded-hq-md border border-danger bg-danger-soft px-hq-6 py-hq-8 text-center"
  >
    <h3 class="font-jp-display text-lg text-ink">{{ message.title }}</h3>
    <p class="mt-hq-2 font-jp text-sm text-muted">{{ message.body }}</p>
    <p class="mt-hq-3 font-mono text-xs uppercase tracking-widest text-muted">
      {{ errCode }}
    </p>
    <div class="mt-hq-6">
      <Button variant="primary" size="sm" @click="emit('retry')">再試行</Button>
    </div>
  </div>
</template>
