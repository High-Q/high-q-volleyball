<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button } from "@high-q/ui";
import { useAuthSession } from "@/features/auth";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { ProfileHeader } from "@/widgets/profile-header";
import { LevelEditSection } from "@/features/profile-level-edit";
import { StatsSection } from "@/features/profile-stats";
import {
  AccountSection,
  BirthdayEditDialog,
  DisplayNameEditDialog,
  NicknameEditDialog,
  PhoneEditDialog,
  EmailEditDialog,
} from "@/features/profile-account";
import { SignOutButton } from "@/features/profile-sign-out";
import { AccountDeletionSection } from "@/features/account-deletion";
import { AppFooter } from "@/widgets/app-footer";
import {
  fetchMyReservations,
  type MyReservationItem,
} from "@/entities/reservation";

const session = useAuthSession();
const member = computed(() => session.member.value);
const route = useRoute();
const router = useRouter();

const reservations = ref<MyReservationItem[]>([]);
const loading = ref<boolean>(true);
const fetchError = ref<string | null>(null);

const successNotice = ref<string | null>(null);
let successTimer: ReturnType<typeof setTimeout> | null = null;

async function load(): Promise<void> {
  if (member.value === null) return;
  loading.value = true;
  fetchError.value = null;
  try {
    reservations.value = await fetchMyReservations(member.value.id);
  } catch (cause) {
    fetchError.value =
      cause instanceof Error
        ? cause.message
        : "データの取得に失敗しました。";
  } finally {
    loading.value = false;
  }
}

const levelSectionEl = ref<HTMLDivElement | null>(null);
const levelHighlighted = ref<boolean>(false);
const levelHighlightClass = computed(() =>
  levelHighlighted.value ? "ring-2 ring-accent ring-offset-2" : "",
);
let levelHighlightTimer: ReturnType<typeof setTimeout> | null = null;

function focusLevelSection(): void {
  // 次の paint で scroll + highlight を行う (要素がマウント済前提)
  requestAnimationFrame(() => {
    levelSectionEl.value?.scrollIntoView({ behavior: "smooth", block: "center" });
    levelHighlighted.value = true;
    if (levelHighlightTimer !== null) clearTimeout(levelHighlightTimer);
    levelHighlightTimer = setTimeout(() => {
      levelHighlighted.value = false;
    }, 2500);
  });
}

onMounted(() => {
  void load();

  // #296: ?edit=<field> クエリで対応する編集モーダルを自動起動
  const raw = route.query.edit;
  const value = typeof raw === "string" ? raw : null;
  if (value === "experienceLevel") {
    // experience_level は LEVEL セクションが inline 配置のためモーダルではなくスクロール + ハイライト
    focusLevelSection();
    // クエリは消費する
    const { edit: _e, ...rest } = route.query;
    void router.replace({ query: rest });
  } else if (
    value !== null &&
    (SUPPORTED_EDIT_FIELDS as ReadonlyArray<string>).includes(value)
  ) {
    editField.value = value as EditField;
  }
  // experience_level は LEVEL セクションへスクロールでも別経路（hash 由来）でも受ける
  if (route.hash === "#profile-level-section") {
    focusLevelSection();
  }
});

type EditField = "displayName" | "nickname" | "email" | "phone" | "birthday";
const SUPPORTED_EDIT_FIELDS: ReadonlyArray<EditField> = [
  "displayName",
  "nickname",
  "email",
  "phone",
  "birthday",
];

const editField = ref<EditField | null>(null);

function onEditAccount(field: EditField): void {
  editField.value = field;
}

function closeEdit(): void {
  editField.value = null;
  // #296: ?edit= クエリは消費 (戻る/進む 操作で同モーダルを再起動できる挙動は維持しない)
  if (route.query.edit !== undefined) {
    const { edit: _edit, ...rest } = route.query;
    void router.replace({ query: rest });
  }
}

function onAccountSaved(): void {
  showSuccess("変更を保存しました。");
}

function showSuccess(message: string): void {
  successNotice.value = message;
  if (successTimer !== null) clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successNotice.value = null;
  }, 4000);
}

