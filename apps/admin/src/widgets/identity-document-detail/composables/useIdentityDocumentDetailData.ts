import { ref, watch, type Ref } from "vue";
import { useRoute } from "vue-router";
import {
  getIdentityDocumentById,
  getSignedUrl,
  type IdentityDocumentDetail,
  type FetchErrorCode,
} from "@/entities/identity-document";
import type { IdentityDocumentId } from "@high-q/shared";

/**
 * /identity-documents/:id 画面のデータ取得 composable。
 *
 * 取得手順:
 *   1. route.params.id から identity_documents を members 詳細 join で fetch
 *   2. storage_path_front / storage_path_back を 1 時間 signed URL に解決
 *   3. signed URL 単独失敗は detail 全体を error にせず、画像エリアの inline error として扱う
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 詳細画面の 4 状態 / 画像プレビュー / signed URL)
 *   openspec/changes/admin-identity-document-review/design.md (D5, D6)
 */

export interface UseIdentityDocumentDetailData {
  detail: Ref<IdentityDocumentDetail | null>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  errorCode: Ref<FetchErrorCode | null>;
  frontSignedUrl: Ref<string | null>;
  backSignedUrl: Ref<string | null>;
  frontUrlError: Ref<boolean>;
  backUrlError: Ref<boolean>;
  refetch: () => Promise<void>;
  refetchFrontUrl: () => Promise<void>;
  refetchBackUrl: () => Promise<void>;
}

export function useIdentityDocumentDetailData(): UseIdentityDocumentDetailData {
  const route = useRoute();

  const detail = ref<IdentityDocumentDetail | null>(null);
  const isPending = ref(false);
  const isError = ref(false);
  const errorCode = ref<FetchErrorCode | null>(null);

  const frontSignedUrl = ref<string | null>(null);
  const backSignedUrl = ref<string | null>(null);
  const frontUrlError = ref(false);
  const backUrlError = ref(false);

  let detailRequestSeq = 0;

  function getDocId(): IdentityDocumentId | null {
    const raw = route.params.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (!id || typeof id !== "string") return null;
    return id as IdentityDocumentId;
  }

  async function load(): Promise<void> {
    const id = getDocId();
    if (!id) {
      isError.value = true;
      errorCode.value = "NOT_FOUND";
      return;
    }

    const seq = ++detailRequestSeq;
    isPending.value = true;
    isError.value = false;
    errorCode.value = null;
    detail.value = null;
    frontSignedUrl.value = null;
    backSignedUrl.value = null;
    frontUrlError.value = false;
    backUrlError.value = false;

    const result = await getIdentityDocumentById(id);

    if (seq !== detailRequestSeq) return;

    if (!result.ok) {
      isError.value = true;
      errorCode.value = result.error.code;
      isPending.value = false;
      return;
    }

    detail.value = result.value;
    isPending.value = false;

    // signed URL を並列発行 (失敗は inline error 扱い、detail 自体は成功)
    await Promise.all([loadFrontUrl(), loadBackUrl()]);
  }

  async function loadFrontUrl(): Promise<void> {
    const path = detail.value?.storage_path_front;
    if (!path) {
      frontSignedUrl.value = null;
      frontUrlError.value = false;
      return;
    }
    frontUrlError.value = false;
    const result = await getSignedUrl(path);
    if (result.ok) {
      frontSignedUrl.value = result.value;
    } else {
      frontSignedUrl.value = null;
      frontUrlError.value = true;
    }
  }

  async function loadBackUrl(): Promise<void> {
    const path = detail.value?.storage_path_back;
    if (!path) {
      backSignedUrl.value = null;
      backUrlError.value = false;
      return;
    }
    backUrlError.value = false;
    const result = await getSignedUrl(path);
    if (result.ok) {
      backSignedUrl.value = result.value;
    } else {
      backSignedUrl.value = null;
      backUrlError.value = true;
    }
  }

  watch(
    () => route.params.id,
    () => {
      void load();
    },
    { immediate: true },
  );

  return {
    detail,
    isPending,
    isError,
    errorCode,
    frontSignedUrl,
    backSignedUrl,
    frontUrlError,
    backUrlError,
    refetch: load,
    refetchFrontUrl: loadFrontUrl,
    refetchBackUrl: loadBackUrl,
  };
}
