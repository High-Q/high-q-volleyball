## Context

`apps/admin` は `admin-reservation-ui-foundation` change で以下の土台が整備されている:

- Vue Router（`src/app/router.ts`）と最低 2 ルート（`/`, `/login` プレースホルダ）
- Tailwind preset（`@high-q/tailwind-preset`）と HQ デザイントークン（`var(--hq-*)`）
- `@high-q/ui` プリミティブ（`Button` / `Kicker` / `Photo` / `RemainBar` 等）
- shadcn-vue プリミティブ（`Input` / `Label` / `FormField` を `apps/admin/src/shared/ui/` に取り込み済み）
- Supabase クライアント（`packages/shared/src/api/supabase.ts` の `createSupabaseClient`）— `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true` で構築済み

DB 側は `supabase-initial-schema` change で:

- `members` テーブル（`role` 列に `'admin' | 'member'` の制約）
- `is_admin()` SQL 関数（SECURITY DEFINER、`auth.uid()` の members.role を判定）
- 全テーブル RLS 有効化、ポリシー内で `is_admin()` を利用

オーナー（翔太郎くん）は MVP1 ではただ 1 人。Supabase Dashboard で `members` に `role = 'admin'` の行を 1 件用意する。マジックリンク到達後、クライアントは `is_admin()` を呼び、`true` であれば管理画面へ進む。`false`（member 行が無い、または role が 'member'）であれば即サインアウトして `/login?reason=not-admin` に戻す。

**セキュリティ要件の引き上げ**: 本サービスは数十人規模の会員の本人確認書類（運転免許証等。マイナンバーカードは個人番号マスク済み画像のみ）を扱う。漏えい時の被害深刻度（なりすまし悪用）に鑑み、マジックリンク単独では不十分（メールアカウント乗っ取り = 即陥落）と判断し、Supabase Auth 標準の **TOTP 二要素認証（MFA）** を必須化する。さらに JWT 有効期限を 30 分・クライアント idle timeout を 15 分に短縮し、デバイス紛失時の侵害ウィンドウを最小化する。

Phase 1 リリースは 2026-05-08。本 change はそれ以降に積まれる管理画面機能（イベント作成・予約管理・チェックイン等）すべての前提となるため、認可レイヤーが正しく機能することが最優先。

## Goals / Non-Goals

**Goals:**

- マジックリンク + TOTP 2FA で**オーナーのみ** `apps/admin` にログインできる
- AAL2（MFA 完了）に到達するまで管理画面の保護ルートにアクセスできない
- セッションは Supabase が `localStorage` に永続化し、ブラウザ再訪時に自動復元（ただし JWT は 30 分で expire）
- 最後のユーザー操作から 15 分で idle timeout により auto signOut
- 未認証ユーザー / 非 admin ユーザー / AAL1 ユーザーは保護ルートに到達できない
- 4 状態（Loading / Empty / Error / Success）が Login / MFA Setup / MFA Challenge の UI で明示される
- E2E のハッピーパスとリダイレクト edge case が Playwright でカバーされる
- composable・guard・UI コンポーネントが TDD で実装され、Vitest でユニットテスト通過

**Non-Goals:**

- パスワード認証 / SSO / メール OTP 数字入力（MVP1 ではマジックリンク + TOTP のみ）
- パスワード忘却・再発行フロー（パスワードを使わないため不要）
- SMS / WebAuthn / Passkey ベースの MFA（TOTP のみ。WebAuthn は Phase 2）
- 複数オーナー同時運用 / 招待フロー（オーナー追加は Supabase Dashboard で手動）
- ヘッダー・サイドナビ・サインアウト UI の本格実装（後続の dashboard Issue で実装。本 change では HomePlaceholder に最小限のサインアウトボタンのみ）
- メールテンプレートのカスタムデザイン（Supabase デフォルトを利用）
- リフレッシュトークンの自前ローテーション（Supabase SDK 任せ）
- 監査ログ（別 change で実施。`audit_log` テーブル + RLS + 主要操作ログ書き込み）
- 本人確認書類閲覧時の step-up 再認証（identity_documents 機能 Issue で実装）
- IP allowlist / 異常アクセス通知（Phase 2 以降）
- 複数タブ間 broadcast による idle timeout の同期（同一ブラウザ複数タブで再ログインが必要になるが MVP1 では受容）
- TOTP factor のリカバリーコード生成（factor 紛失時は Supabase Dashboard で factor 削除 → 再 enroll）

