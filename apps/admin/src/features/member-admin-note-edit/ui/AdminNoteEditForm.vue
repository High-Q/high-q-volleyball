<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";
import { Label, Textarea } from "@/shared/ui";
import {
  ADMIN_NOTE_MAX_LENGTH,
  useAdminNoteEdit,
  type UseAdminNoteEditOptions,
} from "../composables/useAdminNoteEdit";

/**
 * 運営メモ編集フォーム。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md (Requirement: 運営メモ編集)
 */

const props = defineProps<UseAdminNoteEditOptions>();
const emit = defineEmits<{
  saved: [note: string | null];
}>();

const edit = useAdminNoteEdit({
  memberId: props.memberId,
  initialValue: props.initialValue,
  onSaved: (note) => {
    props.onSaved?.(note);
    emit("saved", note);
  },
  onError: props.onError,
});

const counterClass = computed<string>(() =>
  edit.isOverLimit.value
    ? "text-danger font-medium"
    : "text-muted",
);

const inputId = "admin-note-edit-textarea";
</script>

<template>
  <section class="space-y-hq-2">
    <div class="flex items-center justify-between">
      <Label :for="inputId">運営メモ</Label>
      <span
        class="font-mono text-xs"
        :class="counterClass"
        aria-live="polite"
      >
        {{ edit.charCount.value }} / {{ ADMIN_NOTE_MAX_LENGTH }}
      </span>
    </div>
    <Textarea
      :id="inputId"
      v-model="edit.value.value"
      :rows="5"
      :disabled="edit.isSaving.value"
      placeholder="例: 左利き / 体験申込 / メール届かず要確認 …"
      aria-describedby="admin-note-edit-hint"
    />
    <p id="admin-note-edit-hint" class="text-xs text-muted">
      ここに書いた内容は admin だけが見られる運営メモです。会員自身には表示されません。
    </p>
    <div class="flex items-center gap-hq-2">
      <Button
        variant="primary"
        size="sm"
        :disabled="!edit.canSave.value"
        @click="edit.save()"
      >
        {{ edit.isSaving.value ? "保存中…" : "保存" }}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        :disabled="!edit.isDirty.value || edit.isSaving.value"
        @click="edit.resetToInitial()"
      >
        破棄
      </Button>
      <span
        v-if="edit.errorMessage.value"
        class="text-xs text-danger"
        role="alert"
      >
        保存に失敗しました: {{ edit.errorMessage.value }}
      </span>
    </div>
  </section>
</template>
