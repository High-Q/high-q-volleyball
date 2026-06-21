import { describe, expect, it } from "vitest";
import {
  renderEventCancellationMail,
  renderIdentityDocumentPendingNotificationMail,
  renderReservationCancelledMail,
  renderReservationConfirmedMail,
  renderReservationPromotedMail,
  renderReservationUpdatedMail,
  type EventCancellationMailInput,
  type IdentityDocumentPendingNotificationInput,
  type ReservationCancelledInput,
  type ReservationConfirmedInput,
} from "../_shared/mailer-templates.ts";

const baseConfirmed: ReservationConfirmedInput = {
  reservationDisplayId: "#HQ-AB12-CD34",
  eventName: "金曜の夜練 (中級〜)",
  startAtJst: "2026年5月22日 (金) 19:30〜21:30",
  venueName: "新宿スポーツセンター 第 2 体育館",
  venueAddress: "東京都新宿区大久保 3-1-2",
  venueMeetingPoint: "正面玄関ロビーの High Q プラカード前",
  venueMapUrl: "https://maps.example.com/shinjuku-sports",
  feePerPerson: 1500,
  guestCount: 0,
  note: null,
  lineOpenChatUrl: "https://line.me/ti/g2/example",
  reservationDetailUrl: "https://reservation.example/reservations/abc",
  supportNote: "メールが届かない場合は迷惑メールフォルダもご確認ください。",
};

const baseCancelled: ReservationCancelledInput = {
  reservationDisplayId: "#HQ-AB12-CD34",
  eventName: "金曜の夜練 (中級〜)",
  startAtJst: "2026年5月22日 (金) 19:30〜21:30",
  venueName: "新宿スポーツセンター 第 2 体育館",
  cancelledAtJst: "2026年5月20日 (水) 10:15",
  eventDetailUrl: "https://reservation.example/events/xyz",
  lineOpenChatUrl: "https://line.me/ti/g2/example",
};

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe("renderReservationConfirmedMail", () => {
  it("同一入力で同一出力 (純粋関数)", () => {
    const a = renderReservationConfirmedMail(baseConfirmed);
    const b = renderReservationConfirmedMail(baseConfirmed);
    expect(a.subject).toBe(b.subject);
    expect(a.body).toBe(b.body);
  });

  it("件名に予約番号が含まれる", () => {
    const { subject } = renderReservationConfirmedMail(baseConfirmed);
    expect(subject).toContain("#HQ-AB12-CD34");
    expect(subject).toContain("High Q");
  });

  it("本文にイベント名 / 開催日時 / 会場 / LINE / マイページ URL が含まれる", () => {
    const { body } = renderReservationConfirmedMail(baseConfirmed);
    expect(body).toContain(baseConfirmed.eventName);
    expect(body).toContain(baseConfirmed.startAtJst);
    expect(body).toContain(baseConfirmed.venueName);
    expect(body).toContain(baseConfirmed.lineOpenChatUrl);
    expect(body).toContain(baseConfirmed.reservationDetailUrl);
    expect(body).toContain(baseConfirmed.supportNote);
  });

  it("本文に「席」表現を含まない (バレーボールサークルにふさわしくない用語の禁止)", () => {
    const { body } = renderReservationConfirmedMail(baseConfirmed);
    expect(body).not.toContain("席");
  });

  it("生 UUID 形式は subject / body のどこにも出ない", () => {
    const { subject, body } = renderReservationConfirmedMail(baseConfirmed);
    expect(subject).not.toMatch(UUID_RE);
    expect(body).not.toMatch(UUID_RE);
  });

  it("note が null のとき本文に連絡事項セクションを出さない", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      note: null,
    });
    expect(body).not.toContain("連絡事項:");
  });

  it("note が空文字のとき本文に連絡事項セクションを出さない", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      note: "   ",
    });
    expect(body).not.toContain("連絡事項:");
  });

  it("note が値ありのとき連絡事項セクションが本文に含まれる", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      note: "初参加です。よろしくお願いします。",
    });
    expect(body).toContain("連絡事項:");
    expect(body).toContain("初参加です。よろしくお願いします。");
  });

  it("同伴者ありのとき合計人数 / 合計金額が本文に正しく出る", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      guestCount: 2,
      feePerPerson: 1500,
    });
    // ご本人 1 名 + 同伴 2 名 = 3 名 × 1500 = 4500
    expect(body).toContain("3 名");
    expect(body).toContain("同伴 2 名");
    expect(body).toContain("¥4,500");
  });

  it("会場 map URL が null のとき本文に会場マップ行を出さない", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      venueMapUrl: null,
    });
    expect(body).not.toContain("会場マップ:");
  });

  it("会場住所は常に本文に含まれる (秘匿会場の実住所開示)", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      venueAddress: "東京都江東区有明 1-3-15 都立有明西学園",
    });
    expect(body).toContain("住所: 東京都江東区有明 1-3-15 都立有明西学園");
  });

  it("集合地点が登録されているとき本文に含まれる", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      venueMeetingPoint: "南門前 19:00 集合",
    });
    expect(body).toContain("集合地点: 南門前 19:00 集合");
  });

  it("集合地点が null のとき本文に集合地点行を出さない", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      venueMeetingPoint: null,
    });
    expect(body).not.toContain("集合地点:");
  });

  it("集合地点が空文字のとき本文に集合地点行を出さない", () => {
    const { body } = renderReservationConfirmedMail({
      ...baseConfirmed,
      venueMeetingPoint: "   ",
    });
    expect(body).not.toContain("集合地点:");
  });
});

