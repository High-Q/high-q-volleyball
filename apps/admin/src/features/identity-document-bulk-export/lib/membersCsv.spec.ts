import { describe, expect, it } from "vitest";
import { buildMembersCsv, calcAge, type CsvMemberInput } from "./membersCsv";

const asOf = new Date(2026, 10, 2); // 2026-11-02 (month は 0 始まり)

describe("calcAge", () => {
  it("誕生日が既に過ぎていれば満年齢", () => {
    expect(calcAge("2000-01-01", asOf)).toBe(26);
  });

  it("誕生日前日なら 1 歳少ない（境界）", () => {
    // asOf=2026-11-02、誕生日 11-03 はまだ来ていない
    expect(calcAge("2000-11-03", asOf)).toBe(25);
  });

  it("誕生日当日は加齢済み（境界）", () => {
    expect(calcAge("2000-11-02", asOf)).toBe(26);
  });

  it("未設定 / 空 / 不正は null", () => {
    expect(calcAge(null, asOf)).toBeNull();
    expect(calcAge("", asOf)).toBeNull();
    expect(calcAge("not-a-date", asOf)).toBeNull();
  });

  it("未来日付（負の年齢）は null", () => {
    expect(calcAge("2030-01-01", asOf)).toBeNull();
  });
});

describe("buildMembersCsv", () => {
  const members: CsvMemberInput[] = [
    {
      last_name: "田中",
      first_name: "太郎",
      birthday: "1984-04-01",
      phone: "090-1234-5678",
    },
    {
      last_name: "鈴木",
      first_name: "一郎",
      birthday: null,
      phone: null,
    },
  ];

  it("先頭に UTF-8 BOM が付く", () => {
    const csv = buildMembersCsv(members, asOf);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("ヘッダは 氏名/住所/年齢/電話番号 の順で役職名を含まない", () => {
    const csv = buildMembersCsv(members, asOf);
    const firstLine = csv.replace(/^﻿/, "").split("\r\n")[0];
    expect(firstLine).toBe("氏名,住所,年齢,電話番号");
    expect(csv).not.toContain("役職");
  });

  it("氏名は姓+名、住所は空欄、年齢は自動算出、電話は確認値", () => {
    const csv = buildMembersCsv(members, asOf);
    const lines = csv.replace(/^﻿/, "").split("\r\n");
    expect(lines[1]).toBe("田中 太郎,,42,090-1234-5678");
  });

  it("birthday / phone が NULL の行は年齢・電話が空欄", () => {
    const csv = buildMembersCsv(members, asOf);
    const lines = csv.replace(/^﻿/, "").split("\r\n");
    expect(lines[2]).toBe("鈴木 一郎,,,");
  });

  it("住所列は全行空欄", () => {
    const csv = buildMembersCsv(members, asOf);
    const lines = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean);
    // ヘッダを除く各データ行の 2 列目（住所）が空
    for (const line of lines.slice(1)) {
      expect(line.split(",")[1]).toBe("");
    }
  });

  it("区切り文字や引用符を含む値はエスケープされる", () => {
    const csv = buildMembersCsv(
      [{ last_name: "A,B", first_name: '"X"', birthday: null, phone: null }],
      asOf,
    );
    const lines = csv.replace(/^﻿/, "").split("\r\n");
    // 氏名 `A,B "X"` はカンマと引用符を含むため引用符で囲まれ、内部引用符は二重化
    expect(lines[1]).toBe('"A,B ""X""",,,');
  });
});
