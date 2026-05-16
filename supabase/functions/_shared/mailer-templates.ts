// 予約系メール文面のレンダラ群（純粋関数）。
//
// 既存 mailer.ts は `npm:nodemailer` を import しており Vitest (node) では読めないため、
// 送信本体 (mailer.ts) と文面生成 (本ファイル) をファイル単位で分離している。
// 本ファイルは Deno / Node どちらの環境でも import 可能な純 TypeScript に保つ。

export type ReservationConfirmedInput = {
  reservationDisplayId: string; // 表示用フォーマット (#HQ-XXXX-XXXX)
  eventName: string;
  startAtJst: string; // JST に整形済みの日本語日時表記
  venueName: string;
  // venues.address — 公開ページで秘匿される会場でも、メール本文では実住所をそのまま開示する
  // ('data-schema' spec の「有明会場の実住所はメールで初めて伝達される」運用)
  venueAddress: string;
  // venues.meeting_point — 集合地点が登録されている会場では必ず本文に含める
  venueMeetingPoint: string | null;
  venueMapUrl: string | null;
  feePerPerson: number; // 1 人あたり参加費 (円)
  guestCount: number; // 同伴者数 (0 以上)
  note: string | null; // 連絡事項 (空のときは本文から省く)
  lineOpenChatUrl: string;
  reservationDetailUrl: string;
  supportNote: string; // 「届かない場合は迷惑メールフォルダもご確認ください」相当
};

export type ReservationCancelledInput = {
  reservationDisplayId: string;
  eventName: string;
  startAtJst: string;
  venueName: string;
  cancelledAtJst: string;
  eventDetailUrl: string;
  lineOpenChatUrl: string;
};

const SIGNATURE = [
  "----",
  "High Q バレーボールサークル",
  "https://high-q-reservation.onrender.com",
];

function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function renderReservationConfirmedMail(
  input: ReservationConfirmedInput,
): { subject: string; body: string } {
  const totalPeople = 1 + input.guestCount;
  const totalFee = input.feePerPerson * totalPeople;

  const lines: string[] = [
    "High Q バレーボールサークルのご予約ありがとうございます。",
    "下記の内容でお席を確保しました。",
    "",
    `予約番号: ${input.reservationDisplayId}`,
    `イベント: ${input.eventName}`,
    `開催日時: ${input.startAtJst}`,
    `会場: ${input.venueName}`,
    `住所: ${input.venueAddress}`,
  ];

  if (input.venueMeetingPoint && input.venueMeetingPoint.trim().length > 0) {
    lines.push(`集合地点: ${input.venueMeetingPoint}`);
  }

  if (input.venueMapUrl) {
    lines.push(`会場マップ: ${input.venueMapUrl}`);
  }

  lines.push(
    "",
    `参加人数: ${totalPeople} 名 (ご本人 + 同伴 ${input.guestCount} 名)`,
    `参加費: ${formatYen(input.feePerPerson)} × ${totalPeople} = ${formatYen(totalFee)} (当日現金でお支払いください)`,
  );

  if (input.note && input.note.trim().length > 0) {
    lines.push("", "連絡事項:", input.note);
  }

  lines.push(
    "",
    "------",
    "当日の連絡 / やむを得ない当日キャンセルは LINE オープンチャットへお願いします。",
    `LINE オープンチャット: ${input.lineOpenChatUrl}`,
    "",
    `予約詳細・キャンセルはマイページから操作できます: ${input.reservationDetailUrl}`,
    "",
    input.supportNote,
    "",
    ...SIGNATURE,
  );

  return {
    subject: `【High Q】ご予約完了のお知らせ (${input.reservationDisplayId})`,
    body: lines.join("\n"),
  };
}

export function renderReservationCancelledMail(
  input: ReservationCancelledInput,
): { subject: string; body: string } {
  const lines: string[] = [
    "High Q バレーボールサークルのご予約をキャンセルしました。",
    "下記の内容でキャンセルを受け付けています。",
    "",
    `予約番号: ${input.reservationDisplayId}`,
    `イベント: ${input.eventName}`,
    `開催日時: ${input.startAtJst}`,
    `会場: ${input.venueName}`,
    `キャンセル受付: ${input.cancelledAtJst}`,
    "",
    "------",
    `またのご参加をお待ちしています。最新のイベント情報はこちら: ${input.eventDetailUrl}`,
    "",
    "やむを得ない当日キャンセルや当日連絡は LINE オープンチャットへお願いします。",
    `LINE オープンチャット: ${input.lineOpenChatUrl}`,
    "",
    ...SIGNATURE,
  ];

  return {
    subject: `【High Q】ご予約キャンセルのお知らせ (${input.reservationDisplayId})`,
    body: lines.join("\n"),
  };
}
