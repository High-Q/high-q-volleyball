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
import { MemberWithdrawalDialog } from "@/features/member-withdrawal";
import { CorrectionRequestSection } from "@/features/correction-request";
import { useAuthSession } from "@/features/auth";
import type { MemberId } from "@high-q/shared";
import {
  useMemberDetailSheet,
  type MemberDetailSource,
} from "../composables/useMemberDetailSheet";
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
 * - `source` 省略時は `/members` の `useMembersFilter` を購読する従来挙動。
 *   `/events/:id` 等の他ページから使う際は `useRouteDetailQuery()` 等を渡す
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-members-list-screen/design.md (D6, D7)
 *   openspec/changes/link-event-participants-to-member-detail/design.md (D2)
 */

const props = defineProps<{
  source?: MemberDetailSource;
}>();

const emit = defineEmits<{
  /** メモ保存成功時に発火。Page から一覧 widget へ patch を伝搬するため。 */
  saved: [memberId: string, note: string | null];
  /** 会員削除成功時に発火。Page から一覧 widget へ行除去を伝搬するため。 */
  withdrawn: [memberId: string];
  /** #296 修正依頼の件数変化時に発火。Page から一覧 widget のバッジを更新するため。 */
  correctionChanged: [memberId: string, count: number];
}>();

const sheet = useMemberDetailSheet(props.source);
const authSession = useAuthSession();

const adminMemberId = computed<MemberId | null>(() => {
  const uid = authSession.session.value?.user?.id ?? null;
  return uid === null ? null : (uid as unknown as MemberId);
});

function onCorrectionChanged(count: number): void {
  if (sheet.member.value) {
    emit(
      "correctionChanged",
      sheet.member.value.id as unknown as string,
      count,
    );
  }
}

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

/** 退会対象集計: history は cancelled 除外済なので start_at で未来 / 過去を切る。 */
const upcomingReservationCount = computed<number>(() => {
  const now = Date.now();
  return sheet.history.value.filter((row) => {
    const startMs = new Date(row.start_at as unknown as string).getTime();
    return (
      startMs > now &&
      (row.status === "reserved" || row.status === "waitlist")
    );
  }).length;
});

const pastReservationCount = computed<number>(
  () => sheet.history.value.length - upcomingReservationCount.value,
);

function onWithdrawn(): void {
  if (sheet.member.value) {
    const id = sheet.member.value.id as unknown as string;
    emit("withdrawn", id);
    void sheet.close();
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

            <CorrectionRequestSection
              v-if="adminMemberId !== null"
              :key="`correction-${sheet.member.value.id}`"
              :member-id="sheet.member.value.id"
              :admin-member-id="adminMemberId"
              @changed="onCorrectionChanged"
            />

            <section
              class="space-y-hq-2 mt-hq-8 border-t-2 border-danger/30 pt-hq-6"
              aria-labelledby="member-danger-zone-heading"
            >
              <h3
                id="member-danger-zone-heading"
                class="font-mono text-[10px] uppercase tracking-widest text-danger"
              >
                危険な操作
              </h3>
              <p class="font-jp text-xs text-muted">
                会員データを完全に削除します。元に戻せません。
              </p>
              <MemberWithdrawalDialog
                :member-id="sheet.member.value.id"
                :target-email="sheet.member.value.email"
                :upcoming-reservation-count="upcomingReservationCount"
                :past-reservation-count="pastReservationCount"
                @withdrawn="onWithdrawn"
              >
                <template #trigger="{ open }">
                  <button
                    type="button"
                    class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger"
                    @click="open"
                  >
                    この会員を削除
                  </button>
                </template>
              </MemberWithdrawalDialog>
            </section>
          </template>
        </div>
      </RadixDialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