## Decisions

### D1. 認証方式 = `signInWithOtp` (Magic Link only)

**選択**: Supabase Auth の `signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: false } })`。

**Rationale**:

- パスワードレス。オーナー単独運用の負荷最小化
- `shouldCreateUser: false` を指定することで、`auth.users` に未登録のメールでは送信されず、オーナーアロウリスト効果を一段強化（ただし「メールが届かない」という 4 状態の Error にも繋がるため UI でフォロー）
- Supabase 標準 SDK のみで完結。追加依存なし

**代替**:

- ❌ Email + Password: 運用負荷（忘却・リセット）と UI 工数が増える割に、オーナー単独運用ではメリットが薄い
- ❌ OAuth (Google): 運用は楽だが、Supabase の Google Provider 設定が追加で必要。MVP1 では過剰
- ❌ OTP（数字入力）: マジックリンクと比較して UX が劣る（メール開封 → 数字書写）

### D2. オーナー判定 = `is_admin()` RPC（クライアント側で email 照合しない）

**選択**: ログイン後、`supabase.rpc('is_admin')` を呼び、戻り値 `true` のときのみ管理画面アクセスを許可。

**Rationale**:

- email 照合をクライアント側 (`if (email === 'owner@high-q.club')`) に書くと、ハードコード or VITE 環境変数経由での設定となり、ソース管理上 secret になりにくい（ハードコードされた email は GitHub に出る）
- DB 側は `is_admin()` がすでに `members.role = 'admin'` を真実とする RLS の根拠であり、判定ロジックを単一化することで「DB は通すがクライアントは弾く」/「クライアントは通すが DB が弾く」の不整合を防げる
- オーナー追加・変更時は `members` の SQL 1 行で済む

**代替**:

- ❌ `VITE_ADMIN_EMAIL_ALLOWLIST`: ビルド時固定 + クライアント露出。判定の真実が DB と二重化
- ❌ middleware（サーバー側）: Render の静的ホスティングでは middleware を持てない
- ❌ JWT 内 custom claim: Supabase が標準で `role` claim を提供しないため、Auth Hook の追加実装が必要。MVP1 では過剰

### D3. セッション・ロール状態管理 = Pinia ではなく `useAuthSession` composable + reactive ref

**選択**: `provide/inject` で単一インスタンス共有する composable パターン。Pinia は導入しない。

**Rationale**:

- 状態は「session（Supabase が保持） + isAdmin（boolean キャッシュ）+ status（idle/loading/authenticated/unauthenticated）」の 3 つだけ
- 範囲が小さく、composable + `provide/inject` で十分。Pinia 導入はスコープ外
- 後続で Pinia を入れたくなった場合も `useAuthSession` の API を変えずに内部実装だけ差し替え可能

**代替**:

- ❌ Pinia: オーバーキル
- ❌ Plain ref を module top-level に置く: HMR で重複インスタンス問題が出やすい

### D4. auth guard = 「認証情報がロードされるまで待つ」非同期 guard + AAL2 強制

**選択**: `router.beforeEach(async (to) => { await session.ready(); ... return true | { name: 'login' | 'mfa' | 'mfa-setup', ... } })`。AAL（Authentication Assurance Level）を判定し、AAL1（パスワードレス完了のみ・MFA 未完了）状態では保護ルートに進ませない。

**Rationale**:

