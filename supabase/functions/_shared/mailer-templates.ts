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
  // venues.access_note — 会場固有の案内 (集合場所・アクセス・飲み物が買えない等)。空のときは
  // 「注意事項」セクションを本文から省く。会場ごとに 1 回設定すれば
  // その会場の全イベントのメールに自動掲載される。集合地点・地図リンクの構造化行は廃し、
  // 必要な集合情報はこの自由文 (会場メールテンプレート) に書く運用とする。
  venueAccessNote?: string | null;
  feePerPerson: number; // 1 人あたり参加費 (円)
  guestCount: number; // 同伴者数 (0 以上)
  note: string | null; // 連絡事項 (空のときは本文から省く)
  // events.email_note — イベント固有の追記メッセージ (懇親会案内・当日集合補足等)。
  // 空のときは「ご案内」セクションを本文から省く。
  eventEmailNote?: string | null;
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

// 任意の自由文セクション (注意事項 / ご案内) を本文行に
// 追記する。値が NULL / 空文字 / トリム後空のときは何も追記しない。改行は
// 入力のまま尊重する (プレーンテキストメールのためエスケープ不要)。
function pushFreeTextSection(
  lines: string[],
  heading: string,
  text: string | null | undefined,
): void {
  if (text && text.trim().length > 0) {
    lines.push("", `${heading}:`, text);
  }
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
    `参加人数: ${totalPeople} 名 (ご本人 + 同伴 ${input.guestCount} 名)`,
    `参加費: ${formatYen(input.feePerPerson)} × ${totalPeople} = ${formatYen(totalFee)} (当日現金でお支払いください)`,
  ];

  // 会員が予約時に書いた連絡事項 (reservations.note) を会場情報の直後に置く。
  // 主催側の案内 (ご案内・お知らせ) より前に出し、会員記載と主催案内が混ざらないようにする。
  if (input.note && input.note.trim().length > 0) {
    lines.push("", "連絡事項:", input.note);
  }

  // 主催からの当日案内をまとめて掲載する (会場固有の「注意事項」→ イベント固有の「ご案内」)。
  // どちらも空なら描画しない。集合場所・アクセス・地図は会場の「注意事項」(会場メールテンプレート) に書く運用。
  pushFreeTextSection(lines, "注意事項", input.venueAccessNote);
  pushFreeTextSection(lines, "ご案内", input.eventEmailNote);

  lines.push(
    "",
    "------",
    "【必ずご参加ください】当日の集合・時間変更・緊急のご連絡はすべて LINE オープンチャットで行います。",
    "ご予約の方は下記オープンチャットに必ずご参加ください。",
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
    `参加人数: ${totalPeople} 名 (ご本人 + 同伴 ${input.guestCount} 名)`,
    `参加費: ${formatYen(input.feePerPerson)} × ${totalPeople} = ${formatYen(totalFee)} (当日現金でお支払いください)`,
  ];

  // 会員が予約時に書いた連絡事項 (reservations.note) を会場情報の直後に置く。
  // 主催側の案内 (ご案内・お知らせ) より前に出し、会員記載と主催案内が混ざらないようにする。
  if (input.note && input.note.trim().length > 0) {
    lines.push("", "連絡事項:", input.note);
  }

  // 主催からの当日案内をまとめて掲載する (会場固有の「注意事項」→ イベント固有の「ご案内」)。
  // どちらも空なら描画しない。集合場所・アクセス・地図は会場の「注意事項」(会場メールテンプレート) に書く運用。
  pushFreeTextSection(lines, "注意事項", input.venueAccessNote);
  pushFreeTextSection(lines, "ご案内", input.eventEmailNote);

  lines.push(
    "",
    "------",
    "【必ずご参加ください】当日の集合・時間変更・緊急のご連絡はすべて LINE オープンチャットで行います。",
    "ご予約の方は下記オープンチャットに必ずご参加ください。",
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
    `参加人数: ${totalPeople} 名 (ご本人 + 同伴 ${input.guestCount} 名)`,
    `参加費: ${formatYen(input.feePerPerson)} × ${totalPeople} = ${formatYen(totalFee)} (当日現金でお支払いください)`,
  ];

  // 会員が予約時に書いた連絡事項 (reservations.note) を会場情報の直後に置く。
  // 主催側の案内 (ご案内・お知らせ) より前に出し、会員記載と主催案内が混ざらないようにする。
  if (input.note && input.note.trim().length > 0) {
    lines.push("", "連絡事項:", input.note);
  }

  // 主催からの当日案内をまとめて掲載する (会場固有の「注意事項」→ イベント固有の「ご案内」)。
  // どちらも空なら描画しない。集合場所・アクセス・地図は会場の「注意事項」(会場メールテンプレート) に書く運用。
  pushFreeTextSection(lines, "注意事項", input.venueAccessNote);
  pushFreeTextSection(lines, "ご案内", input.eventEmailNote);

  lines.push(
    "",
    "------",
    "ご都合が合わない場合は、お早めにマイページからキャンセルをお願いします（次の方の繰り上げに回ります）。",
    `予約詳細・キャンセルはマイページから操作できます: ${input.reservationDetailUrl}`,
    "",
    "【必ずご参加ください】当日の集合・時間変更・緊急のご連絡はすべて LINE オープンチャットで行います。",
    "ご予約の方は下記オープンチャットに必ずご参加ください。",
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
