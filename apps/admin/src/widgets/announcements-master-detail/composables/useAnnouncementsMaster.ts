import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
  deriveAnnouncementStatus,
  type Announcement,
  type AnnouncementFetchError,
  type AnnouncementFetchErrorCode,
  type AnnouncementStatus,
} from "@/entities/announcement";
import {
  announcementToDraft,
  draftToWrite,
  emptyDraft,
  validateDraft,
  type AnnouncementDraft,
  type ValidationErrors,
} from "../model/announcementDraft";

/**
 * お知らせ マスター・ディテール画面のオーケストレーション composable。
 *
 * widgets/venues-master-detail/composables/useVenuesMaster.ts を手本に、
 * ローカルドラフト編集 + dirty ガード + 保存/削除/新規追加を entities/announcement
 * に接続する。削除は誤操作防止のため AlertDialog（deleteOpen）で確認する。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 *   openspec/changes/general-announcements/design.md D5
 */

/** 未保存の新規お知らせを表すセンチネル id。 */
export const NEW_ID = "__new__";

const AUDIENCE_LABEL: Record<string, string> = {
  public: "公開（LP）",
  members: "会員（予約）",
  all: "両方",
};

const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  scheduled: "掲載予定",
  active: "掲載中",
  ended: "掲載終了",
};

export interface AnnouncementListItem {
  id: string;
  title: string;
  audienceLabel: string;
  status: AnnouncementStatus;
  statusLabel: string;
  selected: boolean;
}

export interface UseAnnouncementsMaster {
  isLoading: Ref<boolean>;
  loadErrorCode: Ref<AnnouncementFetchErrorCode | null>;
  isSaving: Ref<boolean>;
  isDeleting: Ref<boolean>;
  deleteOpen: Ref<boolean>;
  toast: Ref<string>;
  selId: Ref<string | null>;
  draft: Ref<AnnouncementDraft | null>;
  dirty: ComputedRef<boolean>;
  displayErrors: ComputedRef<ValidationErrors>;
  items: ComputedRef<ReadonlyArray<AnnouncementListItem>>;
  totalCount: ComputedRef<number>;
  reload: () => Promise<void>;
  select: (id: string) => void;
  setField: <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) => void;
  addAnnouncement: () => void;
  save: () => Promise<void>;
  cancel: () => void;
  requestDelete: () => void;
  confirmDelete: () => Promise<void>;
  cancelDelete: () => void;
  statusLabelOf: (status: AnnouncementStatus) => string;
}

const ERROR_MESSAGES: Record<AnnouncementFetchErrorCode, string> = {
  VALIDATION: "入力内容を確認してください（掲載期間・文字数など）",
  PERMISSION_DENIED: "この操作を行う権限がありません",
  NETWORK_ERROR: "通信に失敗しました。再試行してください",
  SERVER_ERROR: "保存に失敗しました。しばらくして再試行してください",
};

function confirmDiscard(): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm("編集中の変更があります。破棄して移動しますか？");
}