- ブラウザ再訪時、Supabase の `getSession()` は同期では結果を返さない（非同期）。同期 guard で評価すると「session 復元前は未認証」と誤判定し、リフレッシュ毎に `/login` リダイレクトが発生する
- `useAuthSession` の `ready()` Promise が `getSession()` の最初の解決を待ち、以降は即解決する
- AAL は `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` で取得。`{ currentLevel: 'aal1' | 'aal2', nextLevel: 'aal1' | 'aal2' }` の判定により「MFA factor 未登録 → enroll 必要」「factor 登録済みだが未 verify → challenge 必要」を区別できる
- Loading 状態は guard 中に出ない（router は遷移を保留しているだけ）。アプリ初回マウント時の白画面が一瞬出るが、HQ paper 色の背景を `body`/`html` に当てておけば違和感は最小化

**代替**:

- ❌ 同期 guard で初期は `next(false)` → ready 後再評価: 二重遷移が発生
- ❌ 全ページに `<AuthGuard>` ラッパー: ルート定義が散らかる、ガード抜けの危険
- ❌ AAL 判定をクライアント側で JWT decode: SDK 提供の helper で十分、自前 decode はバージョン依存リスク

### D5. `/auth/callback` の責務 = `detectSessionInUrl: true` 任せ + 後処理

**選択**: Supabase クライアントは既に `detectSessionInUrl: true` で構築されているため、ページマウント時に SDK が URL の `#access_token=...` を消化してセッションを確立する。`AuthCallbackPage` は `onMounted` で session の確立を `useAuthSession` 経由で待ち、結果に応じて `/`（admin）/ `/login?reason=not-admin`（非 admin）/ `/login?reason=link-invalid`（失敗）にリダイレクトするだけ。

**Rationale**:

- Supabase SDK の標準動作に乗ることで、URL hash の解析・トークン検証・session 永続化を自前で書かない
- ページコンポーネントは「待つ + ルーティング」だけになり、テストも単純

**代替**:

- ❌ 自前で `exchangeCodeForSession`: Magic Link は code フローではなく hash フローのため不要

### D6. 4 状態の UI マッピング（LoginPage）

| 状態 | トリガ | UI |
|---|---|---|
| **Empty** | 初期 | フォーム表示、CTA 活性 |
| **Loading** | 送信中 | CTA 無効化 + テキスト「送信中…」、Input は活性のまま（誤操作で連打防止） |
| **Success** | `signInWithOtp` 成功 | フォームを「メールを確認してください」のメッセージに置き換え。`{email}` を表示、「別のメールアドレスを使う」リンクで Empty に戻る |
| **Error** | API エラー / バリデーションエラー / `reason` クエリ | フォームの上にエラーバナー表示、CTA 再活性、Input は値を保持。エラー種別ごとに文言を切り替え（`not-admin` / `link-invalid` / `link-expired` / `network` / `invalid-email`） |

`reason` クエリは `/login?reason=not-admin` のように渡る。バナーで表示し、URL からは `replaceState` で除去（リロードで再表示しない）。

### D7. デザイントークンへの忠実な準拠

- 紙色: `bg-paper`（`var(--hq-paper)`）
- 左ペイン: `bg-paper-warm` または既存トークンに合わせる
- アクセント: `text-accent` / `bg-accent`
- 書体: `font-jp` （Zen Kaku Gothic）/ `font-mono`（kicker, version 表示）/ `font-jp-display`（明朝大見出しは控えめに使う）
- spacing: `p-hq-*` / `gap-hq-*` / `px-hq-*`
- 影: `shadow-hq-*`、border は `border-hairline`

マジックナンバー禁止。`px-[56px]` のような任意値クラスは使わず、preset で対応するキーを利用する。preset に存在しない値が必要になった場合は、design-tokens 側に追加する change を別途切る（本 change ではしない）。

### D8. Vue Router ルート構造の追加

