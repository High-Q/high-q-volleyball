<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { MemberId } from "@high-q/shared";
import { Button } from "@high-q/ui";
import Switch from "@/shared/ui/Switch.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import { useRegistrationToggle } from "../composables/useRegistrationToggle";

/**
 * 運営設定: 新規会員登録の受付可否トグル（member-registration-toggle）。
 *
 * 4 状態: Loading（Skeleton）/ Error（再読込）/ ready（トグル）。
 * 切替は AlertDialog の確認を経て確定する（誤操作防止）。確定・失敗の
 * フィードバックは composable のトーストに委ねる。
 *
 * spec: openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
 */

const props = defineProps<{ adminMemberId: MemberId | null }>();

const adminMemberId = computed(() => props.adminMemberId);
const { status, enabled, updatedAt, saving, load, persist } =
  useRegistrationToggle(adminMemberId);

const confirmOpen = ref(false);
const pendingTarget = ref(true);

function requestToggle(next: boolean): void {
  pendingTarget.value = next;
  confirmOpen.value = true;
}

function cancelConfirm(): void {
  confirmOpen.value = false;
}

async function confirmToggle(): Promise<void> {
  await persist(pendingTarget.value);
  confirmOpen.value = false;
}

const updatedAtLabel = computed(() => {
  if (!updatedAt.value) return null;
  const d = new Date(updatedAt.value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
});

onMounted(load);
</script>

<template>
  <section
    class="rounded-hq-md border border-hairline bg-paper px-hq-5 py-hq-5"
    aria-labelledby="registration-toggle-heading"
  >
    <h2 id="registration-toggle-heading" class="font-jp-display text-base text-ink">
      新規会員登録の受付
    </h2>
    <p class="mt-hq-1 font-jp text-xs text-muted">
      停止中は予約サイトの会員登録ページが案内表示に切り替わり、新しい会員は作られません。既存メンバーのログイン・予約には影響しません。
    </p>

    <!-- Loading -->
    <div v-if="status === 'loading'" class="mt-hq-4 space-y-hq-2" data-testid="toggle-loading">
      <Skeleton class="h-6 w-40" />
      <Skeleton class="h-4 w-64" />
    </div>

    <!-- Error -->
    <div
      v-else-if="status === 'error'"
      role="alert"
      class="mt-hq-4 rounded-hq-sm border border-danger/40 bg-danger-soft px-hq-3 py-hq-2 font-jp text-sm text-danger"
      data-testid="toggle-error"
    >
      <p>設定を読み込めませんでした。時間をおいて再度お試しください。</p>
      <Button variant="ghost" size="sm" type="button" class="mt-hq-2" @click="load">
        再読み込み
      </Button>
    </div>

    <!-- Ready -->
    <div v-else class="mt-hq-4 space-y-hq-3" data-testid="toggle-ready">
      <div class="flex items-center justify-between gap-hq-4">
        <div>
          <span
            :class="[
              'inline-flex items-center rounded-hq-pill px-hq-3 py-hq-1 font-jp text-xs font-medium',
              enabled ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
            ]"
            data-testid="toggle-status-label"
          >
            {{ enabled ? "受付中" : "停止中" }}
          </span>
          <p v-if="updatedAtLabel" class="mt-hq-1 font-jp text-xs text-muted">
            最終更新: {{ updatedAtLabel }}
          </p>
        </div>
        <Switch
          :checked="enabled"
          :disabled="saving"
          aria-label="新規会員登録の受付を切り替える"
          data-testid="registration-switch"
          @update:checked="requestToggle"
        />
      </div>
    </div>

    <!-- 確認ダイアログ -->
    <AlertDialog
      :open="confirmOpen"
      @update:open="
        (next) => {
          if (!next) cancelConfirm();
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ pendingTarget ? "新規会員登録を再開しますか？" : "新規会員登録を停止しますか？" }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <template v-if="pendingTarget">
              予約サイトの会員登録ページが再び開き、新しい会員が登録できるようになります。
            </template>
            <template v-else>
              予約サイトの会員登録ページが案内表示に切り替わり、新しい会員は登録できなくなります。既存メンバーのログイン・予約には影響しません。
            </template>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            type="button"
            :disabled="saving"
            class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0"
            @click="cancelConfirm"
          >
            キャンセル
          </button>
          <button
            type="button"
            :disabled="saving"
            :class="[
              'inline-flex h-9 items-center justify-center rounded-hq-sm px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
              pendingTarget ? 'bg-accent hover:bg-accent/90' : 'bg-danger hover:bg-danger/90',
            ]"
            data-testid="toggle-confirm"
            @click="confirmToggle"
          >
            {{ saving ? "変更中…" : pendingTarget ? "再開する" : "停止する" }}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
