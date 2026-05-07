import { describe, expect, it } from "vitest";
import { buildMapUrl } from "./build-map-url";

describe("buildMapUrl", () => {
  it("mapUrl が登録済ならそのまま返す", () => {
    expect(
      buildMapUrl({
        name: "亀戸スポーツセンター",
        address: "東京都江東区亀戸2-35-7",
        mapUrl: "https://maps.example.com/kameido",
      }),
    ).toBe("https://maps.example.com/kameido");
  });

  it("mapUrl が空文字列のときは Google Maps fallback に進む", () => {
    const url = buildMapUrl({
      name: "板橋区立体育館",
      address: null,
      mapUrl: "",
    });
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  });

  it("mapUrl が NULL のとき Google Maps 検索 URL に会場名 + 住所がエンコードされて入る", () => {
    const url = buildMapUrl({
      name: "亀戸スポーツセンター",
      address: "東京都江東区亀戸2-35-7",
      mapUrl: null,
    });
    expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(
      true,
    );
    expect(url).toContain(encodeURIComponent("亀戸スポーツセンター 東京都江東区亀戸2-35-7"));
  });

  it("address が NULL のときクエリは会場名のみ", () => {
    const url = buildMapUrl({
      name: "板橋区立体育館",
      address: null,
      mapUrl: null,
    });
    expect(url).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("板橋区立体育館")}`,
    );
  });

  it("address が空文字列のときも会場名のみ", () => {
    const url = buildMapUrl({
      name: "板橋区立体育館",
      address: "",
      mapUrl: null,
    });
    expect(url).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("板橋区立体育館")}`,
    );
  });
});