```
/                  HomePlaceholder         (要 admin 認証 + AAL2 / meta.requiresAal2 = true)
/login             LoginPage               (公開 / meta.public = true)
/auth/callback     AuthCallbackPage        (公開 / meta.public = true、内部で session 評価後リダイレクト)
/mfa/setup         MfaSetupPage            (要 AAL1 認証済み + MFA factor 未登録 / meta.requiresAuth = true, meta.requiresAal2 = false)
/mfa               MfaChallengePage        (要 AAL1 認証済み + MFA factor 登録済み / meta.requiresAuth = true, meta.requiresAal2 = false)
```

guard ロジック:

```ts
router.beforeEach(async (to) => {
  await session.ready();
  const authed = session.isAuthenticated.value;
  const admin = session.isAdmin.value;            // is_admin() 結果（AAL2 後にのみ評価）
  const aal = session.aal.value;                   // 'aal1' | 'aal2'
  const hasMfaFactor = session.hasMfaFactor.value; // boolean

  // 公開ルート（/login, /auth/callback）
  if (to.meta.public === true) {
    // ログイン済み AAL2 admin が /login へ来たら / に飛ばす（callback は除外）
    if (to.name === 'login' && authed && aal === 'aal2' && admin) {
      return { name: 'home' };
    }
    return true;
  }

  // 未認証
  if (!authed) return { name: 'login' };

  // AAL1: MFA を完了させる必要あり
  if (aal === 'aal1') {
    if (to.name === 'mfa-setup' || to.name === 'mfa') return true; // セットアップ・チャレンジページは通過
    return hasMfaFactor ? { name: 'mfa' } : { name: 'mfa-setup' };
  }

  // AAL2 到達後の admin 判定
  if (!admin) {
    await session.signOut();
    return { name: 'login', query: { reason: 'not-admin' } };
  }

  // AAL2 admin が /mfa, /mfa/setup へ来たら / に飛ばす
  if (to.name === 'mfa' || to.name === 'mfa-setup') return { name: 'home' };

  return true;
});
```

### D9. 配置（FSD）

```
apps/admin/src/
  app/
    router.ts                    ← ルート + guard
  pages/
    LoginPage.vue                ← 旧 LoginPlaceholder.vue を置換
    HomePlaceholder.vue          ← サインアウトボタンを最小限追加
    AuthCallbackPage.vue         ← 新規
    MfaSetupPage.vue             ← 新規（QR + verify）
    MfaChallengePage.vue         ← 新規（6 桁コード + verify）
  features/
    auth/
      index.ts                   ← Public API
      composables/
        useAuthSession.ts        ← session + isAdmin + aal + hasMfaFactor + ready/signOut
        useSendMagicLink.ts      ← signInWithOtp ラッパー
        useMfaEnrollment.ts      ← mfa.enroll → secret/qr → mfa.challenge → mfa.verify の状態機械
        useMfaChallenge.ts       ← mfa.challenge → mfa.verify の状態機械（既存 factor で再認証）
        useIdleTimeout.ts        ← document の操作イベント監視 + 15 分で signOut
      api/
        auth-client.ts           ← Supabase auth 関連薄いラッパー（テストで mock しやすくする）
      types.ts                   ← AuthStatus / AuthError / MfaStatus / MfaError union
  shared/
    api/
      supabase.ts                ← createSupabaseClient のアプリ内 wrapper（packages/shared をそのまま re-export 想定。既にあれば流用）
    ui/
      Input.vue / Label.vue / FormField.vue ← 既存利用
```

`features/auth` は他 feature から `import { useAuthSession } from '@/features/auth'` で参照される。`@high-q/shared` の Supabase client を直接他レイヤーから触らない。

### D10. テスト戦略