describe("renderReservationUpdatedMail", () => {
  it("同一入力で同一出力 (純粋関数)", () => {
    const a = renderReservationUpdatedMail(baseConfirmed);
    const b = renderReservationUpdatedMail(baseConfirmed);
    expect(a.subject).toBe(b.subject);
    expect(a.body).toBe(b.body);
  });

  it("件名に予約番号が含まれ、'予約完了' 表現は含まれない", () => {
    const { subject } = renderReservationUpdatedMail(baseConfirmed);
    expect(subject).toContain("#HQ-AB12-CD34");
    expect(subject).toContain("High Q");
    expect(subject).toContain("変更");
    expect(subject).not.toContain("予約完了");
    expect(subject).not.toContain("ご予約完了");
  });

  it("本文冒頭は '予約内容を更新しました' を含み '予約完了' 表現を含まない", () => {
    const { body } = renderReservationUpdatedMail(baseConfirmed);
    expect(body).toContain("予約内容を更新しました");
    expect(body).not.toContain("予約完了");
    expect(body).not.toContain("ご予約ありがとうございます");
  });

  it("本文に予約番号 / 会場 / 住所 / LINE / マイページ URL / supportNote が含まれる", () => {
    const { body } = renderReservationUpdatedMail(baseConfirmed);
    expect(body).toContain(baseConfirmed.reservationDisplayId);
    expect(body).toContain(baseConfirmed.eventName);
    expect(body).toContain(baseConfirmed.startAtJst);
    expect(body).toContain(baseConfirmed.venueName);
    expect(body).toContain(`住所: ${baseConfirmed.venueAddress}`);
    expect(body).toContain(baseConfirmed.lineOpenChatUrl);
    expect(body).toContain(baseConfirmed.reservationDetailUrl);
    expect(body).toContain(baseConfirmed.supportNote);
  });

  it("本文に「席」表現を含まない (バレーボールサークルにふさわしくない用語の禁止)", () => {
    const { body } = renderReservationUpdatedMail(baseConfirmed);
    expect(body).not.toContain("席");
  });

  it("生 UUID 形式は subject / body のどこにも出ない", () => {
    const { subject, body } = renderReservationUpdatedMail(baseConfirmed);
    expect(subject).not.toMatch(UUID_RE);
    expect(body).not.toMatch(UUID_RE);
  });

  it("note が null のとき本文に連絡事項セクションを出さない", () => {
    const { body } = renderReservationUpdatedMail({
      ...baseConfirmed,
      note: null,
    });
    expect(body).not.toContain("連絡事項:");
  });

  it("note が空文字のとき本文に連絡事項セクションを出さない", () => {
    const { body } = renderReservationUpdatedMail({
      ...baseConfirmed,
      note: "   ",
    });
    expect(body).not.toContain("連絡事項:");
  });

  it("note が値ありのとき連絡事項セクションが本文に含まれる", () => {
    const { body } = renderReservationUpdatedMail({
      ...baseConfirmed,
      note: "初参加です。よろしくお願いします。",
    });
    expect(body).toContain("連絡事項:");
    expect(body).toContain("初参加です。よろしくお願いします。");
  });

  it("変更後の同伴者数と合計金額が本文に正しく出る", () => {
    const { body } = renderReservationUpdatedMail({
      ...baseConfirmed,
      guestCount: 3,
      feePerPerson: 1500,
    });
    // ご本人 1 名 + 同伴 3 名 = 4 名 × 1500 = 6000
    expect(body).toContain("4 名");
    expect(body).toContain("同伴 3 名");
    expect(body).toContain("¥6,000");
  });

  it("集合地点が登録されているとき本文に含まれる", () => {
    const { body } = renderReservationUpdatedMail({
      ...baseConfirmed,
      venueMeetingPoint: "南門前 19:00 集合",
    });
    expect(body).toContain("集合地点: 南門前 19:00 集合");
  });

  it("集合地点が null のとき本文に集合地点行を出さない", () => {
    const { body } = renderReservationUpdatedMail({
      ...baseConfirmed,
      venueMeetingPoint: null,
    });
    expect(body).not.toContain("集合地点:");
  });
});

