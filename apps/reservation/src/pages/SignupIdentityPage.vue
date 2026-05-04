<script setup lang="ts">
import { computed, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { Kicker } from "@high-q/ui";
import { DOCUMENT_TYPE_LABELS } from "@high-q/shared";
import type { DocumentType } from "@/entities/identity-document";
import {
  useUploadIdentityDocument,
  type Side,
} from "@/features/identity-document";
import { useAuthSession } from "@/features/auth";
import StepDots from "./SignupIdentityPage/components/StepDots.vue";
import DocumentChip from "./SignupIdentityPage/components/DocumentChip.vue";
import ConditionCard from "./SignupIdentityPage/components/ConditionCard.vue";
import MynumberDefense from "./SignupIdentityPage/components/MynumberDefense.vue";
import UploadSlot from "./SignupIdentityPage/components/UploadSlot.vue";
import ErrorBanner from "./SignupIdentityPage/components/ErrorBanner.vue";
import SuccessBanner from "./SignupIdentityPage/components/SuccessBanner.vue";
import StickyCta from "./SignupIdentityPage/components/StickyCta.vue";
import PolicyFooter from "./SignupIdentityPage/components/PolicyFooter.vue";

const router = useRouter();
const session = useAuthSession();
const upload = useUploadIdentityDocument();

const DOCS: Array<{ type: DocumentType; label: string }> = (
  Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]
).map((type) => ({ type, label: DOCUMENT_TYPE_LABELS[type] }));

const isMyNumber = computed(
  () => upload.selectedDocumentType.value === "my_number_card_masked",
);

const ERROR_BANNER_MAP: Record<
  string,
  { title: string; description: string }
> = {
  unsupported_format: {
    title: "ファイル形式が不正です",
    description: "jpg / png / heic のみ受け付けています。別のファイルを選んでください。",
  },
  file_too_large: {
    title: "ファイルサイズが大きすぎます",
    description: "10MB までのファイルを選んでください。",
  },
  storage_failed_front: {
    title: "アップロードに失敗しました (表面)",
    description: "通信状況を確認してから、もう一度お試しください。",
  },
  storage_failed_back: {
    title: "アップロードに失敗しました (裏面)",
    description: "通信状況を確認してから、もう一度お試しください。",
  },
  db_failed: {
    title: "保存に失敗しました",
    description: "時間をおいて再試行してください。問題が続く場合はサポートまで。",
  },
  network: {
    title: "ネットワークエラーが発生しました",
    description: "接続を確認してください。",
  },
};

const errorBanner = computed(() => {
  const code = upload.error.value;
  if (!code) return null;
  return ERROR_BANNER_MAP[code] ?? null;
});

const cta = computed<{ label: string; disabled: boolean; spinner: boolean }>(
  () => {
    if (upload.pageState.value === "success") {
      return { label: "完了する", disabled: false, spinner: false };
    }
    if (upload.pageState.value === "submitting") {
      return { label: "アップロード中…", disabled: true, spinner: true };
    }
    if (upload.selectedDocumentType.value === null) {
      return { label: "送信する", disabled: true, spinner: false };
    }
    if (upload.frontSlot.value.state !== "ready") {
      return { label: "送信する", disabled: true, spinner: false };
    }
    if (
      isMyNumber.value &&
      !upload.consented.value
    ) {
      return { label: "送信する", disabled: true, spinner: false };
    }
    if (upload.error.value !== null) {
      return { label: "もう一度試す", disabled: false, spinner: false };
    }
    return { label: "送信する", disabled: false, spinner: false };
  },
);

const backHelpText = computed(() =>
  isMyNumber.value
    ? "裏面を提出する場合は個人番号 12 桁を完全にマスクしてください"
    : "本籍欄・在留情報・見開き 2 ページ目などを撮影してください",
);

const frontLabel = computed(() => (isMyNumber.value ? "表面 (顔写真側)" : "表面"));
const backLabel = computed(() =>
  isMyNumber.value ? "裏面 (個人番号マスク済み)" : "裏面",
);

function onSelectDoc(type: DocumentType) {
  upload.selectDocumentType(type);
}

function onSelectFile(side: Side, file: File) {
  void upload.selectFile(side, file);
}

function onRemoveFile(side: Side) {
  upload.removeFile(side);
}

function onConsent(value: boolean) {
  upload.toggleConsent(value);
}

async function onCtaClick() {
  if (upload.pageState.value === "success") {
    await session.refresh();
    void router.push({ name: "home" });
    return;
  }
  await upload.submit();
}

watch(
  () => upload.pageState.value,
  (state) => {
    if (state === "success") {
      // 自動遷移はせず、CTA「完了する」押下でホームへ移動 (ユーザー確認の余白)
    }
  },
);

onUnmounted(() => {
  upload.reset();
});
</script>

<template>
  <main class="flex min-h-screen flex-col bg-paper text-ink font-jp">
    <div
      class="mx-auto flex w-full max-w-md flex-1 flex-col gap-hq-4 px-hq-6 pb-hq-8 pt-hq-6"
    >
      <header class="flex flex-col gap-hq-3">
        <StepDots :active="3" :total="3" />
        <Kicker>— Almost there</Kicker>
        <h1
          class="font-jp-display text-[24px] font-medium leading-[1.45] text-ink"
        >
          本人確認書類を<br />アップロード
        </h1>
        <p
          class="font-jp text-[12px] leading-[1.7] text-muted"
        >
          下記いずれか 1 点。氏名・住所・生年月日が確認できる鮮明な画像。
        </p>
      </header>

      <ErrorBanner
        v-if="errorBanner"
        :title="errorBanner.title"
        :description="errorBanner.description"
      />

      <SuccessBanner v-if="upload.pageState.value === 'success'" />

      <!-- 書類種別チップグリッド -->
      <section class="mt-hq-3">
        <div class="flex items-baseline gap-hq-2">
          <span
            id="doc-type-label"
            class="font-jp text-[12.5px] font-medium text-ink/80"
          >
            書類種別
          </span>
          <span class="text-[11px] text-accent">*</span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="doc-type-label"
          class="mt-hq-2 grid grid-cols-2 gap-hq-2"
        >
          <DocumentChip
            v-for="d in DOCS"
            :key="d.type"
            :type="d.type"
            :label="d.label"
            :selected="upload.selectedDocumentType.value === d.type"
            @select="onSelectDoc"
          />
        </div>
      </section>

      <!-- 通常書類: 受付条件カード -->
      <ConditionCard
        v-if="upload.selectedDocumentType.value && !isMyNumber"
        :type="upload.selectedDocumentType.value"
      />

      <!-- マイナンバー: 三重防壁 -->
      <MynumberDefense
        v-if="isMyNumber"
        :consented="upload.consented.value"
        @update:consented="onConsent"
      />

      <!-- 表裏 2 スロット -->
      <section
        v-if="upload.selectedDocumentType.value !== null"
        class="mt-hq-4 flex flex-col gap-hq-4"
      >
        <UploadSlot
          side="front"
          :data="upload.frontSlot.value"
          :required="true"
          :label="frontLabel"
          @select="onSelectFile"
          @remove="onRemoveFile"
        />
        <UploadSlot
          side="back"
          :data="upload.backSlot.value"
          :required="false"
          :label="backLabel"
          :help-text="backHelpText"
          @select="onSelectFile"
          @remove="onRemoveFile"
        />
      </section>

      <!-- footer 注記 -->
      <PolicyFooter />
    </div>

    <StickyCta
      :label="cta.label"
      :disabled="cta.disabled"
      :spinner="cta.spinner"
      @click="onCtaClick"
    />
  </main>
</template>
