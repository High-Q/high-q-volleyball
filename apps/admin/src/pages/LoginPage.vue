<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import Label from "@/shared/ui/Label.vue";
import { useSendMagicLink } from "@/features/auth";

/**
 * 管理画面ログイン (マジックリンク送信)。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D6, D7)
 *   docs/10-デザインサンプル/admin/hq-admin-screens.jsx (ScreenLogin)
 */

const route = useRoute();
const { status, error, submittedEmail, send, reset } = useSendMagicLink();

const email = ref<string>("");
const reasonBanner = ref<string | null>(null);

const isLoading = computed(() => status.value === "loading");
const isSuccess = computed(() => status.value === "success");
const isError = computed(() => status.value === "error");

onMounted(() => {
  const reason = route.query.reason;
  if (typeof reason === "string" && reason.length > 0) {
    reasonBanner.value = reason;
    // URL から query を除去 (リロードで再表示しない)
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  }
});

const errorMessage = computed<string | null>(() => {
  if (isError.value) {
    switch (error.value) {
      case "invalid-email":
        return "メールアドレスの形式が正しくありません。";
      case "rate-limit":
        return "送信回数の上限に達しました。しばらく待ってから再試行してください。";
      case "network":
        return "ネットワークエラーが発生しました。接続を確認してください。";
      default:
        return "送信中にエラーが発生しました。時間をおいて再試行してください。";
    }
  }
  if (reasonBanner.value !== null) {
    switch (reasonBanner.value) {
      case "not-admin":
        return "このアカウントには管理者権限がありません。オーナーアカウントでログインしてください。";
      case "link-invalid":
        return "リンクの有効期限が切れたか、無効です。再度メールを送信してください。";
      case "session-timeout":
        return "操作のないセッションは安全のため終了しました。再度ログインしてください。";
      default:
        return null;
    }
  }
  return null;
});

async function onSubmit() {
  await send(email.value);
}

function onReset() {
  email.value = "";
  reset();
}
</script>

<template>
  <main
    class="flex min-h-screen w-full bg-paper text-ink font-jp"
    aria-label="管理者ログイン"
  >
    <!-- 左ペイン: ブランド・コピー -->
    <section
      class="hidden md:flex md:w-[44%] flex-col bg-paper-warm border-r border-hairline px-hq-12 py-hq-14"
    >
      <div class="flex items-baseline gap-hq-2">
        <span class="font-jp-display text-3xl font-semibold text-ink">
          High Q
        </span>
        <span
          class="font-mono text-[10px] uppercase tracking-[0.24em] text-muted"
        >
          EST.21 · ADMIN
        </span>
      </div>
      <div class="flex-1 flex flex-col justify-center gap-hq-5">
        <Kicker color="accent">— Internal console</Kicker>
        <h2
          class="font-jp text-2xl font-semibold leading-relaxed text-ink"
        >
          サークル運営の<br />ちいさな道具箱。
        </h2>
        <p class="font-jp text-sm leading-loose text-ink-soft max-w-sm">
          イベントの公開、参加者の管理、当日のチェックイン。<br />
          High Q を運営するための画面です。<br />
          オーナーのみがアクセスできます。
        </p>
      </div>
    </section>

    <!-- 右ペイン: フォーム -->
    <section
      class="flex flex-1 items-center justify-center px-hq-6 py-hq-12"
    >
      <div class="w-full max-w-md flex flex-col gap-hq-5">
        <Kicker>— Sign in</Kicker>
        <h1 class="font-jp text-xl font-semibold text-ink">ログイン</h1>
        <p class="font-jp text-sm text-muted">
          登録済みのオーナーアカウントにマジックリンクを送信します。
        </p>

        <p
          v-if="errorMessage"
          role="alert"
          class="font-jp text-sm text-danger bg-danger-soft border border-danger-soft rounded-hq-md px-hq-3 py-hq-2"
        >
          {{ errorMessage }}
        </p>

        <!-- Empty / Loading / Error: フォームを表示 -->
        <form
          v-if="!isSuccess"
          class="flex flex-col gap-hq-4"
          @submit.prevent="onSubmit"
        >
          <FormField>
            <Label html-for="login-email">メールアドレス</Label>
            <Input
              id="login-email"
              type="email"
              name="email"
              autocomplete="email"
              :model-value="email"
              :disabled="isLoading"
              :aria-invalid="isError ? true : undefined"
              placeholder="owner@example.com"
              @update:model-value="(v) => (email = String(v))"
            />
          </FormField>
          <Button
            type="submit"
            variant="primary"
            :loading="isLoading"
            :disabled="isLoading"
          >
            {{ isLoading ? "送信中…" : "マジックリンクを送る" }}
          </Button>
        </form>

        <!-- Success: 送信完了表示 -->
        <div v-else class="flex flex-col gap-hq-4">
          <div
            class="rounded-hq-md border border-hairline bg-paper px-hq-4 py-hq-3 font-jp text-sm text-ink leading-relaxed"
          >
            <p class="font-medium">メールを送信しました。</p>
            <p class="mt-hq-1 text-ink-soft">
              <span class="font-mono">{{ submittedEmail }}</span>
              宛のリンクをクリックしてサインインを完了してください。
            </p>
            <p class="mt-hq-2 text-xs text-muted">
              数分待っても届かない場合は、迷惑メールフォルダや別の認証アプリの通知をご確認ください。
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            @click="onReset"
          >
            別のメールアドレスを使う
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>
