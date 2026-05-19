// イベントキャンセル通知メールの本文レンダラ。
//
// 本ファイルは Supabase Edge Function (Deno) と apps/admin (Vite + Node Vitest)
// の両方から import される純粋関数モジュール。副作用 / 環境固有 API を持たない
// 純 TypeScript に保つ MUST (Deno.env / nodemailer 等の import 禁止)。
//
// 用途:
//   - Edge Function `send-event-cancellation-notification` で本文を生成して SMTP 送信
//   - apps/admin の `EventDeleteDialog` で削除確定前に本文プレビューを描画
//
// 関連:
//   openspec/changes/notify-event-cancellation-on-delete/design.md (Decision 9)
//   openspec/changes/notify-event-cancellation-on-delete/specs/event-cancellation-notification-email/spec.md

export type EventCancellationMailInput = {
  eventName: string;
  startAtJst: string;
  venueName: string;
  organizerMessage?: string;
  lineOpenChatUrl: string;
  reservationBaseUrl: string; // マイページ root URL
  supportNote: string;
};

const SIGNATURE = [
  "----",
  "High Q バレーボールサークル",
  "https://high-q-reservation.onrender.com",
];

export function renderEventCancellationMail(
  input: EventCancellationMailInput,
): { subject: string; body: string } {
  const lines: string[] = [
    "High Q バレーボールサークルです。",
    "ご予約いただいていたイベントが主催者によって中止 / 取消されました。",
    "",
    `イベント: ${input.eventName}`,
    `開催日時: ${input.startAtJst}`,
    `会場: ${input.venueName}`,
  ];

  if (input.organizerMessage && input.organizerMessage.trim().length > 0) {
    lines.push("", "主催者からのお知らせ:", input.organizerMessage);
  }

  lines.push(
    "",
    "------",
    "次回以降のイベントへのご参加をお待ちしています。マイページから他のイベントをご確認いただけます。",
    `マイページ: ${input.reservationBaseUrl}`,
    "",
    "当日連絡 / お問い合わせは LINE オープンチャットへお願いします。",
    `LINE オープンチャット: ${input.lineOpenChatUrl}`,
    "",
    input.supportNote,
    "",
    ...SIGNATURE,
  );

  return {
    subject: `【High Q】イベント中止のお知らせ - ${input.eventName}`,
    body: lines.join("\n"),
  };
}
