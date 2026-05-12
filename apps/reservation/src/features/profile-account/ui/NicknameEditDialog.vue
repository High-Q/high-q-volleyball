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
import { updateMyNickname } from "../api/updateMyAccount";

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

async function persist(rawOrNull: string | null): Promise<void> {
  submitting.value = true;
  errorMsg.value = null;
  try {
    await updateMyNickname(props.memberId, rawOrNull);
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

async function onSubmit(): Promise<void> {
  if (submitting.value) return;
  // 空文字 or 全角空白だけのときは validateOptionalNickname が NULL に変換する
  await persist(value.value);
}

async function onClear(): Promise<void> {
  if (submitting.value) return;
  await persist(null);
}

function onCancel(): void {
  emit("update:open", false);
}
</script>

<template>
  <AlertDialog :open="props.open" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>ニックネームを変更</AlertDialogTitle>
        <AlertDialogDescription>
          会員サイト上での自己呼称です。未設定の場合はお名前で表示されます。
          1〜15 文字、日本語と英字のみ。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form class="flex flex-col gap-hq-3" @submit.prevent="onSubmit">
        <FormField :error="errorMsg ?? undefined">
          <Label html-for="profile-nickname">ニックネーム</Label>
          <Input
            id="profile-nickname"
            v-model="value"
            type="text"
            autocomplete="off"
            :disabled="submitting"
          />
        </FormField>
      </form>
      <AlertDialogFooter>
        <Button
          variant="ghost"
          type="button"
          :disabled="submitting"
          @click="onClear"
        >ニックネームをクリア</Button>
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
