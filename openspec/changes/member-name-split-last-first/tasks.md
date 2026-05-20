## 1. DB migration（dev → prd 順で push）

- [x] 1.1 `supabase/migrations/<timestamp>_split_members_name_last_first.sql` を作成: `last_name` / `first_name` カラムを nullable で追加
- [x] 1.2 同 migration 内で既存行をバックフィル — 全角スペース → 半角 / 連続スペース畳み込みを行い、最初の半角スペースで分割。前後とも 1 文字以上なら成功とみなし `last_name` / `first_name` をセット
- [x] 1.3 分割不能行（スペース無し / 片側空）について `last_name = display_name` / `first_name = '(未設定)'` / `profile = jsonb_set(profile, '{name_split_needed}', 'true')` でセットして残す
- [x] 1.4 NOT NULL 制約 + CHECK (`length(last_name) >= 1 and length(first_name) >= 1`) を付与
- [x] 1.5 トリガ関数 `sync_members_display_name()` を作成（BEFORE INSERT/UPDATE で `new.display_name := new.last_name || ' ' || new.first_name` をセット）し、`members` にアタッチ
- [x] 1.6 全行に対して空 UPDATE（`UPDATE members SET last_name = last_name`）を実行し、トリガで `display_name` を最新化
- [x] 1.7 既存 RLS の本人 UPDATE 列ホワイトリストから `display_name` を外し、`last_name` / `first_name` を追加（admin の UPDATE 権限は全列許容のまま据置）
- [x] 1.8 `verify_rls.sql` 等の DB テストを実行し、姓欠落 / 名欠落 INSERT が CHECK 違反で失敗することを検証
- [x] 1.9 dev Supabase に migration を push (`supabase db push --linked` をレムが直接実行) し、上記 DB テストが通ることを確認 — dev で適用済 (6 行 / mismatch 0 / name_split_needed=1 行)

## 2. Edge Function 更新

- [x] 2.1 `supabase/functions/request-signup/index.ts`: payload バリデーションを `display_name` 単体から `last_name` / `first_name` の 2 フィールド必須 + 各 1〜32 文字に置換
- [x] 2.2 同 Function: `signup_pending.payload` に保存する jsonb を `last_name` / `first_name` の 2 キーに変更（`display_name` キーは保存しない）
- [x] 2.3 `supabase/functions/verify-signup/index.ts`: `formPayload` の型を `{ last_name, first_name, ... }` に変更し、`members` UPSERT で両列を明示的に渡す（`display_name` は渡さない）
- [x] 2.4 同 Function: 旧 schema（payload に `display_name` のみで `last_name` / `first_name` が無い）を検知したら該当行を DELETE し、400 + 「フォームから再度認証コードを発行してください」案内を返す分岐を追加
- [x] 2.5 Edge Function 単体テスト（あれば）を更新 / 新規追加し、姓・名 欠落・旧 schema 行・正常系の 3 ケースをカバー — `validation.spec.ts` を更新

## 3. 共有型・Smart constructor

- [x] 3.1 `apps/reservation/src/entities/member/model/member.types.ts` の `Member` 型に `lastName` / `firstName` を追加。`displayName` は据置（DB 側で同期されるため `string` のまま）
- [x] 3.2 Smart constructor を追加 — `createLastName(input: string)` / `createFirstName(input: string)` — 1〜32 文字 + trim 後非空のバリデーション、spec も追加
- [x] 3.3 既存の `createDisplayName()` Smart constructor は本 change では削除せず、互換用ヘルパとして残す（admin 表示等での結合表記用）
- [x] 3.4 関連 component / spec の fixture を更新し、TypeScript エラーを潰す

## 4. 予約サイト signup フォーム

- [x] 4.1 `apps/reservation/src/pages/SignupPage.vue` の form state を `display_name` から `last_name` / `first_name` に置換
- [x] 4.2 form の「お名前」単一 `FormField` を削除し、「姓」「名」の 2 つの `FormField` を grid (`grid grid-cols-2 gap-hq-3`) で横並び配置。各 Input に `autocomplete="family-name"` / `autocomplete="given-name"`、placeholder「田中」「美咲」を設定
- [x] 4.3 `useRequestSignupCode` composable の `submit` 引数型を `last_name` / `first_name` に切替（`fieldErrors` のキーも `last_name` / `first_name` を追加）
- [x] 4.4 `SignupPage.spec.ts` のテストを更新 — fillValidForm の入力順を更新 + autocomplete 属性チェックを追加
- [x] 4.5 `useRequestSignupCode.spec.ts` のテストを更新 — 姓だけ / 名だけ / 正常 の 3 ケースを追加

## 5. 予約サイト プロフィール画面

