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
import { updateMyName } from "../api/updateMyAccount";

/**
 * #281: お名前編集モーダル。姓・名 2 入力で 1 回の UPDATE で同時保存する。
 *
 * `display_name` は DB トリガ `sync_members_display_name_trg` が
 * `last_name || ' ' || first_name` に自動同期するため、本ダイアログでは扱わない。
 */
const props = defineProps<{
  open: boolean;
  memberId: MemberId;
  initialLastName: string;
  initialFirstName: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  saved: [];
}>();

const lastName = ref<string>(props.initialLastName);
const firstName = ref<string>(props.initialFirstName);
const lastNameError = ref<string | null>(null);
const firstNameError = ref<string | null>(null);
const formError = ref<string | null>(null);
const submitting = ref<boolean>(false);
const session = useAuthSession();

watch(
  () =>
    [props.open, props.initialLastName, props.initialFirstName] as const,
  ([open, initLast, initFirst]) => {
    if (open === true) {
      lastName.value = initLast;
      firstName.value = initFirst;
      lastNameError.value = null;
      firstNameError.value = null;
      formError.value = null;
      submitting.value = false;
    }
  },
);

async function onSubmit(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  lastNameError.value = null;
  firstNameError.value = null;
  formError.value = null;
  try {
    await updateMyName(props.memberId, lastName.value, firstName.value);
    await session.refresh();
    emit("saved");
    emit("update:open", false);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "更新に失敗しました。";
    // Smart constructor のエラーをフィールド単位に振り分ける
    if (/姓/.test(message)) {
      lastNameError.value = message;
    } else if (/名/.test(message)) {
      firstNameError.value = message;
    } else {
      formError.value = message;
    }
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
          姓と名をそれぞれ入力してください。表示用のお名前は自動で結合されます。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <form class="flex flex-col gap-hq-3" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-hq-3">
          <FormField :error="lastNameError ?? undefined">
            <Label html-for="profile-last-name">姓</Label>
            <Input
              id="profile-last-name"
              v-model="lastName"
              type="text"
              autocomplete="family-name"
              placeholder="田中"
              :disabled="submitting"
            />
          </FormField>
          <FormField :error="firstNameError ?? undefined">
            <Label html-for="profile-first-name">名</Label>
            <Input
              id="profile-first-name"
              v-model="firstName"
              type="text"
              autocomplete="given-name"
              placeholder="美咲"
              :disabled="submitting"
            />
          </FormField>
        </div>
        <p
          v-if="formError !== null"
          role="alert"
          class="text-xs text-danger"
        >{{ formError }}</p>
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
