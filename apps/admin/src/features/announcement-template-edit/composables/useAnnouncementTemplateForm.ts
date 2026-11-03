import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";
import {
  ANNOUNCEMENT_BODY_MAX,
  DEFAULT_TEMPLATES,
  SAMPLE_ANNOUNCEMENT_INPUT,
  countXWeightedLength,
  fetchAnnouncementTemplate,
  findUnknownPlaceholders,
  renderAnnouncement,
  saveAnnouncementTemplate,
  type AnnouncementChannel,
} from "@/entities/announcement-template";
import { useToast } from "@/shared/ui/useToast";

/**
 * 告知テンプレート編集フォームの状態管理 (#386)。
 *
 * - チャネル（LINE / X）ごとに 1 テンプレート。未登録時はチャネルの初期テンプレートを
 *   入れた状態で表示し、保存で作成する
 * - X はサンプル展開後の X 文字数を提供する（差し込み後の長さが実際の投稿に近いため）
 * - 入力エラーは編集後（または保存試行後）にのみ出す（初期表示で赤枠を出さない）
 * - 知らない差し込み項目は注意のみで保存は妨げない
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
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
  /** X のみサンプル展開後の X 文字数。LINE は null */
  previewXLength: ComputedRef<number | null>;
  /** 読み込み / 保存後から本文が変わっているか */
  isDirty: ComputedRef<boolean>;
  saving: Ref<boolean>;
  load: () => Promise<void>;
  save: () => Promise<boolean>;
}

export function useAnnouncementTemplateForm(
  adminMemberId: Ref<MemberId | null>,
  channel: AnnouncementChannel = "line",
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
  // X の予約リンクには openExternalBrowser を付けない（ダイアログの実リンクと揃える）
  const sampleInput =
    channel === "x"
      ? {
          ...SAMPLE_ANNOUNCEMENT_INPUT,
          bookingLink: SAMPLE_ANNOUNCEMENT_INPUT.bookingLink.replace(
            "&openExternalBrowser=1",
            "",
          ),
        }
      : SAMPLE_ANNOUNCEMENT_INPUT;

  const preview = computed(() => renderAnnouncement(body.value, sampleInput));
  const previewXLength = computed<number | null>(() =>
    channel === "x" ? countXWeightedLength(preview.value) : null,
  );
  const isDirty = computed(() => body.value !== loadedBody.value);

  async function load(): Promise<void> {
    status.value = "loading";
    const result = await fetchAnnouncementTemplate(channel);
    if (!result.ok) {
      status.value = "error";
      return;
    }
    const template = result.value;
    isNew.value = template === null;
    body.value = template?.body ?? DEFAULT_TEMPLATES[channel];
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
    const result = await saveAnnouncementTemplate(channel, body.value, admin);
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
    previewXLength,
    isDirty,
    saving,
    load,
    save,
  };
}
