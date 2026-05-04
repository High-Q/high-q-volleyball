/**
 * 本人確認書類アップロードの中核 composable。
 *
 * 役割:
 *   - スロット (front 必須 / back 任意) の入力ファイル管理
 *   - クライアント側のファイル検証 (MIME / 拡張子 / サイズ / heic 自動変換)
 *   - 表裏並列 Storage upload + DB INSERT/UPDATE/ロールバック
 *   - PageState / SlotState の reactive 管理
 *
 * 設計:
 *   openspec/changes/reservation-identity-document-upload/design.md (D7 / D8 / D11 / D12 / D17)
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 */

import { computed, reactive, ref } from "vue";
import type { ComputedRef, Ref } from "vue";
import type { Result } from "@high-q/shared";
import { useAuthSession } from "@/features/auth";
import type {
  DocumentType,
  IdentityDocumentId,
  PageState,
  SlotData,
  UploadError,
} from "@/entities/identity-document";
import {
  buildStoragePath,
  confirmStoragePaths,
  insertPendingRecord,
  removeStorageObjects,
  rollbackRecord,
  uploadFileToStorage,
} from "../api/identity-document-client";
import { convertHeicToJpeg, isHeicFile } from "../lib/convertHeicToJpeg";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXT_RE = /\.(jpe?g|png|heic|heif)$/i;
const MAX_BYTES = 10 * 1024 * 1024;

export type Side = "front" | "back";

function emptySlot(): SlotData {
  return { state: "empty", file: null, progress: 0 };
}

function isAllowedFormat(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  return ALLOWED_EXT_RE.test(file.name);
}

export interface UseUploadIdentityDocument {
  pageState: ComputedRef<PageState>;
  selectedDocumentType: Ref<DocumentType | null>;
  frontSlot: { value: SlotData };
  backSlot: { value: SlotData };
  consented: Ref<boolean>;
  error: Ref<UploadError | null>;
  selectDocumentType: (type: DocumentType) => void;
  selectFile: (side: Side, file: File) => Promise<void>;
  removeFile: (side: Side) => void;
  toggleConsent: (next: boolean) => void;
  submit: () => Promise<Result<IdentityDocumentId, UploadError>>;
  reset: () => void;
}

