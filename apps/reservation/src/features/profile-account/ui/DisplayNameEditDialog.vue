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
import { updateMyDisplayName } from "../api/updateMyAccount";

const props = defineProps<{
  open: boolean;
  memberId: MemberId;
  initialValue: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  saved: [];
}>();

const value = ref<string>(props.initialValue);
const errorMsg = ref<string | null>(null);
const submitting = ref<boolean>(false);
const session = useAuthSession();

watch(
  () => [props.open, props.initialValue] as const,
  ([open, init]) => {
    if (open === true) {
      value.value = init;
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
    await updateMyDisplayName(props.memberId, value.value);
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
        <AlertDialogTitle>お名前を変更</AlertDialogTitle>
        <AlertDialogDescription>
          表示用のお名前を変更します。会員サイト全体で表示されます。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form class="flex flex-col gap-hq-3" @submit.prevent="onSubmit">
        <FormField :error="errorMsg ?? undefined">
          <Label html-for="profile-display-name">お名前</Label>
          <Input
            id="profile-display-name"
            v-model="value"
            type="text"
            autocomplete="name"
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
          variant="primary"
          type="button"
          :disabled="submitting"
          @click="onSubmit"
        >{{ submitting ? "保存中..." : "保存" }}</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
