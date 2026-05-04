/**
 * `entities/identity-document` Public API。
 *
 * 外部 (features / pages / app) からは本ファイル経由でのみ import する。
 * model/* への直接 import はレイヤー境界違反とする。
 */

export type {
  DocumentType,
  IdentityDocumentId,
  UploadError,
  PageState,
  SlotState,
  SlotData,
  SubmitInput,
} from "./model/identity-document.types";
