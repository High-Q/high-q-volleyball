import { describe, expect, it } from "vitest";
import {
  buildRejectMailBody,
  buildRejectMailtoHref,
  REJECT_MAIL_SUBJECT,
} from "./rejectMailBody";

describe("buildRejectMailBody", () => {
  it("memberName が冒頭の宛名に含まれる", () => {
    const body = buildRejectMailBody("田中太郎", "理由 X", 0);
    expect(body).toContain("田中太郎 様");
  });

  it("差し戻し理由が body に含まれる", () => {
    const body = buildRejectMailBody("田中", "画像が不鮮明で氏名が読めません", 0);
    expect(body).toContain("画像が不鮮明で氏名が読めません");
  });

  it("再提出 URL (https://reservation.high-q-volleyball.com/signup/identity) が含まれる", () => {
    const body = buildRejectMailBody("田中", "x", 0);
    expect(body).toContain(
      "https://reservation.high-q-volleyball.com/signup/identity",
    );
  });

  it("cancelledCount=0 のときキャンセル件数の言及が省略される", () => {
    const body = buildRejectMailBody("田中", "x", 0);
    expect(body).not.toContain("予約");
    expect(body).not.toContain("件をキャンセル");
  });

  it("cancelledCount=2 のとき body にキャンセル 2 件が含まれる", () => {
    const body = buildRejectMailBody("田中", "x", 2);
    expect(body).toContain("予約 2 件をキャンセル");
    expect(body).toContain("改めて予約をお願いします");
  });

  it("改行 (\\n) が body に含まれる", () => {
    const body = buildRejectMailBody("田中", "x", 0);
    expect(body).toContain("\n");
  });
});

describe("buildRejectMailtoHref", () => {
  it("mailto: で始まり memberEmail を含む", () => {
    const href = buildRejectMailtoHref(
      "user@example.com",
      "田中",
      "理由",
      0,
    );
    expect(href).toMatch(/^mailto:user@example\.com\?/);
  });

  it("subject パラメータが URL エンコード済で含まれる", () => {
    const href = buildRejectMailtoHref("u@x", "田中", "x", 0);
    const expectedSubject = encodeURIComponent(REJECT_MAIL_SUBJECT);
    expect(href).toContain(`subject=${expectedSubject}`);
  });

  it("body パラメータが URL エンコード済で含まれる (改行が %0A)", () => {
    const href = buildRejectMailtoHref("u@x", "田中", "理由 A", 0);
    expect(href).toContain("body=");
    // 改行コードが %0A としてエンコードされている
    expect(href).toContain("%0A");
  });

  it("差し戻し理由の日本語が URL エンコードされる", () => {
    const href = buildRejectMailtoHref("u@x", "田中", "画像不鮮明", 0);
    const expectedReasonEncoded = encodeURIComponent("画像不鮮明");
    expect(href).toContain(expectedReasonEncoded);
  });

  it("cancelledCount=2 のとき URL に 'キャンセル' エンコード済が含まれる", () => {
    const href = buildRejectMailtoHref("u@x", "田中", "x", 2);
    const expected = encodeURIComponent("予約 2 件をキャンセル");
    expect(href).toContain(expected);
  });
});
