/**
 * features/identity-document-bulk-export の Public API。
 *
 * #172 役所提出用 本人確認書類一括ダウンロード。
 */

export {
  useMembersSelection,
  type UseMembersSelection,
} from "./composables/useMembersSelection";

export {
  useBulkExport,
  type UseBulkExport,
  type BulkExportInput,
  type BulkExportResult,
  type BulkExportError,
  type ExportPhase,
  type FailedImage,
  type MemberWithoutDocs,
} from "./composables/useBulkExport";

export { default as BulkExportToolbar } from "./ui/BulkExportToolbar.vue";
export { default as ExportResultDialog } from "./ui/ExportResultDialog.vue";
