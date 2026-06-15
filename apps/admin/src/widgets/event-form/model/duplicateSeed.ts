import type { Event } from "@high-q/shared";
import type { EventFormState } from "./eventFormSchema";
import { eventToState } from "./eventStateMapper";

/**
 * イベント複製のシード生成（純関数）。
 *
 * 複製は「別日の新規開催を作る」操作なので、会場・時間・参加費・タイトルは
 * 複製元から引き継ぎ、開催日だけは空にして必ず選び直させる。
 *
 * 関連:
 *   openspec/changes/admin-event-duplicate/specs/admin-event-duplicate/spec.md
 *   openspec/changes/admin-event-duplicate/design.md (D2, D3)
 */

/** 定例「ゆる練 vol.NN」シリーズ（suggestNextVolume が採番する対象）。 */
const YURU_REN_VOLUME_RE = /^ゆる練 vol\.\d+$/;

/**
 * 複製時のタイトルを解決する。
 *
 * `nextVolume` は `suggestNextVolume` が返す「ゆる練 vol.<全体最大+1>」または
 * undefined。複製元が同じ「ゆる練 vol.NN」シリーズのときだけ採番を適用する
 * （他シリーズに ゆる練 の番号を当てて接頭辞を壊さないため）。それ以外、または
 * 採番取得失敗（nextVolume が undefined）のときは複製元タイトルをそのまま返す。
 */
export function resolveDuplicateName(
  source: Event,
  nextVolume: string | undefined,
): string {
  if (nextVolume != null && YURU_REN_VOLUME_RE.test(source.name)) {
    return nextVolume;
  }
  return source.name;
}

/**
 * 複製元 Event と確定済みタイトルから、作成フォームのシード state を組み立てる。
 * 会場 / 開始時刻 / 終了時刻 / 参加費は複製元を引き継ぎ、開催日は空にする。
 */
export function seedFromEvent(source: Event, nextName: string): EventFormState {
  return {
    ...eventToState(source),
    date: "",
    name: nextName,
  };
}