export function useUploadIdentityDocument(): UseUploadIdentityDocument {
  const selectedDocumentType = ref<DocumentType | null>(null);
  const consented = ref(false);
  const error = ref<UploadError | null>(null);
  const submitting = ref(false);
  const succeeded = ref(false);

  const frontSlot = reactive<SlotData>(emptySlot()) as unknown as {
    value: SlotData;
  };
  const backSlot = reactive<SlotData>(emptySlot()) as unknown as {
    value: SlotData;
  };
  // reactive(...) のオブジェクトに対して `.value` でアクセスする呼び出し側 API を
  // 保つため、ref-like wrapper に被せ直す
  const frontRef = ref<SlotData>(emptySlot());
  const backRef = ref<SlotData>(emptySlot());

  const session = useAuthSession();

  const pageState = computed<PageState>(() => {
    if (succeeded.value) return "success";
    if (submitting.value) return "submitting";
    if (selectedDocumentType.value === null) return "empty";
    return "selecting";
  });

  function setSlot(side: Side, next: SlotData): void {
    if (side === "front") frontRef.value = next;
    else backRef.value = next;
  }

  function selectDocumentType(type: DocumentType): void {
    selectedDocumentType.value = type;
    consented.value = false;
    setSlot("front", emptySlot());
    setSlot("back", emptySlot());
    error.value = null;
    succeeded.value = false;
  }

  async function selectFile(side: Side, raw: File): Promise<void> {
    error.value = null;

    if (!isAllowedFormat(raw)) {
      setSlot(side, {
        state: "error",
        file: null,
        progress: 0,
        errorMessage: "ファイル形式が不正です (jpg / png / heic のみ)",
      });
      error.value = "unsupported_format";
      return;
    }

    let file: File = raw;
    if (isHeicFile(raw)) {
      setSlot(side, { state: "validating", file: null, progress: 0 });
      try {
        file = await convertHeicToJpeg(raw);
      } catch {
        setSlot(side, {
          state: "error",
          file: null,
          progress: 0,
          errorMessage: "画像の変換に失敗しました",
        });
        error.value = "unsupported_format";
        return;
      }
    }

    if (file.size > MAX_BYTES) {
      setSlot(side, {
        state: "error",
        file: null,
        progress: 0,
        errorMessage: "ファイルサイズが大きすぎます (10MB まで)",
      });
      error.value = "file_too_large";
      return;
    }

    setSlot(side, { state: "ready", file, progress: 0 });
  }

  function removeFile(side: Side): void {
    setSlot(side, emptySlot());
    error.value = null;
  }

  function toggleConsent(next: boolean): void {
    consented.value = next;
  }

  async function submit(): Promise<Result<IdentityDocumentId, UploadError>> {
    error.value = null;

    const docType = selectedDocumentType.value;
    if (docType === null) {
      error.value = "front_required";
      return { ok: false, error: "front_required" };
    }

    const front = frontRef.value.file;
    if (front === null) {
      error.value = "front_required";
      return { ok: false, error: "front_required" };
    }

    if (docType === "my_number_card_masked" && !consented.value) {
      error.value = "consent_required";
      return { ok: false, error: "consent_required" };
    }

    const memberId = session.session.value?.user.id;
    if (!memberId) {
      error.value = "db_failed";
      return { ok: false, error: "db_failed" };
    }

    submitting.value = true;

    let docId: string;
    try {
      docId = await insertPendingRecord(memberId, docType);
    } catch {
      submitting.value = false;
      error.value = "db_failed";
      return { ok: false, error: "db_failed" };
    }

    const back = backRef.value.file;
    const frontPath = buildStoragePath(memberId, docId, "front", front.type);
    const backPath = back
      ? buildStoragePath(memberId, docId, "back", back.type)
      : null;

    setSlot("front", { state: "uploading", file: front, progress: 0 });
    if (back) setSlot("back", { state: "uploading", file: back, progress: 0 });

    const tasks: Array<Promise<{ side: Side; ok: boolean }>> = [
      uploadFileToStorage(frontPath, front)
        .then(() => ({ side: "front" as Side, ok: true }))
        .catch(() => ({ side: "front" as Side, ok: false })),
    ];
    if (back && backPath) {
      tasks.push(
        uploadFileToStorage(backPath, back)
          .then(() => ({ side: "back" as Side, ok: true }))
          .catch(() => ({ side: "back" as Side, ok: false })),
      );
    }
    const results = await Promise.all(tasks);

    const frontResult = results.find((r) => r.side === "front");
    const backResult = results.find((r) => r.side === "back");

    if (frontResult && !frontResult.ok) {
      // 表面失敗 — 裏面が成功していれば消し、行も DELETE
      if (backResult?.ok && backPath) {
        await removeStorageObjects([backPath]);
      }
      await rollbackRecord(docId);
      submitting.value = false;
      setSlot("front", {
        state: "error",
        file: front,
        progress: 0,
        errorMessage: "アップロードに失敗しました",
      });
      error.value = "storage_failed_front";
      return { ok: false, error: "storage_failed_front" };
    }

    if (backResult && !backResult.ok) {
      // 裏面失敗 — 表面 Storage 削除 + 行 DELETE
      await removeStorageObjects([frontPath]);
      await rollbackRecord(docId);
      submitting.value = false;
      setSlot("back", {
        state: "error",
        file: back,
        progress: 0,
        errorMessage: "アップロードに失敗しました",
      });
      error.value = "storage_failed_back";
      return { ok: false, error: "storage_failed_back" };
    }

    setSlot("front", { state: "uploaded", file: front, progress: 100 });
    if (back) setSlot("back", { state: "uploaded", file: back, progress: 100 });

    try {
      await confirmStoragePaths(docId, { front: frontPath, back: backPath });
    } catch {
      submitting.value = false;
      error.value = "db_failed";
      return { ok: false, error: "db_failed" };
    }

    submitting.value = false;
    succeeded.value = true;
    return { ok: true, value: docId as IdentityDocumentId };
  }

  function reset(): void {
    selectedDocumentType.value = null;
    consented.value = false;
    error.value = null;
    submitting.value = false;
    succeeded.value = false;
    setSlot("front", emptySlot());
    setSlot("back", emptySlot());
  }

  // 不要だった (使わない)
  void frontSlot;
  void backSlot;

  return {
    pageState,
    selectedDocumentType,
    frontSlot: frontRef,
    backSlot: backRef,
    consented,
    error,
    selectDocumentType,
    selectFile,
    removeFile,
    toggleConsent,
    submit,
    reset,
  };
}
