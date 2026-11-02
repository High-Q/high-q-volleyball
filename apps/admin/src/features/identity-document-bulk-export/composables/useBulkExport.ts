import { ref, type Ref } from "vue";
import { type Result, ok, err } from "@high-q/shared";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import { fetchMembersForExport } from "@/entities/member";
import {
  fetchApprovedDocumentsByMemberIds,
  type ApprovedDocumentRow,
} from "@/entities/identity-document";
import { insertDownloadAudit } from "@/entities/identity-document-download";
import { getSupabase } from "@/shared/api/supabase";
import { buildMembersCsv, type CsvMemberInput } from "../lib/membersCsv";
import {
  buildIdentityDocumentsPdf,
  type PdfDocumentPage,
  type PdfPageImage,
} from "../lib/identityDocumentsPdf";
import { detectImageFormat } from "../lib/imageFormat";
import { saveBlob, buildZipFilename } from "../lib/saveBlob";

/**
 * #172 一括ダウンロードのオーケストレーション composable。
 *
 * 選択 member id → 名簿フィールド取得 → 承認済み書類取得 → 各画像を Storage から
 * Blob 取得（部分失敗は継続）→ CSV + PDF 生成 → ZIP 化 → ローカル保存 → 監査ログ INSERT。
 * 進捗と結果サマリを返す。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 *   同 design.md (D1, D5, D6, D8)
 */

const STORAGE_BUCKET = "identity-documents";
const CSV_FILENAME = "会員名簿.csv";
const PDF_FILENAME = "本人確認書類.pdf";

export type ExportPhase = "idle" | "running" | "done" | "error";

export interface BulkExportInput {
  selectedIds: MemberId[];
  /** ダイアログで確認・編集した電話番号（member id → 値）。未指定は DB 値を使う。 */
  phoneOverrides?: Record<string, string | null>;
  adminMemberId: MemberId;
  note?: string | null;
}

export interface FailedImage {
  documentId: IdentityDocumentId;
  path: string;
}

export interface MemberWithoutDocs {
  id: MemberId;
  name: string;
}

export interface BulkExportResult {
  /** PDF に実際に含めた書類数。 */
  includedDocumentCount: number;
  /** 名簿 CSV に載せた会員数（＝選択会員数）。 */
  rosterMemberCount: number;
  /** 承認済み書類ゼロで PDF 対象外となった会員。 */
  membersWithoutApprovedDocs: MemberWithoutDocs[];
  /** 取得・判定に失敗した画像。 */
  failedImages: FailedImage[];
  /** 監査ログ INSERT に成功したか。false なら手動記録を促す（D8）。 */
  auditLogged: boolean;
}

export interface BulkExportError {
  code: "ROSTER_FETCH_FAILED" | "DOCUMENTS_FETCH_FAILED";
  message: string;
}

export interface UseBulkExport {
  phase: Ref<ExportPhase>;
  progress: Ref<{ done: number; total: number }>;
  run: (
    input: BulkExportInput,
  ) => Promise<Result<BulkExportResult, BulkExportError>>;
}

function fullName(last: string | null, first: string | null): string {
  return [last, first]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ");
}

