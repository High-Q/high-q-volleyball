## 1. 共通シェル基盤（プリミティブ・widget・TDD）

- [x] 1.1 shadcn-vue `Sheet`（ドロワー）プリミティブを `apps/admin/src/shared/ui/` に取り込む（a11y: フォーカストラップ / Esc / スクリム / スクロールロックは radix-vue に委譲）
- [x] 1.2 `shared/ui/DataCardList`（モバイル時 `md:hidden` のカード枠・余白・リスト a11y セマンティクス）を追加し、Component テスト（< `md` で表示 / ≥ `md` で非表示）を TDD で先に書く
- [x] 1.3 `widgets/admin-shell` のデスクトップ `SidebarNav`（240px・ブランド・実在ルート 5 項目・現在ルートのアクティブ強調・最下部にユーザー表示 + ログアウト・本人確認書類 pending Badge）を実装（HQ トークン経由のみ）
- [x] 1.4 `widgets/admin-shell` のモバイル AppBar（ハンバーガー + `route.meta.title` 由来タイトル + 主要アクション Teleport 領域）+ Drawer（`Sheet` で同一ナビ）を実装
- [x] 1.5 `admin-shell` の Component テストを TDD で追加（ドロワー開閉 / Esc・スクリムで閉じる / 閉じた時ハンバーガーへフォーカス返却 / ナビ項目遷移で閉じる / pending Badge 表示）
- [x] 1.6 各ルートに `meta.title` を付与し、`admin-shell` の Public API（`index.ts`）を整備（`eslint-plugin-boundaries` 違反が無いこと）

## 2. App 配線とグローバルナビ移設

- [x] 2.1 `App.vue` を、認証配下ルートはシェル経由・公開ルート（login / mfa / mfa-setup / auth-callback）はシェル無しで描画する構成に変更
- [x] 2.2 `DashboardPage` の header からグローバルナビ（会員 / 本人確認書類 / ログアウト）を削除して TopBar（パンくず + タイトル + 主 CTA）に縮約し、主 CTA をモバイルでアプリバーへ Teleport。本文 2 カラムの `md` 縦積みを確認
- [x] 2.3 `EventsListPage` / `EventDetailPage` / `MembersListPage` / `VenuesPage` / `IdentityDocumentsListPage` / `IdentityDocumentDetailPage` の header グローバルナビ行を削除して TopBar へ縮約（ページ固有アクションのみ残す）
- [x] 2.4 ナビ移設に伴う既存 page / router の spec（`*.spec.ts`）の期待値を更新（グローバルナビをシェルに移したことの反映）

## 3. 一覧のテーブル→カード（モバイル）

- [x] 3.1 `widgets/events-list`: デスクトップ Table 維持 + モバイル `DataCardList` カード（全 7 項目保持・横スクロール無し）。切替の Component テストを TDD で追加
- [x] 3.2 `widgets/members-list`: 同様にモバイルカード化（各バッジ保持）。Component テスト
- [x] 3.3 `widgets/identity-documents-list`: 同様にモバイルカード化（6 項目保持）。Component テスト
- [x] 3.4 `widgets/event-participants`: モバイルカード化（チェックイン済を背景色でハイライト・操作要素 44px 以上・全項目保持）+ 参加者一覧の内側スクロールをカードリストでも維持。Component テスト

## 4. フォーム / master-detail（モバイル縦積み）

- [x] 4.1 `events-crud`（create / edit）をシェル配下に置き、既存モバイルファースト要件（1 カラム縦積み・44px・AlertDialog full-width）の回帰が無いことを確認
- [x] 4.2 `VenuesPage` の master-detail をモバイルでビュー切替（リスト⇄フォーム）にし、詳細フォームを 1 カラム縦積みに。切替の Component テスト

## 5. ログイン / 認証 / エラー

- [x] 5.1 `LoginPage` をモバイル縦積み（ブランド帯を上部に圧縮・装飾コピー非表示・フォーム全幅）、デスクトップ 2 カラム維持
- [x] 5.2 `MfaChallengePage` / `MfaSetupPage` / `AuthCallbackPage` がモバイル幅で中央寄せ・横スクロール無しで収まることを確認
- [x] 5.3 既存のエラー表示（widget の Error 状態等）がモバイル幅で折り返し・破綻しないことを確認

## 6. E2E と最終確認（まとめて実行）

- [x] 6.1 モバイルビューポートの E2E を 1 本追加（ログイン → イベント詳細 → 参加者チェックイン の happy path）
- [ ] 6.2 375 / 768 / 1280px で対象全画面が横スクロール無し・デスクトップ視覚回帰無しを目視確認
- [x] 6.3 まとめて実行: `pnpm exec vitest run` / ESLint（boundaries・no-restricted-imports）/ `stylelint` / 型チェック / `pnpm build:admin`
- [x] 6.4 デザイントークン準拠の grep（`apps/admin/src/{pages,widgets,features}/**/*.vue` で生 hex `#[0-9a-f]{3,6}` / `\[\d+px\]` のマッチ 0 件）
