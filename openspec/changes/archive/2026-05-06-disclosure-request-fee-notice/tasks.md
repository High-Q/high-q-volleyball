## 1. テスト追加 (TDD)

- [x] 1.1 `apps/lp/src/pages/privacy/ui/PrivacyPolicyPage.spec.js` の「開示請求セクションに 4 種請求権と mailto リンクが記載される」テストを拡張し、本文に「手数料」「無料」「MVP1」の文言が描画されることをアサーションに追加（この時点で red であることを確認）

## 2. 実装

- [x] 2.1 `apps/lp/src/pages/privacy/ui/PrivacyPolicyPage.vue` の §7「開示・訂正・利用停止等の請求」セクション末尾に「手数料」サブ項目を追記（文言: 「本請求に係る手数料は、MVP1 期間中は無料です。」）
- [x] 2.2 `pnpm --filter @high-q/lp exec vitest run PrivacyPolicyPage` で 1.1 のテストが green になることを確認

## 3. SOP 同期

- [x] 3.1 `docs/06-品質・セキュリティ/06-個人情報保護方針.md` §7 に「7.4 手数料」サブセクションを追加し、MVP1 期間中は無料である旨を明記
- [x] 3.2 同 §9 改定履歴に本変更の行を追加（日付: 2026-05-06、内容: 「開示・訂正・利用停止等の請求に係る手数料を無料 (MVP1) として明示 (#194)」）

## 4. 最終確認

- [x] 4.1 `pnpm exec vitest run` 全件 green を確認
- [x] 4.2 `pnpm build:lp` がエラーなく通ることを確認
- [ ] 4.3 ローカルで `/privacy` ページを目視し、§7 末尾に手数料記載が表示されること、既存セクションのレイアウトが崩れていないことを確認
