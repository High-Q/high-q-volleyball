## 1. DB マイグレーション

- [x] 1.1 `supabase/migrations/<YYYYMMDDHHMMSS>_add_has_identity_document_to_member_list_view.sql` を新規作成し、`member_list_view` を `CREATE OR REPLACE VIEW` で再定義する。既存集計サブクエリは保ち、`EXISTS (SELECT 1 FROM identity_documents WHERE member_id = members.id)` を `has_identity_document` 列として追加する
- [x] 1.2 migration ファイルにロールバック手順コメント (`-- ROLLBACK:`) と仕様参照リンクを追記する（既存 `20260523085011_add_correction_request_count_to_member_list_view.sql` の冒頭コメント構造に倣う）
- [x] 1.3 既存 GRANT（`authenticated` への SELECT）を維持し、`anon` への REVOKE を再宣言する
- [x] 1.4 レム自身が `supabase db push` で dev DB に適用し、`supabase db query --linked` で `select has_identity_document from member_list_view limit 1` を実行して列が返ることを確認する

## 2. TypeScript 型と API クライアント更新

- [x] 2.1 `apps/admin/src/entities/member/model/member.types.ts` の `MemberListRow` に `has_identity_document: boolean` を追加する。コメントに「`identity_documents` 行が 1 件以上で `true`、`status` は問わない」と書く
- [x] 2.2 `apps/admin/src/entities/member/api/member-client.ts` の `select` 句 2 箇所（一覧取得 / 行単体取得）に `has_identity_document` を追加する
- [x] 2.3 entity の Public API（`apps/admin/src/entities/member/index.ts`）に型変更による影響がないか確認する（型エイリアスのみで API は変わらない想定）

## 3. UI: 書類未提出バッジ表示

- [x] 3.1 `apps/admin/src/widgets/members-list/ui/MembersListTable.vue` の氏名セルに「書類未提出」`Badge`（neutral tone、`data-testid="incomplete-signup-badge"`、`aria-label="本人確認書類が未提出"`）を追加する。表示条件は `row.has_identity_document === false`。既存の「修正依頼 N」バッジの右隣に配置する
- [x] 3.2 既存 `Badge` プリミティブが neutral tone を持たない場合は `@high-q/ui` の用意済み tone（`muted` 等）で代替し、リテラル色を書かない（neutral tone 既存のため代替不要）
- [x] 3.3 デザイントークン準拠 grep（`#[0-9a-f]{3,6}\b` / `\[\d+px\]`）が 0 件であることをローカル確認する

## 4. Component test

- [x] 4.1 `apps/admin/src/widgets/members-list/ui/MembersListTable.spec.ts` に「`has_identity_document = false` で「書類未提出」バッジが表示される」「`has_identity_document = true` でバッジが表示されない」「修正依頼バッジと並列表示される」の 3 シナリオを追加する
- [x] 4.2 既存 `BASE_ROW` フィクスチャに `has_identity_document: true` をデフォルトで設定し、既存テストの影響を避ける

## 5. データ取得 composable のフィクスチャ・モック更新

- [x] 5.1 `apps/admin/src/widgets/members-list/composables/useMembersListData.ts` のテストモック（あれば）と、`apps/admin/src/entities/member/api/member-client.spec.ts`（既存していれば）の fixture に `has_identity_document` を追加する（既存 spec の select アサートは stringContaining ベースで影響なし、独自フィクスチャ無し）
- [x] 5.2 admin の他 widget（`member-detail-sheet` 等）が `MemberListRow` を再利用していないか grep で確認し、型追加で破壊しないことを保証する（MemberDetailHeader は新プロパティ非参照、useMemberDetailSheet は API 戻り値素通しで影響なし）

## 6. E2E ハッピーパス（既存 admin プロジェクトの member 系シナリオがあれば追補）

- [x] 6.1 既存の admin members E2E（`e2e/admin/members-list.e2e.ts`）は auth guard 確認のみで認証済 AAL2 セッションを再現していないため、バッジ表示のアサーション追加は本 change の範囲を超える（seed + 認証セッション整備が必要）
- [x] 6.2 component test 6 件（修正依頼バッジ 3 件 + 書類未提出バッジ 3 件、`MembersListTable.spec.ts`）でバッジ表示パターンを網羅したため E2E スキップ。実機確認は Task 7.2 のローカル動作確認で代替

## 7. 最終確認

- [x] 7.1 `pnpm --filter @high-q/admin lint` / `pnpm --filter @high-q/admin test` / `pnpm --filter @high-q/admin build` を順に実行し、全てパスすることを確認する（lint: errors 0、test: 828/828 pass、build: 成功）
- [x] 7.2 dev 環境（`http://localhost:5273/members`、wt-247 worktree）で書類未提出会員行にバッジが表示されること、書類提出済み会員行に表示されないことを翔太郎くんが確認済（2026-06-08）
- [x] 7.3 OpenSpec validate (`openspec validate admin-members-incomplete-signup-badge --strict`) が pass することを最終確認する
- [x] 7.4 Apply 中に発覚した docs/08-移行/01-環境戦略・本番リリース計画.md L156 の dev/prd project_ref 誤読誘発記述を訂正（本変更で `pnpm db:push` 先を一度 prd に誤投入した事故の再発防止）
