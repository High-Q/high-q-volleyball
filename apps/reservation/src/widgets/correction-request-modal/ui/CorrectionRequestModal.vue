<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import {
  CORRECTION_FIELD_LABEL,
  type CorrectionField,
} from "@high-q/shared";
import { Button } from "@high-q/ui";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui";
import { useAuthSession } from "@/features/auth";
import { useCorrectionRequestDismiss } from "../composables/useCorrectionRequestDismiss";

/**
 * #296 修正依頼モーダル。
 *
 * 認証済会員に admin から届いている未対応の修正依頼を、ログイン直後の
 * **最前面モーダル** で必ず提示する。
 *
 * - dismiss × ボタンでセッション内は閉じれるが、再ログイン / ページリロードで再表示
 * - 各エントリの「修正する」ボタンで /profile?edit=<field> へ誘導
 * - 修正完了で profile.correction_requests が空になると自動で非表示
 *
 * 関連: openspec/specs/member-correction-requests/spec.md
 *       (Requirement: 会員サイトの修正依頼バナー)
 */

const session = useAuthSession();
const router = useRouter();

const memberIdRef = computed(() => session.member.value?.id ?? null);
const { dismissed, dismiss } = useCorrectionRequestDismiss(memberIdRef);

const requests = computed(
  () => session.member.value?.correctionRequests ?? [],
);

const isOpen = computed<boolean>(
  () => session.member.value !== null && requests.value.length > 0 && !dismissed.value,
);

function targetFor(field: CorrectionField): { path: string; query: Record<string, string> } {
  switch (field) {
    case "last_name":
    case "first_name":
      return { path: "/profile", query: { edit: "displayName" } };
    case "birthday":
      return { path: "/profile", query: { edit: "birthday" } };
    case "phone":
      return { path: "/profile", query: { edit: "phone" } };
    case "nickname":
      return { path: "/profile", query: { edit: "nickname" } };
    case "experience_level":
      return { path: "/profile", query: { edit: "experienceLevel" } };
  }
}

function onFix(field: CorrectionField): void {
  const t = targetFor(field);
  dismiss();
  void router.push({ path: t.path, query: t.query });
}

function onClose(): void {
  dismiss();
}
</script>

<template>
  <AlertDialog :open="isOpen" @update:open="(v) => (v ? null : onClose())">
    <AlertDialogContent
      class="border-2 border-danger bg-danger-soft"
      data-testid="correction-request-modal"
    >
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center gap-hq-2 text-danger">
          <span aria-hidden="true">⚠️</span>
          <span>運営からのお願い</span>
        </AlertDialogTitle>
        <AlertDialogDescription class="text-ink">
          ご登録内容について {{ requests.length }} 件の修正をお願いしています。
          お手数ですが内容をご確認のうえ修正してください。
        </AlertDialogDescription>
      </AlertDialogHeader>

      <ul class="flex flex-col gap-hq-3 py-hq-2">
        <li
          v-for="entry in requests"
          :key="entry.field"
          class="flex flex-col gap-hq-2 rounded-hq-md border border-danger bg-paper px-hq-3 py-hq-3"
          :data-field="entry.field"
        >
          <p class="font-jp text-sm font-medium text-danger">
            {{ CORRECTION_FIELD_LABEL[entry.field] }}
          </p>
          <p class="font-jp text-xs text-ink whitespace-pre-wrap">
            {{ entry.message }}
          </p>
          <Button
            variant="primary"
            size="sm"
            type="button"
            @click="onFix(entry.field)"
          >修正する</Button>
        </li>
      </ul>

      <div class="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          data-testid="correction-modal-close"
          @click="onClose"
        >閉じる</Button>
      </div>
    </AlertDialogContent>
  </AlertDialog>
</template>
