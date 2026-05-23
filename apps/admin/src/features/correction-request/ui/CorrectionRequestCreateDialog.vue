<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  CORRECTION_FIELD_LABEL,
  type CorrectionField,
} from "@high-q/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/shared/ui";
import { Button } from "@high-q/ui";

/**
 * #296 修正依頼作成モーダル。
 *
 * field 選択 + message 入力 + 投稿 CTA。重複 / message 長エラーは inline 表示。
 *
 * 関連:
 *   openspec/specs/member-correction-requests/spec.md
 *     (Requirement: admin による修正依頼の作成)
 */

const FIELD_OPTIONS: ReadonlyArray<{ value: CorrectionField; label: string }> = [
  { value: "last_name", label: CORRECTION_FIELD_LABEL.last_name },
  { value: "first_name", label: CORRECTION_FIELD_LABEL.first_name },
  { value: "birthday", label: CORRECTION_FIELD_LABEL.birthday },
  { value: "phone", label: CORRECTION_FIELD_LABEL.phone },
  { value: "experience_level", label: CORRECTION_FIELD_LABEL.experience_level },
  { value: "nickname", label: CORRECTION_FIELD_LABEL.nickname },
];

const MESSAGE_MAX = 500;

const props = defineProps<{
  open: boolean;
  /** 既に未対応の field 一覧。重複作成を弾くために disable 表示する。 */
  existingFields: ReadonlyArray<CorrectionField>;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [field: CorrectionField, message: string];
}>();

const field = ref<CorrectionField | "">("");
const message = ref<string>("");
const externalError = ref<string | null>(null);
const submitting = ref<boolean>(false);

watch(
  () => props.open,
  (next) => {
    if (next) {
      field.value = "";
      message.value = "";
      externalError.value = null;
      submitting.value = false;
    }
  },
);

const charCount = computed<number>(() => message.value.trim().length);
const isOverLimit = computed<boolean>(() => charCount.value > MESSAGE_MAX);

const fieldOptions = computed(() =>
  FIELD_OPTIONS.map((opt) => ({
    ...opt,
    disabled: props.existingFields.includes(opt.value),
  })),
);

const fieldError = computed<string | null>(() => {
  if (field.value === "") return null;
  if (props.existingFields.includes(field.value as CorrectionField)) {
    return "既に同じ属性の修正依頼が存在します。先に取り下げてください";
  }
  return null;
});

const messageError = computed<string | null>(() => {
  if (charCount.value === 0) return null; // 未入力時はエラー表示しない
  if (isOverLimit.value) {
    return `${MESSAGE_MAX} 文字以内で入力してください`;
  }
  return null;
});

const canSubmit = computed<boolean>(() => {
  if (submitting.value) return false;
  if (field.value === "") return false;
  if (fieldError.value !== null) return false;
  if (charCount.value === 0 || isOverLimit.value) return false;
  return true;
});

const counterClass = computed<string>(() =>
  isOverLimit.value ? "text-danger font-medium" : "text-muted",
);

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return;
  externalError.value = null;
  submitting.value = true;
  emit("submit", field.value as CorrectionField, message.value.trim());
}

function setExternalError(msg: string | null): void {
  externalError.value = msg;
  submitting.value = false;
}

function close(): void {
  emit("update:open", false);
}

defineExpose({ setExternalError });
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>修正依頼を作成</DialogTitle>
        <DialogDescription>
          会員に修正してほしい属性と理由を指定します。会員のログイン時にバナーで通知され、対象属性の編集モーダルが起動されます。
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-hq-3" @submit.prevent="onSubmit">
        <FormField :error="fieldError ?? undefined">
          <Label html-for="correction-field-select">対象属性</Label>
          <Select v-model="field">
            <SelectTrigger id="correction-field-select" class="w-full">
              <SelectValue placeholder="属性を選択してください" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in fieldOptions"
                :key="opt.value"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}<span v-if="opt.disabled" class="text-muted"> (依頼中)</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField :error="messageError ?? undefined">
          <div class="flex items-center justify-between">
            <Label html-for="correction-message">理由</Label>
            <span
              class="font-mono text-xs"
              :class="counterClass"
              aria-live="polite"
            >
              {{ charCount }} / {{ MESSAGE_MAX }}
            </span>
          </div>
          <Textarea
            id="correction-message"
            v-model="message"
            :rows="4"
            :disabled="submitting"
            placeholder="例: 本人確認書類と生年月日が一致していません。書類どおりの日付に修正してください。"
          />
        </FormField>

        <p
          v-if="externalError !== null"
          role="alert"
          class="text-xs text-danger"
        >{{ externalError }}</p>
      </form>

      <DialogFooter>
        <Button
          variant="ghost"
          type="button"
          :disabled="submitting"
          @click="close"
        >キャンセル</Button>
        <Button
          variant="primary"
          type="button"
          :disabled="!canSubmit"
          @click="onSubmit"
        >{{ submitting ? "送信中…" : "投稿" }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
