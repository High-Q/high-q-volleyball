## 1. DB: 運営設定テーブルと公開参照関数

- [x] 1.1 `supabase/templates/new_table.sql` を出発点に migration を新規追加。`operational_settings` テーブル作成（単一行制約: `id boolean primary key default true check (id)`、`member_registration_enabled boolean not null default true`、`updated_at timestamptz not null default now()`、`updated_by uuid references public.members(id)`）
- [x] 1.2 RLS 有効化 + ポリシー: admin（authenticated かつ role='admin'）の SELECT / UPDATE を許可、それ以外の直接アクセスは無し。anon / authenticated / service_role の 3 ロールへ明示 GRANT（authenticated は SELECT/UPDATE、anon はテーブル権限無し、service_role は ALL）/ verify_operational_settings_rls.sql 追加
- [x] 1.3 初期 1 行を seed（`member_registration_enabled = true`）
- [x] 1.4 `SECURITY DEFINER` 関数 `public.registration_open() returns boolean` を作成し、anon / authenticated へ EXECUTE 付与。受付中 true / 停止中 false を返す
- [x] 1.5 migration に `-- ROLLBACK:` コメント（テーブル + 関数 drop 手順）を記載
- [x] 1.6 dev へ適用し verify_grants.sql / verify_operational_settings_rls.sql で確認（anon=なし / authenticated=SELECT,UPDATE / service_role=全、RLS 10 件パス）

## 2. サーバー側ゲート（Edge Function・TDD）

- [x] 2.1 `_shared/registration-gate.ts` を追加（service_role で `operational_settings` を読み、error/例外はフェイルクローズで停止扱い・行無しは既定受付中）。`_tests/registration-gate.spec.ts` を先に書き 8 件パス
- [x] 2.2 `request-signup` に supabase client 生成直後ゲートを挿入。停止中は `registration-suspended`（503）を返し、コード発行・メール送信を行わない。読取失敗は console.error
- [x] 2.3 `verify-signup` に同ゲートを挿入。停止中は `registration-suspended`（503）で `auth.users` / `members` を作らない（進行中コードもここで停止）

## 3. admin: 運営設定ページ

- [x] 3.1 `shared/ui/Switch.vue`（radix-vue SwitchRoot/Thumb・HQ トークン着色）を取り込み index.ts に公開
- [x] 3.2 entity `operational-settings`（型 + fetch/update クエリ + spec）と feature `registration-toggle`（composable + spec）を追加。update 時 `updated_by = auth.uid()` を記録
- [x] 3.3 `SettingsPage.vue` + `RegistrationToggleCard.vue`: 受付可否トグル + AlertDialog 確認 + 4 状態（Loading=Skeleton / Error=再読込 / Success=トースト / 通常）。PageBreadcrumb + header 1 箇所、デザイントークン経由
- [x] 3.4 admin router に `/settings`（lazy import）を追加 + router.spec の件数テスト更新（14→15）
- [x] 3.5 admin-shell navItems に「運営設定」(settings アイコン追加) + SidebarNavContent.spec 更新（6→7）
- [x] 3.6 AnnouncementTemplatePage / EventDeleteDialog を Read し header・AlertDialog パターンを踏襲

## 4. reservation: `/signup` 受付停止中の表示

- [x] 4.1 `useRegistrationStatus`（`registration_open()` RPC 参照・読取失敗はフェイルオープン）を features/auth に追加 + spec（5 件）
- [x] 4.2 `SignupPage.vue` を 3 分岐化: 確認中=Loading / 停止中=案内カード（停止の旨 + `/login` 導線）/ 受付中=従来フォーム。`useRequestSignupCode` に `registration-suspended`(503) 分岐追加
- [x] 4.3 `useVerifySignupCode` + `SignupVerifyPage.vue` に `registration-suspended`(503) 分岐と案内文を追加
- [ ] 4.4 案内文面を翔太郎くんに確認（既定: 再開確定日を出さない中立文面）← 最終確認で提示

## 5. 最終確認

- [x] 5.1 `pnpm -r test` 全パス（functions 170 / admin 1204 / reservation 857 / lp 62 / ui 33 / preset 8）
- [x] 5.2 typecheck clean / lint・stylelint・dependency-cruiser ともエラー 0（警告は既存ファイルのみ）/ admin・reservation 本番ビルド成功（SettingsPage は独立 lazy chunk）
- [x] 5.3 既存メンバー動線（ログイン・予約・退会）のテスト全パスで回帰無しを確認。ゲートは signup 系 Edge Function 2 つ + `/signup` に限定
- [ ] 5.4 dev で停止 → `/signup` 案内 + 503 / 再開 → 通常登録 の UI 往復（翔太郎くんのローカル確認で実施）。migration + Edge Function は dev 適用済・SQL で停止/再開の永続化は確認済
- [x] 5.5 `verify-locally` で動作確認案内を生成し翔太郎くんへ提示（dev パスワードレスログイン手順併記）
