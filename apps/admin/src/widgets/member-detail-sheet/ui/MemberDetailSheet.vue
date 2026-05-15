<script setup lang="ts">
import { computed } from "vue";
import {
  DialogClose,
  DialogContent as RadixDialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogDescription,
} from "radix-vue";
import { Skeleton } from "@/shared/ui";
import { AdminNoteEditForm } from "@/features/member-admin-note-edit";
import { useMemberDetailSheet } from "../composables/useMemberDetailSheet";
import MemberDetailHeader from "./MemberDetailHeader.vue";
import MemberHistoryTable from "./MemberHistoryTable.vue";

/**
 * 詳細 sheet。一覧の右側に slide-in する 480px 固定幅 modal。
 *
 * radix-vue の Dialog を直接組み立てて右端寄せ + slide アニメ + a11y を実装する
 * （admin の共通 `DialogContent` は中央配置のため、本 widget では使わない）。
 *
 * - role="dialog" + aria-modal="true" は DialogContent が付与
 * - フォーカストラップ / Esc クローズ / overlay クリッククローズ は radix-vue が提供
 * - URL クエリ `?detail=:id` の同期は useMemberDetailSheet が担う
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-members-list-screen/design.md (D6, D7)
 */

const emit = defineEmits<{
  /** メモ保存成功時に発火。Page から一覧 widget へ patch を伝搬するため。 */
  saved: [memberId: string, note: string | null];
}>();

const sheet = useMemberDetailSheet();

const isOpen = computed<boolean>(() => sheet.isOpen.value);

function onOpenChange(next: boolean): void {
  if (!next) {
    void sheet.close();
  }
}

function onSaved(note: string | null): void {
  if (sheet.member.value) {
    sheet.patchAdminNote(note);
    emit("saved", sheet.member.value.id as unknown as string, note);
  }
}
</script>

<template>
  <DialogRoot :open="isOpen" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <RadixDialogContent
        class="fixed right-0 top-0 z-50 flex h-screen w-full max-w-[480px] flex-col gap-hq-4 border-l border-hairline bg-paper p-hq-6 shadow-hq-md duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
      >
        <div class="flex items-start justify-between">
          <DialogTitle class="font-jp-display text-base text-ink">
            会員詳細
          </DialogTitle>
          <DialogClose
            class="rounded-hq-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </DialogClose>
        </div>
        <DialogDescription class="sr-only">
          選択された会員の基本情報・参加履歴・運営メモを編集します。
        </DialogDescription>

        <div class="flex-1 overflow-y-auto pr-hq-1 space-y-hq-6">
          <template v-if="sheet.isPending.value">
            <div class="space-y-hq-3">
              <Skeleton class="h-10 w-10 rounded-full" />
              <Skeleton class="h-4 w-40" />
              <Skeleton class="h-3 w-32" />
            </div>
            <div class="space-y-hq-2">
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-full" />
              <Skeleton class="h-3 w-3/4" />
            </div>
          </template>

          <template v-else-if="sheet.isError.value">
            <div
              role="alert"
              class="rounded-hq-md border border-danger bg-danger-soft px-hq-4 py-hq-4"
            >
              <p class="font-jp text-sm text-ink">
                会員情報を取得できませんでした。
              </p>
              <p class="mt-hq-1 font-mono text-xs text-muted">
                {{ sheet.errorCode.value }}
              </p>
            </div>
          </template>

          <template v-else-if="sheet.member.value">
            <MemberDetailHeader :member="sheet.member.value" />

            <section class="space-y-hq-2">
              <h3 class="font-mono text-[10px] uppercase tracking-widest text-muted">
                参加履歴
              </h3>
              <MemberHistoryTable :rows="sheet.history.value" />
            </section>

            <AdminNoteEditForm
              :key="sheet.member.value.id"
              :member-id="sheet.member.value.id"
              :initial-value="sheet.member.value.admin_note"
              @saved="onSaved"
            />
          </template>
        </div>
      </RadixDialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
