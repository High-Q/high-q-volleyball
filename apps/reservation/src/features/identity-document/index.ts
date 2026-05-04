/**
 * `features/identity-document` Public API。
 *
 * 外部 (pages / app) からは本ファイル経由でのみ import する。
 * api/* / lib/* / composables/* への直接 import はレイヤー境界違反とする。
 */

export { useUploadIdentityDocument } from "./composables/useUploadIdentityDocument";
export type { UseUploadIdentityDocument, Side } from "./composables/useUploadIdentityDocument";

export { isHeicFile, convertHeicToJpeg } from "./lib/convertHeicToJpeg";
