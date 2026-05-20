import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemberId } from "@/entities/member";

const supabaseMock = {
  from: vi.fn(),
  auth: {
    updateUser: vi.fn(),
  },
};

const builderMock = {
  update: vi.fn(),
  eq: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.from.mockReturnValue(builderMock);
  builderMock.update.mockReturnValue(builderMock);
  builderMock.eq.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const memberId = createMemberId("00000000-0000-0000-0000-00000000ffff");

describe("updateMyName", () => {
  it("姓空欄は createLastName が例外を投げ、UPDATE 発行されない", async () => {
    const { updateMyName } = await import("./updateMyAccount");
    await expect(updateMyName(memberId, "  ", "美咲")).rejects.toThrow(
      /姓を入力してください/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("名空欄は createFirstName が例外を投げ、UPDATE 発行されない", async () => {
    const { updateMyName } = await import("./updateMyAccount");
    await expect(updateMyName(memberId, "田中", "  ")).rejects.toThrow(
      /名を入力してください/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("正常値は trim 済の姓・名で 1 回の UPDATE 発行 (display_name は指定しない)", async () => {
    const { updateMyName } = await import("./updateMyAccount");
    const result = await updateMyName(memberId, "  田中  ", "  美希  ");
    expect(result).toEqual({ lastName: "田中", firstName: "美希" });
    expect(builderMock.update).toHaveBeenCalledTimes(1);
    expect(builderMock.update).toHaveBeenCalledWith({
      last_name: "田中",
      first_name: "美希",
    });
    // display_name は明示指定しない (DB トリガで自動同期されるため)
    const updateCallArg = builderMock.update.mock.calls[0]?.[0] ?? {};
    expect(updateCallArg).not.toHaveProperty("display_name");
  });
});

describe("updateMyNickname", () => {
  it("空文字は NULL に変換して UPDATE 発行", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    const result = await updateMyNickname(memberId, "");
    expect(result).toBeNull();
    expect(builderMock.update).toHaveBeenCalledWith({ nickname: null });
  });

  it("null は NULL のまま UPDATE 発行", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    await updateMyNickname(memberId, null);
    expect(builderMock.update).toHaveBeenCalledWith({ nickname: null });
  });

  it("文字種違反は createNickname が例外を投げる", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    await expect(updateMyNickname(memberId, "たろ123")).rejects.toThrow(
      /日本語と英字のみ/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("16 文字以上は createNickname が例外を投げる", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    await expect(
      updateMyNickname(memberId, "a".repeat(16)),
    ).rejects.toThrow(/15 文字以内/);
  });

  it("正常値はそのまま UPDATE 発行", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    await updateMyNickname(memberId, "ミサキ");
    expect(builderMock.update).toHaveBeenCalledWith({ nickname: "ミサキ" });
  });
});

describe("updateMyPhone", () => {
  it("区切りなし入力は正規化して UPDATE 発行", async () => {
    const { updateMyPhone } = await import("./updateMyAccount");
    await updateMyPhone(memberId, "09098765432");
    expect(builderMock.update).toHaveBeenCalledWith({
      phone: "090-9876-5432",
    });
  });

  it("固定電話は createPhone が例外を投げる", async () => {
    const { updateMyPhone } = await import("./updateMyAccount");
    await expect(updateMyPhone(memberId, "03-1234-5678")).rejects.toThrow(
      /携帯電話番号/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("桁数不足は createPhone が例外を投げる", async () => {
    const { updateMyPhone } = await import("./updateMyAccount");
    await expect(updateMyPhone(memberId, "090-1234")).rejects.toThrow(
      /桁数/,
    );
  });
});

describe("requestMyEmailChange", () => {
  it("空欄を弾く", async () => {
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await expect(requestMyEmailChange("  ")).rejects.toThrow(
      /メールアドレスを入力してください/,
    );
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("形式不正を弾く", async () => {
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await expect(requestMyEmailChange("not-an-email")).rejects.toThrow(
      /形式/,
    );
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("正常値は supabase.auth.updateUser を呼び、members は触らない", async () => {
    supabaseMock.auth.updateUser.mockResolvedValueOnce({ error: null });
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await requestMyEmailChange("new@example.com");
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      email: "new@example.com",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("rate-limit エラーを日本語メッセージに変換", async () => {
    supabaseMock.auth.updateUser.mockResolvedValueOnce({
      error: { message: "Email rate limit exceeded" },
    });
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await expect(
      requestMyEmailChange("new@example.com"),
    ).rejects.toThrow(/送信回数の上限/);
  });
});