const upcomingReservationCount = computed<number>(() => {
  const now = Date.now();
  return reservations.value.filter((r) => {
    const startMs = new Date(r.event.startAt).getTime();
    return (
      startMs > now && (r.status === "reserved" || r.status === "waitlist")
    );
  }).length;
});
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp flex flex-col">
    <header
      class="px-hq-5 py-hq-4 flex items-start justify-between gap-hq-4 border-b border-hairline"
    >
      <div class="flex flex-col gap-hq-1">
        <PageBreadcrumb
          :items="[
            { label: 'マイページ', to: { name: 'events-list' } },
            { label: 'プロフィール' },
          ]"
        />
        <span class="font-jp-display text-lg text-ink mt-hq-1">High Q</span>
      </div>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-6">
      <div
        v-if="member === null"
        class="flex flex-col gap-hq-4"
        aria-label="プロフィールを読み込み中"
      >
        <div class="bg-surface border border-hairline rounded-hq-lg h-16 animate-pulse" />
        <div class="bg-surface border border-hairline rounded-hq-lg h-40 animate-pulse" />
        <div class="bg-surface border border-hairline rounded-hq-lg h-32 animate-pulse" />
      </div>
      <template v-else>
        <ProfileHeader :member="member" />

        <p
          v-if="successNotice !== null"
          role="status"
          class="bg-accent-soft text-accent border border-accent rounded-hq-md px-hq-4 py-hq-3 font-jp text-sm m-0"
          data-testid="profile-success-notice"
        >{{ successNotice }}</p>

        <div
          v-if="fetchError !== null"
          role="alert"
          class="bg-surface border border-hairline rounded-hq-lg p-hq-4 flex items-center justify-between gap-hq-3"
        >
          <p class="font-jp text-sm text-ink m-0">
            データの取得に失敗しました。
          </p>
          <Button variant="outline" size="sm" type="button" @click="load">再試行</Button>
        </div>

        <div
          id="profile-level-section"
          ref="levelSectionEl"
          class="rounded-hq-lg transition-colors duration-700"
          :class="levelHighlightClass"
        >
          <LevelEditSection
            :member-id="member.id"
            :initial-level="member.experienceLevel"
          />
        </div>

        <AccountSection :member="member" @edit="onEditAccount" />

        <div v-if="loading" class="bg-surface border border-hairline rounded-hq-lg h-32 animate-pulse" aria-label="読み込み中" />
        <StatsSection v-else :reservations="reservations" />

        <SignOutButton />

        <AccountDeletionSection
          :upcoming-reservation-count="upcomingReservationCount"
        />
      </template>
    </section>

    <!--
      法令対応 (個人情報保護法 / 改正電気通信事業法) のため、メイン画面で
      AppFooter が非表示になっているタブバー表示中でも、プロフィール画面には
      AppFooter (プライバシーポリシー / 外部送信ポリシー / Cookie 設定) を
      確実に表示し、ユーザーが容易に到達できる状態を保つ。
    -->
    <AppFooter />

    <template v-if="member !== null">
      <DisplayNameEditDialog
        :open="editField === 'displayName'"
        :member-id="member.id"
        :initial-last-name="member.lastName"
        :initial-first-name="member.firstName"
        @update:open="(v) => (v ? null : closeEdit())"
        @saved="onAccountSaved"
      />
      <NicknameEditDialog
        :open="editField === 'nickname'"
        :member-id="member.id"
        :initial-value="member.nickname"
        @update:open="(v) => (v ? null : closeEdit())"
        @saved="onAccountSaved"
      />
      <PhoneEditDialog
        :open="editField === 'phone'"
        :member-id="member.id"
        :initial-value="member.phone"
        @update:open="(v) => (v ? null : closeEdit())"
        @saved="onAccountSaved"
      />
      <BirthdayEditDialog
        :open="editField === 'birthday'"
        :member-id="member.id"
        :initial-value="member.birthday"
        @update:open="(v) => (v ? null : closeEdit())"
        @saved="onAccountSaved"
      />
      <EmailEditDialog
        :open="editField === 'email'"
        :current-email="member.email"
        @update:open="(v) => (v ? null : closeEdit())"
      />
    </template>
  </main>
</template>
