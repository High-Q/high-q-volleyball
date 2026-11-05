<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { Button } from "@high-q/ui";
import type { BulkExportResult } from "../composables/useBulkExport";

/**
 * #172 ダウンロード結果ダイアログ。含めた書類数 / 名簿会員数 / 承認済みなし会員 /
 * 取得失敗書類を表示する。監査ログ失敗・処理エラーは role="alert" で通知し再試行を促す。
 *
 * 関連: openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 */
const props = defineProps<{
  open: boolean;
  result: BulkExportResult | null;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  retry: [];
}>();

function close(): void {
  emit("update:open", false);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>ダウンロード結果</DialogTitle>
        <DialogDescription>
          生成した ZIP はローカルに保存されました。
        </DialogDescription>
      </DialogHeader>

      <!-- エラー時 -->
      <div
        v-if="props.errorMessage"
        role="alert"
        class="rounded-hq-md border border-danger bg-paper px-hq-3 py-hq-2 text-sm text-danger"
      >
        ダウンロードに失敗しました: {{ props.errorMessage }}
      </div>

      <!-- 成功サマリ -->
      <dl
        v-else-if="props.result"
        class="grid grid-cols-[auto_1fr] gap-x-hq-4 gap-y-hq-2 font-jp text-sm text-ink"
      >
        <dt class="text-muted">名簿に載せた会員</dt>
        <dd>{{ props.result.rosterMemberCount }} 名</dd>

        <dt class="text-muted">PDF に含めた書類</dt>
        <dd>{{ props.result.includedDocumentCount }} 件</dd>

        <dt class="text-muted">承認済み書類なし</dt>
        <dd>
          <template v-if="props.result.membersWithoutApprovedDocs.length > 0">
            {{ props.result.membersWithoutApprovedDocs.length }} 名（PDF 対象外）
            <span class="block text-xs text-muted">
              {{
                props.result.membersWithoutApprovedDocs
                  .map((m) => m.name)
                  .join("、")
              }}
            </span>
          </template>
          <template v-else>なし</template>
        </dd>

        <dt class="text-muted">取得に失敗した書類</dt>
        <dd>{{ props.result.failedImages.length }} 件</dd>
      </dl>

      <!-- 監査ログ失敗の警告 -->
      <p
        v-if="props.result && !props.result.auditLogged"
        role="alert"
        class="mt-hq-2 text-xs text-danger"
      >
        ダウンロードは完了しましたが監査ログの記録に失敗しました。SOP に従い手動で記録してください。
      </p>

      <DialogFooter>
        <Button
          v-if="props.errorMessage"
          variant="primary"
          type="button"
          @click="emit('retry')"
        >再試行</Button>
        <Button variant="ghost" type="button" @click="close">閉じる</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
