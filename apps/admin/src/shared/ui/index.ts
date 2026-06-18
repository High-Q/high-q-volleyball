/**
 * shadcn-vue 由来プリミティブ（admin 配下）の Public API。
 *
 * 関連:
 *   openspec/changes/admin-reservation-ui-foundation/specs/shadcn-vue-integration/spec.md
 */

export { default as Input } from "./Input.vue";
export { default as Textarea } from "./Textarea.vue";
export { default as Label } from "./Label.vue";
export { default as FormField } from "./FormField.vue";

export { default as Table } from "./Table.vue";
export { default as TableHeader } from "./TableHeader.vue";
export { default as TableBody } from "./TableBody.vue";
export { default as TableRow } from "./TableRow.vue";
export { default as TableHead } from "./TableHead.vue";
export { default as TableCell } from "./TableCell.vue";
export { default as TableCaption } from "./TableCaption.vue";

export { default as Select } from "./Select.vue";
export { default as SelectTrigger } from "./SelectTrigger.vue";
export { default as SelectValue } from "./SelectValue.vue";
export { default as SelectContent } from "./SelectContent.vue";
export { default as SelectItem } from "./SelectItem.vue";

export { default as Skeleton } from "./Skeleton.vue";

// DataCardList (admin-mobile-responsive, #155) — モバイル時のテーブル→カード縦積み枠
export { default as DataCardList } from "./DataCardList.vue";

// AlertDialog group (admin-events-crud-screen, #86)
export { default as AlertDialog } from "./AlertDialog.vue";
export { default as AlertDialogTrigger } from "./AlertDialogTrigger.vue";
export { default as AlertDialogContent } from "./AlertDialogContent.vue";
export { default as AlertDialogHeader } from "./AlertDialogHeader.vue";
export { default as AlertDialogFooter } from "./AlertDialogFooter.vue";
export { default as AlertDialogTitle } from "./AlertDialogTitle.vue";
export { default as AlertDialogDescription } from "./AlertDialogDescription.vue";
export { default as AlertDialogAction } from "./AlertDialogAction.vue";
export { default as AlertDialogCancel } from "./AlertDialogCancel.vue";

// Dialog group (admin-identity-document-review, #171) — 画像プレビューモーダル等の汎用 modal
export { default as Dialog } from "./Dialog.vue";
export { default as DialogTrigger } from "./DialogTrigger.vue";
export { default as DialogContent } from "./DialogContent.vue";
export { default as DialogHeader } from "./DialogHeader.vue";
export { default as DialogFooter } from "./DialogFooter.vue";
export { default as DialogTitle } from "./DialogTitle.vue";
export { default as DialogDescription } from "./DialogDescription.vue";
export { default as DialogClose } from "./DialogClose.vue";

// Sheet group (admin-mobile-responsive, #155) — admin-shell モバイルナビ用ドロワー
export { default as Sheet } from "./Sheet.vue";
export { default as SheetTrigger } from "./SheetTrigger.vue";
export { default as SheetContent } from "./SheetContent.vue";
export { default as SheetClose } from "./SheetClose.vue";
export { default as SheetTitle } from "./SheetTitle.vue";
export { default as SheetDescription } from "./SheetDescription.vue";

// Toast group (admin-events-crud-screen, #86)
export { default as Toast } from "./Toast.vue";
export { default as Toaster } from "./Toaster.vue";
export { default as ToastProvider } from "./ToastProvider.vue";
export { default as ToastViewport } from "./ToastViewport.vue";
export { default as ToastTitle } from "./ToastTitle.vue";
export { default as ToastDescription } from "./ToastDescription.vue";
export { default as ToastClose } from "./ToastClose.vue";
export { useToast, type ToastOptions, type ToastEntry } from "./useToast";
