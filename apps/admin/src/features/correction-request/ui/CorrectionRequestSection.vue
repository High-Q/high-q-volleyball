<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  CORRECTION_FIELD_LABEL,
  type CorrectionField,
  type MemberId,
} from "@high-q/shared";
import { Button } from "@high-q/ui";
import { useCorrectionRequests } from "../composables/useCorrectionRequests";
import CorrectionRequestCreateDialog from "./CorrectionRequestCreateDialog.vue";

/**
 * #296 修正依頼セクション。詳細 sheet 内に組み込み、未対応の修正依頼一覧 +
 * 新規作成 / 取り下げ操作を提供する。
 *
 * 関連:
 *   openspec/specs/member-correction-requests/spec.md
 *     (Requirement: admin 詳細 sheet の修正依頼セクション)
 */

const props = defineProps<{
  memberId: MemberId;
  adminMemberId: MemberId;
}>();

const emit = defineEmits<{
  /** 件数が変化したとき発火。一覧のバッジを楽観更新するため。 */
  changed: [count: number];
}>();

const requests = useCorrectionRequests(props.memberId, props.adminMemberId);
const isDialogOpen = ref<boolean>(false);
const createDialog = ref<InstanceType<typeof CorrectionRequestCreateDialog> | null>(null);
const withdrawingField = ref<CorrectionField | null>(null);

onMounted(() => {
  void requests.refresh();
});

const existingFields = computed<CorrectionField[]>(() =>
  requests.entries.value.map((e) => e.field),
);

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function onSubmit(field: CorrectionField, message: string): Promise<void> {
  const result = await requests.create(field, message);
  if (!result.ok) {
    createDialog.value?.setExternalError(result.message);
    return;
  }
  isDialogOpen.value = false;
  emit("changed", requests.entries.value.length);
}

async function onWithdraw(field: CorrectionField): Promise<void> {
  if (withdrawingField.value !== null) return;
  withdrawingField.value = field;
  try {
    await requests.withdraw(field);
    emit("changed", requests.entries.value.length);
  } finally {
    withdrawingField.value = null;
  }
}
</script>

<template>
  <section class="space-y-hq-2" aria-labelledby="correction-requests-heading">
    <div class="flex items-center justify-between">
      <h3
        id="correction-requests-heading"
        class="font-mono text-[10px] uppercase tracking-widest text-muted"
      >
        修正依頼
      </h3>
      <Button
        variant="outline"
        size="sm"
        type="button"
        @click="isDialogOpen = true"
      >修正依頼を作成</Button>
    </div>

    <template v-if="requests.phase.value === 'loading'">
      <p class="font-jp text-xs text-muted">読み込み中…</p>
    </template>

    <template v-else-if="requests.phase.value === 'error'">
      <p role="alert" class="font-jp text-xs text-danger">
        修正依頼の取得に失敗しました: {{ requests.errorMessage.value }}
      </p>
    </template>

    <template v-else>
      <p
        v-if="requests.entries.value.length === 0"
        class="font-jp text-xs text-muted"
      >修正依頼はありません</p>

      <ul
        v-else
        class="space-y-hq-2"
        data-testid="correction-request-list"
      >
        <li
          v-for="entry in requests.entries.value"
          :key="entry.field"
          class="rounded-hq-md border border-hairline bg-paper px-hq-3 py-hq-2"
        >
          <div class="flex items-start justify-between gap-hq-2">
            <div class="flex-1 space-y-hq-1">
              <p class="font-jp text-sm font-medium text-ink">
                {{ CORRECTION_FIELD_LABEL[entry.field] }}
              </p>
              <p class="font-jp text-xs text-ink whitespace-pre-wrap">
                {{ entry.message }}
              </p>
              <p class="font-mono text-[10px] text-muted">
                {{ formatTimestamp(entry.requested_at) }}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              :disabled="withdrawingField === entry.field"
              @click="onWithdraw(entry.field)"
            >{{ withdrawingField === entry.field ? "取り下げ中…" : "取り下げ" }}</Button>
          </div>
        </li>
      </ul>
    </template>

    <CorrectionRequestCreateDialog
      ref="createDialog"
      :open="isDialogOpen"
      :existing-fields="existingFields"
      @update:open="isDialogOpen = $event"
      @submit="onSubmit"
    />
  </section>
</template>
