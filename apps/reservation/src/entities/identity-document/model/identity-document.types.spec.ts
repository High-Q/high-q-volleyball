import { describe, it, expectTypeOf } from "vitest";
import type {
  DocumentType,
  IdentityDocumentId,
  UploadError,
  PageState,
  SlotState,
  SlotData,
  SubmitInput,
} from "./identity-document.types";

/**
 * 型レベル契約テスト。
 *
 * 関連: openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 *       (アップロード結果は Result 型で表現される / 状態モデル)
 */

describe("IdentityDocumentId / DocumentType (re-export from @high-q/shared)", () => {
  it("IdentityDocumentId は branded string", () => {
    type Result = IdentityDocumentId extends string ? true : false;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("DocumentType は 10 種の literal union", () => {
    const allTypes: DocumentType[] = [
      "drivers_license",
      "driving_history_cert",
      "residence_certificate",
      "disability_certificate",
      "residence_card",
      "special_permanent_resident_cert",
      "student_id",
      "passport",
      "my_number_card_masked",
      "health_insurance_cert",
    ];
    expectTypeOf(allTypes).toEqualTypeOf<DocumentType[]>();
  });
});

describe("UploadError union (9 種)", () => {
  it("9 種すべての値を許容する", () => {
    const all: UploadError[] = [
      "unsupported_format",
      "file_too_large",
      "consent_required",
      "front_required",
      "back_required",
      "storage_failed_front",
      "storage_failed_back",
      "db_failed",
      "network",
    ];
    expectTypeOf(all).toEqualTypeOf<UploadError[]>();
  });

  it("想定外の値はコンパイルエラー", () => {
    type HasUnknown = "unknown_error" extends UploadError ? true : false;
    expectTypeOf<HasUnknown>().toEqualTypeOf<false>();
  });
});

describe("PageState (4 種)", () => {
  it("4 種すべて許容", () => {
    const all: PageState[] = ["empty", "selecting", "submitting", "success"];
    expectTypeOf(all).toEqualTypeOf<PageState[]>();
  });
});

describe("SlotState (6 種)", () => {
  it("6 種すべて許容", () => {
    const all: SlotState[] = [
      "empty",
      "validating",
      "ready",
      "uploading",
      "uploaded",
      "error",
    ];
    expectTypeOf(all).toEqualTypeOf<SlotState[]>();
  });
});

describe("SlotData", () => {
  it("state / file / progress を持つ", () => {
    const slot: SlotData = {
      state: "empty",
      file: null,
      progress: 0,
    };
    expectTypeOf(slot).toMatchTypeOf<SlotData>();
  });

  it("errorMessage は任意", () => {
    const slot: SlotData = {
      state: "error",
      file: null,
      progress: 0,
      errorMessage: "ファイル形式が不正です",
    };
    expectTypeOf(slot).toMatchTypeOf<SlotData>();
  });
});

describe("SubmitInput", () => {
  it("frontFile は必須、backFile は任意、consented は必須", () => {
    const front = new File([""], "id.jpg", { type: "image/jpeg" });
    const minimal: SubmitInput = {
      documentType: "drivers_license",
      frontFile: front,
      consented: false,
    };
    expectTypeOf(minimal).toMatchTypeOf<SubmitInput>();

    const back = new File([""], "id-back.jpg", { type: "image/jpeg" });
    const full: SubmitInput = {
      documentType: "residence_card",
      frontFile: front,
      backFile: back,
      consented: false,
    };
    expectTypeOf(full).toMatchTypeOf<SubmitInput>();
  });
});
