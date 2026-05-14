import { describe, expect, it } from "vitest";
import {
  buildCancelledInput,
  buildConfirmedInput,
  formatJstDateTime,
  formatJstRange,
  formatReservationDisplayId,
  type BuildUrls,
  type EventRow,
  type ReservationRow,
  type VenueRow,
} from "../_shared/reservation-mail-inputs.ts";

const URLS: BuildUrls = {
  reservationDetailUrl: "https://reservation.example/reservations/abc",
  eventDetailUrl: "https://reservation.example/events/xyz",
  lineOpenChatUrl: "https://line.me/ti/g2/example",
};

const baseReservation: ReservationRow = {
  id: "11111111-2222-3333-4444-555555555555",
  guest_count: 0,
  note: null,
  cancelled_at: null,
};

const baseEvent: EventRow = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  name: "金曜の夜練 (中級〜)",
  start_at: "2026-05-22T10:30:00.000Z", // = 2026-05-22 19:30 JST
  end_at: "2026-05-22T12:30:00.000Z", // = 2026-05-22 21:30 JST
  fee: 1500,
};

const baseVenue: VenueRow = {
  name: "新宿スポーツセンター 第 2 体育館",
  address: "東京都新宿区大久保 3-1-2",
  meeting_point: "正面玄関ロビーの High Q プラカード前",
  map_url: "https://maps.example.com/shinjuku-sports",
  default_fee: 1200,
};

describe("formatReservationDisplayId", () => {
  it("UUID を #HQ-XXXX-XXXX 形式に変換し、決定的に同一出力", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const a = formatReservationDisplayId(id);
    const b = formatReservationDisplayId(id);
    expect(a).toBe(b);
    expect(a).toMatch(/^#HQ-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it("Crockford Base32 アルファベット (I/L/O/U を除く 32 文字) のみを使う", () => {
    const id = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const out = formatReservationDisplayId(id);
    expect(out).not.toMatch(/[ILOU]/);
  });
});

describe("formatJstRange", () => {
  it("UTC ISO を JST の日本語日付 + 時刻範囲に整形する", () => {
    const out = formatJstRange(
      "2026-05-22T10:30:00.000Z",
      "2026-05-22T12:30:00.000Z",
    );
    // "2026年5月22日(金) 19:30〜21:30" 相当 (環境差で曜日や空白の細部は変動しうるため部分一致で検証)
    expect(out).toContain("2026");
    expect(out).toContain("5");
    expect(out).toContain("22");
    expect(out).toContain("19:30");
    expect(out).toContain("21:30");
    expect(out).toContain("〜");
  });

  it("UTC → JST のタイムゾーン換算が正しく機能する (深夜境界)", () => {
    // UTC 15:30 = JST 翌日 00:30
    const out = formatJstRange(
      "2026-05-22T15:30:00.000Z",
      "2026-05-22T17:30:00.000Z",
    );
    expect(out).toContain("23"); // JST 5/23
    expect(out).toContain("00:30");
    expect(out).toContain("02:30");
  });
});

describe("formatJstDateTime", () => {
  it("UTC ISO を JST の日本語日付 + 時刻 (range なし) に整形する", () => {
    const out = formatJstDateTime("2026-05-20T01:15:00.000Z"); // = 2026-05-20 10:15 JST
    expect(out).toContain("2026");
    expect(out).toContain("20");
    expect(out).toContain("10:15");
    expect(out).not.toContain("〜");
  });
});

describe("buildConfirmedInput", () => {
  it("DB row 群を ReservationConfirmedInput に変換する", () => {
    const out = buildConfirmedInput(baseReservation, baseEvent, baseVenue, URLS);

    expect(out.reservationDisplayId).toMatch(/^#HQ-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(out.eventName).toBe(baseEvent.name);
    expect(out.startAtJst).toContain("19:30");
    expect(out.startAtJst).toContain("21:30");
    expect(out.venueName).toBe(baseVenue.name);
    expect(out.venueAddress).toBe(baseVenue.address);
    expect(out.venueMeetingPoint).toBe(baseVenue.meeting_point);
    expect(out.venueMapUrl).toBe(baseVenue.map_url);
    expect(out.feePerPerson).toBe(1500);
    expect(out.guestCount).toBe(0);
    expect(out.note).toBeNull();
    expect(out.lineOpenChatUrl).toBe(URLS.lineOpenChatUrl);
    expect(out.reservationDetailUrl).toBe(URLS.reservationDetailUrl);
    expect(out.supportNote).toContain("迷惑メール");
  });

  it("event.fee が NULL のとき venue.default_fee を採用する", () => {
    const out = buildConfirmedInput(
      baseReservation,
      { ...baseEvent, fee: null },
      baseVenue,
      URLS,
    );
    expect(out.feePerPerson).toBe(baseVenue.default_fee);
  });

  it("event.fee も venue.default_fee も NULL のとき 0 にフォールバック", () => {
    const out = buildConfirmedInput(
      baseReservation,
      { ...baseEvent, fee: null },
      { ...baseVenue, default_fee: null },
      URLS,
    );
    expect(out.feePerPerson).toBe(0);
  });

  it("venues.address が NULL のとき空文字を返す (レンダラ側で住所欄が空表示になる)", () => {
    const out = buildConfirmedInput(
      baseReservation,
      baseEvent,
      { ...baseVenue, address: null },
      URLS,
    );
    expect(out.venueAddress).toBe("");
  });

  it("venues.meeting_point が NULL のとき null を保持する (レンダラ側で行が省略される)", () => {
    const out = buildConfirmedInput(
      baseReservation,
      baseEvent,
      { ...baseVenue, meeting_point: null },
      URLS,
    );
    expect(out.venueMeetingPoint).toBeNull();
  });
});

describe("buildCancelledInput", () => {
  const cancelledReservation: ReservationRow = {
    ...baseReservation,
    cancelled_at: "2026-05-20T01:15:00.000Z", // = 2026-05-20 10:15 JST
  };

  it("DB row 群を ReservationCancelledInput に変換する", () => {
    const out = buildCancelledInput(
      cancelledReservation,
      baseEvent,
      baseVenue,
      URLS,
    );
    expect(out.reservationDisplayId).toMatch(/^#HQ-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(out.eventName).toBe(baseEvent.name);
    expect(out.startAtJst).toContain("19:30");
    expect(out.venueName).toBe(baseVenue.name);
    expect(out.cancelledAtJst).toContain("10:15");
    expect(out.eventDetailUrl).toBe(URLS.eventDetailUrl);
    expect(out.lineOpenChatUrl).toBe(URLS.lineOpenChatUrl);
  });

  it("cancelled_at が NULL のとき例外を投げる (型ガード)", () => {
    expect(() =>
      buildCancelledInput(baseReservation, baseEvent, baseVenue, URLS),
    ).toThrow(/cancelled_at/);
  });
});