| レベル | 対象 | ツール |
|---|---|---|
| Unit | `useSendMagicLink` のバリデーション + signInWithOtp 呼び出し | Vitest, vi.mock(supabase) |
| Unit | `useAuthSession` の ready / isAdmin / aal / hasMfaFactor / signOut | Vitest, vi.mock |
| Unit | `useMfaEnrollment` の enroll → challenge → verify state machine（成功 / wrong code / API error） | Vitest, vi.mock |
| Unit | `useMfaChallenge` の challenge → verify state machine（成功 / wrong code / 試行回数制限） | Vitest, vi.mock |
| Unit | `useIdleTimeout` のイベント検知 / タイマーリセット / 15 分経過で signOut 呼び出し | Vitest, fake timers |
| Unit | router guard 6 ケース（未認証 / AAL1 + factor 未登録 → /mfa/setup / AAL1 + factor 登録済み → /mfa / AAL2 admin で / 通過 / AAL2 非 admin → サインアウト + /login?reason=not-admin / AAL2 admin で /login → /） | Vitest, mock useAuthSession |
| Component | LoginPage の 4 状態 | @vue/test-utils |
| Component | AuthCallbackPage の 3 ケース（admin / 非 admin / エラー） | @vue/test-utils |
| Component | MfaSetupPage の 4 状態（Empty=QR 表示 / Loading=verify 中 / Success=完了 / Error=コード誤り） | @vue/test-utils |
| Component | MfaChallengePage の 4 状態 | @vue/test-utils |
| E2E | (1) `/` に未認証アクセス → `/login` にリダイレクトされフォームが表示される | Playwright |
| E2E | (2) `/login` でメール送信 → Success 状態の文言が表示される（Supabase は MSW で mock or テスト用 endpoint） | Playwright |

E2E は機能あたり 1〜2 件の上限を遵守。マジックリンクの実メール受信および TOTP 検証は E2E では追わず、callback / MFA 後の挙動は component test に押し下げる。

#### D10.1. **E2E が本番 Supabase に届かないことの保証（多層防御）**

本サービスは数十人規模の本人確認書類を扱うため、E2E が誤って本番 Supabase に書き込みを行うことは絶対に避けなければならない。以下の 4 層で fail-closed 防御する:

1. **Playwright route mock**: 各 E2E テスト fixture で `page.route('**/auth/v1/**', ...)` `page.route('**/rest/v1/**', ...)` `page.route('**/storage/v1/**', ...)` を設定し、Supabase の全 API パスを mock 応答に差し替える
2. **ダミー env (`.env.e2e`)**: `VITE_SUPABASE_URL=https://e2e-dummy.invalid` のように **DNS で解決できないドメイン**を E2E 環境変数として用意。mock 漏れが起きても本番には届かない
3. **URL ガード assertion**: Playwright global setup で `VITE_SUPABASE_URL` を検査し、`.supabase.co` を含む（= 本番系の可能性）場合は `throw` でテスト全停止
4. **未マッチ HTTP のブロック**: 全テストで `page.route('**/*', route => { ... })` のフォールバック handler を設定し、明示的に許可した URL 以外の通信は `route.abort()` する

CI（GitHub Actions）でも、**E2E ジョブには本番 Supabase の secrets を渡さない**ことを運用ルールとする。E2E 環境変数は必ずダミー値であり、本番 secrets は build / unit test ジョブのみに公開される。

### D11. TOTP 二要素認証（MFA）の必須化

**選択**: Supabase Auth 標準の `mfa.enroll/challenge/verify` API を利用し、admin は TOTP factor の登録と検証を必須とする。AAL2 に到達するまで `is_admin()` を呼ばず、保護ルートも guard で遮断する。

**Rationale**:

- 本サービスは数十人規模の本人確認書類を扱う。マジックリンク単独では「メールアカウント乗っ取り = 即陥落」のため、第二要素が無いと漏えい時の被害深刻度に対して防御層が薄すぎる
- TOTP は Authy / Google Authenticator / 1Password 等で実装され、デバイス紛失リスクのみで運用可能（SMS のような SS7 攻撃や SIM swap 耐性あり）
- Supabase 標準の MFA API が利用可能で、追加バックエンド実装不要
- AAL（aal1 / aal2）は SDK が JWT を解析して提供するため、自前で claim 検査しない
- RLS にも `(auth.jwt() ->> 'aal') = 'aal2'` を将来的に追加できる（本 change ではしないが、後続で identity_documents テーブルに追加する余地を残す）

