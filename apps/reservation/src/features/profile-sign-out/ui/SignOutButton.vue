<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui";
import { useAuthSession } from "@/features/auth";

const session = useAuthSession();
const router = useRouter();
const open = ref<boolean>(false);
const submitting = ref<boolean>(false);

async function onConfirm(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  try {
    await session.signOut();
    open.value = false;
    void router.push({ name: "login" });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <button
    type="button"
    class="font-jp text-sm text-muted border border-hairline rounded-full px-hq-5 py-hq-3 hover:bg-surface transition-colors w-full"
    @click="open = true"
  >ログアウト</button>

  <AlertDialog :open="open" @update:open="open = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
        <AlertDialogDescription>
          再度ログインするにはメールアドレスにログインリンクを送る必要があります。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="submitting">キャンセル</AlertDialogCancel>
        <AlertDialogAction :disabled="submitting" @click="onConfirm">
          {{ submitting ? "処理中..." : "ログアウトする" }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
