import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { EventDetailRow } from "@/entities/event-detail";
import {
  buildBookingLink,
  fetchAnnouncementTemplate,
  renderAnnouncement,
  type AnnouncementTemplate,
} from "@/entities/announcement-template";
import { useToast } from "@/shared/ui/useToast";

/**
 * 告知文ダイアログの状態管理 (#386)。
 *
 * - LINE 用テンプレートを取得し、対象イベントで展開した告知文を提供する
 * - 告知リンクはテンプレートの状態によらず生成し、Empty / Error でもリンクだけはコピーできる
 * - クリップボード書き込み失敗時は `fallbackText` に対象文字列を入れ、UI 側で手動コピーへ退避させる
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
 *   「告知文ダイアログ」
 */

export type AnnouncementDialogState = "idle" | "loading" | "empty" | "error" | "success";

export interface UseAnnouncementDialog {
  state: Ref<AnnouncementDialogState>;
  message: ComputedRef<string | null>;
  bookingLink: ComputedRef<string>;
  /** クリップボード書き込み失敗時の手動コピー用テキスト */
  fallbackText: Ref<string | null>;
  load: () => Promise<void>;
  copyMessage: () => Promise<void>;
  copyLink: () => Promise<void>;
}

export function useAnnouncementDialog(
  event: Ref<EventDetailRow | null>,
): UseAnnouncementDialog {
  const { toast } = useToast();
  const state = ref<AnnouncementDialogState>("idle");
  const template = ref<AnnouncementTemplate | null>(null);
  const fallbackText = ref<string | null>(null);

  const bookingLink = computed(() =>
    event.value ? buildBookingLink(event.value.id) : "",
  );

  const message = computed<string | null>(() => {
    const e = event.value;
    if (!e || !template.value) return null;
    return renderAnnouncement(template.value.body, {
      name: e.name,
      vol: e.vol ?? null,
      startAt: e.start_at,
      endAt: e.end_at,
      venueName: e.venue_name,
      fee: e.fee,
      capacity: e.capacity,
      bookingLink: bookingLink.value,
    });
  });

  async function load(): Promise<void> {
    state.value = "loading";
    fallbackText.value = null;
    const result = await fetchAnnouncementTemplate("line");
    if (!result.ok) {
      template.value = null;
      state.value = "error";
      return;
    }
    template.value = result.value;
    state.value = result.value ? "success" : "empty";
  }

  async function copy(text: string, successTitle: string): Promise<void> {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      fallbackText.value = null;
      toast({ title: successTitle });
    } catch {
      fallbackText.value = text;
      toast({
        title: "コピーできませんでした",
        description: "表示中の文面を長押しでコピーしてください。",
        variant: "destructive",
      });
    }
  }

  async function copyMessage(): Promise<void> {
    if (message.value === null) return;
    await copy(message.value, "告知文をコピーしました");
  }

  async function copyLink(): Promise<void> {
    if (bookingLink.value === "") return;
    await copy(bookingLink.value, "リンクをコピーしました");
  }

  return { state, message, bookingLink, fallbackText, load, copyMessage, copyLink };
}
