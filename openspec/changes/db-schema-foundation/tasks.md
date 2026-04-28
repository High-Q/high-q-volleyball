## 1. SQL Migration 作成

- [x] 1.1 `supabase/migrations/20260428XXXXXX_db_schema_foundation.sql` を作成 (timestamp は適用時刻)
- [x] 1.2 venues テーブル作成 (id / name UNIQUE / address / default_fee / access_note / map_url / is_primary / timestamps)
- [x] 1.3 venues に partial unique index `venues_single_primary_idx` (where is_primary = true)
- [x] 1.4 events から `location` 列を DROP / 列追加: `venue_id` (uuid NOT NULL, FK → venues, ON DELETE RESTRICT) / `fee` / `visibility` (CHECK in draft/published/private, default draft) / `cancel_deadline`
- [x] 1.5 events に index 追加: `venue_id` の B-tree
- [x] 1.6 members に列追加: `birthday` (date NOT NULL, placeholder default `current_date`) / `phone` / `experience_level` (CHECK in beginner/intermediate/experienced, default beginner)
- [x] 1.7 reservations に列追加: `guest_count` (smallint NOT NULL default 0, CHECK 0..5) / `phone_at_booking` / `checked_in_at` / `cancelled_at`
- [x] 1.8 reservations.status の CHECK 制約を更新して `'waitlist'` を含む 5 値に拡張
- [x] 1.9 reservations に index 追加: `(event_id, status)` の B-tree
- [x] 1.10 reservations に トリガー `set_reservations_cancelled_at` 追加 (status='cancelled' 時に cancelled_at = now())
- [x] 1.11 identity_documents テーブル作成 (id / member_id FK CASCADE / document_type CHECK 10 値 / storage_path / status CHECK 3 値 / rejection_reason / uploaded_at / reviewed_at / reviewed_by FK SET NULL)
- [x] 1.12 identity_documents に index 追加: `member_id` B-tree、`status` partial where status='pending'
- [x] 1.13 主要 5 会場の seed INSERT (具体値は design.md D9 の表に従う・`ON CONFLICT (name) DO NOTHING`)。**events.venue_id NOT NULL 化の前に必ず実行**する。有明会場の name / address は秘匿された値 (駅住所) で投入する
- [x] 1.14 ロールバック手順をファイル末尾コメントに記載

## 2. RLS ポリシー追加

- [x] 2.1 venues: ENABLE ROW LEVEL SECURITY
- [x] 2.2 venues SELECT ポリシー (USING true)
- [x] 2.3 venues INSERT/UPDATE/DELETE ポリシー (is_admin())
- [x] 2.4 identity_documents: ENABLE ROW LEVEL SECURITY
- [x] 2.5 identity_documents SELECT ポリシー (auth.uid() = member_id OR is_admin())
- [x] 2.6 identity_documents INSERT ポリシー (auth.uid() = member_id)
- [x] 2.7 identity_documents UPDATE ポリシー — メンバー: storage_path のみ更新可 / admin: status/rejection_reason/reviewed_at/reviewed_by 更新可
- [x] 2.8 identity_documents DELETE ポリシー (auth.uid() = member_id OR is_admin())

## 3. Supabase Storage バケット & ポリシー

- [x] 3.1 Storage バケット `identity-documents` 作成 (private)
- [x] 3.2 storage.objects に identity-documents 用 RLS ポリシー (SELECT)
- [x] 3.3 storage.objects に identity-documents 用 RLS ポリシー (INSERT)
- [x] 3.4 storage.objects に identity-documents 用 RLS ポリシー (UPDATE / DELETE)
- [x] 3.5 バケット public フラグが false であることを確認

## 4. TypeScript エンティティ型と Branded Types

