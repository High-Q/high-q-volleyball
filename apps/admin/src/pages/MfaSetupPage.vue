<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import QRCode from "qrcode";
import { Button, Kicker } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import Label from "@/shared/ui/Label.vue";
import { useMfaEnrollment } from "@/features/auth";

/**
 * 初回 MFA 登録 (TOTP factor enroll + verify)。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D11, D13)
 */

const router = useRouter();
const {
  status,
  error,
  uri,
  secret,
  enroll,
  submitCode,
} = useMfaEnrollment();

const code = ref<string>("");
const qrSvg = ref<string>("");

const isAwaitingCode = computed(() => status.value === "awaiting-code");
const isVerifying = computed(() => status.value === "verifying");
const isEnrolling = computed(() => status.value === "enrolling");

const errorMessage = computed<string | null>(() => {
  if (error.value === null) return null;
  switch (error.value) {
    case "invalid-code":
      return "コードが正しくありません。認証アプリに表示されている 6 桁を入力してください。";
    case "rate-limit":
      return "試行回数の上限に達しました。しばらく待ってから再試行してください。";
    case "network":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    case "no-factor":
      return "MFA 設定の準備ができていません。ページを再読み込みしてください。";
    default:
      return "エラーが発生しました。時間をおいて再試行してください。";
  }
});

async function regenerateQr(): Promise<void> {
  if (uri.value) {
    qrSvg.value = await QRCode.toString(uri.value, {
      type: "svg",
      margin: 1,
      width: 220,
    });
  } else {
    qrSvg.value = "";
  }
}

onMounted(async () => {
  await regenerateQr();
  if (status.value === "success") {
    void router.replace({ name: "home" });
  }
  if (status.value === "idle") {
    void enroll();
  }
});

watch(uri, () => {
  void regenerateQr();
});

watch(status, (next) => {
  if (next === "success") {
    void router.replace({ name: "home" });
  }
  if (next === "awaiting-code") {
    code.value = "";
  }
});

async function onSubmit() {
  await submitCode(code.value);
}
</script>

<template>
  <main
    class="flex min-h-screen w-full items-center justify-center bg-paper text-ink font-jp px-hq-6 py-hq-12"
  >
    <div class="w-full max-w-xl flex flex-col gap-hq-5">
      <Kicker>— Two-factor setup</Kicker>
      <h1 class="font-jp text-xl font-semibold text-ink">
        二要素認証を設定する
      </h1>
      <p class="font-jp text-sm text-muted">
        ログインを安全に保つため、認証アプリで生成される 6 桁コードを必須にします。
      </p>

      <p
        v-if="errorMessage"
        role="alert"
        class="font-jp text-sm text-danger bg-danger-soft border border-danger-soft rounded-hq-md px-hq-3 py-hq-2"
      >
        {{ errorMessage }}
      </p>

      <p v-if="isEnrolling" class="font-jp text-sm text-muted">
        準備中…
      </p>

      <template v-if="isAwaitingCode || isVerifying">
        <ol
          class="font-jp text-sm text-ink-soft list-decimal list-inside flex flex-col gap-hq-1"
        >
          <li>
            認証アプリ
            (<a
              href="https://authy.com/"
              class="text-accent underline"
              target="_blank"
              rel="noreferrer"
              >Authy</a
            >
            /
            <a
              href="https://support.google.com/accounts/answer/1066447"
              class="text-accent underline"
              target="_blank"
              rel="noreferrer"
              >Google Authenticator</a
            >
            /
            <a
              href="https://1password.com/"
              class="text-accent underline"
              target="_blank"
              rel="noreferrer"
              >1Password</a
            >)
            をインストールします。
          </li>
          <li>下の QR コードをアプリでスキャンします。</li>
          <li>表示された 6 桁コードを入力して「確認」を押します。</li>
        </ol>

        <div
          class="rounded-hq-md border border-hairline bg-paper-warm p-hq-4 flex flex-col gap-hq-3 items-center"
        >
          <div
            v-if="qrSvg"
            class="bg-paper rounded-hq-sm p-hq-2"
            v-html="qrSvg"
          />
          <p class="font-mono text-xs text-muted text-center">
            手動入力用シークレット<br />
            <span class="font-mono text-ink select-all">{{ secret }}</span>
          </p>
        </div>

        <form class="flex flex-col gap-hq-4" @submit.prevent="onSubmit">
          <FormField>
            <Label html-for="mfa-code">認証アプリの 6 桁コード</Label>
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
            {{ isVerifying ? "確認中…" : "確認" }}
          </Button>
        </form>
      </template>
    </div>
  </main>
</template>
