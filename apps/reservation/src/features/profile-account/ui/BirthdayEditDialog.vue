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
import { updateMyBirthday } from "../api/updateMyAccount";

/**
 * #296 生年月日編集モーダル。
 *
 * バナー経由 (`/profile?edit=birthday`) で起動される。Smart constructor
 * `createBirthday` で過去日付 + 100 年範囲を検証し、UPDATE 成功時に
 * `correction_requests` の `field=birthday` エントリを自動消化する。
 */
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
    await updateMyBirthday(props.memberId, value.value);
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
        <AlertDialogTitle>生年月日を変更</AlertDialogTitle>
        <AlertDialogDescription>
          本人確認書類に記載されている生年月日と一致するように設定してください。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form class="flex flex-col gap-hq-3" @submit.prevent="onSubmit">
        <FormField :error="errorMsg ?? undefined">
          <Label html-for="profile-birthday">生年月日</Label>
          <Input
            id="profile-birthday"
            v-model="value"
            type="date"
            autocomplete="bday"
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