- [x] 4.1 `packages/shared/src/entities/venue/types.ts` 作成: `VenueId` Branded Type + `Venue` 行型 + `createVenueId()` smart constructor
- [x] 4.2 `packages/shared/src/entities/identity-document/types.ts` 作成: `IdentityDocumentId` + `IdentityDocument` + `DocumentType` enum + `createIdentityDocumentId()`
- [x] 4.3 既存 `Event` / `Member` / `Reservation` 型を拡張列に合わせて更新
- [x] 4.4 `packages/shared/src/entities/index.ts` で Public API export を更新
- [x] 4.5 Vitest: Branded Type の混入防止テスト (VenueId に EventId を渡したら型エラー)
- [x] 4.6 Vitest: smart constructor の UUID バリデーションテスト

## 5. RLS 振る舞いテスト (Vitest + Supabase client)

- [ ] 5.1 venues: anon で SELECT → 全件返る
- [ ] 5.2 venues: member で INSERT → 拒否
- [ ] 5.3 venues: admin で INSERT → 成功
- [ ] 5.4 identity_documents: 自分の SELECT → 1 行
- [ ] 5.5 identity_documents: 他人の id を指定して SELECT → 0 行
- [ ] 5.6 identity_documents: 自己 status='approved' UPDATE → 拒否
- [ ] 5.7 identity_documents: admin で status='approved' UPDATE → 成功
- [ ] 5.8 Storage: 自分のディレクトリに upload → 成功
- [ ] 5.9 Storage: 他人のディレクトリに upload → 拒否
- [ ] 5.10 reservations: status='cancelled' に UPDATE → cancelled_at が自動セット
- [ ] 5.11 reservations: 同一 (event_id, member_id) で重複 INSERT → UNIQUE 違反

## 6. ドキュメント更新

- [ ] 6.1 `openspec/project.md`: "マイナンバーカードは受け付けない" を「個人番号 12 桁マスク済み画像のみ受付。テキストとしての保管は禁止」に更新
- [ ] 6.2 `CLAUDE.md` セキュリティルール: マイナンバー関連を最新方針に更新 (テキスト保管禁止は維持、マスク済み画像許可を明記)
- [ ] 6.3 `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` 新規作成: アップロード UX 要件 / admin レビュー手順 / マスク漏れ削除 SOP
- [ ] 6.4 `docs/04-システム設計/01-DB設計/01-論理設計/論理設計.md` 更新: 5 テーブル ER 図 + 列定義 + venues seed 内容
- [ ] 6.5 `apps/admin` / `apps/reservation` の README に "DB スキーマは #147 に依存" の注意書き追加 (任意)
- [ ] 6.6 `docs/06-品質・セキュリティ/09-管理者ブートストラップ手順.md` 新規作成: Supabase Auth で翔太郎くんアカウント発行 → members 行の placeholder 値を正規値で UPDATE → role='admin' に昇格、までの手順 SOP

## 7. 適用と検証

- [ ] 7.1 ローカル Supabase で migration 適用 → エラーなく完了
- [ ] 7.2 `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('events','members','reservations','venues','identity_documents')` で全 true を確認
- [ ] 7.3 seed データで 4 会場が venues に存在することを確認
- [ ] 7.4 `pnpm exec vitest run` で 4. と 5. のテストが全て通ることを確認
- [ ] 7.5 `pnpm build` (admin / reservation / shared) がエラーなく成功
- [ ] 7.6 PR 作成前に `openspec validate db-schema-foundation` が通ることを確認

## 8. PR とレビュー

- [x] 8.1 ブランチ `feature/147-db-schema-foundation` を作成
- [ ] 8.2 タスク 1-6 を 1 タスク 1 コミットの粒度でコミット
- [ ] 8.3 PR を起票 — タイトル `feat(db): #147 DB スキーマ確立: events / members / reservations 拡張 + venues / identity_documents 追加 + RLS`
- [ ] 8.4 PR 本文に対象 5 テーブル・新規 RLS 一覧・マイナンバー方針変更の要点を記載
- [ ] 8.5 CI (lint / typecheck / vitest) 全パス確認
- [ ] 8.6 翔太郎くんのレビュー & 承認待ち
