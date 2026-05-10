<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import {
  useAuthSession,
  useRequestSignupCode,
  useVerifySignupCode,
} from "@/features/auth";

/**
 * Issue #189 ゼロ滞留 signup フローの段階 2。
 *
 * /signup から渡された email + 受信した 6 桁コードを Edge Function `verify-signup`
 * に投げ、成功で session を確立する。コード再送 / メールアドレス変更 / 期限切れ /
 * 上限到達のエラー分岐を持つ。
 *
 * 関連:
 *   openspec/changes/reservation-signup-zero-stale/specs/reservation-member-auth/spec.md
 *   - Requirement: /signup/verify ページ（6 桁コード入力）
 */

const route = useRoute();
const router = useRouter();
const session = useAuthSession();
const verify = useVerifySignupCode();
const resend = useRequestSignupCode();

const code = ref<string>("");
const email = ref<string>("");
const resendBanner = ref<string | null>(null);

const isLoading = computed(() => verify.status.value === "loading");
const isResending = computed(() => resend.status.value === "loading");

onMounted(async () => {
  const q = route.query.email;
  if (typeof q !== "string" || q.length === 0) {
    void router.replace({ name: "signup" });
    return;
  }
  email.value = q;
});

const codeError = computed<string | null>(() => {
  if (verify.status.value !== "error") return null;
  switch (verify.errorCode.value) {
    case "validation":
      return "6 桁の数字コードを入力してください。";
    case "invalid-code":
      return verify.remainingAttempts.value !== null
        ? `コードが正しくありません（残り ${verify.remainingAttempts.value} 回）。`
        : "コードが正しくありません。";
    case "expired":
      return "コードの有効期限が切れました。最初からやり直してください。";
    case "attempt-exceeded":
      return "試行回数の上限に達しました。最初からやり直してください。";
    case "not-found":
      return "認証セッションが見つかりません。最初からやり直してください。";
    case "session-failed":
      return "認証は成功しましたが、ログインの確立に失敗しました。ログイン画面からお試しください。";
    case "network":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    default:
      return "認証に失敗しました。時間をおいて再試行してください。";
  }
});

const showRestartCta = computed(() =>
  verify.status.value === "error" &&
  (verify.errorCode.value === "expired" ||
    verify.errorCode.value === "attempt-exceeded" ||
    verify.errorCode.value === "not-found"),
);

const showLoginCta = computed(
  () => verify.status.value === "error" && verify.errorCode.value === "session-failed",
);

watch(
  () => verify.status.value,
  async (s) => {
    if (s !== "success") return;
    // session が正常確立後、書類提出状態に応じて遷移先を選ぶ
    await session.refresh();
    if (session.hasIdentityDocument.value) {
      void router.replace({ name: "home" });
    } else {
      void router.replace({ name: "signup-identity" });
    }
  },
);

async function onSubmit() {
  await verify.submit(email.value, code.value);
}

async function onResend() {
  // 再送はメールのみで他フィールドが既知でないため、/signup へ戻して
  // ユーザーにフォーム再送信してもらう導線にする
  void router.push({ name: "signup", query: { email: email.value } });
}

function onChangeEmail() {
  void router.push({ name: "signup", query: { email: email.value } });
}
</script>

<template>
  <main class="flex min-h-screen flex-col bg-paper text-ink font-jp">
    <div class="mx-auto flex w-full max-w-md flex-1 flex-col gap-hq-6 px-hq-6 py-hq-10">
      <Kicker>— Sign up · Step 2 / 3</Kicker>
      <h1 class="font-jp-display text-2xl text-ink leading-snug">
        メールに届いた<br />6 桁コードを入力してください。
      </h1>
      <p class="text-sm text-muted leading-relaxed">
        <span class="text-ink">{{ email }}</span> 宛に認証コードを送信しました。<br />
        コードは 30 分間有効です。届かない場合は迷惑メールフォルダもご確認ください。
      </p>

      <div
        v-if="resendBanner"
        role="status"
        class="rounded-md border border-hairline bg-paper-warm px-hq-4 py-hq-3 text-sm text-ink"
      >
        {{ resendBanner }}
      </div>

      <div
        v-if="codeError"
        role="alert"
        data-testid="verify-banner"
        class="rounded-md border border-hairline bg-paper-warm px-hq-4 py-hq-3 text-sm text-danger"
      >
        {{ codeError }}
      </div>

      <form class="flex flex-col gap-hq-4" @submit.prevent="onSubmit">
        <FormField label="認証コード（6 桁）">
          <template #default="{ fieldId, ariaInvalid }">
            <Input
              :id="fieldId"
              v-model="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              pattern="\d{6}"
              placeholder="------"
              data-testid="verify-code-input"
              class="text-center tracking-[0.5em] text-2xl font-mono"
              :aria-invalid="ariaInvalid"
              :disabled="isLoading"
            />
          </template>
        </FormField>

        <Button type="submit" :disabled="code.length !== 6 || isLoading">
          {{ isLoading ? "認証中…" : "認証する" }}
        </Button>
      </form>

      <div class="flex flex-col gap-hq-2 text-sm">
        <button
          type="button"
          class="text-left text-accent underline"
          :disabled="isResending"
          @click="onResend"
        >
          コードを再送する（フォームに戻ります）
        </button>
        <button
          type="button"
          class="text-left text-muted underline"
          @click="onChangeEmail"
        >
          メールアドレスを変更する
        </button>
      </div>

      <div v-if="showRestartCta" class="pt-hq-4">
        <Button type="button" @click="router.push({ name: 'signup' })">
          最初からやり直す
        </Button>
      </div>
      <div v-if="showLoginCta" class="pt-hq-4">
        <Button type="button" @click="router.push({ name: 'login' })">
          ログイン画面へ
        </Button>
      </div>
    </div>
  </main>
</template>
