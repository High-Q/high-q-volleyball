import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReservationId } from "@high-q/shared";

const cancelByAdminMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/entities/reservation", () => ({
  cancelByAdmin: (...args: unknown[]) => cancelByAdminMock(...args),
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const RID = "00000000-0000-0000-0000-00000000a001" as unknown as ReservationId;

describe("useReservationCancelByAdmin — open/cancel", () => {
  it("初期状態は閉じていてエラーなし", async () => {
    const { useReservationCancelByAdmin } = await import(
      "./useReservationCancelByAdmin"
    );
    const c = useReservationCancelByAdmin(RID);
    expect(c.isOpen.value).toBe(false);
    expect(c.cancelError.value).toBeNull();
  });

  it("open() で isOpen=true になり、過去のエラーをクリアする", async () => {
    const { useReservationCancelByAdmin } = await import(
      "./useReservationCancelByAdmin"
    );
    const c = useReservationCancelByAdmin(RID);
    c.cancelError.value = { code: "NETWORK_ERROR", message: "" };
    c.open();
    expect(c.isOpen.value).toBe(true);
    expect(c.cancelError.value).toBeNull();
  });

  it("cancel() で isOpen=false になり、mutation は発行されない", async () => {
    const { useReservationCancelByAdmin } = await import(
      "./useReservationCancelByAdmin"
    );
    const c = useReservationCancelByAdmin(RID);
    c.open();
    c.cancel();
    expect(c.isOpen.value).toBe(false);
    expect(cancelByAdminMock).not.toHaveBeenCalled();
  });
});

describe("useReservationCancelByAdmin — confirm 成功", () => {
  it("成功時に Toast を出し、Dialog を閉じ、onSuccess を呼ぶ", async () => {
    cancelByAdminMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationCancelByAdmin } = await import(
      "./useReservationCancelByAdmin"
    );
    const c = useReservationCancelByAdmin(RID);
    const onSuccess = vi.fn();
    c.open();

    await c.confirm(onSuccess);

    expect(cancelByAdminMock).toHaveBeenCalledWith(RID);
    expect(c.isOpen.value).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "キャンセルしました" }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("成功時に isCancelling が false に戻る", async () => {
    cancelByAdminMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationCancelByAdmin } = await import(
      "./useReservationCancelByAdmin"
    );
    const c = useReservationCancelByAdmin(RID);
    c.open();
    await c.confirm();
    expect(c.isCancelling.value).toBe(false);
  });
});

describe("useReservationCancelByAdmin — confirm 失敗", () => {
  it("失敗時に inline error を保持し、Dialog は開いたまま", async () => {
    cancelByAdminMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    const { useReservationCancelByAdmin } = await import(
      "./useReservationCancelByAdmin"
    );
    const c = useReservationCancelByAdmin(RID);
    const onSuccess = vi.fn();
    c.open();

    await c.confirm(onSuccess);

    expect(c.isOpen.value).toBe(true);
    expect(c.cancelError.value).toEqual({
      code: "NETWORK_ERROR",
      message: "",
    });
    expect(toastMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("失敗後に再度 open すると過去のエラーがクリアされる", async () => {
    cancelByAdminMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    const { useReservationCancelByAdmin } = await import(
      "./useReservationCancelByAdmin"
    );
    const c = useReservationCancelByAdmin(RID);
    c.open();
    await c.confirm();
    expect(c.cancelError.value).not.toBeNull();
    c.open();
    expect(c.cancelError.value).toBeNull();
  });
});

describe("getCancelErrorMessage", () => {
  it("既知の code を日本語メッセージに変換", async () => {
    const { getCancelErrorMessage } = await import(
      "./useReservationCancelByAdmin"
    );
    expect(
      getCancelErrorMessage({ code: "NETWORK_ERROR", message: "" }),
    ).toContain("通信");
    expect(
      getCancelErrorMessage({ code: "PERMISSION_DENIED", message: "" }),
    ).toContain("権限");
  });
});
