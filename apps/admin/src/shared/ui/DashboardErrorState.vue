<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";

/**
 * Dashboard widget 共通の Error 状態 (#149)。
 *
 * widget 単位で局所表示する (ページ全体は再ロードしない)。`role="alert"`。
 * source ラベルを渡すとエラーコード行に反映する (例: "admin_dashboard_view")。
 *
 * 関連: openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

const props = withDefaults(
  defineProps<{
    /** エラーコード (例: "NETWORK_ERROR" / "SERVER_ERROR")。 */
    code?: string;
    /** エラー発生源 (例: "admin_dashboard_view")。コード行に表示。 */
    source?: string;
    /** 表示メッセージ。省略時は汎用文言。 */
    message?: string;
  }>(),
  {
    code: "SERVER_ERROR",
    source: "supabase",
    message: "データを読み込めませんでした。少し待ってから再試行してください。",
  },
);

const emit = defineEmits<{ retry: [] }>();

const errLine = computed(() => `ERR · ${props.source} · ${props.code}`);
</script>

<template>
  <div
    role="alert"
    class="flex flex-col items-center gap-hq-3 rounded-hq-sm border border-danger bg-danger-soft px-hq-4 py-hq-6 text-center"
  >
    <p class="font-jp text-sm text-ink">{{ message }}</p>
    <p class="font-mono text-xs uppercase tracking-widest text-muted">
      {{ errLine }}
    </p>
    <Button variant="primary" size="sm" @click="emit('retry')">再試行</Button>
  </div>
</template>