export function useAnnouncementsMaster(
  adminMemberId: Ref<MemberId | null>,
): UseAnnouncementsMaster {
  const announcements = ref<Announcement[]>([]);
  const selId = ref<string | null>(null);
  const draft = ref<AnnouncementDraft | null>(null);
  const baseline = ref<string>("");
  const pendingNew = ref<boolean>(false);

  const isLoading = ref<boolean>(false);
  const loadErrorCode = ref<AnnouncementFetchErrorCode | null>(null);
  const isSaving = ref<boolean>(false);
  const isDeleting = ref<boolean>(false);
  const deleteOpen = ref<boolean>(false);
  const showErrors = ref<boolean>(false);
  const toast = ref<string>("");
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function flash(msg: string): void {
    toast.value = msg;
    if (toastTimer) clearTimeout(toastTimer);
    if (typeof setTimeout !== "undefined") {
      toastTimer = setTimeout(() => {
        toast.value = "";
      }, 2200);
    }
  }

  function setDraftFromAnnouncement(a: Announcement | null): void {
    const d = a ? announcementToDraft(a) : null;
    draft.value = d;
    baseline.value = d ? JSON.stringify(d) : "";
    showErrors.value = false;
  }

  const dirty = computed<boolean>(
    () => draft.value !== null && JSON.stringify(draft.value) !== baseline.value,
  );

  const validation = computed(() =>
    draft.value ? validateDraft(draft.value) : { isValid: true, errors: {} },
  );
  const displayErrors = computed<ValidationErrors>(() =>
    showErrors.value ? validation.value.errors : {},
  );

  const totalCount = computed<number>(
    () => announcements.value.length + (pendingNew.value ? 1 : 0),
  );

  const items = computed<ReadonlyArray<AnnouncementListItem>>(() => {
    const now = new Date();
    const base: AnnouncementListItem[] = announcements.value.map((a) => {
      const status = deriveAnnouncementStatus(a, now);
      return {
        id: a.id as unknown as string,
        title: a.title,
        audienceLabel: AUDIENCE_LABEL[a.audience] ?? a.audience,
        status,
        statusLabel: STATUS_LABEL[status],
        selected: (a.id as unknown as string) === selId.value,
      };
    });
    if (pendingNew.value && draft.value) {
      base.unshift({
        id: NEW_ID,
        title: draft.value.title,
        audienceLabel:
          draft.value.audience === ""
            ? "（未選択）"
            : (AUDIENCE_LABEL[draft.value.audience] ?? draft.value.audience),
        status: "scheduled",
        statusLabel: "新規（未保存）",
        selected: selId.value === NEW_ID,
      });
    }
    return base;
  });

  async function reload(preferId?: string | null): Promise<void> {
    isLoading.value = true;
    loadErrorCode.value = null;
    const result = await fetchAnnouncements();
    isLoading.value = false;
    if (!result.ok) {
      loadErrorCode.value = result.error.code;
      return;
    }
    announcements.value = result.value;
    pendingNew.value = false;
    const list = result.value;
    const target =
      (preferId != null && list.find((a) => (a.id as unknown as string) === preferId)) ||
      list[0] ||
      null;
    selId.value = target ? (target.id as unknown as string) : null;
    setDraftFromAnnouncement(target);
  }

  function select(id: string): void {
    if (id === selId.value) return;
    if (dirty.value && !confirmDiscard()) return;
    pendingNew.value = false;
    const a = announcements.value.find((x) => (x.id as unknown as string) === id) ?? null;
    selId.value = a ? id : null;
    setDraftFromAnnouncement(a);
  }

  function setField<K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]): void {
    if (!draft.value) return;
    draft.value = { ...draft.value, [key]: value };
  }

  function addAnnouncement(): void {
    if (dirty.value && !confirmDiscard()) return;
    pendingNew.value = true;
    selId.value = NEW_ID;
    const d = emptyDraft();
    draft.value = d;
    baseline.value = JSON.stringify(d);
    showErrors.value = false;
    flash("新しいお知らせを追加しました。内容を入力してください");
  }

  function errorMessage(error: AnnouncementFetchError): string {
    return ERROR_MESSAGES[error.code] ?? error.message;
  }

  async function save(): Promise<void> {
    if (!draft.value) return;
    showErrors.value = true;
    if (!validation.value.isValid) return;
    const createdBy = adminMemberId.value;
    if (createdBy === null) {
      flash("ログイン情報を確認できませんでした。再読み込みしてください");
      return;
    }
    isSaving.value = true;
    try {
      const isNew = draft.value.id == null;
      const write = draftToWrite(draft.value);
      const result = isNew
        ? await createAnnouncement(write, createdBy)
        : await updateAnnouncement(
            draft.value.id as unknown as Parameters<typeof updateAnnouncement>[0],
            write,
          );
      if (!result.ok) {
        flash(errorMessage(result.error));
        return;
      }
      const savedTitle = draft.value.title.trim() || "無題のお知らせ";
      const savedId = result.value.id as unknown as string;
      await reload(savedId);
      flash(`「${savedTitle}」を保存しました`);
    } finally {
      isSaving.value = false;
    }
  }

  function cancel(): void {
    if (pendingNew.value) {
      const d = emptyDraft();
      draft.value = d;
      baseline.value = JSON.stringify(d);
      showErrors.value = false;
      return;
    }
    const a =
      announcements.value.find((x) => (x.id as unknown as string) === selId.value) ?? null;
    setDraftFromAnnouncement(a);
  }

  function requestDelete(): void {
    if (!draft.value) return;
    // 未保存の新規は DB を触らず破棄（確認ダイアログ不要）
    if (draft.value.id == null) {
      pendingNew.value = false;
      const first = announcements.value[0] ?? null;
      selId.value = first ? (first.id as unknown as string) : null;
      setDraftFromAnnouncement(first);
      flash("入力中の新規お知らせを破棄しました");
      return;
    }
    deleteOpen.value = true;
  }

  function cancelDelete(): void {
    deleteOpen.value = false;
  }

  async function confirmDelete(): Promise<void> {
    if (!draft.value || draft.value.id == null) {
      deleteOpen.value = false;
      return;
    }
    isDeleting.value = true;
    try {
      const result = await deleteAnnouncement(
        draft.value.id as unknown as Parameters<typeof deleteAnnouncement>[0],
      );
      if (!result.ok) {
        flash(errorMessage(result.error));
        return;
      }
      deleteOpen.value = false;
      await reload();
      flash("お知らせを削除しました");
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    isLoading,
    loadErrorCode,
    isSaving,
    isDeleting,
    deleteOpen,
    toast,
    selId,
    draft,
    dirty,
    displayErrors,
    items,
    totalCount,
    reload: () => reload(),
    select,
    setField,
    addAnnouncement,
    save,
    cancel,
    requestDelete,
    confirmDelete,
    cancelDelete,
    statusLabelOf: (status: AnnouncementStatus) => STATUS_LABEL[status],
  };
}
