## 1. DB: 監査ログテーブル（migration + RLS + GRANT）

- [ ] 1.1 `supabase/templates/new_table.sql` を出発点に `supabase/migrations/<YYYYMMDDHHMMSS>_create_identity_document_downloads.sql` を作成。列: `id uuid pk default gen_random_uuid()` / `downloaded_by uuid references members(id) on delete set null` / `downloaded_at timestamptz not null default now()` / `member_ids uuid[] not null` / `document_ids uuid[] not null` / `member_count int not null` / `document_count int not null` / `note text`。`comment on table` を付与
- [ ] 1.2 RLS 有効化 + ポリシー: SELECT / INSERT は `is_admin()` のみ（INSERT は WITH CHECK で `is_admin()`）。UPDATE / DELETE ポリシーは作らない（追記専用）
- [ ] 1.3 GRANT 3 ロール明示: anon は付与しない / authenticated は `select, insert` / service_role は全権。末尾に `-- ROLLBACK:` コメント（revoke + drop policy + drop table）を実テーブル名で記述
- [ ] 1.4 dev へ適用（レムが `pnpm db:push` 実行）→ `supabase db query --linked --file supabase/tests/verify_grants.sql` で 3 ロール GRANT 状態を確認。CI `migration-safety`（RLS 網羅 / my-number / rollback コメント）が緑であることを確認

## 2. entities/identity-document: 承認済み書類の取得クエリ

- [ ] 2.1 承認済み書類を会員 id 群で取得するクエリを追加（`status = 'approved'` + `member_id in (...)`、`storage_path_front`/`storage_path_back` がともに NULL の行は除外）。取得列: `id, member_id, document_type, status, uploaded_at, storage_path_front, storage_path_back, member:members(last_name, first_name, display_name, email)`。Supabase の暗黙 join で 1 クエリ。`Result<T>` を返す
- [ ] 2.2 上記クエリの API layer test（Vitest + Supabase mock）: WHERE（approved + member_id in）/ NULL 書類除外 / members join を検証。`entities/identity-document/index.ts` に公開 API を追加

## 3. entities/identity-document-download: 監査ログ entity

- [ ] 3.1 `apps/admin/src/entities/identity-document-download/` を新規作成。DTO 型（Branded `MemberId` / 書類 id）と INSERT クエリ（`downloaded_by` / `member_ids` / `document_ids` / `member_count` / `document_count` / `note?`）を実装。`Result<T>` を返す。`index.ts` で公開
- [ ] 3.2 INSERT クエリの unit test（Vitest + Supabase mock）: payload 組み立て / 成功・失敗の Result 分岐

## 4. shared/ui: Checkbox プリミティブ

- [ ] 4.1 `apps/admin/src/shared/ui/Checkbox.*` を shadcn-vue（radix-vue）から copy-paste 取り込み。HQ デザイントークン（tailwind preset utility / `var(--hq-*)`）で着色。`checked` / `indeterminate` / `disabled` / v-model 対応。`apps/admin/src/shared/ui/index.ts` に公開
- [ ] 4.2 Checkbox の component test（checked / indeterminate / disabled / v-model トグル / `aria-label` 伝播）

## 5. features/identity-document-bulk-export: 選択・生成ロジック

