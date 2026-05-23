import { describe, expect, it } from "vitest";
import {
  appendCorrectionRequest,
  CORRECTION_FIELD_LABEL,
  getCorrectionRequests,
  hasCorrectionRequest,
  removeCorrectionRequests,
} from "./correction-requests.js";
import type { CorrectionRequest, MemberProfile } from "../types/entities.js";

const ADMIN_ID = "00000000-0000-0000-0000-0000000admin";

function makeRequest(
  field: CorrectionRequest["field"],
  message = "msg",
): CorrectionRequest {
  return {
    field,
    message,
    requested_at: "2026-05-23T10:00:00.000Z",
    requested_by: ADMIN_ID,
  };
}

describe("getCorrectionRequests", () => {
  it("undefined / null profile は空配列", () => {
    expect(getCorrectionRequests(null)).toEqual([]);
    expect(getCorrectionRequests(undefined)).toEqual([]);
  });

  it("correction_requests キー未定義は空配列", () => {
    expect(getCorrectionRequests({ signup_completed: true })).toEqual([]);
  });

  it("配列が入っていればそのまま返す", () => {
    const r = makeRequest("birthday");
    expect(getCorrectionRequests({ correction_requests: [r] })).toEqual([r]);
  });

  it("配列以外（型違反）が入っていても空配列で fallback", () => {
    const profile = {
      correction_requests: "not-an-array",
    } as unknown as MemberProfile;
    expect(getCorrectionRequests(profile)).toEqual([]);
  });
});

describe("removeCorrectionRequests", () => {
  it("該当 field のエントリのみ削除", () => {
    const profile: MemberProfile = {
      correction_requests: [
        makeRequest("birthday"),
        makeRequest("phone"),
        makeRequest("display_name"),
      ],
    };
    const result = removeCorrectionRequests(profile, ["phone"]);
    expect(result.correction_requests).toHaveLength(2);
    expect(result.correction_requests?.map((r) => r.field)).toEqual([
      "birthday",
      "display_name",
    ]);
  });

  it("複数 field を一度に削除", () => {
    const profile: MemberProfile = {
      correction_requests: [
        makeRequest("display_name"),
        makeRequest("nickname"),
        makeRequest("birthday"),
      ],
    };
    const result = removeCorrectionRequests(profile, ["display_name", "nickname"]);
    expect(result.correction_requests).toHaveLength(1);
    expect(result.correction_requests?.[0]?.field).toBe("birthday");
  });

  it("全件削除されたら correction_requests キー自体を削除", () => {
    const profile: MemberProfile = {
      signup_completed: true,
      correction_requests: [makeRequest("birthday")],
    };
    const result = removeCorrectionRequests(profile, ["birthday"]);
    expect(result).not.toHaveProperty("correction_requests");
    expect(result.signup_completed).toBe(true);
  });

  it("該当エントリ無しは元 profile を返す", () => {
    const profile: MemberProfile = {
      correction_requests: [makeRequest("birthday")],
    };
    const result = removeCorrectionRequests(profile, ["phone"]);
    expect(result.correction_requests).toEqual(profile.correction_requests);
  });

  it("null profile + fields は空 profile を返す", () => {
    expect(removeCorrectionRequests(null, ["birthday"])).toEqual({});
  });

  it("既存の他キーは保持される", () => {
    const profile: MemberProfile = {
      signup_completed: true,
      terms_agreed_at: "2026-01-01",
      correction_requests: [makeRequest("phone")],
    };
    const result = removeCorrectionRequests(profile, ["phone"]);
    expect(result.signup_completed).toBe(true);
    expect(result.terms_agreed_at).toBe("2026-01-01");
  });
});

describe("appendCorrectionRequest", () => {
  it("空配列に追加", () => {
    const result = appendCorrectionRequest({}, makeRequest("birthday"));
    expect(result.correction_requests).toHaveLength(1);
  });

  it("既存配列に append", () => {
    const profile: MemberProfile = {
      correction_requests: [makeRequest("birthday")],
    };
    const result = appendCorrectionRequest(profile, makeRequest("phone"));
    expect(result.correction_requests).toHaveLength(2);
  });

  it("同 field の重複は例外", () => {
    const profile: MemberProfile = {
      correction_requests: [makeRequest("birthday")],
    };
    expect(() =>
      appendCorrectionRequest(profile, makeRequest("birthday", "別の理由")),
    ).toThrow(/already exists/);
  });

  it("他キーを保持", () => {
    const result = appendCorrectionRequest(
      { signup_completed: true },
      makeRequest("birthday"),
    );
    expect(result.signup_completed).toBe(true);
    expect(result.correction_requests).toHaveLength(1);
  });
});

describe("hasCorrectionRequest", () => {
  it("該当 field が存在する", () => {
    const profile: MemberProfile = {
      correction_requests: [makeRequest("birthday")],
    };
    expect(hasCorrectionRequest(profile, "birthday")).toBe(true);
    expect(hasCorrectionRequest(profile, "phone")).toBe(false);
  });

  it("null profile は false", () => {
    expect(hasCorrectionRequest(null, "birthday")).toBe(false);
  });
});

describe("CORRECTION_FIELD_LABEL", () => {
  it("全 field に日本語ラベルがある", () => {
    expect(CORRECTION_FIELD_LABEL.birthday).toBe("生年月日");
    expect(CORRECTION_FIELD_LABEL.display_name).toBe("お名前");
    expect(CORRECTION_FIELD_LABEL.phone).toBe("電話番号");
    expect(CORRECTION_FIELD_LABEL.experience_level).toBe("経験レベル");
    expect(CORRECTION_FIELD_LABEL.nickname).toBe("ニックネーム");
  });
});
