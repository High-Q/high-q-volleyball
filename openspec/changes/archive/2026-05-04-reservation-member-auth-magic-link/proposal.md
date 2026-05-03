## Why

`apps/reservation` は会員（一般ユーザー）が自分でイベントを予約・キャンセル・履歴確認するためのサイトであり、Issue #170 のユーザージャーニー（出会う → 登録する → 探す → 予約する → 当日参加 → 管理する → 繰り返す）の **「登録する」「ログインする」起点** となる。現状は `LoginPlaceholder.vue` のみで、認証も会員プロフィール作成もできず、後続の予約フォーム（#90-92）が前提とする「ログイン済み + プロフィール完成済みの member」という前提条件を成立させられない。Issue #89 はこの穴を塞ぐ。

認証方式は **Supabase Auth マジックリンク（パスワードレス）** を採用する。理由は (a) 会員は数十〜数百名規模で UX 摩擦を最小化したい、(b) admin (#84) で確立した同じ Supabase Auth 基盤を再利用でき実装・運用コストが抑えられる、(c) 会員ロールは admin と異なり高権限ではない（`is_admin()` を持たず、自分の members 行 / 自分の reservations のみ RLS で許可）ため MFA は過剰、の 3 点。会員のセキュリティはマジックリンクの 15 分有効期限 + Supabase 側の同一 IP/email レートリミット + RLS で十分とする（Phase 2 以降に WebAuthn / Passkey を追加検討）。

## What Changes

- **新規**: 会員登録ページ `SignupPage.vue`（段階 1） — メールアドレスのみ入力 + 「ログインリンクを送る」CTA。マジックリンク送信のみを担当
- **新規**: 会員情報入力ページ `SignupProfilePage.vue`（段階 2） — マジックリンク認証完了後に到達。氏名 / 生年月日 / **電話（必須・国内携帯番号フォーマット）** / 経験レベル（初めて / 中級 / 経験者） / 利用規約・プライバシーポリシー同意（必須）を入力 → 「登録する」CTA で `members` UPDATE + `signup_completed: true` セット
- **新規**: ログインページ `LoginPage.vue`（既存 `LoginPlaceholder` を置換）— メール入力 + 「ログインリンクを送る」CTA
- **新規**: マジックリンク送信完了画面 `LinkSentPage.vue`（送信済みメールアドレスを表示 + メール再送ボタン + 別メールで送り直すリンク）
- **新規**: `/auth/callback` ルートおよび `AuthCallbackPage.vue`（マジックリンク戻り先。session 確立後、保留中の signup payload があれば members を UPDATE し、プロフィール完成済みなら `/`、未完成なら `/signup`）
- **新規**: `auth` feature スライス（`features/auth/`）— composable `useAuthSession` / `useSendMagicLink` / `useRequestSignupLink`（段階 1） / `useCompleteProfile`（段階 2） / `useSignOut`、Supabase Auth ラッパー、idle timeout は MVP1 では不要（admin と異なり個人情報書類アクセスがないため）
- **新規**: `member` entity スライス（`entities/member/`）— `MemberId` Branded Type、`Member` 型（DB row → アプリ型変換）、`memberQueries`（自分のプロフィール取得・更新）、Smart constructor によるバリデーション（名前 1〜50 文字、生年月日が過去かつ 100 年前以降、**電話番号必須・国内携帯番号フォーマット**、experience_level enum）
- **新規**: `apps/reservation/src/app/router.ts` の **auth guard** 実装（未認証 + 非公開ルート → `/login`、認証済み + プロフィール未完成 + `/signup/profile` 以外 → `/signup/profile`、認証済み + プロフィール完成済み + `/login` or `/signup` or `/signup/profile` → `/`）。`/`（イベント一覧プレースホルダ）と `/login` / `/signup` / `/auth/callback` / `/auth/link-sent` は `meta.public = true` で**ゲスト閲覧許可**。`/signup/profile` は `meta.public` なし（認証済み + 未完成のみ）
- **改訂（2026-05-04 翔太郎くん指示）**: `/`（HomePlaceholder）の **ランディング画面を廃止し認証必須化**。未認証ユーザーは auth guard により `/login` に直接誘導される。`/` は会員ダッシュボードのプレースホルダ「準備中」表示専用（後続 #90 でイベント一覧に置き換え）
- **新規**: `HomePlaceholder.vue` に最小限の「ログアウト」ボタン（admin と同じパターン。本格的な header / nav は後続 Issue で）
- **新規**: 4 状態（Loading / Empty / Error / Success）の UI 設計を Signup / SignupProfile / Login / LinkSent / AuthCallback の 5 画面に適用
- **方針**: admin は member の **完全上位互換**として扱う。`role === 'admin'` のユーザーは reservation サイトでも `isProfileComplete === true` 扱いとなり、プロフィール再入力なしで予約機能を利用可能（同一 email で admin / member 両方を運用したい翔太郎くんの要件を満たす）
- **修正**: `apps/reservation/src/pages/LoginPlaceholder.vue` を削除（`LoginPage.vue` に置換）
- **DB**: スキーマ変更なし。既存の `members` テーブル（display_name / birthday / phone / experience_level / profile jsonb）と `on_auth_user_created` トリガー（placeholder 行の自動作成）と既存 RLS（自分の members 行のみ SELECT/UPDATE 可、role 列の自己昇格不可）をそのまま利用。利用規約同意のタイムスタンプは `members.profile.terms_agreed_at`（jsonb）に格納、プロフィール完成フラグは `members.profile.signup_completed: true`（jsonb）に格納。**`members.phone` 列は DB 上は NULL 許可のままだが、アプリ層（Smart constructor + フォームバリデーション）で必須化する**（DB 制約変更を伴わずアプリ要件で締めることで、将来 phone を不要とする場合の DB マイグレーション不要）
- **依存**: 追加なし。既存の `@supabase/supabase-js` / `vue-router` / `radix-vue` / shadcn-vue (`Input` / `Label` / `FormField`) / `@high-q/ui` (`Button` / `Kicker`) を再利用

## Capabilities

### New Capabilities

- `reservation-member-auth`: 予約サイト（apps/reservation）の会員認証・登録フロー。マジックリンク送信、マジックリンクからのセッション確立、会員プロフィールの作成（signup フォーム → members 行 UPDATE）、プロフィール完成判定、auth guard、ログアウト、セッション復元、4 状態 UI、利用規約同意の記録を含む。

### Modified Capabilities

- `app-routing`: 既存の「`apps/reservation` の `/login` は `LoginPlaceholder`」要件を本実装の `LoginPage` に置換し、新たに `/signup` / `/auth/callback` ルートおよび `apps/reservation` の `router.beforeEach` auth guard 実装要件を追加する。`apps/reservation` の `LoginPlaceholder.vue` は廃止。

## Impact

- **コード**:
  - `apps/reservation/src/pages/LoginPlaceholder.vue` を `LoginPage.vue` に差し替え
  - `apps/reservation/src/pages/SignupPage.vue` 新規
  - `apps/reservation/src/pages/LinkSentPage.vue` 新規
  - `apps/reservation/src/pages/AuthCallbackPage.vue` 新規
  - `apps/reservation/src/features/auth/` 新規（composable / API ラッパー / 型）
  - `apps/reservation/src/entities/member/` 新規（Branded Types / 型 / queries / Smart constructor）
  - `apps/reservation/src/shared/api/supabase.ts` 新規（admin と同じパターン: `@high-q/shared` の `createSupabaseClient` を singleton ラップ）
  - `apps/reservation/src/app/router.ts` 修正（`/signup` / `/auth/callback` 追加 + `beforeEach` guard + `// TODO: auth guard` コメント除去）
  - `apps/reservation/src/main.ts` 修正（`installAuthSession(app)` を `app.use(router)` の前に配線）
  - `apps/reservation/src/pages/HomePlaceholder.vue` 修正（ログアウトボタン追加）
- **DB**: 変更なし。既存の `members` テーブル / `on_auth_user_created` トリガー / RLS をそのまま利用
- **環境変数**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` は既設定（admin で使用中のものを共有）。追加なし
- **Supabase 側設定（運用作業、コードに含めない）**:
  - Auth → URL Configuration の Redirect URLs に reservation の本番・プレビュー URL（`https://high-q-reservation.onrender.com/auth/callback` 等）を追加
  - リンク有効期限は 15 分（admin と同じ。既設定）
  - members への admin 行追加は本 change スコープ外（admin で運用済み）
- **テスト**:
  - composable のユニットテスト（`useSendMagicLink` / `useSignUp` / `useAuthSession` / `useSignOut` / `useMemberProfile`）— Supabase クライアントは `vi.mock`
  - Smart constructor のユニットテスト（`MemberId` / 名前 / 生年月日 / 電話番号 / experience_level）
  - router guard のユニットテスト（5 ケース: 未認証 + `/` → 通過（public）/ 未認証 + 予約ルート → `/login` / 認証済み + プロフィール未完成 + 任意ルート → `/signup` / 認証済み + プロフィール完成 + `/login` → `/` / 認証済み + プロフィール完成 + 保護ルート → 通過）
  - SignupPage / LoginPage / LinkSentPage / AuthCallbackPage の component テスト（4 状態網羅）
  - **E2E（Playwright）**: 機能あたり 1〜2 件（happy path: ログインリンク送信成功表示 / edge case: 未認証で予約ルート → `/login` リダイレクト + signup フォームのバリデーションエラー表示）。マジックリンク実メール受信は admin と同じく Supabase Auth API を MSW でモック
- **セキュリティ**:
  - `auth.users` への直接書き込みはなし（Supabase Auth SDK 経由のみ）
  - members 行は trigger で自動作成、UPDATE のみアプリから実行（INSERT 不可は既存 RLS で担保）
  - `role` 列の自己昇格は既存 RLS の WITH CHECK で拒否（変更不要）
  - signup payload の一時保管は **`sessionStorage` ではなく `localStorage`**（理由: マジックリンクは別ブラウザタブで開く可能性があり sessionStorage では消える）。payload は `signup-pending-<email>` キーで保存、callback 完了時に削除。氏名・電話・生年月日が含まれるが、ブラウザ Local Storage は同一オリジンに限定されるため XSS でなければ漏洩しない。マジックリンクが期限切れで使われない場合の payload は **24 時間で自動削除**（書き込み時に `expires_at` も保存し、callback 開始時に過ぎていれば削除）
  - 利用規約同意は `members.profile.terms_agreed_at` に ISO 8601 タイムスタンプを格納。後日 GDPR / 個人情報保護法対応で audit が必要になった場合の最低限の trail を提供
- **後続 change（本 change の範囲外、別 Issue 化）**:
  - `/` イベント一覧の本実装（Issue #90）
  - 予約フォーム / 予約確認 / 予約履歴 / プロフィール編集（#91 / #92 / #148）
  - **本人確認書類アップロード（identity_documents）を予約確定時に必須化** — 電話番号申告制の弱点（虚偽申告可能）を補完する身元担保。既存 `identity_documents` テーブル + RLS を利用。別 Issue として起票推奨
  - **未確認 / 中途離脱ユーザーの自動 cleanup ジョブ（並行起票推奨）** — Supabase Edge Function + 外部 cron で 48h ルール cleanup（design.md D3.1 SQL を実装）。Phase 1 期間内にリリース推奨
  - **「ゼロ滞留」signup フロー（Option F）→ Phase 2** — Edge Function + admin SDK + 6 桁コード方式で「全項目入力 + コード検証 → 一括 INSERT」を実装。中途半端な行が DB に一切残らない設計。MVP1 は A + cleanup で受容
  - **SMS 認証（電話番号の実在確認）→ Phase 2** — Twilio / AWS SNS 等の従量課金（国内 SMS 約 10〜11 円/通）が発生するため Render / Supabase 無料枠の方針から外れる。会員ロールの権限範囲（自分の予約のみ）を考慮し、MVP1 ではアプリ層のフォーマットバリデーションと身分証アップロードで代替
  - パスワードレス強化（WebAuthn / Passkey）→ Phase 2
  - 通知設定 / 統計 / プロフィール詳細（#170 の MVP2 範囲）
