import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { EventDetailRow } from "@/entities/event-detail";
import {
  buildBookingLink,
  countXWeightedLength,
  fetchAnnouncementTemplate,
  renderAnnouncement,
  type AnnouncementChannel,
  type AnnouncementTemplate,
} from "@/entities/announcement-template";
import { LP_TOP_URL } from "@/shared/lib/externalLinks";
import { useToast } from "@/shared/ui/useToast";

/**
 * 告知文ダイアログの状態管理 (#386)。
 *
 * - 選択中チャネル（LINE / X）のテンプレートを取得し、対象イベントで展開した告知文を提供する
 * - 予約リンク（LINE のみ openExternalBrowser 付き）と紹介ページリンクを差し込み値として生成する
 * - コピー操作は告知文の 1 つのみ（リンク単体のコピーは提供しない）
 * - X 選択時は X の数え方による文字数を提供する
 * - クリップボード書き込み失敗時は `fallbackText` に対象文字列を入れ、UI 側で手動コピーへ退避させる
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「告知文ダイアログ」
 */

export type AnnouncementDialogState = "idle" | "loading" | "empty" | "error" | "success";

export interface UseAnnouncementDialog {
  state: Ref<AnnouncementDialogState>;
  message: ComputedRef<string | null>;
  bookingLink: ComputedRef<string>;
  introLink: string;
  /** X 選択時のみ X の文字数。それ以外は null */
  xLength: ComputedRef<number | null>;
  /** クリップボード書き込み失敗時の手動コピー用テキスト */
  fallbackText: Ref<string | null>;
  load: () => Promise<void>;
  copyMessage: () => Promise<void>;
}

export function useAnnouncementDialog(
  event: Ref<EventDetailRow | null>,
  channel: Ref<AnnouncementChannel>,
): UseAnnouncementDialog {
  const { toast } = useToast();
  const state = ref<AnnouncementDialogState>("idle");
  const template = ref<AnnouncementTemplate | null>(null);
  const fallbackText = ref<string | null>(null);
  const introLink = LP_TOP_URL;

  const bookingLink = computed(() =>
    event.value
      ? buildBookingLink(event.value.id, {
          openExternalBrowser: channel.value === "line",
        })
      : "",
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
      introLink,
    });
  });

  const xLength = computed<number | null>(() =>
    channel.value === "x" && message.value !== null
      ? countXWeightedLength(message.value)
      : null,
  );

  let requestSeq = 0;

  async function load(): Promise<void> {
    const seq = ++requestSeq;
    const target = channel.value;
    state.value = "loading";
    template.value = null;
    fallbackText.value = null;
    const result = await fetchAnnouncementTemplate(target);
    // チャネルを素早く切り替えた場合、古い応答で上書きしない
    if (seq !== requestSeq) return;
    if (!result.ok) {
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

  return {
    state,
    message,
    bookingLink,
    introLink,
    xLength,
    fallbackText,
    load,
    copyMessage,
  };
}
