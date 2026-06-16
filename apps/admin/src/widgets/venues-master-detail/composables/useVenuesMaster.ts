import {
  computed,
  ref,
  type ComputedRef,
  type Ref,
} from "vue";
import type { Venue } from "@high-q/shared";
import {
  createVenue,
  deleteVenue,
  fetchVenues,
  updateVenue,
  type FetchError,
  type FetchErrorCode,
} from "@/entities/venue";
import {
  draftToInsert,
  draftToUpdate,
  emptyDraft,
  validateDraft,
  venueToDraft,
  type ValidationErrors,
  type VenueDraft,
} from "../model/venueDraft";

/**
 * 会場マスタ マスター・ディテール画面のオーケストレーション composable。
 *
 * プロトタイプ（会場マスタ B案.html / venue-app.jsx）の VenueApp ロジックを正とし、
 * ローカルドラフト編集 + dirty ガード + 保存/削除/新規追加を実 DB（entities/venue）
 * に接続する。メイン会場の自動切替（D1）と参照中削除ガード（D2 / VENUE_IN_USE）は
 * entity API 側で処理され、保存/削除後の refetch で一覧に反映される。
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 *   openspec/changes/admin-venues-crud-screen/design.md (D1, D2, §3)
 */

/** 未保存の新規会場を表すセンチネル id。 */
export const NEW_ID = "__new__";

export interface VenueListItem {
  id: string;
  name: string;
  isMain: boolean;
  isVariable: boolean;
  feeLabel: string;
  selected: boolean;
}

export interface UseVenuesMaster {
  query: Ref<string>;
  isLoading: Ref<boolean>;
  loadErrorCode: Ref<FetchErrorCode | null>;
  isSaving: Ref<boolean>;
  isDeleting: Ref<boolean>;
  toast: Ref<string>;
  selId: Ref<string | null>;
  draft: Ref<VenueDraft | null>;
  dirty: ComputedRef<boolean>;
  displayErrors: ComputedRef<ValidationErrors>;
  items: ComputedRef<ReadonlyArray<VenueListItem>>;
  totalCount: ComputedRef<number>;
  filteredCount: ComputedRef<number>;
  reload: () => Promise<void>;
  select: (id: string) => void;
  setField: <K extends keyof VenueDraft>(key: K, value: VenueDraft[K]) => void;
  addVenue: () => void;
  save: () => Promise<void>;
  cancel: () => void;
  remove: () => Promise<void>;
}

function yen(n: number): string {
  return "¥" + n.toLocaleString("ja-JP");
}

const SAVE_ERROR_MESSAGES: Record<FetchErrorCode, string> = {
  DUPLICATE_NAME: "同名の会場が既に存在します",
  VENUE_IN_USE: "このイベントで使用中のため削除できません",
  PERMISSION_DENIED: "この操作を行う権限がありません",
  NETWORK_ERROR: "通信に失敗しました。再試行してください",
  SERVER_ERROR: "保存に失敗しました。しばらくして再試行してください",
};

function confirmDiscard(): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm("編集中の変更があります。破棄して移動しますか？");
}

