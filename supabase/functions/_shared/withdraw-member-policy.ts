// =============================================================================
// withdraw-member Edge Function 認可判定ロジック
// =============================================================================
// 純粋関数として切り出し、vitest でテスト可能にする。Deno 依存なし。
//
// 仕様:
//   openspec/changes/member-withdrawal-flow/specs/member-withdrawal/spec.md
//   openspec/changes/member-withdrawal-flow/specs/rls-policies/spec.md
//   "Requirement: `withdraw-member` Edge Function の認可と権限"
// =============================================================================

export type WithdrawAuthInput = {
  /** Authorization ヘッダから取得した呼び出し元 auth.uid()。未認証なら null */
  callerUid: string | null;
  /** 呼び出し元の members.role。未登録なら null */
  callerRole: "member" | "admin" | null;
  /** 削除対象の member_id */
  targetMemberId: string;
};

export type WithdrawAuthResult =
  | { ok: true; reason: "self" | "admin" }
  | { ok: false; status: 401 | 403; reason: "unauthenticated" | "forbidden" };

/**
 * 退会の認可判定。
 * - callerUid === targetMemberId → 本人退会として許可
 * - callerRole === 'admin' → admin 強制削除として許可
 * - それ以外 → 403
 * - callerUid が null → 401
 */
export function evaluateWithdrawAuth(input: WithdrawAuthInput): WithdrawAuthResult {
  if (!input.callerUid) {
    return { ok: false, status: 401, reason: "unauthenticated" };
  }
  if (input.callerUid === input.targetMemberId) {
    return { ok: true, reason: "self" };
  }
  if (input.callerRole === "admin") {
    return { ok: true, reason: "admin" };
  }
  return { ok: false, status: 403, reason: "forbidden" };
}

// -----------------------------------------------------------------------------
// payload バリデーション
// -----------------------------------------------------------------------------

export type WithdrawPayloadValidation =
  | { ok: true; targetMemberId: string }
  | { ok: false; error: "invalid-json" | "invalid-target" };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateWithdrawPayload(raw: unknown): WithdrawPayloadValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "invalid-json" };
  }
  const value = (raw as { target_member_id?: unknown }).target_member_id;
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    return { ok: false, error: "invalid-target" };
  }
  return { ok: true, targetMemberId: value };
}
