import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";
import {
  ANNOUNCEMENT_BODY_MAX,
  DEFAULT_LINE_TEMPLATE,
  SAMPLE_ANNOUNCEMENT_INPUT,
  fetchAnnouncementTemplate,
  findUnknownPlaceholders,
  renderAnnouncement,
  saveAnnouncementTemplate,
} from "@/entities/announcement-template";
import { useToast } from "@/shared/ui/useToast";

/**
 * 告知テンプレート編集フォームの状態管理 (#386)。
 *
 * - 未登録時は初期テンプレートを入れた状態で表示し、保存で作成する
 * - 入力エラーは編集後（または保存試行後）にのみ出す（初期表示で赤枠を出さない）
 * - 知らない差し込み項目は注意のみで保存は妨げない
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
 *   「告知テンプレート画面」
 */

export type AnnouncementTemplateFormStatus = "loading" | "error" | "ready";

export interface UseAnnouncementTemplateForm {
  status: Ref<AnnouncementTemplateFormStatus>;
  isNew: Ref<boolean>;
  body: Ref<string>;
  updatedAt: Ref<string | null>;
  remaining: ComputedRef<number>;
  bodyError: ComputedRef<string | null>;
  unknownPlaceholders: ComputedRef<string[]>;
  preview: ComputedRef<string>;
  saving: Ref<boolean>;
  load: () => Promise<void>;
  save: () => Promise<boolean>;
}

export function useAnnouncementTemplateForm(
  adminMemberId: Ref<MemberId | null>,
): UseAnnouncementTemplateForm {
  const { toast } = useToast();
  const status = ref<AnnouncementTemplateFormStatus>("loading");
  const isNew = ref(false);
  const body = ref("");
  const loadedBody = ref("");
  const updatedAt = ref<string | null>(null);
  const saving = ref(false);
  const submitted = ref(false);

  const remaining = computed(() => ANNOUNCEMENT_BODY_MAX - body.value.length);

  const bodyError = computed<string | null>(() => {
    const touched = submitted.value || body.value !== loadedBody.value;
    if (!touched) return null;
    if (body.value.length === 0) return "本文を入力してください。";
    if (remaining.value < 0) {
      return `${ANNOUNCEMENT_BODY_MAX.toLocaleString("ja-JP")} 文字以内で入力してください。`;
    }
    return null;
  });

  const unknownPlaceholders = computed(() => findUnknownPlaceholders(body.value));
  const preview = computed(() =>
    renderAnnouncement(body.value, SAMPLE_ANNOUNCEMENT_INPUT),
  );

  async function load(): Promise<void> {
    status.value = "loading";
    const result = await fetchAnnouncementTemplate("line");
    if (!result.ok) {
      status.value = "error";
      return;
    }
    const template = result.value;
    isNew.value = template === null;
    body.value = template?.body ?? DEFAULT_LINE_TEMPLATE;
    loadedBody.value = body.value;
    updatedAt.value = template?.updatedAt ?? null;
    submitted.value = false;
    status.value = "ready";
  }

  async function save(): Promise<boolean> {
    submitted.value = true;
    if (bodyError.value !== null) return false;
    const admin = adminMemberId.value;
    if (admin === null) {
      toast({
        title: "保存できませんでした",
        description: "ログイン状態を確認してください。",
        variant: "destructive",
      });
      return false;
    }
    saving.value = true;
    const result = await saveAnnouncementTemplate("line", body.value, admin);
    saving.value = false;
    if (!result.ok) {
      toast({
        title: "保存できませんでした",
        description: "時間をおいて再度お試しください。",
        variant: "destructive",
      });
      return false;
    }
    isNew.value = false;
    loadedBody.value = result.value.body;
    updatedAt.value = result.value.updatedAt;
    submitted.value = false;
    toast({ title: "告知テンプレートを保存しました" });
    return true;
  }

  return {
    status,
    isNew,
    body,
    updatedAt,
    remaining,
    bodyError,
    unknownPlaceholders,
    preview,
    saving,
    load,
    save,
  };
}
