/**
 * @high-q/shared — クロスアプリ共通パッケージの Public API。
 *
 * 各アプリは以下の形式で import する:
 *   import { createSupabaseClient, createEventId, type Event } from '@high-q/shared'
 *
 * サブエクスポートも利用可:
 *   import { ok, err } from '@high-q/shared/types'
 *   import { createSupabaseClient } from '@high-q/shared/api'
 */

export * from "./types/index.js";
export * from "./api/index.js";
