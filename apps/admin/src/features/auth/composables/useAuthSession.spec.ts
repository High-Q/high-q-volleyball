import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp, defineComponent, h, nextTick, type App } from "vue";

const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const getAalMock = vi.fn();
const listMfaFactorsMock = vi.fn();
const checkIsAdminMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("../api/auth-client", () => ({
  getSession: () => getSessionMock(),
  onAuthStateChange: (cb: unknown) => onAuthStateChangeMock(cb),
  getAal: () => getAalMock(),
  listMfaFactors: () => listMfaFactorsMock(),
  checkIsAdmin: () => checkIsAdminMock(),
  signOut: () => signOutMock(),
}));

let testApp: App | null = null;

function provideAndConsume<T>(consume: () => T): T {
  let captured!: T;
  const Probe = defineComponent({
    setup() {
      captured = consume();
      return () => h("div");
    },
  });
  const app = createApp(Probe);
  // installAuthSession を呼ぶ前提のテストでは外側で plugin install してから呼ぶ
  app.mount(document.createElement("div"));
  testApp = app;
  return captured;
}

beforeEach(() => {
  vi.clearAllMocks();
  // デフォルトはセッションなし
  getSessionMock.mockResolvedValue(null);
  onAuthStateChangeMock.mockReturnValue({ unsubscribe: vi.fn() });
  getAalMock.mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal1" });
  listMfaFactorsMock.mockResolvedValue([]);
  checkIsAdminMock.mockResolvedValue(false);
  signOutMock.mockResolvedValue(undefined);
});

afterEach(() => {
  testApp?.unmount();
  testApp = null;
});

async function setupSession() {
  const { installAuthSession, useAuthSession } = await import(
    "./useAuthSession"
  );
  type Captured = ReturnType<typeof useAuthSession>;
  let captured: Captured | null = null;
  const Probe = defineComponent({
    setup() {
      captured = useAuthSession() as Captured;
      return () => h("div");
    },
  });
  const app = createApp(Probe);
  installAuthSession(app);
  app.mount(document.createElement("div"));
  testApp = app;
  const result = captured as Captured | null;
  if (result === null) {
    throw new Error("useAuthSession not captured");
  }
  return result;
}

describe("useAuthSession", () => {
  it("初期状態は loading で ready() を await すると解決する", async () => {
    getSessionMock.mockResolvedValue(null);

    const session = await setupSession();
    expect(session.status.value).toBe("loading");

    await session.ready();
    expect(session.status.value).toBe("unauthenticated");
  });

  it("session ありかつ aal2 なら is_admin() を呼んで authenticated", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "owner@x" },
      access_token: "t",
    });
    getAalMock.mockResolvedValue({ currentLevel: "aal2", nextLevel: "aal2" });
    checkIsAdminMock.mockResolvedValue(true);
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "verified" },
    ]);

    const session = await setupSession();
    await session.ready();

    expect(checkIsAdminMock).toHaveBeenCalledTimes(1);
    expect(session.status.value).toBe("authenticated");
    expect(session.aal.value).toBe("aal2");
    expect(session.isAdmin.value).toBe(true);
    expect(session.hasMfaFactor.value).toBe(true);
  });

  it("aal1 のときは is_admin() を呼ばず isAdmin は null のまま", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "u1" },
      access_token: "t",
    });
    getAalMock.mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal2" });
    listMfaFactorsMock.mockResolvedValue([]);

    const session = await setupSession();
    await session.ready();

    expect(checkIsAdminMock).not.toHaveBeenCalled();
    expect(session.aal.value).toBe("aal1");
    expect(session.isAdmin.value).toBeNull();
    expect(session.hasMfaFactor.value).toBe(false);
    expect(session.status.value).toBe("authenticated");
  });

  it("listMfaFactors の結果で hasMfaFactor が更新される (verified factor あり)", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u" }, access_token: "t" });
    getAalMock.mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal2" });
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "verified" },
    ]);

    const session = await setupSession();
    await session.ready();
    expect(session.hasMfaFactor.value).toBe(true);
  });

  it("unverified factor のみは hasMfaFactor=false", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u" }, access_token: "t" });
    getAalMock.mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal2" });
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "unverified" },
    ]);

    const session = await setupSession();
    await session.ready();
    expect(session.hasMfaFactor.value).toBe(false);
  });

  it("onAuthStateChange の SIGNED_OUT で unauthenticated に遷移", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "u1" },
      access_token: "t",
    });
    getAalMock.mockResolvedValue({ currentLevel: "aal2", nextLevel: "aal2" });
    checkIsAdminMock.mockResolvedValue(true);

    let stateCb: ((event: string, session: unknown) => void) | null = null;
    onAuthStateChangeMock.mockImplementation((cb) => {
      stateCb = cb as typeof stateCb;
      return { unsubscribe: vi.fn() };
    });

    const session = await setupSession();
    await session.ready();
    expect(session.status.value).toBe("authenticated");

    // SIGNED_OUT 後は getSession() が null を返すように切り替える
    getSessionMock.mockResolvedValue(null);

    stateCb!("SIGNED_OUT", null);
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    expect(session.status.value).toBe("unauthenticated");
    expect(session.isAdmin.value).toBeNull();
  });

  it("signOut() で signOut API が呼ばれて state がクリアされる", async () => {
    getSessionMock.mockResolvedValue({
      user: { id: "u1" },
      access_token: "t",
    });
    getAalMock.mockResolvedValue({ currentLevel: "aal2", nextLevel: "aal2" });
    checkIsAdminMock.mockResolvedValue(true);

    const session = await setupSession();
    await session.ready();

    await session.signOut();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(session.status.value).toBe("unauthenticated");
    expect(session.isAdmin.value).toBeNull();
    expect(session.aal.value).toBe("aal1");
  });

  it("ready() は同じ Promise を再利用して即解決する (idempotent)", async () => {
    getSessionMock.mockResolvedValue(null);

    const session = await setupSession();
    const p1 = session.ready();
    const p2 = session.ready();
    expect(p1).toBe(p2);
    await p1;
  });
});

describe("useAuthSession (未 install 時)", () => {
  it("install せずに inject すると例外", async () => {
    const { useAuthSession } = await import("./useAuthSession");
    expect(() => provideAndConsume(() => useAuthSession())).toThrow(
      /useAuthSession/i,
    );
  });
});
