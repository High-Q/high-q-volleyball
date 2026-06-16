import type { Venue, VenueInsert } from "@high-q/shared";
import type { VenueUpdate } from "@/entities/venue";

/**
 * 会場マスタ マスター・ディテール画面の編集ドラフト VM と DB 写像・バリデーション。
 *
 * プロトタイプ（docs/10-デザインサンプル/admin/会場マスタ B案.html / venue-app.jsx）を
 * 正とし、UI 上の VM を実 DB スキーマ（venues）へ次の通り写像する:
 *   feeType + fee ↔ default_fee（固定=値 / 都度=NULL）
 *   geo           ↔ map_url
 *   access        ↔ access_note
 *   main          ↔ is_primary
 *   郵便番号(zip)  → 列なし。住所(address)に統合（#151 は migration なし）
 *   meeting_point  → 本画面に編集欄なし。update では送らず既存値を保持する
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 *   openspec/changes/admin-venues-crud-screen/design.md (D1, D2, §3)
 */

export type FeeType = "fixed" | "variable";

export interface VenueDraft {
  /** 永続化済みは UUID、未保存の新規は null。 */
  id: string | null;
  name: string;
  address: string;
  feeType: FeeType;
  /** 円。feeType=fixed のとき有効。null は未入力。 */
  fee: number | null;
  access: string;
  /** 地図 URL / 埋め込み URL（map_url）。 */
  geo: string;
  main: boolean;
  /** updated_at の表示用（読み取り専用、YYYY-MM-DD）。 */
  updated: string;
}

export type VenueDraftErrorKey = "name" | "fee";
export type ValidationErrors = Partial<Record<VenueDraftErrorKey, string>>;
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

/** 新規作成時のデフォルト（B案 addVenue: feeType=fixed / fee=1000）。 */
export function emptyDraft(): VenueDraft {
  return {
    id: null,
    name: "",
    address: "",
    feeType: "fixed",
    fee: 1000,
    access: "",
    geo: "",
    main: false,
    updated: "",
  };
}

/** ISO8601 (timestamptz) を JST の YYYY-MM-DD に整形。空入力は "" を返す。 */
export function formatYmdJst(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const TZ_OFFSET_MIN = 9 * 60;
  const jst = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function venueToDraft(v: Venue): VenueDraft {
  return {
    id: v.id as unknown as string,
    name: v.name,
    address: v.address ?? "",
    feeType: v.default_fee == null ? "variable" : "fixed",
    fee: v.default_fee,
    access: v.access_note ?? "",
    geo: v.map_url ?? "",
    main: v.is_primary,
    updated: formatYmdJst(v.updated_at),
  };
}

function emptyToNull(value: string): string | null {
  const t = value.trim();
  return t.length === 0 ? null : t;
}

/** feeType に応じた default_fee 値（固定=数値 / 都度=NULL）。 */
function resolveDefaultFee(draft: VenueDraft): number | null {
  return draft.feeType === "variable" ? null : draft.fee;
}

export function draftToInsert(draft: VenueDraft): VenueInsert {
  return {
    name: draft.name.trim(),
    address: emptyToNull(draft.address),
    default_fee: resolveDefaultFee(draft),
    access_note: emptyToNull(draft.access),
    map_url: emptyToNull(draft.geo),
    is_primary: draft.main,
    // meeting_point は本画面に編集欄が無いため送らない（DB default '現地集合' に委ねる）
  };
}

export function draftToUpdate(draft: VenueDraft): VenueUpdate {
  return {
    name: draft.name.trim(),
    address: emptyToNull(draft.address),
    default_fee: resolveDefaultFee(draft),
    access_note: emptyToNull(draft.access),
    map_url: emptyToNull(draft.geo),
    is_primary: draft.main,
    // meeting_point は送らない（allowlist で除外され既存値が保持される）
  };
}

export function validateDraft(draft: VenueDraft): ValidationResult {
  const errors: ValidationErrors = {};

  if (draft.name.trim().length === 0) {
    errors.name = "会場名を入力してください";
  }

  // 固定額のときのみ金額必須・0 以上の整数
  if (draft.feeType === "fixed") {
    if (draft.fee == null || Number.isNaN(draft.fee)) {
      errors.fee = "標準参加費を入力してください";
    } else if (!Number.isInteger(draft.fee) || draft.fee < 0) {
      errors.fee = "標準参加費は 0 以上の整数で入力してください";
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
