## 1. Setup

- [x] 1.1 ブランチ `feature/229-reservation-lp-event-entry` を作成し、master から分岐させる

## 2. open redirect ガード (`safeNextPath`)

- [x] 2.1 [RED] `apps/reservation/src/shared/lib/safeNextPath.spec.ts` を作成し、受理・却下の各ケース (通常パス / 絶対 URL / protocol-relative / 制御文字 / `/login` 等への循環 / 非文字列入力) を網羅するユニットテストを書く
- [x] 2.2 [GREEN] `apps/reservation/src/shared/lib/safeNextPath.ts` を実装し、テストを通す
- [x] 2.3 `shared/lib/` には barrel index がない運用なので、直接 `@/shared/lib/safeNextPath` で import する方針 (新規 barrel は作らない)

## 3. auth guard 拡張

- [x] 3.1 [RED] `apps/reservation/src/app/router.spec.ts` を拡張し、以下のシナリオを追加する:
  - 未認証で `/events/<id>` に直接アクセスすると `/login?next=%2Fevents%2F<id>` にリダイレクトされる
  - 未認証で `/login` に直接アクセスしても `next` は付与されない
  - 未認証で `/auth/callback` 直接アクセスはガード通過 (`next` 付与対象外)
  - 不正な `next` 値 (`https://evil.example.com` 等) は破棄される
  - 認証済み + プロフィール完成済みで `/login?next=%2Fevents%2F<id>` にアクセスすると `/events/<id>` に直接 navigate される
- [x] 3.2 [GREEN] `apps/reservation/src/app/router.ts` の `registerAuthGuard` を改修
- [x] 3.3 既存テスト全件が引き続き pass することを確認 (30 tests pass)

## 4. LoginPage の `next` 引き継ぎ

- [x] 4.1 [RED] `apps/reservation/src/pages/LoginPage.spec.ts` に next 引き継ぎテストを追加 (`sendMock` 第 2 引数で next を検証 + signup リンクで next 引き継ぎ)
- [x] 4.2 [GREEN] `LoginPage.vue` で `route.query.next` を `safeNextPath` で検証し、`send()` と signup リンクに渡す実装に改修

## 5. SignupPage / SignupVerifyPage / SignupIdentityPage の `next` 引き継ぎ

- [x] 5.1 [RED] `apps/reservation/src/pages/SignupPage.spec.ts` を拡張: `/signup?next=...` で送信成功時に `/signup/verify?email=...&next=...` に navigate されることを検証
- [x] 5.2 [GREEN] `SignupPage.vue` を改修し、`next` を `router.push` のクエリに引き継ぐ
- [x] 5.3 [RED] `SignupVerifyPage.spec.ts` を拡張: 検証成功 → `/signup/identity?next=...` (書類未提出時) または `next` 先 (書類提出済み時) に navigate されることを検証
- [x] 5.4 [GREEN] `SignupVerifyPage.vue` を改修し、検証成功後の navigate 先決定で `next` を尊重する
- [x] 5.5 [RED] `SignupIdentityPage.spec.ts` を拡張: 書類アップロード完了後に `next` 先に navigate されることを検証 (`next` 未指定時は既存どおり `/` へ)
- [x] 5.6 [GREEN] `SignupIdentityPage.vue` を改修し、完了 navigate 先を `safeNextPath(next) ?? '/'` で決定する

## 6. AuthCallbackPage の `next` 引き継ぎ

- [x] 6.1 [RED] `AuthCallbackPage.spec.ts` を拡張: 認証成功 + next で next 先 / 不正 next で home / 認証失敗で login の 3 シナリオを追加 (signup/profile 分岐は #189 で廃止済のため対象外)
- [x] 6.2 [GREEN] `AuthCallbackPage.vue` の navigate 決定ロジックを改修し、`safeNextPath(route.query.next)` の戻り値で `router.replace` 先を上書きする (既定値: `home`)

## 7. Integration (ローカル動作確認)

- [ ] 7.1 reservation dev server を起動し、未認証セッションで以下を手動確認:
  - `/events/<実在 id>` 直アクセス → `/login?next=%2Fevents%2F<id>` に遷移
  - メールアドレス入力 → マジックリンクメールの URL に `next` が含まれている
  - リンククリック → トークン消化後 `/events/<id>` に到達
- [ ] 7.2 同様に signup フローを未認証セッションで通し、3 段階すべてで `next` が引き継がれ、書類提出完了後に `/events/<id>` に到達することを確認
- [ ] 7.3 認証済みセッションで `/events/<id>` 直アクセスが guard 通過のまま描画されることを確認
- [ ] 7.4 認証済みセッションで `/login?next=%2Fevents%2F<id>` 直アクセスが直接 `/events/<id>` に遷移することを確認
- [ ] 7.5 不正 ID (`/events/nonexistent`) で認証フローを通し、EventDetailPage の「該当なし」状態と一覧導線が描画されることを確認

## 8. PR / CI

- [ ] 8.1 `pnpm --filter @high-q/reservation lint` / `typecheck` / `test` / `build` をローカルで全 pass を確認
- [ ] 8.2 PR を作成し、Issue #229 にリンク。CI 全 pass を確認
- [ ] 8.3 Render Preview で 7.1〜7.5 のシナリオを再確認 (preview URL 共有後に翔太郎くん確認)
