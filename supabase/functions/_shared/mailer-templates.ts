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
    "下記の内容でご予約を承りました。",
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

export function renderReservationUpdatedMail(
  input: ReservationConfirmedInput,
): { subject: string; body: string } {
  const totalPeople = 1 + input.guestCount;
  const totalFee = input.feePerPerson * totalPeople;

  const lines: string[] = [
    "High Q バレーボールサークルの予約内容を更新しました。",
    "下記の内容でご予約を承っています。",
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
    subject: `【High Q】ご予約内容変更のお知らせ (${input.reservationDisplayId})`,
    body: lines.join("\n"),
  };
}

export function renderReservationPromotedMail(
  input: ReservationConfirmedInput,
): { subject: string; body: string } {
  const totalPeople = 1 + input.guestCount;
  const totalFee = input.feePerPerson * totalPeople;

  const lines: string[] = [
    "High Q バレーボールサークルです。",
    "キャンセルにより空きが出たため、キャンセル待ちから繰り上がり、ご予約が確定しました。",
    "下記の内容でご予約を承りました。",
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
    "ご都合が合わない場合は、お早めにマイページからキャンセルをお願いします（次の方の繰り上げに回ります）。",
    `予約詳細・キャンセルはマイページから操作できます: ${input.reservationDetailUrl}`,
    "",
    "当日の連絡 / やむを得ない当日キャンセルは LINE オープンチャットへお願いします。",
    `LINE オープンチャット: ${input.lineOpenChatUrl}`,
    "",
    input.supportNote,
    "",
    ...SIGNATURE,
  );

  return {
    subject: `【High Q】キャンセル待ち繰り上げのお知らせ・ご予約確定 (${input.reservationDisplayId})`,
    body: lines.join("\n"),
  };
}

// renderEventCancellationMail / EventCancellationMailInput は admin アプリの
// 削除確認 Dialog でも本文プレビュー描画に再利用するため、SSOT として
// `packages/shared/src/mail-templates/event-cancellation.ts` に移管済。
// Edge Function は本ファイルから re-export を経由して同一実装を共有する。
export {
  renderEventCancellationMail,
  type EventCancellationMailInput,
} from "../../../packages/shared/src/mail-templates/event-cancellation.ts";

export type IdentityDocumentPendingNotificationInput = {
  memberDisplayName: string;
  uploadedAtIso: string; // 受信時に JST 換算する
  detailUrl: string; // {ADMIN_BASE_URL}/identity-documents/{id}
};

function formatUploadedAtJst(iso: string): string {
  // YYYY/MM/DD HH:mm を JST で組み立てる。Intl は環境差を避けて
  // UTC からの +9 時間オフセットを手動加算する。
  const utc = new Date(iso);
  if (Number.isNaN(utc.getTime())) {
    return iso; // 不正入力はそのまま返す (呼び出し側のテストで検出する想定)
  }
  const jst = new Date(utc.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mi = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

export function renderIdentityDocumentPendingNotificationMail(
  input: IdentityDocumentPendingNotificationInput,
): { subject: string; body: string } {
  const uploadedJst = formatUploadedAtJst(input.uploadedAtIso);
  const body = [
    "本人確認書類の確認依頼が届いています。",
    "",
    `会員名: ${input.memberDisplayName}`,
    `提出日時: ${uploadedJst}`,
    "",
    `確認画面: ${input.detailUrl}`,
    "",
    "上記リンクから管理画面で内容を確認し、承認 / 差し戻しの操作をお願いします。",
    "",
    ...SIGNATURE,
  ].join("\n");
  return {
    subject: "【High Q】本人確認書類の確認依頼があります",
    body,
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
