import { describe, expect, it } from "vitest";
import {
  renderReservationCancelledMail,
  renderReservationConfirmedMail,
  renderReservationUpdatedMail,
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