export function useVenuesMaster(): UseVenuesMaster {
  const venues = ref<Venue[]>([]);
  const query = ref<string>("");
  const selId = ref<string | null>(null);
  const draft = ref<VenueDraft | null>(null);
  const baseline = ref<string>("");
  const pendingNew = ref<boolean>(false);

  const isLoading = ref<boolean>(false);
  const loadErrorCode = ref<FetchErrorCode | null>(null);
  const isSaving = ref<boolean>(false);
  const isDeleting = ref<boolean>(false);
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

  function setDraftFromVenue(v: Venue | null): void {
    const d = v ? venueToDraft(v) : null;
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
    () => venues.value.length + (pendingNew.value ? 1 : 0),
  );

  const items = computed<ReadonlyArray<VenueListItem>>(() => {
    const q = query.value.trim();
    const base: VenueListItem[] = venues.value.map((v) => ({
      id: v.id as unknown as string,
      name: v.name,
      isMain: v.is_primary,
      isVariable: v.default_fee == null,
      feeLabel: v.default_fee == null ? "都度" : yen(v.default_fee),
      selected: (v.id as unknown as string) === selId.value,
    }));
    // 未保存の新規はドラフトから合成行を作り先頭付近に出す
    if (pendingNew.value && draft.value) {
      base.unshift({
        id: NEW_ID,
        name: draft.value.name,
        isMain: draft.value.main,
        isVariable: draft.value.feeType === "variable",
        feeLabel:
          draft.value.feeType === "variable"
            ? "都度"
            : yen(draft.value.fee ?? 0),
        selected: selId.value === NEW_ID,
      });
    }
    if (!q) return base;
    return base.filter(
      (it) =>
        it.id === NEW_ID ||
        it.name.includes(q) ||
        venueAddress(it.id).includes(q),
    );
  });

  const filteredCount = computed<number>(() => items.value.length);

  function venueAddress(id: string): string {
    const v = venues.value.find((x) => (x.id as unknown as string) === id);
    return v?.address ?? "";
  }

  async function reload(preferId?: string | null): Promise<void> {
    isLoading.value = true;
    loadErrorCode.value = null;
    const result = await fetchVenues();
    isLoading.value = false;
    if (!result.ok) {
      loadErrorCode.value = result.error.code;
      return;
    }
    venues.value = result.value;
    pendingNew.value = false;
    const list = result.value;
    const target =
      (preferId != null &&
        list.find((v) => (v.id as unknown as string) === preferId)) ||
      list[0] ||
      null;
    selId.value = target ? (target.id as unknown as string) : null;
    setDraftFromVenue(target);
  }

  function select(id: string): void {
    if (id === selId.value) return;
    if (dirty.value && !confirmDiscard()) return;
    pendingNew.value = false;
    const v =
      venues.value.find((x) => (x.id as unknown as string) === id) ?? null;
    selId.value = v ? id : null;
    setDraftFromVenue(v);
  }

  function setField<K extends keyof VenueDraft>(
    key: K,
    value: VenueDraft[K],
  ): void {
    if (!draft.value) return;
    draft.value = { ...draft.value, [key]: value };
  }

  function addVenue(): void {
    if (dirty.value && !confirmDiscard()) return;
    pendingNew.value = true;
    selId.value = NEW_ID;
    const d = emptyDraft();
    draft.value = d;
    baseline.value = JSON.stringify(d);
    showErrors.value = false;
    flash("新しい会場を追加しました。内容を入力してください");
  }

  async function save(): Promise<void> {
    if (!draft.value) return;
    showErrors.value = true;
    if (!validation.value.isValid) return;
    isSaving.value = true;
    try {
      const isNew = draft.value.id == null;
      const result = isNew
        ? await createVenue(draftToInsert(draft.value))
        : await updateVenue(
            draft.value.id as unknown as Parameters<typeof updateVenue>[0],
            draftToUpdate(draft.value),
          );
      if (!result.ok) {
        flash(saveErrorMessage(result.error));
        return;
      }
      const savedName = draft.value.name.trim() || "無題の会場";
      const savedId = (result.value as Venue).id as unknown as string;
      await reload(savedId);
      flash(`「${savedName}」を保存しました`);
    } finally {
      isSaving.value = false;
    }
  }

  function saveErrorMessage(error: FetchError): string {
    return SAVE_ERROR_MESSAGES[error.code] ?? error.message;
  }

  function cancel(): void {
    if (pendingNew.value) {
      const d = emptyDraft();
      draft.value = d;
      baseline.value = JSON.stringify(d);
      showErrors.value = false;
      return;
    }
    const v =
      venues.value.find((x) => (x.id as unknown as string) === selId.value) ??
      null;
    setDraftFromVenue(v);
  }

  async function remove(): Promise<void> {
    if (!draft.value) return;
    // 未保存の新規は DB を触らず破棄
    if (draft.value.id == null) {
      pendingNew.value = false;
      const first = venues.value[0] ?? null;
      selId.value = first ? (first.id as unknown as string) : null;
      setDraftFromVenue(first);
      flash("入力中の新規会場を破棄しました");
      return;
    }
    const name = draft.value.name || "この会場";
    if (
      typeof window !== "undefined" &&
      !window.confirm(`「${name}」を削除しますか？この操作は取り消せません。`)
    ) {
      return;
    }
    isDeleting.value = true;
    try {
      const result = await deleteVenue(
        draft.value.id as unknown as Parameters<typeof deleteVenue>[0],
      );
      if (!result.ok) {
        flash(saveErrorMessage(result.error));
        return;
      }
      await reload();
      flash("会場を削除しました");
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    query,
    isLoading,
    loadErrorCode,
    isSaving,
    isDeleting,
    toast,
    selId,
    draft,
    dirty,
    displayErrors,
    items,
    totalCount,
    filteredCount,
    reload: () => reload(),
    select,
    setField,
    addVenue,
    save,
    cancel,
    remove,
  };
}
