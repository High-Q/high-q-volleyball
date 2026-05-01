<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";
import type { FetchErrorCode } from "@/entities/event-detail";

/**
 * /events/:id 画面の Error 状態。
 *
 * - EVENT_NOT_FOUND: 「イベントが見つかりません。削除済みの可能性があります」+「一覧へ戻る」CTA
 * - PERMISSION_DENIED: 「閲覧権限がありません」+「一覧へ戻る」CTA
 * - NETWORK_ERROR / SERVER_ERROR: 「取得に失敗しました」+「再試行」CTA
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D7)
 */

const props = defineProps<{
  errorCode: FetchErrorCode;
}>();

const emit = defineEmits<{
  retry: [];
  goBack: [];
}>();

const message = computed<string>(() => {
  switch (props.errorCode) {
    case "EVENT_NOT_FOUND":
      return "イベントが見つかりません。削除済みの可能性があります。";
    case "PERMISSION_DENIED":
      return "このイベントの閲覧権限がありません。";
    case "NETWORK_ERROR":
      return "通信に失敗しました。再度お試しください。";
    case "SERVER_ERROR":
    default:
      return "サーバーエラーが発生しました。";
  }
});

const showRetry = computed(
  () =>
    props.errorCode === "NETWORK_ERROR" || props.errorCode === "SERVER_ERROR",
);
const showGoBack = computed(
  () =>
    props.errorCode === "EVENT_NOT_FOUND" ||
    props.errorCode === "PERMISSION_DENIED",
);
</script>

<template>
  <div
    role="alert"
    class="flex flex-col items-center gap-hq-4 py-hq-14 px-hq-8 text-center"
    data-testid="event-detail-error"
  >
    <p class="font-jp text-base text-ink">{{ message }}</p>
    <div class="flex items-center gap-hq-3">
      <Button v-if="showGoBack" variant="primary" size="sm" @click="emit('goBack')">
        イベント一覧へ戻る
      </Button>
      <Button v-if="showRetry" variant="primary" size="sm" @click="emit('retry')">
        再試行
      </Button>
    </div>
  </div>
</template>
