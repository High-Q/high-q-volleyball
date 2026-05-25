## REMOVED Requirements

### Requirement: JWT 30 分 + idle timeout 15 分

**Reason**: 当日運営オペレーションが 15 分無操作で頻繁に強制ログアウトされ業務継続性が損なわれていたこと、および現状実装 (`jwt_expiry = 3600` = 1 時間) と spec 記述 (「30 分」) が乖離していたことを同時に解消するため、ポリシーを「JWT 1 時間 + クライアント側 idle timeout 3 時間」に切り替える。

Issue #297 当初の採用方針 (Supabase Auth `inactivity_timeout` でサーバ側一本化) は Pro プラン限定機能であり Free プランでは選択不可と判明したため、クライアント側 `useIdleTimeout` の閾値を 15 分 → 3 時間に延長する案 B を採用した (経緯は `openspec/changes/auth-session-inactivity-3h/design.md` Decision 1 参照)。

**Migration**: 本 change で新規 ADDED される `Requirement: JWT 1 時間 + クライアント側 idle timeout 3 時間` に従う。`apps/admin/src/features/auth/composables/useIdleTimeout.ts` の `IDLE_LIMIT_MS` 定数を `15 * 60 * 1000` から `3 * 60 * 60 * 1000` に変更し、Vitest の時間リテラルも 3 時間ベースに更新する。Supabase Auth 設定 (`jwt_expiry` / `[auth.sessions]`) は本 change で SHALL NOT 変更する。

## ADDED Requirements

### Requirement: JWT 1 時間 + クライアント側 idle timeout 3 時間

セッションの JWT 有効期限は 1 時間（3600 秒）SHALL とする。これは Supabase Auth の `jwt_expiry` 設定で規定され、クライアントは `autoRefreshToken: true` により refresh token から自動更新する。

加えて、`apps/admin` はクライアント側で **idle timeout 3 時間** を MUST 実装する: 最後のユーザー操作 (`mousedown` / `keydown` / `touchstart` / `scroll` のいずれか) から 3 時間 (10,800,000 ms) 経過で `useAuthSession.signOut()` を呼ぶ。Supabase Auth のサーバ側 `inactivity_timeout` は Pro プラン限定機能のため本 capability では SHALL NOT 依存する (将来 Pro 昇格時にサーバ側移行する change を別途起こす想定)。

#### Scenario: アクティブ操作中はサインアウトされない
- **WHEN** admin ユーザーが定期的にクリック・キー入力・タッチ・スクロールを行っている
- **THEN** idle timer がリセットされ続け、サインアウトされない

#### Scenario: 3 時間放置で auto signOut
- **WHEN** admin ユーザーが 3 時間 (10,800,000 ms) 一切の `mousedown` / `keydown` / `touchstart` / `scroll` イベントを発生させない
- **THEN** `signOut` が呼ばれ、保護ルートにアクセスすれば `/login` にリダイレクトされる

#### Scenario: JWT 自動更新
- **WHEN** admin ユーザーがアクティブな状態で 1 時間以上操作を続ける
- **THEN** Supabase SDK が refresh token から JWT を自動更新し、ユーザーは再ログインを求められない

#### Scenario: クライアント側 idle timer の起動
- **WHEN** `apps/admin` が起動する
- **THEN** `main.ts` で `useIdleTimeout()` が `start(() => signOut())` 付きで呼ばれており、document level のイベントリスナーが登録されている
