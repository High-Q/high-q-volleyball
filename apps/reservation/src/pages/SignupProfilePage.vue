<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import FormField from "@/shared/ui/FormField.vue";
import Input from "@/shared/ui/Input.vue";
import { useAuthSession, useCompleteProfile } from "@/features/auth";

const route = useRoute();
const router = useRouter();
const session = useAuthSession();
const { status, error, fieldErrors, submit } = useCompleteProfile();

const form = reactive({
  display_name: "",
  birthday: "",
  phone: "",
  experience_level: "beginner",
  terms_agreed: false,
});

const reasonBanner = ref<string | null>(null);
const isLoading = computed(() => status.value === "loading");

onMounted(() => {
  // session の display_name placeholder (メール由来) は無視。空欄スタートで翔太郎くんに正式名を入れてもらう
  const reason = route.query.reason;
  if (typeof reason === "string" && reason.length > 0) {
    reasonBanner.value = reason;
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
  }
});

const bannerMessage = computed<string | null>(() => {
  if (status.value === "error" && error.value && error.value !== "validation") {
    switch (error.value) {
      case "network":
        return "ネットワークエラーが発生しました。接続を確認してください。";
      default:
        return "登録に失敗しました。時間をおいて再試行してください。";
    }
  }
  if (reasonBanner.value === "profile-update-failed") {
    return "プロフィールの登録に失敗しました。お手数ですがもう一度お試しください。";
  }
  return null;
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

watch(status, (s) => {
  if (s === "success") {
    void router.push({ name: "home" });
  }
});

async function onSubmit() {
  await submit({
    display_name: form.display_name,
    birthday: form.birthday,
    phone: form.phone,
    experience_level: form.experience_level,
    terms_agreed: form.terms_agreed,
  });
}
</script>

<template>
  <main class="flex min-h-screen flex-col bg-paper text-ink font-jp">
    <div class="mx-auto flex w-full max-w-md flex-1 flex-col gap-hq-6 px-hq-6 py-hq-10">
      <Kicker>— Almost there</Kicker>
      <h1 class="font-jp-display text-2xl text-ink leading-snug">
        はじめまして。<br />あなたのことを<br />少しだけ教えてください。
      </h1>
      <p class="text-sm text-muted leading-relaxed">
        メール認証が完了しました（{{ session.session.value?.user.email ?? "" }}）。続けて、予約に必要な情報をご入力ください。
      </p>

      <div
        v-if="bannerMessage"
        role="alert"
        class="rounded-md border border-hairline bg-paper-warm px-hq-4 py-hq-3 text-sm text-danger"
      >
        {{ bannerMessage }}
      </div>

      <form class="flex flex-col gap-hq-5" @submit.prevent="onSubmit">
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
            <a href="#" class="text-accent underline">プライバシーポリシー</a>
            に同意します。
          </span>
        </label>
        <p v-if="fieldErrors.terms" role="alert" class="text-xs text-danger">
          {{ fieldErrors.terms }}
        </p>
      </form>
    </div>
    <div class="border-t border-hairline bg-paper px-hq-6 py-hq-3">
      <div class="mx-auto w-full max-w-md">
        <Button
          type="button"
          :disabled="!form.terms_agreed || isLoading"
          @click="onSubmit"
        >
          {{ isLoading ? "登録中…" : "登録する" }}
        </Button>
      </div>
    </div>
  </main>
</template>