export function useBulkExport(): UseBulkExport {
  const phase = ref<ExportPhase>("idle");
  const progress = ref<{ done: number; total: number }>({ done: 0, total: 0 });

  async function run(
    input: BulkExportInput,
  ): Promise<Result<BulkExportResult, BulkExportError>> {
    phase.value = "running";
    progress.value = { done: 0, total: 0 };
    const asOf = new Date();

    // 1. 名簿フィールド取得（選択順に整列）
    const rosterRes = await fetchMembersForExport(input.selectedIds);
    if (!rosterRes.ok) {
      phase.value = "error";
      return err({ code: "ROSTER_FETCH_FAILED", message: rosterRes.error.message });
    }
    const rosterById = new Map(rosterRes.value.map((m) => [m.id, m]));
    const rosterOrdered = input.selectedIds
      .map((id) => rosterById.get(id))
      .filter((m): m is NonNullable<typeof m> => m != null);

    // 2. 承認済み書類取得
    const docsRes = await fetchApprovedDocumentsByMemberIds(input.selectedIds);
    if (!docsRes.ok) {
      phase.value = "error";
      return err({
        code: "DOCUMENTS_FETCH_FAILED",
        message: docsRes.error.message,
      });
    }
    const docsByMember = new Map<string, ApprovedDocumentRow[]>();
    for (const doc of docsRes.value) {
      const list = docsByMember.get(doc.member_id as unknown as string) ?? [];
      list.push(doc);
      docsByMember.set(doc.member_id as unknown as string, list);
    }

    // 3. 取得対象画像パスの総数を数えて進捗 total に設定
    const total = docsRes.value.reduce(
      (n, d) =>
        n + (d.storage_path_front ? 1 : 0) + (d.storage_path_back ? 1 : 0),
      0,
    );
    progress.value = { done: 0, total };

    // 4. CSV 会員行順に、各会員の各書類の画像を download（部分失敗は継続）
    const supabase = getSupabase();
    const pages: PdfDocumentPage[] = [];
    const failedImages: FailedImage[] = [];
    const includedDocIds: IdentityDocumentId[] = [];
    const includedMemberIds = new Set<MemberId>();
    const membersWithoutApprovedDocs: MemberWithoutDocs[] = [];

    for (const member of rosterOrdered) {
      const docs = docsByMember.get(member.id as unknown as string) ?? [];
      if (docs.length === 0) {
        membersWithoutApprovedDocs.push({
          id: member.id,
          name: fullName(member.last_name, member.first_name),
        });
        continue;
      }

      for (const doc of docs) {
        const paths = [doc.storage_path_front, doc.storage_path_back].filter(
          (p): p is string => typeof p === "string" && p.length > 0,
        );
        const images: PdfPageImage[] = [];
        for (const path of paths) {
          const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .download(path);
          progress.value = { done: progress.value.done + 1, total };
          if (error || !data) {
            failedImages.push({ documentId: doc.id, path });
            continue;
          }
          const bytes = new Uint8Array(await data.arrayBuffer());
          const format = detectImageFormat(bytes, path);
          if (format === null) {
            failedImages.push({ documentId: doc.id, path });
            continue;
          }
          images.push({ bytes, format });
        }

        if (images.length > 0) {
          pages.push({ documentTypeLabel: doc.document_type, images });
          includedDocIds.push(doc.id);
          includedMemberIds.add(doc.member_id);
        }
      }
    }

    // 5. PDF 生成（含める書類が無い場合も valid な 1 ページを作る）
    const pdfPages: PdfDocumentPage[] =
      pages.length > 0
        ? pages
        : [{ documentTypeLabel: "No approved documents", images: [] }];
    const pdfBytes = await buildIdentityDocumentsPdf(pdfPages);

    // 6. CSV 生成（住所は空欄、年齢は birthday から自動、電話は確認値）
    const csvMembers: CsvMemberInput[] = rosterOrdered.map((m) => {
      const key = m.id as unknown as string;
      const phone =
        input.phoneOverrides && key in input.phoneOverrides
          ? input.phoneOverrides[key]
          : m.phone;
      return {
        last_name: m.last_name,
        first_name: m.first_name,
        birthday: m.birthday,
        phone: phone ?? null,
      };
    });
    const csv = buildMembersCsv(csvMembers, asOf);

    // 7. ZIP 化してローカル保存
    const JSZipMod = await import("jszip");
    const JSZip = JSZipMod.default;
    const zip = new JSZip();
    zip.file(CSV_FILENAME, csv);
    zip.file(PDF_FILENAME, pdfBytes);
    const blob = await zip.generateAsync({ type: "blob" });
    saveBlob(blob, buildZipFilename(asOf));

    // 8. 監査ログ INSERT（実含有集合で記録。失敗してもダウンロードは成立）
    const auditRes = await insertDownloadAudit({
      downloaded_by: input.adminMemberId,
      member_ids: [...includedMemberIds],
      document_ids: includedDocIds,
      note: input.note ?? null,
    });

    phase.value = "done";
    return ok({
      includedDocumentCount: includedDocIds.length,
      rosterMemberCount: rosterOrdered.length,
      membersWithoutApprovedDocs,
      failedImages,
      auditLogged: auditRes.ok,
    });
  }

  return { phase, progress, run };
}
