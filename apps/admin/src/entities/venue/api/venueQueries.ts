import { type Result, ok, err } from "@high-q/shared";
import type { Venue, VenueInsert, VenueId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";

/**
 * venues マスタの CRUD API layer。
 *
 * entities/event/api/eventQueries.ts を手本に `Result<T, FetchError>` で統一する。
 * read 専用の `useVenues`（filter dropdown 用 DTO）とは責務が異なり、こちらは
 * 会場マスタ CRUD 画面（#151）が使う本格的なドメインアクセス層。
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 *   openspec/changes/admin-venues-crud-screen/design.md (D1, D2, D3)
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED"
  // 参照中会場の削除（events.venue_id ON DELETE RESTRICT / FK 違反 23503）
  | "VENUE_IN_USE"
  // 会場名重複（venues_name_key UNIQUE 違反 23505）
  | "DUPLICATE_NAME";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

/**
 * UPDATE で受け付ける許可列。`id` / `created_at` / `updated_at` は更新対象外。
 * 攻撃的呼び出しに備えて updateVenue 内で再フィルタする。
 */
export interface VenueUpdate {
  name?: string;
  address?: string | null;
  default_fee?: number | null;
  access_note?: string | null;
  map_url?: string | null;
  meeting_point?: string;
  is_primary?: boolean;
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (error.code === "23503") {
    return "VENUE_IN_USE";
  }
  if (error.code === "23505") {
    return "DUPLICATE_NAME";
  }
  if (error.code === "42501" || /permission/i.test(error.message)) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

function toFetchError(cause: unknown): FetchError {
  if (cause instanceof TypeError) {
    return { code: "NETWORK_ERROR", message: cause.message };
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return { code: "SERVER_ERROR", message };
}

/**
 * 全会場を name 昇順で取得する（一覧画面用）。
 */
export async function fetchVenues(): Promise<Result<Venue[], FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok((data ?? []) as Venue[]);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * 単一 venue を id で取得する。行が無ければ ok(null)（404 を Error 扱いしない）。
 */
export async function fetchVenue(
  id: VenueId,
): Promise<Result<Venue | null, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok((data as Venue | null) ?? null);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * メイン会場フラグの一意性維持（D1）。
 *
 * `is_primary = true` を設定する前に、既存のメイン会場を false 化する。
 * `exceptId` を渡すとその行は除外する（編集時に自分自身を含めない）。
 * 「解除 → 設定」の順で適用することで venues_single_primary_idx
 * （partial unique）に 2 件同時 true で抵触するのを避ける。
 */
async function unsetExistingPrimary(
  supabase: ReturnType<typeof getSupabase>,
  exceptId?: VenueId,
): Promise<FetchError | null> {
  try {
    let query = supabase.from("venues").update({ is_primary: false });
    if (exceptId !== undefined) {
      query = query.neq("id", exceptId as unknown as string);
    }
    const { error } = await query.eq("is_primary", true);
    if (error) {
      return { code: classifyError(error), message: error.message };
    }
    return null;
  } catch (cause) {
    return toFetchError(cause);
  }
}

/**
 * 新規 venue を INSERT する。`is_primary = true` のときは先に既存メインを解除する。
 */
export async function createVenue(
  input: VenueInsert,
): Promise<Result<Venue, FetchError>> {
  const supabase = getSupabase();
  try {
    if (input.is_primary === true) {
      const unsetError = await unsetExistingPrimary(supabase);
      if (unsetError) return err(unsetError);
    }
    const { data, error } = await supabase
      .from("venues")
      .insert(input)
      .select("*")
      .single();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(data as Venue);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * 既存 venue を UPDATE する。許可列のみ allowlist で抽出。
 * `is_primary = true` のときは先に自分以外の既存メインを解除する（D1）。
 */
export async function updateVenue(
  id: VenueId,
  patch: VenueUpdate,
): Promise<Result<Venue, FetchError>> {
  const supabase = getSupabase();
  const safe: Record<string, unknown> = {};
  const p = patch as Record<string, unknown>;
  if ("name" in p) safe.name = p.name;
  if ("address" in p) safe.address = p.address;
  if ("default_fee" in p) safe.default_fee = p.default_fee;
  if ("access_note" in p) safe.access_note = p.access_note;
  if ("map_url" in p) safe.map_url = p.map_url;
  if ("meeting_point" in p) safe.meeting_point = p.meeting_point;
  if ("is_primary" in p) safe.is_primary = p.is_primary;
  try {
    if (patch.is_primary === true) {
      const unsetError = await unsetExistingPrimary(supabase, id);
      if (unsetError) return err(unsetError);
    }
    const { data, error } = await supabase
      .from("venues")
      .update(safe)
      .eq("id", id as unknown as string)
      .select("*")
      .single();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(data as Venue);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * venue を DELETE する。events.venue_id の ON DELETE RESTRICT により、
 * 参照中の会場は DB が削除を拒否する（FK 違反 23503 → VENUE_IN_USE）。
 */
export async function deleteVenue(
  id: VenueId,
): Promise<Result<void, FetchError>> {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from("venues")
      .delete()
      .eq("id", id as unknown as string);
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(undefined);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}
