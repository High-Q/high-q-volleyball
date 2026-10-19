## 1. client I/O 層の差し替え (`api/identity-document-client.ts`)

- [x] 1.1 `STORAGE_PATH_PLACEHOLDER` と `insertPendingRecord` / `confirmStoragePaths` を廃止し、実パス確定済みで 1 回だけ INSERT する `insertRecord({ id, memberId, documentType, frontPath, backPath })` を追加する（`storage_path_front` = frontPath、`storage_path_back` = backPath ?? null、`status='pending'`、`id` はクライアント採番値を明示指定）
- [x] 1.2 `buildStoragePath` は既存のまま（`<member_id>/<id>-<side>.<ext>`、拡張子導出も不変）を維持する。id はクライアント採番値を渡す
- [x] 1.3 `removeStorageObjects`（失敗時のオブジェクト撤去）は維持する。`rollbackRecord`（行 DELETE）は新手順では行が最後に作られるため不要 → 削除する
- [x] 1.4 `api/identity-document-client.spec.ts` を新 API に合わせて更新（INSERT payload に実パスが入ること / placeholder を使わないこと / INSERT が 1 回であること）

## 2. アップロード統括 composable の差し替え (`composables/useUploadIdentityDocument.ts`)

- [x] 2.1 `submit()` の手順を design D2 の順序へ差し替える: ①id 採番（`crypto.randomUUID()`）→ ②表裏パス組み立て → ③`Promise.all` で Storage 表裏並列 upload → ④両成功で `insertRecord` を 1 回実行 → ⑤upload 失敗時は成功側オブジェクトを撤去してエラー → ⑥INSERT 失敗時は表裏オブジェクトを撤去して `db_failed`
- [x] 2.2 スロット状態遷移（uploading / uploaded / error）と `UploadError` 種別（`storage_failed_front` / `storage_failed_back` / `db_failed` / `front_required` / `consent_required` 等）を新手順に合わせて保つ。確定 UPDATE 由来の分岐を除去する
- [x] 2.3 オーナー通知 fire-and-forget（`triggerIdentityDocumentPendingNotification`）は「行 INSERT 成功で `{ ok: true }` を返す直前」に発火する位置へ移す。ロールバック分岐では発火しない
- [x] 2.4 `useUploadIdentityDocument.spec.ts` を更新し、回帰テストを追加:
  - happy path（表面のみ / 表裏両方）で INSERT payload の `storage_path_*` が実パスであること、placeholder が使われないこと
  - **回帰**: 行が作成されるとき、その `storage_path_*` は upload 済み実パスと一致する（仮パス行が生成され得ない）
  - upload 失敗時に行が作られず成功側オブジェクトが撤去されること（`storage_failed_front` / `storage_failed_back`）
  - INSERT 失敗時に表裏オブジェクトが撤去され `db_failed` を返すこと、通知が発火しないこと
  - 通知発火位置（INSERT 成功後 1 回のみ、ロールバック分岐では発火なし）

## 3. 最終確認

- [x] 3.1 `pnpm exec vitest run`（reservation 対象）でユニット/コンポーネントテスト緑を確認
- [x] 3.2 `pnpm build:reservation` でビルド通過を確認
- [x] 3.3 FSD 境界・型・lint（対象アプリの既存 CI 相当）を確認し、Supabase client 直 import 等の規約違反が無いことを確認
