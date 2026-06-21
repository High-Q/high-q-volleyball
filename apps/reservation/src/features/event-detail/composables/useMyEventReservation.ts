import { ref, watch, type Ref } from "vue";
import { unsafeMemberId } from "@high-q/shared";
import { useAuthSession } from "@/features/auth";
import {
  fetchMyEventReservation,
  type MyEventReservation,
} from "@/entities/reservation";

export type UseMyEventReservationReturn = {
  myReservation: Ref<MyEventReservation | null>;
  /**
   * 取得が成功して結果が確定したか。取得前 / 取得失敗時は false。
   * CTA は本フラグが false の間はキャンセル待ち導線を出さず安全側 (満員なら無効表示) に倒す。
   */
  resolved: Ref<boolean>;
  loading: Ref<boolean>;
  reload: () => Promise<void>;
  /** 登録成功後の楽観的更新用。確定済みとして扱う */
  setLocal: (r: MyEventReservation | null) => void;
};

/**
 * イベント詳細画面で、当該会員自身の当該イベントに対する予約状態を取得する composable。
 *
 * - CTA 分岐 (未登録 / 予約済み / キャンセル待ち登録済み) を駆動する。
 * - 取得失敗時は `resolved=false` のままにし、CTA を「未登録」扱いにしない (安全側)。
 *
 * 関連:
 *   openspec/changes/reservation-waitlist-registration/specs/reservation-waitlist-registration/spec.md
 *   (「自己予約状態の取得」要件)
 */
export function useMyEventReservation(
  eventIdRef: Ref<string>,
): UseMyEventReservationReturn {
  const session = useAuthSession();
  const myReservation = ref<MyEventReservation | null>(null);
  const resolved = ref<boolean>(false);
  const loading = ref<boolean>(false);

  async function reload(): Promise<void> {
    const m = session.member.value;
    const eventId = eventIdRef.value;
    if (m === null || eventId === "") {
      myReservation.value = null;
      resolved.value = false;
      return;
    }
    loading.value = true;
    resolved.value = false;
    try {
      const result = await fetchMyEventReservation(
        eventId,
        unsafeMemberId(m.id as unknown as string),
      );
      myReservation.value = result;
      resolved.value = true;
    } catch {
      // 取得失敗は安全側: 未登録扱いにせず resolved=false のまま (CTA は従来の無効表示へ倒れる)
      myReservation.value = null;
      resolved.value = false;
    } finally {
      loading.value = false;
    }
  }

  function setLocal(r: MyEventReservation | null): void {
    myReservation.value = r;
    resolved.value = true;
  }

  watch(
    [eventIdRef, () => session.member.value],
    () => {
      void reload();
    },
    { immediate: true },
  );

  return { myReservation, resolved, loading, reload, setLocal };
}