- [ ] 5.1 選択状態 composable `useMembersSelection`（`Set<MemberId>`、toggle / add / remove / clear / 現ページ全選択 / indeterminate 判定 / ページ・フィルタまたぎ保持）を実装 + unit test
- [ ] 5.2 会員名簿 CSV ビルダ（列: 氏名 = `last_name + ' ' + first_name` / 住所 = admin 入力 / 電話番号 = 確認値、**役職名は含めない**、**UTF-8 BOM 付き**、CSV エスケープ）を純粋関数で実装 + unit test
- [ ] 5.3 画像形式判定ユーティリティ（拡張子 + マジックバイトで jpg / png 判定、判定不能は失敗扱い）を純粋関数で実装 + unit test
- [ ] 5.4 本人確認書類 PDF ビルダ（`pdf-lib` を **dynamic import**。会員ごとにページ、ページ上部に氏名ラベル + 書類種別、表面→裏面の順に画像配置、jpg は `embedJpg` / png は `embedPng`）を実装 + unit test（ページ数 / 氏名ラベル / 埋め込み関数選択）
- [ ] 5.5 一括ダウンロードのオーケストレーション composable を実装: 選択 member id + admin 入力（住所 / 電話）→ 承認済み書類取得（§2）→ 各画像を `supabase.storage.from('identity-documents').download(path)` で Blob 取得（部分失敗は継続）→ CSV（§5.2）+ PDF（§5.4）生成 → `jszip` を **dynamic import** して `会員名簿.csv` + `本人確認書類.pdf` を ZIP 化 → ローカル保存 → 監査ログ INSERT（§3、実含有集合で記録）。進捗（取得済み / 対象数）と結果（含めた書類数 / 名簿会員数 / 承認済みなし会員 / 失敗書類）を Result で返す
- [ ] 5.6 `jszip` と `pdf-lib` を `apps/admin/package.json` に依存追加（dynamic import 前提）
- [ ] 5.7 オーケストレーションの unit test: approved のみ抽出 / NULL 書類除外 / 部分失敗で成功分のみ PDF・監査ログ対象が実含有集合に一致 / 全画像失敗でも CSV 出力 / 承認済み 0 件会員は CSV に載るが PDF 対象外 / 監査ログ INSERT 失敗時の警告分岐
- [ ] 5.8 一括アクションツールバー UI（選択件数 / 「会員名簿と本人確認書類をダウンロード」ボタン / 「選択を解除」、取得中は disabled + `aria-busy`）を実装
- [ ] 5.9 エクスポート準備ダイアログ UI（選択会員一覧、氏名=読み取り専用 / 電話番号=DB プリフィル編集可 / 住所=入力、`shared/ui/FormField` でラップ・初期赤枠なし、「ダウンロード」で §5.5 起動）を実装
- [ ] 5.10 結果ダイアログ UI（含めた書類数 / 名簿会員数 / 承認済みなしで PDF 対象外の会員 / 取得失敗書類、エラー時 `role="alert"` + 再試行）を実装。`features/identity-document-bulk-export/index.ts` で公開

## 6. widgets/members-list: 選択列の統合

- [ ] 6.1 `MembersListTable.vue` に選択チェックボックス列を 7 列の左に追加（デスクトップ DataTable + モバイルカード両方）。`has_identity_document === false` は disabled。チェックボックス領域は `@click.stop` で行クリック（詳細 sheet）と分離。ヘッダに現ページ全選択（indeterminate 対応）
- [ ] 6.2 `MembersListWidget.vue` に選択 composable・一括アクションツールバー・エクスポート準備ダイアログ・結果ダイアログを統合。1 件以上選択時のみツールバー表示。既存フィルタ / ソート / ページネーション / 行クリック詳細 sheet を維持
- [ ] 6.3 component test: ツールバー表示条件 / 件数表示 / ダウンロード起動で準備ダイアログ表示 / チェックボックスクリックで行クリック非発火 / 書類未提出会員の disabled / 現ページ全選択 indeterminate

## 7. 最終確認（UI 一括検証）

- [ ] 7.1 E2E（Playwright, admin, 1 件）: 認証済み admin で `/members` → 複数会員選択 → ダウンロード起動 → 住所入力 → ダウンロード → 結果ダイアログ表示の happy path
- [ ] 7.2 `pnpm exec vitest run` / `pnpm --filter @high-q/admin lint`（boundaries / no-restricted-imports / stylelint）/ `pnpm build`（admin）をまとめて実行し緑を確認。マジックナンバー grep（`#[0-9a-f]{3,6}` / `\[\d+px\]`）が新規コンポーネントで 0 件
- [ ] 7.3 ローカル動作確認の案内（`verify-locally`）を作成し翔太郎くんに提示（dev passwordless login + admin `/members` の URL・主要シナリオ・4 状態 + a11y + モバイル + 権限・生成 ZIP の中身確認）