describe("renderReservationCancelledMail", () => {
  it("同一入力で同一出力 (純粋関数)", () => {
    const a = renderReservationCancelledMail(baseCancelled);
    const b = renderReservationCancelledMail(baseCancelled);
    expect(a.subject).toBe(b.subject);
    expect(a.body).toBe(b.body);
  });

  it("件名に予約番号が含まれる", () => {
    const { subject } = renderReservationCancelledMail(baseCancelled);
    expect(subject).toContain("#HQ-AB12-CD34");
    expect(subject).toContain("キャンセル");
  });

  it("本文にイベント名 / 開催日時 / キャンセル時刻 / LINE / 再予約導線が含まれる", () => {
    const { body } = renderReservationCancelledMail(baseCancelled);
    expect(body).toContain(baseCancelled.eventName);
    expect(body).toContain(baseCancelled.startAtJst);
    expect(body).toContain(baseCancelled.cancelledAtJst);
    expect(body).toContain(baseCancelled.lineOpenChatUrl);
    expect(body).toContain(baseCancelled.eventDetailUrl);
  });

  it("生 UUID 形式は subject / body のどこにも出ない", () => {
    const { subject, body } = renderReservationCancelledMail(baseCancelled);
    expect(subject).not.toMatch(UUID_RE);
    expect(body).not.toMatch(UUID_RE);
  });
});

const baseEventCancellation: EventCancellationMailInput = {
  eventName: "金曜の夜練 (中級〜)",
  startAtJst: "2026年5月22日 (金) 19:30〜21:30",
  venueName: "新宿スポーツセンター 第 2 体育館",
  organizerMessage: undefined,
  lineOpenChatUrl: "https://line.me/ti/g2/example",
  reservationBaseUrl: "https://reservation.example",
  supportNote: "メールが届かない場合は迷惑メールフォルダもご確認ください。",
};

describe("renderEventCancellationMail", () => {
  it("同一入力で同一出力 (純粋関数)", () => {
    const a = renderEventCancellationMail(baseEventCancellation);
    const b = renderEventCancellationMail(baseEventCancellation);
    expect(a.subject).toBe(b.subject);
    expect(a.body).toBe(b.body);
  });

  it("件名にイベント名と『イベント中止のお知らせ』が含まれる", () => {
    const { subject } = renderEventCancellationMail(baseEventCancellation);
    expect(subject).toContain(baseEventCancellation.eventName);
    expect(subject).toContain("イベント中止のお知らせ");
  });

  it("本文にイベント名 / 開催日時 / 会場 / LINE / マイページ URL が含まれる", () => {
    const { body } = renderEventCancellationMail(baseEventCancellation);
    expect(body).toContain(baseEventCancellation.eventName);
    expect(body).toContain(baseEventCancellation.startAtJst);
    expect(body).toContain(baseEventCancellation.venueName);
    expect(body).toContain(baseEventCancellation.lineOpenChatUrl);
    expect(body).toContain(baseEventCancellation.reservationBaseUrl);
    expect(body).toContain(baseEventCancellation.supportNote);
  });

  it("organizerMessage が undefined のとき本文に主催者からのお知らせ欄を出さない", () => {
    const { body } = renderEventCancellationMail(baseEventCancellation);
    expect(body).not.toContain("主催者からのお知らせ:");
  });

  it("organizerMessage が空文字のとき本文に主催者からのお知らせ欄を出さない", () => {
    const { body } = renderEventCancellationMail({
      ...baseEventCancellation,
      organizerMessage: "   ",
    });
    expect(body).not.toContain("主催者からのお知らせ:");
  });

  it("organizerMessage が値ありのとき本文の理由欄に描画される", () => {
    const { body } = renderEventCancellationMail({
      ...baseEventCancellation,
      organizerMessage: "雨天のため中止します。次回ご参加お待ちしています。",
    });
    expect(body).toContain("主催者からのお知らせ:");
    expect(body).toContain("雨天のため中止します。次回ご参加お待ちしています。");
  });

  it("本文に予約番号 (#HQ-) プレフィックスを含まない", () => {
    const { body } = renderEventCancellationMail({
      ...baseEventCancellation,
      organizerMessage: "中止します",
    });
    expect(body).not.toContain("#HQ-");
    expect(body).not.toContain("予約番号");
  });

  it("生 UUID 形式は subject / body のどこにも出ない", () => {
    const { subject, body } = renderEventCancellationMail({
      ...baseEventCancellation,
      organizerMessage: "中止します",
    });
    expect(subject).not.toMatch(UUID_RE);
    expect(body).not.toMatch(UUID_RE);
  });
});

