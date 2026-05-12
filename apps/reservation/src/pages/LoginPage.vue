<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import { useSendMagicLink } from "@/features/auth";
import { safeNextPath } from "@/shared/lib/safeNextPath";

/**
 * 予約サイトのログイン専用ページ。
 *
 * #189 ゼロ滞留 signup フロー導入後、新規会員登録は /signup（全項目入力 + 6 桁
 * コード認証）に分離された。本ページは既存会員のマジックリンクログイン専用となり、
 * Supabase signInWithOtp に shouldCreateUser:false を渡して未登録メールでは
 * Supabase 側が "未登録" エラーを返す挙動に頼る。未登録の場合は会員登録への導線を
 * 案内する。
 *
 * 関連:
 *   openspec/changes/reservation-signup-zero-stale/specs/reservation-member-auth/spec.md
 *   - Requirement: ログインフローはマジックリンク方式を維持
 */
const route = useRoute();
const router = useRouter();
const { status, error, send } = useSendMagicLink();

const email = ref<string>("");
const reasonBanner = ref<string | null>(null);

const isLoading = computed(() => status.value === "loading");
const isError = computed(() => status.value === "error");

onMounted(() => {
  const reason = route.query.reason;
  if (typeof reason === "string" && reason.length > 0) {
    reasonBanner.value = reason;
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  }
});

const isUnregistered = computed(
  () => isError.value && error.value === "unregistered",
);

const errorMessage = computed<string | null>(() => {
  if (isError.value) {
    switch (error.value) {
      case "invalid-email":
        return "メールアドレスの形式が正しくありません。";
      case "unregistered":
        return "このメールアドレスは登録されていません。新規会員登録をご利用ください。";
      case "rate-limit":
        return "送信回数の上限に達しました。約 60 秒お待ちいただいてから再試行してください。";
      case "network":
        return "ネットワークエラーが発生しました。接続を確認してください。";
      default:
        return "送信中にエラーが発生しました。時間をおいて再試行してください。";
    }
  }
  if (reasonBanner.value !== null) {
    switch (reasonBanner.value) {
      case "link-invalid":
        return "リンクの有効期限が切れたか、無効です。再度メールを送信してください。";
      default:
        return null;
    }
  }
  return null;
});

const aboutItems = [
  { label: "月1〜2回", description: "土日祝の日中または夜に開催" },
  { label: "初心者歓迎", description: "参加者の 2〜3 割が初心者" },
  { label: "会費無料", description: "各イベント参加費のみ" },
] as const;

// #229: LP からのイベント指定遷移を受けるため、`next` クエリを safeNextPath で
// 正規化したうえでマジックリンクの emailRedirectTo に持ち回す。
const nextPath = computed<string | null>(() =>
  safeNextPath(route.query.next),
);

async function onSubmit() {
  await send(email.value, {
    shouldCreateUser: false,
    next: nextPath.value,
  });
  if (status.value === "success") {
    const query: Record<string, string> = { email: email.value };
    if (nextPath.value) {
      query.next = nextPath.value;
    }
    void router.push({
      name: "auth-link-sent",
      query,
    });
  }
}
</script>

<template>
  <main class="flex min-h-screen flex-col bg-paper text-ink font-jp">
    <!-- ヘッダー: ロゴ + START ラベル -->
    <header
      class="border-b border-hairline px-hq-6 py-hq-4 flex items-center justify-between"
    >
      <div class="flex items-baseline gap-hq-2">
        <span class="font-jp-display text-xl text-ink tracking-wide">High Q</span>
        <span
          class="font-mono text-xs uppercase tracking-widest text-muted"
          aria-hidden="true"
        >EST.21</span>
      </div>
      <span
        class="font-mono text-xs uppercase tracking-widest text-muted"
        aria-hidden="true"
      >START</span>
    </header>

    <div class="mx-auto flex w-full max-w-md flex-1 flex-col gap-hq-6 px-hq-6 py-hq-8">
      <!-- 見出しブロック -->
      <section class="flex flex-col gap-hq-2">
        <Kicker>— Welcome to High Q</Kicker>
        <h1 class="font-jp-display text-4xl text-ink leading-tight">
          はじめる
        </h1>
        <p class="font-jp-display text-xl text-muted leading-snug">
          メールアドレスを入力してください。
        </p>
        <p class="mt-hq-2 text-sm text-ink-soft leading-relaxed">
          High Q は東京・江東区を中心に活動する<br />
          社会人バレーボールサークルの予約システムです。
        </p>
      </section>

      <!-- フォーム -->
      <section class="flex flex-col gap-hq-4">
        <div
          v-if="errorMessage"
          role="alert"
          class="rounded-md border border-hairline bg-paper-warm px-hq-4 py-hq-3 text-sm text-danger"
        >
          {{ errorMessage }}
        </div>

        <form class="flex flex-col gap-hq-4" @submit.prevent="onSubmit">
          <FormField>
            <template #default="{ fieldId, ariaInvalid }">
              <label :for="fieldId" class="text-sm text-ink mb-hq-2 inline-block">
                メールアドレス <span class="text-accent" aria-hidden="true">*</span>
              </label>
              <Input
                :id="fieldId"
                v-model="email"
                type="email"
                autocomplete="email"
                placeholder="example@mail.com"
                :aria-invalid="ariaInvalid"
                :aria-required="true"
                :disabled="isLoading"
              />
            </template>
          </FormField>
          <p class="text-xs text-muted leading-relaxed">
            ご入力のメールにログイン用リンクをお送りします。リンクから 1 タップで続行できます。
          </p>
          <Button type="submit" :disabled="isLoading">
            {{ isLoading ? "送信中…" : "メールでリンクを受け取る →" }}
          </Button>
          <p
            v-if="isUnregistered"
            class="text-xs text-muted leading-relaxed text-center"
          >
            <router-link
              :to="{
                name: 'signup',
                query: nextPath ? { email, next: nextPath } : { email },
              }"
              class="text-accent underline"
              data-testid="login-go-signup"
            >新規会員登録へ</router-link>
            お進みください。
          </p>
          <p v-else class="text-xs text-muted leading-relaxed text-center">
            初めての方は
            <router-link
              :to="{
                name: 'signup',
                query: nextPath ? { next: nextPath } : {},
              }"
              class="text-accent underline"
              data-testid="login-go-signup"
            >新規会員登録</router-link>
            へお進みください。
          </p>
        </form>
      </section>

      <!-- ABOUT カード -->
      <section
        class="rounded-md border border-hairline bg-paper-warm px-hq-5 py-hq-4"
      >
        <Kicker>— About</Kicker>
        <dl class="mt-hq-3 flex flex-col gap-hq-2">
          <div
            v-for="item in aboutItems"
            :key="item.label"
            class="flex items-baseline gap-hq-3 text-sm"
          >
            <dt class="font-medium text-ink shrink-0 w-20">{{ item.label }}</dt>
            <dd class="text-muted">{{ item.description }}</dd>
          </div>
        </dl>
      </section>

      <!-- フッターリンク (LP へのリンク・後続 #90 周辺で正式配線) -->
      <div class="text-center pb-hq-2">
        <a
          href="#"
          class="text-xs text-muted leading-relaxed inline-flex items-center gap-1"
        >
          サークルについて詳しく
          <span aria-hidden="true">›</span>
        </a>
      </div>
    </div>
  </main>
</template>
