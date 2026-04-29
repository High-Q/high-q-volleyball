import { ref } from "vue";
import {
  challengeMfa,
  listMfaFactors,
  verifyMfa,
} from "../api/auth-client";
import type { MfaError, MfaStatus } from "../types";
import { useAuthSession } from "./useAuthSession";

/**
 * 既存 TOTP factor で再認証する composable。
 *
 * - start() で verified factor を取得して challenge を発行
 * - submitCode(code) で verify を実行
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D11)
 */

export function useMfaChallenge() {
  const status = ref<MfaStatus>("idle");
  const error = ref<MfaError | null>(null);
  const factorId = ref<string>("");
  const challengeId = ref<string>("");

  const session = useAuthSession();

  async function start(): Promise<void> {
    error.value = null;
    status.value = "enrolling";
    try {
      const factors = await listMfaFactors();
      const verified = factors.find((f) => f.status === "verified");
      if (!verified) {
        status.value = "error";
        error.value = "no-factor";
        return;
      }
      factorId.value = verified.id;
      challengeId.value = await challengeMfa(verified.id);
      status.value = "awaiting-code";
    } catch (e: unknown) {
      status.value = "error";
      error.value = classify(e);
    }
  }

  async function submitCode(code: string): Promise<void> {
    if (!factorId.value || !challengeId.value) {
      status.value = "error";
      error.value = "no-factor";
      return;
    }
    error.value = null;
    status.value = "verifying";
    try {
      await verifyMfa(factorId.value, challengeId.value, code);
      await session.refresh();
      status.value = "success";
    } catch (e: unknown) {
      const errorCode = classify(e);
      error.value = errorCode;
      status.value =
        errorCode === "invalid-code" ? "awaiting-code" : "error";
    }
  }

  function reset(): void {
    status.value = "idle";
    error.value = null;
    factorId.value = "";
    challengeId.value = "";
  }

  return { status, error, factorId, start, submitCode, reset };
}

function classify(e: unknown): MfaError {
  if (typeof e === "object" && e !== null) {
    const obj = e as { message?: unknown; status?: unknown; name?: unknown };
    const message = typeof obj.message === "string" ? obj.message : "";
    const status = typeof obj.status === "number" ? obj.status : 0;
    if (
      status === 400 ||
      /invalid.*(code|otp|totp)|incorrect/i.test(message)
    ) {
      return "invalid-code";
    }
    if (status === 429 || /rate.limit/i.test(message)) {
      return "rate-limit";
    }
    if (
      obj.name === "TypeError" ||
      /network|fetch|failed to fetch/i.test(message)
    ) {
      return "network";
    }
  }
  return "unknown";
}
