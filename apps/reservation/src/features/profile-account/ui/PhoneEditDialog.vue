<script setup lang="ts">
import { ref, watch } from "vue";
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
import { useAuthSession } from "@/features/auth";
import type { MemberId } from "@/entities/member";
import { updateMyPhone } from "../api/updateMyAccount";

const props = defineProps<{
  open: boolean;
  memberId: MemberId;
  initialValue: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  saved: [];
}>();

const value = ref<string>(props.initialValue ?? "");
const errorMsg = ref<string | null>(null);
const submitting = ref<boolean>(false);
const session = useAuthSession();

watch(
  () => [props.open, props.initialValue] as const,
  ([open, init]) => {
    if (open === true) {
      value.value = init ?? "";
      errorMsg.value = null;
      submitting.value = false;
    }
  },
);

async function onSubmit(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  errorMsg.value = null;
  try {
    await updateMyPhone(props.memberId, value.value);
    await session.refresh();
    emit("saved");
    emit("update:open", false);
  } catch (cause) {
    errorMsg.value =
      cause instanceof Error ? cause.message : "更新に失敗しました。";
  } finally {
    submitting.value = false;
  }
}

function onCancel(): void {
  emit("update:open", false);
}
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>電話番号を変更</AlertDialogTitle>
        <AlertDialogDescription>
          当日連絡用の携帯電話番号 (070 / 080 / 090 で始まる番号)。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form class="flex flex-col gap-hq-3" @submit.prevent="onSubmit">
        <FormField :error="errorMsg ?? undefined">
          <Label html-for="profile-phone">電話番号</Label>
          <Input
            id="profile-phone"
            v-model="value"
            type="tel"
            autocomplete="tel"
            placeholder="090-1234-5678"
            :disabled="submitting"
          />
        </FormField>
      </form>
      <AlertDialogFooter>
        <Button
          variant="ghost"
          type="button"
          :disabled="submitting"
          @click="onCancel"
        >キャンセル</Button>
        <Button
          variant="ink"
          type="button"
          :disabled="submitting"
          @click="onSubmit"
        >{{ submitting ? "保存中..." : "保存" }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
