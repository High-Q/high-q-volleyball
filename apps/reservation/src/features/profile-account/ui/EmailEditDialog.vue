<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  FormField,
  Input,
  Label,
} from "@/shared/ui";
import { Button } from "@high-q/ui";
import { requestMyEmailChange } from "../api/updateMyAccount";

const props = defineProps<{
  open: boolean;
  currentEmail: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

type Phase = "editing" | "sent";

const value = ref<string>("");
const errorMsg = ref<string | null>(null);
const submitting = ref<boolean>(false);
const phase = ref<Phase>("editing");

watch(
  () => props.open,
  (open) => {
    if (open === true) {
      value.value = "";
      errorMsg.value = null;
      submitting.value = false;
      phase.value = "editing";
    }
  },
);

const isSameAsCurrent = computed(
  () => value.value.trim().toLowerCase() === props.currentEmail.trim().toLowerCase(),
);

async function onSubmit(): Promise<void> {
  if (submitting.value) return;
  errorMsg.value = null;

  if (isSameAsCurrent.value) {
    errorMsg.value = "現在のメールアドレスと同じです";
    return;
  }
  submitting.value = true;
  try {
    await requestMyEmailChange(value.value);
    phase.value = "sent";
  } catch (cause) {
    errorMsg.value =
      cause instanceof Error ? cause.message : "送信に失敗しました。";
  } finally {
    submitting.value = false;
  }
}

function onClose(): void {
  emit("update:open", false);
}
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          <template v-if="phase === 'editing'">メールアドレスを変更</template>
          <template v-else>確認メールを送信しました</template>
        </AlertDialogTitle>
        <AlertDialogDescription>
          <template v-if="phase === 'editing'">
            新しいアドレス宛に確認メールを送信します。リンクをクリックして確認が完了するまで、現在のメールアドレスのまま使用できます。
          </template>
          <template v-else>
            <span class="text-ink font-medium">{{ value }}</span> 宛に確認メールを送信しました。新しいアドレスに届くリンクから変更を完了してください。
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <form
        v-if="phase === 'editing'"
        class="flex flex-col gap-hq-3"
        @submit.prevent="onSubmit"
      >
        <FormField :error="errorMsg ?? undefined">
          <Label html-for="profile-email">新しいメールアドレス</Label>
          <Input
            id="profile-email"
            v-model="value"
            type="email"
            autocomplete="email"
            :disabled="submitting"
          />
        </FormField>
      </form>

      <AlertDialogFooter>
        <template v-if="phase === 'editing'">
          <Button
            variant="ghost"
            type="button"
            :disabled="submitting"
            @click="onClose"
          >キャンセル</Button>
          <Button
            variant="primary"
            type="button"
            :disabled="submitting"
            @click="onSubmit"
          >{{ submitting ? "送信中..." : "保存" }}</Button>
        </template>
        <template v-else>
          <Button variant="primary" type="button" @click="onClose">閉じる</Button>
        </template>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
