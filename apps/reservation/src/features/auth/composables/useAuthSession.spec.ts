import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h } from "vue";

const getSessionMock = vi.fn();
const signOutMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const fetchMyMemberMock = vi.fn();
const fetchHasIdentityDocumentMock = vi.fn();

vi.mock("../api/auth-client", () => ({
  getSession: () => getSessionMock(),
  signOut: () => signOutMock(),
  onAuthStateChange: (cb: unknown) => onAuthStateChangeMock(cb),
}));

vi.mock("@/entities/member", async () => {
  const actual =
    await vi.importActual<typeof import("@/entities/member")>("@/entities/member");
  return {
    ...actual,
    fetchMyMember: (uid: string) => fetchMyMemberMock(uid),
    fetchHasIdentityDocument: (uid: string) =>
      fetchHasIdentityDocumentMock(uid),
  };
});

const sessionFixture = {
  user: { id: "00000000-0000-0000-0000-000000000001", email: "x@example.com" },
  access_token: "token",
} as unknown;

const memberFixture = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "x@example.com",
  displayName: "x",
  birthday: "2000-01-01",
  phone: "090-0000-0000",
  experienceLevel: "beginner",
  role: "member",
  profile: { signup_completed: true },
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  onAuthStateChangeMock.mockReturnValue({ unsubscribe: vi.fn() });
  fetchHasIdentityDocumentMock.mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function setupSession() {
  const { installAuthSession, useAuthSession } = await import("./useAuthSession");
  let captured!: ReturnType<typeof useAuthSession>;
  const app = createApp({
    setup() {
      captured = useAuthSession();
      return () => h("div");
    },
  });
  installAuthSession(app);
  app.mount(document.createElement("div"));
  return captured;
}

describe("useAuthSession", () => {
  it("初期状態は loading", async () => {
    getSessionMock.mockImplementation(() => new Promise(() => {}));
    const session = await setupSession();
    expect(session.status.value).toBe("loading");
  });

  it("session なしで unauthenticated に遷移", async () => {
    getSessionMock.mockResolvedValue(null);
    const session = await setupSession();
    await session.ready();
    expect(session.status.value).toBe("unauthenticated");
    expect(session.member.value).toBeNull();
    expect(session.isProfileComplete.value).toBe(false);
    expect(session.hasIdentityDocument.value).toBe(false);
  });

  it("session あり + member 取得成功で authenticated に遷移", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue(memberFixture);
    const session = await setupSession();
    await session.ready();
    expect(session.status.value).toBe("authenticated");
    expect(session.member.value).toEqual(memberFixture);
    expect(session.isProfileComplete.value).toBe(true);
  });

  it("プロフィール未完成 (signup_completed != true) で isProfileComplete=false", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue({
      ...memberFixture,
      profile: { signup_completed: false },
    });
    const session = await setupSession();
    await session.ready();
    expect(session.status.value).toBe("authenticated");
    expect(session.isProfileComplete.value).toBe(false);
  });

  it("member fetch がエラーでも authenticated 遷移 (member は null)", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockRejectedValue(new Error("boom"));
    const session = await setupSession();
    await session.ready();
    expect(session.status.value).toBe("authenticated");
    expect(session.member.value).toBeNull();
    expect(session.isProfileComplete.value).toBe(false);
  });

  it("signOut() で state がクリアされる", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue(memberFixture);
    signOutMock.mockResolvedValue(undefined);
    const session = await setupSession();
    await session.ready();
    await session.signOut();
    expect(session.status.value).toBe("unauthenticated");
    expect(session.member.value).toBeNull();
  });

  it("ready() Promise が初回 evaluate 完了を待つ", async () => {
    let resolve!: (v: unknown) => void;
    getSessionMock.mockImplementation(
      () => new Promise((r) => (resolve = r as typeof resolve)),
    );
    const session = await setupSession();
    const p = session.ready();
    expect(session.status.value).toBe("loading");
    resolve(null);
    await p;
    expect(session.status.value).toBe("unauthenticated");
  });

  it("refresh() で再 evaluate", async () => {
    getSessionMock.mockResolvedValueOnce(null);
    const session = await setupSession();
    await session.ready();
    expect(session.status.value).toBe("unauthenticated");

    getSessionMock.mockResolvedValueOnce(sessionFixture);
    fetchMyMemberMock.mockResolvedValueOnce(memberFixture);
    await session.refresh();
    expect(session.status.value).toBe("authenticated");
  });

  it("onAuthStateChange が install 時に登録される", async () => {
    getSessionMock.mockResolvedValue(null);
    await setupSession();
    expect(onAuthStateChangeMock).toHaveBeenCalled();
  });

  // #254 / #255 退会フロー: 退会済み会員 (session 有 + members 不在) を検知して
  // 自動 signOut + /login?error=member_not_found 遷移する挙動を担保する。
  describe("退会済み会員の自動 signOut (member fetch が null)", () => {
    let assignMock: ReturnType<typeof vi.fn>;
    let originalLocation: Location;

    beforeEach(() => {
      assignMock = vi.fn();
      originalLocation = window.location;
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          pathname: "/profile",
          search: "",
          assign: assignMock,
        },
      });
    });

    afterEach(() => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    });

    it("session あり + fetchMyMember が null → signOut + /login?error=member_not_found 遷移", async () => {
      getSessionMock.mockResolvedValue(sessionFixture);
      fetchMyMemberMock.mockResolvedValue(null);
      signOutMock.mockResolvedValue(undefined);
      const session = await setupSession();
      await session.ready();

      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(session.status.value).toBe("unauthenticated");
      expect(session.member.value).toBeNull();
      expect(assignMock).toHaveBeenCalledWith("/login?error=member_not_found");
    });

    it("既に /login?error=member_not_found に居る場合は再遷移しない", async () => {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: {
          pathname: "/login",
          search: "?error=member_not_found",
          assign: assignMock,
        },
      });
      getSessionMock.mockResolvedValue(sessionFixture);
      fetchMyMemberMock.mockResolvedValue(null);
      signOutMock.mockResolvedValue(undefined);
      const session = await setupSession();
      await session.ready();

      expect(signOutMock).toHaveBeenCalled();
      expect(assignMock).not.toHaveBeenCalled();
    });

    it("fetchMyMember rejected (取得失敗) のときは自動 signOut しない (既存挙動を維持)", async () => {
      getSessionMock.mockResolvedValue(sessionFixture);
      fetchMyMemberMock.mockRejectedValue(new Error("network"));
      const session = await setupSession();
      await session.ready();

      expect(signOutMock).not.toHaveBeenCalled();
      expect(session.status.value).toBe("authenticated");
      expect(assignMock).not.toHaveBeenCalled();
    });
  });
});

