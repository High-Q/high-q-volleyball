<script setup lang="ts">
import { computed, reactive } from "vue";
import { useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import PolicyFooter from "@/shared/ui/PolicyFooter.vue";
import { PRIVACY_POLICY_URL } from "@/shared/lib/externalLinks";
import { useRequestSignupCode } from "@/features/auth";

/**
 * Issue #189 ゼロ滞留 signup フローの段階 1。
 *
 * 全項目（メール / 氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 同意）を
 * 1 ページで受け取り、Edge Function `request-signup` を呼んで認証コードメールを送信する。
 * 成功で /signup/verify?email=<encoded> に遷移する。
 *
 * 関連:
 *   openspec/changes/reservation-signup-zero-stale/specs/reservation-member-auth/spec.md
 *   - Requirement: /signup ページ（1 ページ全項目入力）
 */

const router = useRouter();
const { status, errorCode, fieldErrors, retryAfterSec, submit } =
  useRequestSignupCode();

const profileLead =
  "ご入力いただいた情報は、本人確認・連絡・参加管理のためにのみ利用します。第三者への提供は法令に基づく場合を除き行いません。";

const form = reactive({
  email: "",
  display_name: "",
  nickname: "",
  birthday: "",
  phone: "",
  experience_level: "beginner",
  terms_agreed: false,
});

const isLoading = computed(() => status.value === "loading");

const bannerMessage = computed<string | null>(() => {
  if (status.value !== "error") return null;
  switch (errorCode.value) {
    case "rate-limited":
      return retryAfterSec.value
        ? `送信回数の上限に達しました。約 ${retryAfterSec.value} 秒お待ちいただいてから再試行してください。`
        : "送信回数の上限に達しました。少し時間を空けてから再試行してください。";
    case "mail-send-failed":
      return "認証コードメールの送信に失敗しました。時間をおいて再試行してください。";
    case "network":
      return "ネットワークエラーが発生しました。接続を確認してください。";
    case "unknown":
      return "送信中にエラーが発生しました。時間をおいて再試行してください。";
    default:
      return null;
  }
});

const experienceOptions = [
  {
    value: "beginner",
    label: "初めて",
    description: "バレー自体が初めて、または久しぶり",
  },
  {
    value: "intermediate",
    label: "中級",
    description: "基礎ができる・経験 1〜3 年程度",
  },
  {
    value: "experienced",
    label: "経験者",
    description: "部活・社会人歴あり",
  },
] as const;

async function onSubmit() {
  const ok = await submit({
    email: form.email,
    display_name: form.display_name,
    nickname: form.nickname,
    birthday: form.birthday,
    phone: form.phone,
    experience_level: form.experience_level,
    terms_agreed: form.terms_agreed,
  });
  if (ok) {
    void router.push({
      name: "signup-verify",
      query: { email: form.email.trim().toLowerCase() },
    });
  }
}
</script>

<template>
  <main class="flex min-h-screen flex-col bg-paper text-ink font-jp">
    <div class="mx-auto flex w-full max-w-md flex-1 flex-col gap-hq-6 px-hq-6 py-hq-10">
      <Kicker>— Sign up · Step 1 / 3</Kicker>
      <h1 class="font-jp-display text-2xl text-ink leading-snug">
        会員登録を<br />はじめましょう。
      </h1>
      <p class="text-sm text-muted leading-relaxed">
        全項目をご入力後、認証コードを記載したメールをお送りします。
        メール内の 6 桁コードを次の画面で入力すると登録が完了します。
      </p>

      <div
        v-if="bannerMessage"
        role="alert"
        data-testid="signup-banner"
        class="rounded-md border border-hairline bg-paper-warm px-hq-4 py-hq-3 text-sm text-danger"
      >
        {{ bannerMessage }}
      </div>

      <form class="flex flex-col gap-hq-5" @submit.prevent="onSubmit">
        <FormField label="メールアドレス" :error="fieldErrors.email">
          <template #default="{ fieldId, ariaInvalid }">
            <Input
              :id="fieldId"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="example@mail.com"
              :aria-invalid="ariaInvalid"
              :disabled="isLoading"
            />
          </template>
        </FormField>
        <p
          v-if="errorCode === 'already-registered'"
          class="-mt-hq-3 text-xs text-muted leading-relaxed"
        >
          既に登録済みの場合は
          <router-link :to="{ name: 'login' }" class="text-accent underline">
            ログイン画面
          </router-link>
          へお進みください。
        </p>

        <FormField label="お名前" :error="fieldErrors.display_name">
          <template #default="{ fieldId, ariaInvalid }">
            <Input
              :id="fieldId"
              v-model="form.display_name"
              autocomplete="name"
              placeholder="例: 田中 美咲"
              :aria-invalid="ariaInvalid"
              :disabled="isLoading"
            />
          </template>
        </FormField>

        <FormField
          label="ニックネーム"
          hint="未入力時は氏名で表示されます · 1〜15 文字 · 日本語と英字のみ"
          :error="fieldErrors.nickname"
        >
          <template #default="{ fieldId, ariaInvalid }">
            <Input
              :id="fieldId"
              v-model="form.nickname"
              autocomplete="nickname"
              placeholder="例: ミサキ"
              :aria-invalid="ariaInvalid"
              :disabled="isLoading"
            />
          </template>
        </FormField>

        <FormField label="生年月日" :error="fieldErrors.birthday">
          <template #default="{ fieldId, ariaInvalid }">
            <Input
              :id="fieldId"
              v-model="form.birthday"
              type="date"
              autocomplete="bday"
              :aria-invalid="ariaInvalid"
              :disabled="isLoading"
            />
          </template>
        </FormField>

        <FormField
          label="電話番号"
          hint="必須 · 当日連絡用 · 携帯電話番号"
          :error="fieldErrors.phone"
        >
          <template #default="{ fieldId, ariaInvalid }">
            <Input
              :id="fieldId"
              v-model="form.phone"
              type="tel"
              autocomplete="tel"
              placeholder="090-1234-5678"
              :aria-invalid="ariaInvalid"
              :disabled="isLoading"
            />
          </template>
        </FormField>

        <fieldset class="flex flex-col gap-hq-2">
          <legend class="text-sm font-medium text-ink">
            経験レベル <span class="text-xs text-muted">あとから変更できます</span>
          </legend>
          <label
            v-for="opt in experienceOptions"
            :key="opt.value"
            class="flex items-start gap-3 rounded-md border px-hq-4 py-hq-3 cursor-pointer"
            :class="
              form.experience_level === opt.value
                ? 'border-accent bg-accent-soft'
                : 'border-hairline bg-paper-warm'
            "
          >
            <input
              v-model="form.experience_level"
              type="radio"
              :value="opt.value"
              class="mt-1"
              :disabled="isLoading"
            />
            <div class="flex-1">
              <div
                class="text-sm font-medium"
                :class="
                  form.experience_level === opt.value ? 'text-accent' : 'text-ink'
                "
              >
                {{ opt.label }}
              </div>
              <div class="text-xs text-muted">{{ opt.description }}</div>
            </div>
          </label>
          <p
            v-if="fieldErrors.experience_level"
            role="alert"
            class="text-xs text-danger"
          >
            {{ fieldErrors.experience_level }}
          </p>
        </fieldset>

        <label class="flex items-start gap-3 text-xs leading-relaxed text-ink">
          <input
            v-model="form.terms_agreed"
            type="checkbox"
            class="mt-1"
            :disabled="isLoading"
          />
          <span>
            <a href="#" class="text-accent underline">利用規約</a> と
            <a
              :href="PRIVACY_POLICY_URL"
              target="_blank"
              rel="noreferrer"
              class="text-accent underline"
              data-testid="signup-privacy-link"
            >プライバシーポリシー</a>
            に同意します。
          </span>
        </label>
        <p v-if="fieldErrors.terms" role="alert" class="text-xs text-danger">
          {{ fieldErrors.terms }}
        </p>
      </form>

      <PolicyFooter :lead="profileLead" />
    </div>
    <div class="border-t border-hairline bg-paper px-hq-6 py-hq-3">
      <div class="mx-auto w-full max-w-md">
        <Button
          type="button"
          :disabled="!form.terms_agreed || isLoading"
          @click="onSubmit"
        >
          {{ isLoading ? "送信中…" : "認証コードを送信する" }}
        </Button>
      </div>
    </div>
  </main>
</template>