const baseIdentityPending: IdentityDocumentPendingNotificationInput = {
  memberDisplayName: "山田 太郎",
  uploadedAtIso: "2026-05-29T10:30:00Z",
  detailUrl:
    "https://high-q-admin.onrender.com/identity-documents/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
};

describe("renderIdentityDocumentPendingNotificationMail", () => {
  it("同一入力で同一出力 (純粋関数)", () => {
    const a = renderIdentityDocumentPendingNotificationMail(baseIdentityPending);
    const b = renderIdentityDocumentPendingNotificationMail(baseIdentityPending);
    expect(a.subject).toBe(b.subject);
    expect(a.body).toBe(b.body);
  });

  it("件名は固定文言 (会員名 / 日時 / 書類種別を含まない)", () => {
    const { subject } = renderIdentityDocumentPendingNotificationMail(
      baseIdentityPending,
    );
    expect(subject).toBe("【High Q】本人確認書類の確認依頼があります");
    expect(subject).not.toContain(baseIdentityPending.memberDisplayName);
    expect(subject).not.toContain("2026");
  });

  it("本文に会員 display_name が含まれる", () => {
    const { body } = renderIdentityDocumentPendingNotificationMail(
      baseIdentityPending,
    );
    expect(body).toContain("山田 太郎");
  });

  it("本文に admin 詳細画面 URL が含まれる", () => {
    const { body } = renderIdentityDocumentPendingNotificationMail(
      baseIdentityPending,
    );
    expect(body).toContain(baseIdentityPending.detailUrl);
  });

  it("本文の提出日時が JST に換算されて含まれる (UTC +09:00)", () => {
    // 2026-05-29T10:30:00Z = JST 2026-05-29 19:30
    const { body } = renderIdentityDocumentPendingNotificationMail(
      baseIdentityPending,
    );
    expect(body).toContain("2026/05/29 19:30");
  });

  it("本文に ISO 文字列の生表示は含まれない", () => {
    const { body } = renderIdentityDocumentPendingNotificationMail(
      baseIdentityPending,
    );
    expect(body).not.toContain("2026-05-29T10:30:00Z");
  });

  it("本文に email / 電話 / document_type の値が含まれない (個人情報非露出)", () => {
    const { body } = renderIdentityDocumentPendingNotificationMail({
      ...baseIdentityPending,
      memberDisplayName: "プライバシー テスト",
    });
    expect(body).not.toContain("@");
    expect(body).not.toContain("080-");
    expect(body).not.toContain("090-");
    expect(body).not.toContain("070-");
    expect(body).not.toContain("運転免許証");
    expect(body).not.toContain("マイナンバー");
    expect(body).not.toContain("drivers_license");
    expect(body).not.toContain("my_number_card_masked");
  });

  it("本文に生 UUID 形式単独表示は出ない (URL 経由の含有は許可)", () => {
    const { subject, body } = renderIdentityDocumentPendingNotificationMail(
      baseIdentityPending,
    );
    expect(subject).not.toMatch(UUID_RE);
    const linesWithoutUrl = body
      .split("\n")
      .filter((line) => !line.includes("http"))
      .join("\n");
    expect(linesWithoutUrl).not.toMatch(UUID_RE);
  });

  it("UTC 深夜帯の入力が翌日 JST に正しく換算される", () => {
    // 2026-05-29T23:30:00Z = JST 2026-05-30 08:30
    const { body } = renderIdentityDocumentPendingNotificationMail({
      ...baseIdentityPending,
      uploadedAtIso: "2026-05-29T23:30:00Z",
    });
    expect(body).toContain("2026/05/30 08:30");
  });
});

describe("renderReservationPromotedMail", () => {
  it("件名に繰り上げ・予約番号を含む", () => {
    const { subject } = renderReservationPromotedMail(baseConfirmed);
    expect(subject).toContain("繰り上げ");
    expect(subject).toContain("#HQ-AB12-CD34");
  });

  it("本文に繰り上げ確定・イベント情報・参加費・LINE 導線を含む", () => {
    const { body } = renderReservationPromotedMail(baseConfirmed);
    expect(body).toContain("繰り上が");
    expect(body).toContain("ご予約が確定しました");
    expect(body).toContain("金曜の夜練 (中級〜)");
    expect(body).toContain("¥1,500");
    expect(body).toContain("LINE オープンチャット");
    expect(body).toContain("https://line.me/ti/g2/example");
  });

  it("同伴者ありのとき合計人数・合計金額を反映する", () => {
    const { body } = renderReservationPromotedMail({
      ...baseConfirmed,
      guestCount: 2,
    });
    expect(body).toContain("3 名");
    expect(body).toContain("¥4,500");
  });
});
