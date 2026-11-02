/**
 * #172 エクスポート準備ダイアログの表示用 DTO。
 */
export interface ExportDialogMember {
  id: string;
  name: string;
  /** DB プリフィルの電話番号（NULL は空文字）。 */
  phone: string;
}