**代替**:

- ❌ SMS OTP: SS7 / SIM swap 攻撃耐性が低く、コストもかかる
- ❌ メール OTP（マジックリンクと同じメールに 6 桁コード）: 第一要素と同じチャネルなので意味がない
- ❌ WebAuthn / Passkey: より強固だが実装複雑度が高く、ブラウザ・デバイス依存。Phase 2 で検討
- ❌ MFA を「任意」にする: オーナーが面倒で OFF にしたら効かない。**必須化**で初めて意味を持つ

### D12. JWT 30 分 + idle 15 分の二段構え

**選択**: Supabase Project Settings で JWT expiry を 1800 秒（30 分）に短縮。さらにクライアント側で `useIdleTimeout` を実装し、document の `mousedown` / `keydown` / `touchstart` / `scroll` イベントから最後の操作時刻を更新、15 分経過で `signOut` を呼ぶ。

**Rationale**:

- JWT 30 分: refresh token は別途有効だが、JWT 単体が短命なら傍受時の悪用ウィンドウが小さい
- idle 15 分: アクティブ操作中はサインアウトされないが、放置中にデバイス紛失/盗難が起きても 15 分以内に侵害ウィンドウが閉じる
- 二段構えにすることで「ユーザー体験を著しく損なわず、デバイス紛失耐性を確保」のバランスを取る

**代替**:

- ❌ JWT 1 時間（デフォルト）: 数十人の本人確認書類を扱う水準としては長すぎる
- ❌ idle 5 分: ユーザー体験が著しく劣化（数行入力中に切れる）
- ❌ idle なし: デバイス紛失耐性が JWT 短縮のみに依存、現実的に 30 分は侵害可能性が残る
- ❌ Activity ベースの broadcast 同期（複数タブ）: MVP1 では複雑度に見合わない。タブ間で session が落ちることは許容

### D13. MFA Enrollment の強制タイミング

**選択**: 初回ログイン後、AAL1 状態かつ MFA factor 未登録なら自動的に `/mfa/setup` にリダイレクト。setup 完了（verify 成功）で AAL2 になり、初期到達ルート（または `/`）にリダイレクト。

**Rationale**:

- 初回オンボーディング時にしっかり setup させる強制力が必要。「後で」を許すと永遠に設定されない
- `mfa.enroll({ factorType: 'totp' })` は同一ユーザーで複数回呼べるが、verify されるまで factor は `unverified` 状態。verify 失敗時はそのまま再 enroll でリカバリー可能
- factor 紛失時（端末交換等）の運用は Supabase Dashboard で factor 削除 → 次回ログインで再 setup

**代替**:

- ❌ ログイン後の任意設定: オーナーが設定し忘れたら無意味
- ❌ Supabase の "MFA enforcement" 機能（Pro plan 以上）: 無料枠で動作させるためアプリ側で強制
- ❌ 初回マジックリンク送信時に setup を要求: 初回はそもそもログインしていないので不可

### D14. AAL2 後の admin 判定タイミング

**選択**: `is_admin()` RPC は AAL2 到達後にのみ呼ぶ。AAL1 中は `isAdmin = null`（未判定）として扱う。

**Rationale**:

- AAL1 で `is_admin()` を呼んでしまうと、MFA 未完了でも非 admin 判定が走り、サインアウト処理に進んでしまう。setup ページに到達できなくなる
- ロジックのフロー:
  1. signInWithOtp で AAL1 確立 → `useAuthSession` は session を保持、`isAdmin = null`
  2. `/mfa/setup` または `/mfa` で MFA 完了 → AAL2
  3. `onAuthStateChange` で AAL の変化を検知し `is_admin()` を呼ぶ
  4. 結果を `isAdmin` に格納
- 万一 AAL1 のまま is_admin() を呼ぶ実装になっていたとしても、`is_admin()` 自体は AAL に関わらず動作する（members.role を見るだけ）。ただし非 admin 判定で即サインアウトすると MFA setup に到達できないため、AAL ガードを優先する