describe("useAuthSession.hasIdentityDocument", () => {
  it("session 確立時に identity_documents の存在を fetch する", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue(memberFixture);
    fetchHasIdentityDocumentMock.mockResolvedValue(true);
    const session = await setupSession();
    await session.ready();
    expect(fetchHasIdentityDocumentMock).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
    );
    expect(session.hasIdentityDocument.value).toBe(true);
  });

  it("0 件なら hasIdentityDocument=false", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue(memberFixture);
    fetchHasIdentityDocumentMock.mockResolvedValue(false);
    const session = await setupSession();
    await session.ready();
    expect(session.hasIdentityDocument.value).toBe(false);
  });

  it("fetch エラー時は安全側 (false) に倒す", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue(memberFixture);
    fetchHasIdentityDocumentMock.mockRejectedValue(new Error("boom"));
    const session = await setupSession();
    await session.ready();
    expect(session.hasIdentityDocument.value).toBe(false);
  });

  it("refresh() で再取得", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue(memberFixture);
    fetchHasIdentityDocumentMock.mockResolvedValueOnce(false);
    const session = await setupSession();
    await session.ready();
    expect(session.hasIdentityDocument.value).toBe(false);

    fetchHasIdentityDocumentMock.mockResolvedValueOnce(true);
    await session.refresh();
    expect(session.hasIdentityDocument.value).toBe(true);
  });

  it("signOut() で false にリセット", async () => {
    getSessionMock.mockResolvedValue(sessionFixture);
    fetchMyMemberMock.mockResolvedValue(memberFixture);
    fetchHasIdentityDocumentMock.mockResolvedValue(true);
    signOutMock.mockResolvedValue(undefined);
    const session = await setupSession();
    await session.ready();
    expect(session.hasIdentityDocument.value).toBe(true);

    await session.signOut();
    expect(session.hasIdentityDocument.value).toBe(false);
  });
});
