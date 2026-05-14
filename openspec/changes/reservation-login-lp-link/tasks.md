## 1. 共有ヘルパーへの LP トップ URL 追加

- [x] 1.1 `apps/reservation/src/shared/lib/externalLinks.ts` に LP トップ URL を返す export を追加する（既存 `normalizedLpOrigin` を流用し、定数名は `LP_TOP_URL`、値はオリジンそのもの）
- [x] 1.2 既存の `PRIVACY_POLICY_URL` / `EXTERNAL_TRANSMISSION_URL` と同じ命名規約・並びに沿って配置する

## 2. ログインページのリンク配線

- [x] 2.1 `apps/reservation/src/pages/LoginPage.vue` の `<script setup>` で `LP_TOP_URL` を import する
- [x] 2.2 該当 anchor (`href="#"`) を `:href="LP_TOP_URL"` に差し替える
- [x] 2.3 `target="_blank"` と `rel="noopener noreferrer"` を付与する
- [x] 2.4 スクリーンリーダー向けに外部遷移を伝える補助情報（`aria-label` に「サークルについて詳しく（新しいタブで開く）」相当）を付与する
- [x] 2.5 「#90 周辺で正式配線」を示唆していた暫定 TODO コメントを削除する

## 3. テストの追加・更新

- [x] 3.1 `apps/reservation/src/pages/LoginPage.spec.ts` に、anchor の `href` が `LP_TOP_URL`（=`externalLinks.ts` 経由の値）と一致することを確認するアサーションを追加する
- [x] 3.2 同テストに、`target="_blank"` と `rel` が `noopener` / `noreferrer` を含むことを確認するアサーションを追加する
- [x] 3.3 既存「サークルについて詳しく」文字列のアサーションが新仕様で壊れていないことを確認する
- [x] 3.4 `import.meta.env.VITE_LP_ORIGIN` をテスト内で差し替えるパターンが必要な場合は既存テスト（`PolicyFooter.spec.ts` / `AppFooter.spec.ts`）に倣う

## 4. 最終確認

- [x] 4.1 `pnpm exec vitest run` で reservation 側のユニット / コンポーネントテストがすべてグリーンであることを確認する
- [x] 4.2 `pnpm build:reservation` でビルドエラーがないことを確認する
- [ ] 4.3 開発サーバを起動し、`/login` を開いて「サークルについて詳しく ›」をクリックすると LP オリジンが新規タブで開き、元のタブのメール入力が保持されることを目視確認する（翔太郎くんに実機確認を依頼予定）
- [x] 4.4 OpenSpec 整合性チェック (`openspec validate reservation-login-lp-link --strict`) を実行し、Pass することを確認する
