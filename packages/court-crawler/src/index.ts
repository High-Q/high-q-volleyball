/**
 * @high-q/court-crawler
 *
 * 公的施設予約サイトを定期 crawl し、対象条件に合う空き枠を検知して重複を
 * 排除しつつオーナーへ通知する共通基盤（Issue #286 / Epic #285）。
 *
 * 施設非依存の crawl コアを公開する。施設アダプタ（江東区スポーツネット等）と
 * オーケストレーション（crawl → reconcile → 通知）は後続タスクで結線する。
 */
export * from "./core/index.js";