**代替**:

- ❌ AAL1 でも is_admin() を呼ぶ: 上記の通り setup 到達不可
- ❌ DB 側 RLS で `(auth.jwt() ->> 'aal') = 'aal2'` を要求: members への RLS が AAL2 必須となり、AAL1 中の判定で「members 行が見えない = 非 admin」と誤判定。本 change のスコープ外

## Risks / Trade-offs

- **[Risk] `is_admin()` RPC が RLS で守られた SQL 関数のため、未認証では呼べない**  
  → Mitigation: `useAuthSession` は `supabase.auth.onAuthStateChange` で session が確立し、かつ AAL2 に到達した後にのみ `is_admin()` を呼ぶ。session 未確立時 / AAL1 時は `isAdmin = null`（未判定）として扱い、guard は session.ready() を待つ
- **[Risk] マジックリンクの `emailRedirectTo` を間違えると、本番の URL ではなくローカル URL に飛ばされる**  
  → Mitigation: `emailRedirectTo` は `window.location.origin + '/auth/callback'` で動的生成。Supabase Dashboard の Redirect URLs に admin の本番・プレビュー・ローカル URL を全て登録（運用作業として README/docs に明記）
- **[Risk] `shouldCreateUser: false` を指定するとアロウリスト外のメールではメールが届かないが、API レスポンスは成功扱いになりうる**  
  → Mitigation: それは仕様として受容（攻撃者にメール存在有無を漏らさない）。Success 表示は「メールが届いた場合のみクリック」とし、3 分待って届かない場合のヘルプ文言を Success 状態に追加
- **[Risk] ブラウザの localStorage が無効/制限されている環境（Safari Private 等）では session が永続化されない**  
  → Mitigation: 受容。MVP1 では発生時にユーザーが再度ログインする運用。後続で in-memory フォールバック検討
- **[Risk] `is_admin()` の結果をクライアント側でキャッシュすると、DB 側で role を 'member' に降格しても次のセッション期限まで admin と判定される**  
  → Mitigation: `useAuthSession` は `onAuthStateChange` のたびに `is_admin()` を再評価。明示的サインアウトで完全リセット。MVP1 ではオーナーが 1 人のため、降格シナリオ自体が運用上発生しない
- **[Risk] `signInWithOtp` のレートリミット（Supabase 既定: 同一 email 60 秒、IP あたり 1 時間）に引っかかる**  
  → Mitigation: Error 文言で「しばらく待ってから再試行してください」を表示。CTA は `loading=false` に戻す
- **[Risk] TOTP factor を登録した端末を紛失すると、オーナーがログイン不可になる**  
  → Mitigation: Supabase Dashboard の Authentication → Users から該当ユーザーの factor を削除する運用手順を docs に明記。次回ログインで再 setup される。MVP1 ではリカバリーコード生成は実装しない（スコープ外）
- **[Risk] TOTP の時刻ずれ（端末の時計が大きくずれている）で verify が失敗する**  
  → Mitigation: TOTP は ±30 秒の許容窓があるが、それを超えるずれは端末側で NTP 同期が必要。Error 文言に「端末の時刻設定を確認」を含める
- **[Risk] idle timeout が誤検知してアクティブ操作中にサインアウトされる**  
  → Mitigation: イベントは `mousedown` / `keydown` / `touchstart` / `scroll` の 4 種を統合。Network リクエストのレスポンスで延長はしない（ユーザー操作のみが活動の根拠）。タイマーは setTimeout の cancel/再設定で精度確保
- **[Risk] 複数タブで同一 session を使用中、片方のタブで idle timeout が走るともう一方も切られる**  
  → Mitigation: signOut は session 全体に作用するため受容。複数タブ運用時は両方アクティブにしておく必要がある（業務上は基本シングルタブ運用なので問題小）
