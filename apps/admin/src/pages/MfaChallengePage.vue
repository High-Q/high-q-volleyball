<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import Label from "@/shared/ui/Label.vue";
import { useMfaChallenge } from "@/features/auth";

/**
 * 既存 TOTP factor で再認証 (challenge + verify)。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D11)
 */

const router = useRouter();
const { status, error, start, submitCode } = useMfaChallenge();

const code = ref<string>("");

const isAwaitingCode = computed(() => status.value === "awaiting-code");
const isVerifying = computed(() => status.value === "verifying");

const errorMessage = computed<string | null>(() => {
  if (error.value === null) return null;
  switch (error.value) {
    case "invalid-code":
      return "コードが正しくありません。認証アプリの最新の 6 桁を入力してください。";
    case "rate-limit":
      return "試行回数の上限に達しました。しばらく待ってから再試行してください。";
    case "network":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    default:
      return "エラーが発生しました。時間をおいて再試行してください。";
  }
});

function handleStatus(next: typeof status.value) {
  if (next === "success") {
    void router.replace({ name: "events" });
  }
  if (next === "awaiting-code") {
    code.value = "";
  }
}

function handleError() {
  if (error.value === "no-factor") {
    void router.replace({ name: "mfa-setup" });
  }
}

onMounted(async () => {
  if (status.value === "success") {
    void router.replace({ name: "events" });
    return;
  }
  if (status.value === "idle") {
    await start();
  }
  handleStatus(status.value);
  handleError();
});

watch(status, handleStatus);
watch(error, handleError);

async function onSubmit() {
  await submitCode(code.value);
}
</script>

<template>
  <main
    class="flex min-h-screen w-full items-center justify-center bg-paper text-ink font-jp px-hq-6 py-hq-12"
  >
    <div class="w-full max-w-md flex flex-col gap-hq-5">
      <Kicker>— Two-factor</Kicker>
      <h1 class="font-jp text-xl font-semibold text-ink">
        認証コードを入力
      </h1>
      <p class="font-jp text-sm text-muted">
        認証アプリに表示されている 6 桁コードを入力してください。
      </p>

      <p
        v-if="errorMessage"
        role="alert"
        class="font-jp text-sm text-danger bg-danger-soft border border-danger-soft rounded-hq-md px-hq-3 py-hq-2"
      >
        {{ errorMessage }}
      </p>

      <form
        v-if="isAwaitingCode || isVerifying"
        class="flex flex-col gap-hq-4"
        @submit.prevent="onSubmit"
      >
        <FormField>
          <Label html-for="mfa-code">6 桁コード</Label>
          <Input
            id="mfa-code"
            name="mfa-code"
            type="text"
            autocomplete="one-time-code"
            :model-value="code"
            :disabled="isVerifying"
            :aria-invalid="error === 'invalid-code' ? true : undefined"
            placeholder="123456"
            @update:model-value="(v) => (code = String(v))"
          />
        </FormField>
        <Button
          type="submit"
          variant="primary"
          :loading="isVerifying"
          :disabled="isVerifying"
        >
          {{ isVerifying ? "確認中…" : "サインインする" }}
        </Button>
      </form>
    </div>
  </main>
</template>
