import { ref, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";
import {
  fetchOperationalSettings,
  updateMemberRegistrationEnabled,
} from "@/entities/operational-settings";
import { useToast } from "@/shared/ui/useToast";

/**
 * 運営設定（新規会員登録の受付可否）トグルの状態管理（member-registration-toggle）。
 *
 * - 画面マウント時に現在値を読み込む（Loading → ready / error）
 * - persist(next) で受付可否を更新。成功で enabled を確定しトースト、失敗は
 *   enabled を変えずにトースト（UI 側で switch を元に戻す）
 * - 確認ダイアログは UI (RegistrationToggleCard) 側で挟む
 *
 * spec: openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
 *   「admin 運営設定ページ」
 */

export type RegistrationToggleStatus = "loading" | "error" | "ready";

export interface UseRegistrationToggle {
  status: Ref<RegistrationToggleStatus>;
  /** 現在確定している受付可否（true=受付中） */
  enabled: Ref<boolean>;
  updatedAt: Ref<string | null>;
  saving: Ref<boolean>;
  load: () => Promise<void>;
  /** 受付可否を next に更新する。成功で true。 */
  persist: (next: boolean) => Promise<boolean>;
}

export function useRegistrationToggle(
  adminMemberId: Ref<MemberId | null>,
): UseRegistrationToggle {
  const { toast } = useToast();
  const status = ref<RegistrationToggleStatus>("loading");
  const enabled = ref(true);
  const updatedAt = ref<string | null>(null);
  const saving = ref(false);

  async function load(): Promise<void> {
    status.value = "loading";
    const result = await fetchOperationalSettings();
    if (!result.ok) {
      status.value = "error";
      return;
    }
    enabled.value = result.value.memberRegistrationEnabled;
    updatedAt.value = result.value.updatedAt;
    status.value = "ready";
  }

  async function persist(next: boolean): Promise<boolean> {
    const admin = adminMemberId.value;
    if (admin === null) {
      toast({
        title: "変更できませんでした",
        description: "ログイン状態を確認してください。",
        variant: "destructive",
      });
      return false;
    }
    saving.value = true;
    const result = await updateMemberRegistrationEnabled(next, admin);
    saving.value = false;
    if (!result.ok) {
      toast({
        title: "変更できませんでした",
        description: "時間をおいて再度お試しください。",
        variant: "destructive",
      });
      return false;
    }
    enabled.value = result.value.memberRegistrationEnabled;
    updatedAt.value = result.value.updatedAt;
    toast({
      title: next
        ? "新規会員登録を再開しました"
        : "新規会員登録を停止しました",
    });
    return true;
  }

  return { status, enabled, updatedAt, saving, load, persist };
}