- **[Risk] JWT 30 分への短縮で、長時間作業中（例: イベント情報の長文入力）にトークン切れが発生**  
  → Mitigation: Supabase SDK は `autoRefreshToken: true` で refresh token から新 JWT を自動取得する。refresh token は別途長期有効。30 分切れがそのまま「再ログイン強制」を意味しない
- **[Risk] MFA を必須化したことでオンボーディング時に詰まる**  
  → Mitigation: `/mfa/setup` ページに丁寧な手順説明（"認証アプリをインストール → QR コードをスキャン → 6 桁を入力" の 3 ステップ）と、推奨アプリのリンクを表示
- **[Trade-off] パスワード非対応により、初回オーナー以外の人がパスワード入力を期待した場合に混乱する可能性**  
  → 受容: オーナー単独運用のため利用者は翔太郎くんだけ。文言で明示
- **[Trade-off] MFA 必須化でログインのステップが 1 つ増える（メール → クリック → 6 桁入力）**  
  → 受容: セキュリティ要件に対する正当なコスト。1 日 1〜2 回のログインなら許容範囲

## Migration Plan

1. このコードがマージ・デプロイされる前に、Supabase Dashboard で:
   - Auth → URL Configuration の Redirect URLs に admin の本番・Render プレビュー・`http://localhost:5173` を追加
   - Auth → Email Templates → Magic Link の有効期限を 15 分（900 秒）に設定
   - **Auth → Providers → MFA → TOTP を ON に設定**（無料枠で利用可能）
   - **Project Settings → API → JWT settings の JWT expiry を 1800（30 分）に設定**
   - SQL Editor で `members` に admin の行を 1 件挿入（`auth.users` に対応行が必要なため、初回はオーナーが一度マジックリンクで signin → trigger or 手動で `members` を挿入 → role を 'admin' に更新の手順、または Dashboard の Authentication からユーザーを Invite してから members 行を挿入）
2. PR がマージされてデプロイ完了したら:
   - 本番 URL でマジックリンクを送信し、メールから AAL1 → `/mfa/setup` に到達することを確認
   - 認証アプリ（Authy 等）で QR コードをスキャンし、6 桁を入力して AAL2 に到達 → `/` に到達することを確認
   - 一度サインアウトし、再度マジックリンクログイン → `/mfa` で 6 桁入力 → `/` に到達することを確認（factor 登録済みなら setup ではなく challenge に飛ぶ）
   - 別アカウント（非 admin）でも試し、AAL2 後に `/login?reason=not-admin` に戻されることを確認
   - 未認証で `/` にアクセスし、`/login` にリダイレクトされることを確認
   - 15 分間操作せず放置し、auto signOut で `/login` に戻ることを確認
3. ロールバック: revert PR で旧 LoginPlaceholder と guard なしの状態に戻る。`auth.users` / `auth.mfa_factors` / `members` のデータは温存。Supabase Dashboard の MFA 設定 / JWT expiry はそのまま残しても旧コードに悪影響なし（旧コードは MFA 未対応なので AAL1 のまま動作する）。roll-forward で復旧

## Open Questions

- Supabase の magic link 有効期限を 15 分・JWT を 30 分に短縮する設定は Dashboard 側のみ（コードには現れない）。これを `docs/` の運用手順に書くべきか → **Sync フェーズで `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md` または新規 `docs/04-システム設計/` に追記する**
- TOTP factor 紛失時の運用手順（Dashboard で削除 → 再 setup）も同様に Sync フェーズで docs に追記
- `HomePlaceholder` のサインアウトボタンは「最小限」と本書で定義したが、デザインサンプルでは Sidebar 内の avatar メニュー配下にある。後続 dashboard Issue で Sidebar 実装時に移設し、HomePlaceholder からは外す → **本 change ではフォローアップ Issue を立てる代わりに `// TODO(後続 dashboard Issue): サインアウトボタンを Sidebar に移設` のコメントを残す**
- QR コードライブラリの選定（`qrcode` vs `@vueuse/qrcode`）は Apply 時にバンドルサイズ・型対応・メンテ状況を見て決定。本 change では `qrcode` を第一候補とする
