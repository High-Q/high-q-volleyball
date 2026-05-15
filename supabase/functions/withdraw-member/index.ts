// =============================================================================
// Edge Function: withdraw-member
// =============================================================================
// Issue #254 + #255: 会員退会の DB / Storage / Auth 一括削除フロー。
//
// 呼び出し元:
//   - reservation アプリ: /profile のアカウント削除 (本人)
//   - admin アプリ: /members 詳細 sheet の強制削除 (admin)
//
// フロー (順序厳守 — design.md D3):
//   1. 認可判定 (callerUid === targetMemberId or callerRole === 'admin')
//   2. target 存在確認 (不在なら 204、冪等)
//   3. 未来予約キャンセル (status IN ('reserved','waitlist') → 'cancelled')
//   4. reservations 個人情報列 NULL 化 (phone_at_booking, note)
//   5. Storage オブジェクト削除 (identity-documents/<member_id>/*)
//   6. members DELETE
//      → identity_documents は ON DELETE CASCADE で連鎖
//      → reservations.member_id は ON DELETE SET NULL で匿名化
//   7. auth.users DELETE
//
// エラー時の整合性:
//   ・Step 3〜5 のいずれかが失敗 → Step 6 以降は実行しない、500 を返す
//   ・Step 6 成功 / Step 7 失敗 → DB の削除は維持、500 を返す
//     (auth user 単体の孤児状態。次回ログイン試行時に members 不在で弾かれる)
//
// 関連:
//   - openspec/changes/member-withdrawal-flow/specs/member-withdrawal/spec.md
//   - design.md D3 / D4 / D7
// =============================================================================

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import {
  evaluateWithdrawAuth,
  validateWithdrawPayload,
} from "../_shared/withdraw-member-policy.ts";

const STORAGE_BUCKET = "identity-documents";

export async function handleWithdrawMember(req: Request): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonResponse({ error: "method-not-allowed" }, { status: 405 });
  }

  // ---------------------------------------------------------------------------
  // payload 検証
  // ---------------------------------------------------------------------------
  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return jsonResponse({ error: "invalid-json" }, { status: 400 });
  }
  const payload = validateWithdrawPayload(bodyRaw);
  if (!payload.ok) {
    return jsonResponse({ error: payload.error }, { status: 400 });
  }
  const targetMemberId = payload.targetMemberId;

  // ---------------------------------------------------------------------------
  // 1. 認可: JWT から callerUid + role を取得
  // ---------------------------------------------------------------------------
  const userClient = createUserClient(req.headers.get("Authorization"));
  const { data: userData } = await userClient.auth.getUser();
  const callerUid = userData?.user?.id ?? null;

  const service = createServiceClient();
  let callerRole: "member" | "admin" | null = null;
  if (callerUid) {
    const { data: callerRow } = await service
      .from("members")
      .select("role")
      .eq("id", callerUid)
      .maybeSingle();
    callerRole = (callerRow?.role as "member" | "admin" | null) ?? null;
  }

  const auth = evaluateWithdrawAuth({ callerUid, callerRole, targetMemberId });
  if (!auth.ok) {
    return jsonResponse({ error: auth.reason }, { status: auth.status });
  }

  // ---------------------------------------------------------------------------
  // 2. target 存在確認 (冪等: 不在なら 204)
  // ---------------------------------------------------------------------------
  const { data: targetRow, error: targetSelectErr } = await service
    .from("members")
    .select("id")
    .eq("id", targetMemberId)
    .maybeSingle();
  if (targetSelectErr) {
    console.error("[withdraw-member] target select failed", targetSelectErr);
    return jsonResponse({ error: "internal" }, { status: 500 });
  }
  if (!targetRow) {
    // 既に削除済み (中断後のリトライ等)。auth.users が残っていれば後始末。
    await service.auth.admin.deleteUser(targetMemberId).catch(() => {});
    return new Response(null, { status: 204 });
  }

  // ---------------------------------------------------------------------------
  // 3. 未来予約のキャンセル
  // ---------------------------------------------------------------------------
  const { error: cancelErr } = await service
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("member_id", targetMemberId)
    .in("status", ["reserved", "waitlist"]);
  if (cancelErr) {
    console.error("[withdraw-member] cancel future reservations failed", {
      targetMemberId,
      error: cancelErr,
    });
    return jsonResponse({ error: "cancel-failed" }, { status: 500 });
  }

  // ---------------------------------------------------------------------------
  // 4. reservations 個人情報列 NULL 化 (phone_at_booking, note)
  //    Step 6 の ON DELETE SET NULL では member_id しか NULL にならないため、
  //    個人情報列は明示的に消去する。member_id NULL 化前に実行する必要がある。
  // ---------------------------------------------------------------------------
  const { error: anonymizeErr } = await service
    .from("reservations")
    .update({ phone_at_booking: null, note: null })
    .eq("member_id", targetMemberId);
  if (anonymizeErr) {
    console.error("[withdraw-member] anonymize PII failed", {
      targetMemberId,
      error: anonymizeErr,
    });
    return jsonResponse({ error: "anonymize-failed" }, { status: 500 });
  }

  // ---------------------------------------------------------------------------
  // 5. Storage オブジェクト削除
  //    identity-documents/<member_id>/ 配下を list → remove
  // ---------------------------------------------------------------------------
  const { data: storageList, error: listErr } = await service
    .storage
    .from(STORAGE_BUCKET)
    .list(targetMemberId, { limit: 100 });
  if (listErr) {
    console.error("[withdraw-member] storage list failed", {
      targetMemberId,
      error: listErr,
    });
    return jsonResponse({ error: "storage-list-failed" }, { status: 500 });
  }
  if (storageList && storageList.length > 0) {
    const paths = storageList.map((obj) => `${targetMemberId}/${obj.name}`);
    const { error: removeErr } = await service
      .storage
      .from(STORAGE_BUCKET)
      .remove(paths);
    if (removeErr) {
      console.error("[withdraw-member] storage remove failed", {
        targetMemberId,
        paths,
        error: removeErr,
      });
      return jsonResponse({ error: "storage-remove-failed" }, { status: 500 });
    }
  }

  // ---------------------------------------------------------------------------
  // 6. members DELETE
  //    - identity_documents は ON DELETE CASCADE で連鎖削除
  //    - reservations.member_id は ON DELETE SET NULL で匿名化
  // ---------------------------------------------------------------------------
  const { error: memberDeleteErr } = await service
    .from("members")
    .delete()
    .eq("id", targetMemberId);
  if (memberDeleteErr) {
    console.error("[withdraw-member] members delete failed", {
      targetMemberId,
      error: memberDeleteErr,
    });
    return jsonResponse({ error: "member-delete-failed" }, { status: 500 });
  }

  // ---------------------------------------------------------------------------
  // 7. auth.users DELETE
  //    失敗してもここでは DB ロールバックしない (孤児として運営に通知する設計)。
  // ---------------------------------------------------------------------------
  const { error: authDeleteErr } = await service.auth.admin.deleteUser(targetMemberId);
  if (authDeleteErr) {
    console.error("[withdraw-member] auth.users delete failed (DB already deleted)", {
      targetMemberId,
      error: authDeleteErr,
    });
    return jsonResponse(
      { error: "auth-delete-failed", dbDeleted: true },
      { status: 500 },
    );
  }

  console.info("[withdraw-member] success", {
    targetMemberId,
    executedBy: callerUid,
    role: auth.reason,
    at: new Date().toISOString(),
  });
  return jsonResponse({ ok: true }, { status: 200 });
}

Deno.serve(handleWithdrawMember);
