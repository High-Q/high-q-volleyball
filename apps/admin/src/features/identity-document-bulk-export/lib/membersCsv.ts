/**
 * #172 会員名簿 CSV（江東区フォーマット + 年齢列）ビルダ。純粋関数。
 *
 * 列順: 氏名 / 住所 / 年齢 / 電話番号（役職名は含めない）。
 * - 氏名 = `last_name + ' ' + first_name`
 * - 住所 = 常に空欄（アプリは出力しない。エクスポート後に補記）
 * - 年齢 = birthday からエクスポート基準日時点の満年齢（未設定・算出不能は空欄）
 * - 電話番号 = 確認済み値（未設定は空欄）
 * UTF-8 BOM 付き・CRLF 区切りで Excel の文字化けを防ぐ。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 *   同 design.md (D3)
 */

export interface CsvMemberInput {
  last_name: string | null;
  first_name: string | null;
  /** ISO 8601 date（YYYY-MM-DD）。年齢算出の元。 */
  birthday: string | null;
  /** 確認済み電話番号。NULL / 未入力は空欄で出力。 */
  phone: string | null;
}

const BOM = "﻿";
const HEADER = ["氏名", "住所", "年齢", "電話番号"] as const;

/**
 * `birthday`（YYYY-MM-DD）から `asOf` 時点の満年齢を算出する。
 * タイムゾーンのズレを避けるため日付文字列を要素分解して計算する。
 * 未設定・パース不能・未来日付は null（＝CSV 空欄）。
 */
export function calcAge(
  birthday: string | null | undefined,
  asOf: Date,
): number | null {
  if (!birthday) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday);
  if (!m) return null;
  const by = Number(m[1]);
  const bmo = Number(m[2]);
  const bd = Number(m[3]);

  let age = asOf.getFullYear() - by;
  const monthDiff = asOf.getMonth() + 1 - bmo;
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < bd)) {
    age -= 1;
  }
  if (age < 0) return null;
  return age;
}

/** CSV セルのエスケープ: 区切り文字 / 引用符 / 改行を含むときのみ二重引用符で囲う。 */
function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function fullName(m: CsvMemberInput): string {
  return [m.last_name, m.first_name]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ");
}

/**
 * 会員名簿 CSV 文字列を生成する（BOM 付き・CRLF 区切り）。
 */
export function buildMembersCsv(
  members: CsvMemberInput[],
  asOf: Date,
): string {
  const rows: string[][] = [
    [...HEADER],
    ...members.map((m) => {
      const age = calcAge(m.birthday, asOf);
      return [
        fullName(m),
        "", // 住所: 常に空欄
        age === null ? "" : String(age),
        m.phone ?? "",
      ];
    }),
  ];

  const body = rows
    .map((cols) => cols.map(escapeCsvCell).join(","))
    .join("\r\n");

  return `${BOM}${body}\r\n`;
}