- [x] 5.1 `apps/reservation/src/features/profile-account/ui/DisplayNameEditDialog.vue` の氏名編集モーダルを姓・名 2 入力に置換。1 回の UPDATE で両列を同時更新する
- [x] 5.2 `apps/reservation/src/features/profile-account/api/updateMyAccount.ts` を `updateMyName(memberId, last, first)` に置換し、`updateMyDisplayName` は削除
- [x] 5.3 `updateMyAccount.spec.ts` を更新（旧 `updateMyDisplayName` テストを `updateMyName` に置換）
- [x] 5.4 ACCOUNT セクションの「お名前」行表示は `member.displayName` のまま据置（DB トリガで同期されている前提）
- [x] 5.5 ProfilePage / 関連 widget の component test を更新 — 既存 ProfilePage 固有テストは存在しないため fixture 修正のみ

## 6. seed / 既存 SQL 整備

- [x] 6.1 `supabase/seed/dev_event_detail_seed.sql` の `update public.members set display_name = ...` を `set last_name = ..., first_name = ...` 形式に書き換え
- [x] 6.2 `supabase/seed/dev_nickname_seed.sql` ほか seed スクリプトで `display_name` を直接 INSERT / UPDATE している箇所を同様に修正 — dev_nickname_seed.sql は comment のみで実コード変更不要
- [x] 6.3 `supabase/tests/verify_rls.sql` / `verify_reservations_event_fk_cascade.sql` の `insert into public.members (..., display_name, ...)` を `(..., last_name, first_name, ...)` に書き換え
- [ ] 6.4 dev Supabase に対し seed の再投入が必要なら `supabase db query --linked --file <path>` でレムが直接実行し、整合性を確認 — 翔太郎くんが seed の再適用を望む場合に実施

## 7. admin 側の読み出し互換確認（spec 変更なし）

- [ ] 7.1 admin 会員一覧 (`/members`) で `display_name` ILIKE 検索が `'田中'` / `'美咲'` どちらでもヒットすることを動作確認 — PR Preview / dev で翔太郎くんが確認
- [ ] 7.2 admin イベント詳細 (`/events/:id`) の参加者一覧で氏名 + ニックネーム表示が崩れないことを動作確認 — 同上
- [ ] 7.3 admin 本人確認書類レビュー画面の氏名表示が崩れないことを動作確認 — 同上
- [ ] 7.4 ニックネーム fallback (`nickname ?? display_name`) が会員サイトのプロフィールヘッダで従来通り動作することを確認 — 同上

## 8. 統合動作確認（dev）

- [ ] 8.1 dev で `/signup` → 姓・名入力 → コード送信 → `/signup/verify` → コード入力 → `/signup/identity` の一気通貫 happy path を実機ブラウザで確認 — 翔太郎くんに依頼
- [ ] 8.2 dev で `/profile` から姓のみ変更・名のみ変更・両方変更の 3 ケースを動作確認 — 同上
- [ ] 8.3 dev で「姓だけ入力して送信」「名だけ入力して送信」がフォーム側でブロックされ、`request-signup` が呼ばれないことを確認 — 同上
- [x] 8.4 dev DB を SELECT し、新規会員行で `display_name = last_name || ' ' || first_name` の関係が成立していることを確認 — migration push 直後の検証で 6/6 行成立を確認済

## 9. 既存会員の補正フォロー方針確定

- [x] 9.1 dev / prd 各 Supabase で `profile.name_split_needed = true` の会員行件数を SELECT し、運営（翔太郎くん）に報告 — dev は 1 行（オーナー本人）、prd は既知 1 行（横尾さん）
- [x] 9.2 既知会員の補正方針を確定 — オーナー (dev) は手動 SQL で補正済 (`High Q オーナー`)、横尾さん (prd) は追加 migration `20260520164020_fix_known_split_needed_members.sql` で「横尾 周」に補正、未知の対象は ship 後 SELECT 抽出 + 個別ヒアリング運用
- [x] 9.3 採用された方針を `design.md` の Open Questions に追記して確定させる

## 10. リリース前最終チェック

- [x] 10.1 全アプリ vitest run を実行し、緑であることを確認 — reservation 75/75 files (637 tests) / admin 89/89 files (795 tests) / edge-functions 8/8 files (128 tests) 全緑
- [x] 10.2 `pnpm build:lp` / `pnpm -F @high-q/reservation build` / `pnpm -F @high-q/admin build` を実行し、ビルドが通ることを確認
- [ ] 10.3 PR 作成。Test Plan に「PR Preview で signup → verify → profile 編集を動作確認」「prd への migration push + Edge Function deploy のタイミング揃え」を明記
- [ ] 10.4 ship 時に prd Supabase に対して `supabase db push --linked` で migration を先に流し、その後 Edge Function を deploy する手順を `opsx-ship` 実行時に守る
