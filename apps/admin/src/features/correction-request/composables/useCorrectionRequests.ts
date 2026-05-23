import { ref, type Ref } from "vue";
import type { CorrectionField, CorrectionRequest, MemberId } from "@high-q/shared";
import { fetchMemberCorrectionRequests } from "@/entities/member";
import {
  createCorrectionRequest,
  type CreateCorrectionRequestErrorCode,
} from "../api/createCorrectionRequest";
import {
  withdrawCorrectionRequest,
  type WithdrawCorrectionRequestErrorCode,
} from "../api/withdrawCorrectionRequest";

/**
 * #296 修正依頼セクションの状態管理 composable。
 *
 * - 対象 member の未対応エントリ一覧を保持
 * - 作成 / 取り下げ操作後にローカル state を patch（楽観的更新）
 * - フェッチエラーは isError でハンドル
 */

export type CorrectionRequestPhase = "idle" | "loading" | "ready" | "error";

export interface UseCorrectionRequests {
  phase: Ref<CorrectionRequestPhase>;
  entries: Ref<CorrectionRequest[]>;
  errorMessage: Ref<string | null>;
  refresh: () => Promise<void>;
  create: (
    field: CorrectionField,
    message: string,
  ) => Promise<{ ok: true } | { ok: false; code: CreateCorrectionRequestErrorCode; message: string }>;
  withdraw: (
    field: CorrectionField,
  ) => Promise<{ ok: true } | { ok: false; code: WithdrawCorrectionRequestErrorCode; message: string }>;
}

export function useCorrectionRequests(
  memberId: MemberId,
  adminMemberId: MemberId,
): UseCorrectionRequests {
  const phase = ref<CorrectionRequestPhase>("idle");
  const entries = ref<CorrectionRequest[]>([]);
  const errorMessage = ref<string | null>(null);

  async function refresh(): Promise<void> {
    phase.value = "loading";
    errorMessage.value = null;
    const result = await fetchMemberCorrectionRequests(memberId);
    if (!result.ok) {
      phase.value = "error";
      errorMessage.value = result.error.message;
      return;
    }
    entries.value = result.value;
    phase.value = "ready";
  }

  async function create(
    field: CorrectionField,
    message: string,
  ): ReturnType<UseCorrectionRequests["create"]> {
    const result = await createCorrectionRequest({
      memberId,
      adminMemberId,
      field,
      message,
    });
    if (!result.ok) {
      return { ok: false, code: result.error.code, message: result.error.message };
    }
    // 楽観的更新: ローカル配列に append
    entries.value = [...entries.value, result.value];
    return { ok: true };
  }

  async function withdraw(
    field: CorrectionField,
  ): ReturnType<UseCorrectionRequests["withdraw"]> {
    const result = await withdrawCorrectionRequest({ memberId, field });
    if (!result.ok) {
      return { ok: false, code: result.error.code, message: result.error.message };
    }
    // 楽観的更新: ローカル配列から filter out
    entries.value = entries.value.filter((r) => r.field !== field);
    return { ok: true };
  }

  return {
    phase,
    entries,
    errorMessage,
    refresh,
    create,
    withdraw,
  };
}
