<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import { useSendMagicLink } from "@/features/auth";

const route = useRoute();
const router = useRouter();
const { status, error, send } = useSendMagicLink();

const email = computed(() =>
  typeof route.query.email === "string" ? route.query.email : "",
);
// /login が signup と兼用になったため、via は廃止 (常に login)。
// 別アドレスで送り直すリンクは /login に戻す。

const isLoading = computed(() => status.value === "loading");
const justResent = ref(false);

const errorMessage = computed<string | null>(() => {
  if (status.value !== "error") return null;
  switch (error.value) {
    case "rate-limit":
      return "送信回数の上限に達しました。約 60 秒お待ちいただいてから再試行してください。";
    case "network":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    case "invalid-email":
      return "メールアドレスが無効です。最初からやり直してください。";
    default:
      return "再送に失敗しました。時間をおいて再試行してください。";
  }
});

async function resend() {
  justResent.value = false;
  // login = signup 兼用なので shouldCreateUser:true で OK
  await send(email.value, { shouldCreateUser: true });
  if (status.value === "success") {
    justResent.value = true;
  }
}

function changeAddress() {
  void router.push({ name: "login" });
}
</script>

<template>
  <main class="flex min-h-screen flex-col bg-paper text-ink font-jp">
    <div class="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-hq-5 px-hq-6 py-hq-10 text-center">
      <div
        class="mt-hq-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft"
        aria-hidden="true"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-accent"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>
      <Kicker>— Check your inbox</Kicker>
      <h1 class="font-jp-display text-xl text-ink leading-snug">
        メールを送信しました。
      </h1>
      <p class="text-sm text-muted leading-relaxed">
        <span class="font-medium text-ink">{{ email }}</span> 宛に<br />
        ログインリンクを送信しました。<br />
        メール内のリンクから続行してください。
      </p>

      <div
        v-if="errorMessage"
        role="alert"
        class="w-full rounded-md border border-hairline bg-paper-warm px-hq-4 py-hq-3 text-left text-sm text-danger"
      >
        {{ errorMessage }}
      </div>
      <p
        v-if="justResent && !errorMessage"
        role="status"
        class="text-xs text-accent"
      >
        メールを再送しました。
      </p>

      <div class="w-full rounded-md border border-hairline bg-paper-warm px-hq-5 py-hq-4 text-left">
        <Kicker>— Note</Kicker>
        <ul class="mt-hq-2 flex flex-col gap-hq-2 text-xs text-muted leading-relaxed">
          <li>リンクの有効期限は 15 分</li>
          <li>メールが届かない場合は迷惑メールをご確認ください</li>
          <li>別のメールでやり直すこともできます</li>
        </ul>
      </div>

      <div class="flex flex-col items-center gap-hq-3">
        <Button
          variant="ghost"
          type="button"
          :disabled="isLoading"
          @click="resend"
        >
          {{ isLoading ? "送信中…" : "メールを再送する" }}
        </Button>
        <button
          type="button"
          class="text-xs text-muted underline"
          @click="changeAddress"
        >
          別のアドレスを使う
        </button>
      </div>
    </div>
  </main>
</template>
