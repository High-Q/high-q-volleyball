import { describe, expect, it } from "vitest";
import {
  loadMailPolicy,
  shouldSuppressSend,
  type EnvLike,
} from "../_shared/mailer-policy.ts";

function envOf(map: Record<string, string | undefined>): EnvLike {
  return { get: (name) => map[name] };
}

describe("loadMailPolicy", () => {
  it("未設定のとき suppress=false, allowList=null (本番デフォルト)", () => {
    const p = loadMailPolicy(envOf({}));
    expect(p.suppress).toBe(false);
    expect(p.allowList).toBeNull();
  });

  it("MAIL_SUPPRESS_SEND=true で suppress=true", () => {
    const p = loadMailPolicy(envOf({ MAIL_SUPPRESS_SEND: "true" }));
    expect(p.suppress).toBe(true);
  });

  it("MAIL_SUPPRESS_SEND の大文字小文字は寛容に解釈する", () => {
    expect(loadMailPolicy(envOf({ MAIL_SUPPRESS_SEND: "TRUE" })).suppress).toBe(
      true,
    );
    expect(loadMailPolicy(envOf({ MAIL_SUPPRESS_SEND: " True " })).suppress).toBe(
      true,
    );
  });

  it("MAIL_SUPPRESS_SEND=false / 任意値で suppress=false", () => {
    expect(loadMailPolicy(envOf({ MAIL_SUPPRESS_SEND: "false" })).suppress).toBe(
      false,
    );
    expect(loadMailPolicy(envOf({ MAIL_SUPPRESS_SEND: "1" })).suppress).toBe(
      false,
    );
  });

  it("MAIL_ALLOWED_RECIPIENTS を小文字化・trim して allowList にする", () => {
    const p = loadMailPolicy(
      envOf({ MAIL_ALLOWED_RECIPIENTS: " A@Example.com, b@x.io , " }),
    );
    expect(p.allowList).toEqual(["a@example.com", "b@x.io"]);
  });

  it("MAIL_ALLOWED_RECIPIENTS が空のとき allowList=null", () => {
    expect(
      loadMailPolicy(envOf({ MAIL_ALLOWED_RECIPIENTS: "" })).allowList,
    ).toBeNull();
    expect(
      loadMailPolicy(envOf({ MAIL_ALLOWED_RECIPIENTS: "   " })).allowList,
    ).toBeNull();
  });
});

describe("shouldSuppressSend", () => {
  it("policy.suppress=true なら宛先に関わらず true", () => {
    expect(
      shouldSuppressSend({ suppress: true, allowList: null }, "anyone@x.com"),
    ).toBe(true);
    expect(
      shouldSuppressSend(
        { suppress: true, allowList: ["anyone@x.com"] },
        "anyone@x.com",
      ),
    ).toBe(true);
  });

  it("allowList=null かつ suppress=false なら false (=送信される)", () => {
    expect(
      shouldSuppressSend(
        { suppress: false, allowList: null },
        "member@example.com",
      ),
    ).toBe(false);
  });

  it("allowList 指定時、宛先が含まれていれば false (=送信される)", () => {
    expect(
      shouldSuppressSend(
        { suppress: false, allowList: ["owner@example.com"] },
        "owner@example.com",
      ),
    ).toBe(false);
  });

  it("allowList 指定時、宛先が含まれていなければ true (=抑制)", () => {
    expect(
      shouldSuppressSend(
        { suppress: false, allowList: ["owner@example.com"] },
        "stranger@example.com",
      ),
    ).toBe(true);
  });

  it("宛先の比較は大文字小文字非依存・前後空白を無視する", () => {
    expect(
      shouldSuppressSend(
        { suppress: false, allowList: ["owner@example.com"] },
        "  Owner@Example.COM ",
      ),
    ).toBe(false);
  });
});
