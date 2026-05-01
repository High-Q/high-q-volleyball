/**
 * 会場名の短縮表示ヘルパー。
 *
 * モバイル / 一覧テーブル等の限られた幅で会場名を表示する際、共通する施設種別
 * 末尾（「スポーツセンター」「コミュニティセンター」等）を削り、地名等の主要部
 * のみを残す。
 *
 * 設計理由:
 * - 「先頭 2-3 文字」での切り出しは判断基準が無く、SaaS 化で他オーナーが任意の
 *   会場名を登録した時に挙動が安定しない（翔太郎くん 2026-05-01）
 * - suffix 削除なら「亀戸スポーツセンター → 亀戸」「江東文化センター → 江東文化」
 *   のように地名 + ジャンル名の構造を保ちつつ短縮できる
 * - 将来 venues テーブルに `short_name` 列を足したら、そちらが優先（本ヘルパー
 *   は fallback として残す）
 *
 * 関連: openspec/changes/admin-events-crud-screen/design.md
 */

/**
 * 削除対象の末尾サフィックス。長い順に並べる（先勝ち判定のため）。
 *
 * 公共施設の典型的な末尾語を網羅。「センター」単独はあえて含めない（"〇〇文化
 * センター" の "文化" が意味を持つため、"〇〇センター" → "〇〇" まで削るのは
 * 情報損失）。
 */
const VENUE_SUFFIXES = [
  "総合スポーツセンター",
  "スポーツセンター",
  "コミュニティセンター",
  "総合体育館",
  "コミュニティ",
  "区民センター",
  "区民館",
  "市民センター",
  "市民館",
  "公民館",
  "体育館",
  "ホール",
] as const;

/**
 * 会場名の主要部を返す。サフィックスが一致しない / 削ると空になる場合は元の
 * 名前をそのまま返す。
 */
export function shortenVenueName(name: string): string {
  if (!name) return name;
  for (const suffix of VENUE_SUFFIXES) {
    if (name.endsWith(suffix)) {
      const base = name.slice(0, -suffix.length).trim();
      if (base.length > 0) return base;
    }
  }
  return name;
}
