<script setup lang="ts">
import { ref, computed } from "vue";
import { Kicker } from "@high-q/ui";
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@high-q/shared";
import IdentityDocumentImageDialog from "./IdentityDocumentImageDialog.vue";

/**
 * 詳細画面の画像プレビュー (表面 + 裏面任意 + 削除済み表示 + 拡大 Dialog 起動)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 画像プレビュー / Dialog 拡大モーダル)
 */

const props = defineProps<{
  documentType: DocumentType;
  storagePathFront: string | null;
  storagePathBack: string | null;
  frontSignedUrl: string | null;
  backSignedUrl: string | null;
  frontUrlError: boolean;
  backUrlError: boolean;
}>();

const emit = defineEmits<{
  retryFront: [];
  retryBack: [];
}>();

const frontDialogOpen = ref(false);
const backDialogOpen = ref(false);

const documentTypeLabel = computed(
  () => DOCUMENT_TYPE_LABELS[props.documentType],
);

const frontDeleted = computed(() => props.storagePathFront === null);
const hasBack = computed(() => props.storagePathBack !== null);
const backDeleted = computed(
  () => props.storagePathBack === null && props.storagePathFront === null,
  // mask-delete 時は両方 NULL になるため、表面が NULL のとき裏面も削除済とみなす
);

function openFront(): void {
  if (props.frontSignedUrl) frontDialogOpen.value = true;
}
function openBack(): void {
  if (props.backSignedUrl) backDialogOpen.value = true;
}
</script>

<template>
  <section class="flex flex-col gap-hq-2" aria-labelledby="image-preview-kicker">
    <div class="flex items-center justify-between">
      <Kicker id="image-preview-kicker">— 画像プレビュー</Kicker>
      <p class="font-mono text-xs text-muted">
        クリックで拡大 (1x / 2x / 4x ズーム可)
      </p>
    </div>

    <div class="flex flex-col gap-hq-3 sm:flex-row sm:gap-hq-4">
      <!-- 表面 -->
      <div class="flex w-full max-w-xs flex-col gap-hq-1">
        <p class="font-mono text-xs uppercase tracking-widest text-muted">
          表面
        </p>
        <div
          class="overflow-hidden rounded-hq-sm border border-hairline bg-paper-warm"
          style="aspect-ratio: 85 / 54"
        >
          <p
            v-if="frontDeleted"
            class="flex h-full items-center justify-center font-jp text-sm text-muted"
          >
            画像は削除済みです
          </p>
          <div
            v-else-if="frontUrlError"
            role="alert"
            class="flex h-full flex-col items-center justify-center gap-hq-2"
          >
            <p class="font-jp text-sm text-danger">画像を取得できませんでした</p>
            <button
              type="button"
              class="inline-flex h-7 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-3 text-xs font-jp text-ink hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              @click="emit('retryFront')"
            >
              再試行
            </button>
          </div>
          <button
            v-else-if="frontSignedUrl"
            type="button"
            class="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            :aria-label="`${documentTypeLabel} の表面 を拡大表示`"
            @click="openFront"
          >
            <img
              :src="frontSignedUrl"
              :alt="`${documentTypeLabel} の表面`"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-contain"
            />
          </button>
          <div v-else class="flex h-full items-center justify-center">
            <span class="font-mono text-xs text-muted">読み込み中…</span>
          </div>
        </div>
      </div>

      <!-- 裏面 (storage_path_back IS NOT NULL のとき表示) -->
      <div v-if="hasBack" class="flex w-full max-w-xs flex-col gap-hq-1">
        <p class="font-mono text-xs uppercase tracking-widest text-muted">
          裏面
        </p>
        <div
          class="overflow-hidden rounded-hq-sm border border-hairline bg-paper-warm"
          style="aspect-ratio: 85 / 54"
        >
          <p
            v-if="backDeleted"
            class="flex h-full items-center justify-center font-jp text-sm text-muted"
          >
            画像は削除済みです
          </p>
          <div
            v-else-if="backUrlError"
            role="alert"
            class="flex h-full flex-col items-center justify-center gap-hq-2"
          >
            <p class="font-jp text-sm text-danger">画像を取得できませんでした</p>
            <button
              type="button"
              class="inline-flex h-7 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-3 text-xs font-jp text-ink hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              @click="emit('retryBack')"
            >
              再試行
            </button>
          </div>
          <button
            v-else-if="backSignedUrl"
            type="button"
            class="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            :aria-label="`${documentTypeLabel} の裏面 を拡大表示`"
            @click="openBack"
          >
            <img
              :src="backSignedUrl"
              :alt="`${documentTypeLabel} の裏面`"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-contain"
            />
          </button>
          <div v-else class="flex h-full items-center justify-center">
            <span class="font-mono text-xs text-muted">読み込み中…</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 拡大 Dialog -->
    <IdentityDocumentImageDialog
      v-if="frontSignedUrl"
      v-model:open="frontDialogOpen"
      :signed-url="frontSignedUrl"
      :alt="`${documentTypeLabel} の表面`"
    />
    <IdentityDocumentImageDialog
      v-if="backSignedUrl"
      v-model:open="backDialogOpen"
      :signed-url="backSignedUrl"
      :alt="`${documentTypeLabel} の裏面`"
    />
  </section>
</template>
