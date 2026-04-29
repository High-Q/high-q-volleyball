import { ref } from "vue";
import { challengeMfa, enrollTotp, verifyMfa } from "../api/auth-client";
import type { MfaError, MfaStatus } from "../types";
import { useAuthSession } from "./useAuthSession";

/**
 * TOTP MFA Enrollment composable。
 *
 * - mount 時に enroll() を呼ぶことで factor を生成、QR コード / secret を保持
 * - submitCode(code) で challenge → verify を実施
 * - verify 成功で AuthSession.refresh() を呼び aal2 に切り替える
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D11, D13)
 */

export function useMfaEnrollment() {
  const status = ref<MfaStatus>("idle");
  const error = ref<MfaError | null>(null);
  const qrCode = ref<string>("");
  const secret = ref<string>("");
  const uri = ref<string>("");
  const factorId = ref<string>("");

  const session = useAuthSession();

  async function enroll(): Promise<void> {
    error.value = null;
    status.value = "enrolling";
    try {
      const result = await enrollTotp();
      factorId.value = result.factorId;
      qrCode.value = result.qrCode;
      secret.value = result.secret;
      uri.value = result.uri;
      status.value = "awaiting-code";
    } catch (e: unknown) {
      status.value = "error";
      error.value = classify(e);
    }
  }

  async function submitCode(code: string): Promise<void> {
    if (!factorId.value) {
      status.value = "error";
      error.value = "no-factor";
      return;
    }
    error.value = null;
    status.value = "verifying";
    try {
      const challengeId = await challengeMfa(factorId.value);
      await verifyMfa(factorId.value, challengeId, code);
      await session.refresh();
      status.value = "success";
    } catch (e: unknown) {
      const code = classify(e);
      error.value = code;
      // verify 失敗は再入力させる
      status.value = code === "invalid-code" ? "awaiting-code" : "error";
    }
  }

  function reset(): void {
    status.value = "idle";
    error.value = null;
    qrCode.value = "";
    secret.value = "";
    uri.value = "";
    factorId.value = "";
  }

  return {
    status,
    error,
    qrCode,
    secret,
    uri,
    factorId,
    enroll,
    submitCode,
    reset,
  };
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
