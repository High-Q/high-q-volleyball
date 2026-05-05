import { describe, expect, it } from "vitest";
import {
  buildMaskDeleteMailBody,
  buildMaskDeleteMailtoHref,
  MASK_DELETE_MAIL_SUBJECT,
} from "./maskDeleteMailBody";

describe("buildMaskDeleteMailBody", () => {
  it("memberName が冒頭の宛名に含まれる", () => {
    const body = buildMaskDeleteMailBody("田中太郎", 0);
    expect(body).toContain("田中太郎 様");
  });

  it("マスク不十分の文言が含まれる", () => {
    const body = buildMaskDeleteMailBody("田中", 0);
    expect(body).toContain("個人番号");
    expect(body).toContain("マスクが不十分");
    expect(body).toContain("Storage から完全削除");
  });

  it("再提出 URL が含まれる", () => {
    const body = buildMaskDeleteMailBody("田中", 0);
    expect(body).toContain(
      "https://reservation.high-q-volleyball.com/signup/identity",
    );
  });

  it("「サンプル比較」への誘導が含まれる", () => {
    const body = buildMaskDeleteMailBody("田中", 0);
    expect(body).toContain("サンプル比較");
  });

  it("cancelledCount=0 のときキャンセル件数の言及が省略される", () => {
    const body = buildMaskDeleteMailBody("田中", 0);
    expect(body).not.toContain("予約");
    expect(body).not.toContain("キャンセル");
  });

  it("cancelledCount=2 のとき body にキャンセル 2 件が含まれる", () => {
    const body = buildMaskDeleteMailBody("田中", 2);
    expect(body).toContain("予約 2 件をキャンセル");
  });

  it("改行 (\\n) が body に含まれる", () => {
    const body = buildMaskDeleteMailBody("田中", 0);
    expect(body).toContain("\n");
  });
});

describe("buildMaskDeleteMailtoHref", () => {
  it("mailto: で始まり memberEmail を含む", () => {
    const href = buildMaskDeleteMailtoHref("user@example.com", "田中", 0);
    expect(href).toMatch(/^mailto:user@example\.com\?/);
  });

  it("subject パラメータが URL エンコード済で含まれる", () => {
    const href = buildMaskDeleteMailtoHref("u@x", "田中", 0);
    const expected = encodeURIComponent(MASK_DELETE_MAIL_SUBJECT);
    expect(href).toContain(`subject=${expected}`);
  });

  it("body の改行が %0A としてエンコードされる", () => {
    const href = buildMaskDeleteMailtoHref("u@x", "田中", 0);
    expect(href).toContain("%0A");
  });

  it("cancelledCount=2 のとき URL に 'キャンセル' エンコード済が含まれる", () => {
    const href = buildMaskDeleteMailtoHref("u@x", "田中", 2);
    const expected = encodeURIComponent("予約 2 件をキャンセル");
    expect(href).toContain(expected);
  });
});
