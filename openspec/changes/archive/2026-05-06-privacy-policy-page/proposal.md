## Why

個人情報保護法 §17-§22 に基づき会員から取得・保管する個人情報（特に本人確認書類画像という極めてセンシティブな情報）の利用目的・保管期間・開示請求窓口を公表する義務があるが、現状 `/privacy` ルートが未実装で SignupProfilePage / SignupIdentityPage の同意リンクが 404 を返す状態にある。本対応は #92 (reservation 本人確認書類アップロード) の本番 ship 前提の法務ブロッカーであり、外部送信ポリシー (#192) と対をなす最後の法令文書ピースを埋める。

## What Changes

- プライバシーポリシー本文ページ `/privacy` を **LP に新設**し、3 アプリ共通の単一 source of truth として運用する（`/external-transmission` と同じ集約方針）
- ページ本文に個人情報保護法 §17-§22 が要求する記載要素を網羅: 取得項目 / 利用目的 / 第三者提供 / 保管期間・退会後処理 / 安全管理措置 / 開示請求等の窓口
- ページ本文では個別 SaaS 名（Supabase / Render / AWS 等）と個別技術名（RLS / TLS 等）を非掲載とし、「クラウドサービス事業者」「アクセス制御」等の概要表現に抑える（セキュリティ上のヒント漏えい回避と、法令上の公表義務範囲の整合）。具体名は内部 SOP（`docs/06-個人情報保護方針.md`）に集約し、本人からの個別問い合わせに応じて開示する運用とする
- 主体表記は「事業者」ではなく **江東区社会教育団体** としての実態に即した表現を用いる（株式会社や個人事業主ではない任意団体としての性格を反映）
- LP のフッター法務リンク群に「プライバシーポリシー」を追加し、admin / reservation のフッターにも同リンクを配置（外部送信ポリシーと同様、別オリジンへの新規タブ遷移）
- reservation の `PolicyFooter` のプライバシーリンクを **`RouterLink to="/privacy"` から LP オリジンへの外部リンク (`<a target="_blank">`) に変更**し、SignupIdentityPage / SignupProfilePage 双方から到達可能にする
- 既存 `docs/06-品質・セキュリティ/06-個人情報保護方針.md` を本ページの記載内容で埋める（現状 0 byte）

## Capabilities

### New Capabilities
- `privacy-policy-page`: `/privacy` ページの記載要件（個人情報保護法に基づく必須要素の網羅、フッターリンク常設、3 アプリからの導線）

### Modified Capabilities
- `lp-layout`: フッター法務リンク群に「プライバシーポリシー」を追加（既存は「外部送信ポリシー」「Cookie 設定」のみ）
- `reservation-member-auth`: SignupProfilePage の PolicyFooter のプライバシーリンク先を LP の URL（別オリジン・新規タブ）に変更
- `reservation-identity-document-upload`: SignupIdentityPage の PolicyFooter のプライバシーリンク先を LP の URL に変更し、reservation 内に `/privacy` ルートを持たないことを明示

## Impact

- **コード**: `apps/lp/src/pages/privacy/`（新規 Vue ページ + ルート登録）, `apps/lp/src/shared/ui/FooterLine.vue`（リンク追加）, `apps/admin/src/widgets/app-footer/`（リンク追加）, `apps/reservation/src/widgets/app-footer/`（リンク追加）, `apps/reservation/src/shared/ui/PolicyFooter.vue`（RouterLink → 外部リンク化）, `apps/reservation/src/shared/lib/externalLinks.ts`（`PRIVACY_POLICY_URL` 追加）
- **依存**: 新規外部依存なし
- **デプロイ**: LP 先行デプロイで privacy ページを公開後、admin / reservation を順次デプロイ。3 アプリの順番が逆転すると一時的に 404 リンクが発生するが、既存の external-transmission spec で確立済みの「リンク先 404 でも単独受入可」方針を踏襲
- **ドキュメント**: `docs/06-品質・セキュリティ/06-個人情報保護方針.md` を本ページの記載内容と整合する形で記述（現状空ファイル）
- **法務**: 法律家レビューはオプション（Issue 完了条件）。MVP1 では翔太郎くん起草版で ship し、レビュー入手後に sync で更新する運用
