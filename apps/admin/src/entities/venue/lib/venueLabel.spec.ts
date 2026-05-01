import { describe, expect, it } from "vitest";
import { shortenVenueName } from "./venueLabel";

describe("shortenVenueName", () => {
  it.each([
    ["亀戸スポーツセンター", "亀戸"],
    ["深川北スポーツセンター", "深川北"],
    ["有明スポーツセンター", "有明"],
    ["東陽町コミュニティセンター", "東陽町"],
    ["江東文化センター", "江東文化センター"], // "センター"単独は削らない
    ["江東区総合スポーツセンター", "江東区"],
    ["第一体育館", "第一"],
    ["江東区民館", "江東"],
    ["麹町区民センター", "麹町"],
    ["北区民センター", "北"],
    ["江東公民館", "江東"],
    ["豊洲ホール", "豊洲"],
    ["亀戸", "亀戸"], // suffix 無し
    ["", ""], // 空文字は空のまま
  ])("'%s' → '%s'", (input, expected) => {
    expect(shortenVenueName(input)).toBe(expected);
  });

  it("削ると空になる場合は元の name を返す", () => {
    expect(shortenVenueName("スポーツセンター")).toBe("スポーツセンター");
    expect(shortenVenueName("体育館")).toBe("体育館");
  });

  it("先頭・末尾の空白は trim する", () => {
    expect(shortenVenueName("亀戸 スポーツセンター")).toBe("亀戸");
  });
});
