## 1. `/privacy` ページを LP に新設

- [x] 1.1 `apps/lp/src/pages/privacy/` に Vue ページ + ルート登録を新設する（`/external-transmission` と同階層・同実装パターンを踏襲）
- [x] 1.2 ページ本文に 8 セクション構成（はじめに / 取得項目 / 利用目的 / 第三者提供 / 保管期間 / 安全管理 / 開示請求窓口 / 改定履歴・問い合わせ）を Vuetify で組み立てる
- [x] 1.3 取得項目セクションに認証情報・プロフィール（氏名・生年月日・電話番号・経験レベル）・本人確認書類画像（センシティブ表記）・利用ログを列挙する
- [x] 1.4 利用目的セクションに 5 項目（本人確認 / 連絡 / 役所提出証憑 / サービス提供 / 障害・不正調査）と目的外利用禁止の表明を記載する
- [x] 1.5 第三者提供セクションに「法令に基づく場合」「役所への団体登録証憑」の 2 例外と委託先（Supabase / Render）所在地を記載する
- [x] 1.6 保管期間セクションに在籍中継続保管・退会時削除・役所提出済証憑の分離保管を記載する
- [x] 1.7 安全管理措置セクションに RLS / Storage 暗号化 / TLS / 本人確認書類取扱 SOP / マイナンバー 12 桁テキスト保存禁止 / 閲覧権限最小化を記載する
- [x] 1.8 開示請求窓口セクションに 4 種請求権（開示 / 訂正 / 利用停止 / 第三者提供停止）と mailto: リンク・対応プロセスを記載する
- [x] 1.9 ページ末尾に外部送信ポリシーへの相互参照リンク・最終更新日（`YYYY-MM-DD`）・問い合わせ先 mailto: を表示する
- [x] 1.10 vitest で「8 セクション全描画」「mailto: リンク存在」「外部送信ポリシーへの相互参照リンク存在」のコンポーネントテストを書く

## 2. LP のフッターにプライバシーポリシーリンクを追加

- [x] 2.1 `apps/lp/src/shared/ui/FooterLine.vue` の法務リンク群に「プライバシーポリシー」を追加する
- [x] 2.2 vitest で「フッターに プライバシーポリシー / 外部送信ポリシー / Cookie 設定 の 3 リンクが並ぶ」「いずれの画面幅でも常設」を検証する

## 3. reservation の PolicyFooter のプライバシーリンク先を LP 外部リンクに変更

- [x] 3.1 `apps/reservation/src/shared/lib/externalLinks.ts` に `PRIVACY_POLICY_URL` 定数を追加（`EXTERNAL_TRANSMISSION_URL` と同じ pattern で `${lpOrigin}/privacy`）
- [x] 3.2 `apps/reservation/src/shared/ui/PolicyFooter.vue` の `<RouterLink to="/privacy">` を `<a :href="PRIVACY_POLICY_URL" target="_blank" rel="noreferrer">` に変更する
- [x] 3.3 既存 `PolicyFooter.spec.ts` を更新し、「プライバシーリンクが LP オリジンへの新規タブ外部リンク」「target="_blank"」「rel="noreferrer"」を検証するアサーションに差し替える
- [x] 3.4 SignupIdentityPage / SignupProfilePage の関連 spec から `/privacy` ルートの Stub 設定を削除する（もう不要）
- [x] 3.5 SignupIdentityPage / SignupProfilePage が LP 外部リンクで privacy へ到達できることを vitest で確認する

## 4. reservation のフッターにプライバシーポリシーリンクを追加

- [x] 4.1 `apps/reservation/src/widgets/app-footer/` の法務リンク群に「プライバシーポリシー」を追加（`PRIVACY_POLICY_URL` を `target="_blank"` + `rel="noreferrer"` で参照）
- [x] 4.2 vitest で「フッターに プライバシーポリシー / 外部送信ポリシー / Cookie 設定 の 3 リンクが並ぶ」を検証する

## 5. admin のフッターにプライバシーポリシーリンクを追加

- [x] 5.1 `apps/admin/src/widgets/app-footer/` の法務リンク群に「プライバシーポリシー」を追加（LP オリジン + `target="_blank"` + `rel="noreferrer"`）
- [x] 5.2 vitest で「フッターに プライバシーポリシー / 外部送信ポリシー / Cookie 設定 の 3 リンクが並ぶ」を検証する

## 6. 内部運用ドキュメント更新

- [x] 6.1 `docs/06-品質・セキュリティ/06-個人情報保護方針.md` を本ページの内部運用版として執筆する（取得項目 / 利用目的 / 第三者提供 / 保管期間 / 安全管理 / 開示請求窓口の各カテゴリをページ本文と項目整合）
- [x] 6.2 `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` の関連箇所から本ポリシーページへの相互参照を追加する

## 7. 最終確認

- [x] 7.1 `pnpm exec vitest run` を全アプリで通す（lp / admin / reservation 全 pass）
- [x] 7.2 `pnpm build:lp` / `pnpm --filter @high-q/admin build` / `pnpm --filter @high-q/reservation build` を通す
- [ ] 7.3 ローカルで lp を起動し `/privacy` の表示・mailto リンク・外部送信ポリシー相互参照リンク・3 アプリのフッターリンク導線（admin / reservation から新規タブで LP の `/privacy` が開くこと）を手動確認する（翔太郎くん）
