## Why

改正電気通信事業法 §27の12（外部送信規律、2023 年 6 月施行・罰則あり）への準拠が未整備のまま 3 アプリ（lp / admin / reservation）が運用されており、ユーザー情報の外部送信を事前公表せず・任意 cookie のオプトアウト手段も提供していない状態にある。本対応は #92（reservation 本人確認書類アップロード）の本番 ship 前提の法務ブロッカーであり、加えて LP の Google Tag Manager が同意を取得せずに無条件ロードされている既存の法令違反グレーをあわせて解消する。

## What Changes

- 外部送信ポリシーページ `/external-transmission` を **LP に新設**し、外部送信先・送信される情報・利用目的・利用者がオプトアウトできる手段を明示する（3 アプリ共通の単一 source of truth）
- 全アプリ初回アクセス時に **Cookie 同意 UI**（バナー）を表示し、`necessary` / `analytics` の 2 区分で同意取得・保存する
- **同意状態管理を packages/shared に共通基盤として実装**し、3 アプリで一貫した consent 体験と将来拡張（MVP2 で reservation に GTM を入れる等）を低コスト化する
- LP の **既存 GTM ロードを consent gate 化**し、analytics 同意前は `gtm.js` を読み込まない挙動に変更する（**BREAKING**: 同意前の GA 計測は失われる）
- 各アプリのフッターに「外部送信ポリシー」リンクを常設する（reservation はフッター自体が未実装のため新設）
- reservation の SignupIdentityPage / SignupProfilePage から本ポリシーページへのリンクを張る

## Capabilities

### New Capabilities
- `external-transmission-policy`: `/external-transmission` ページの記載要件（送信先・情報・目的の明示、フッターリンク常設、外部リンク扱いでの admin/reservation からの導線）
- `cookie-consent`: 同意 UI の表示条件・カテゴリ区分・状態保存・再表示抑止、および任意タグの consent gate ロード方針

### Modified Capabilities
- `lp-layout`: フッターに外部送信ポリシーリンクを追加。GTM の無条件ロードを consent gate 化
- `reservation-member-auth`: SignupProfilePage に外部送信ポリシー / プライバシーポリシーリンク (PolicyFooter 共通化) を追加
- `reservation-identity-document-upload`: 既存 spec が `/external-transmission` を reservation 内のルートと仮定していたが、設計判断で LP 集約に変更。SignupIdentityPage の外部送信ポリシーリンクは LP の URL を新規タブで開く挙動に修正

## Impact

- **コード**: `packages/shared/src/consent/`（新規・consent state schema/storage/event）, `apps/lp/index.html`（GTM の inline 実行除去）, `apps/lp/src/`（Vuetify 製 consent banner + footer リンク + `/external-transmission` ページ）, `apps/admin/src/`（shadcn-vue 製 consent banner + footer リンク）, `apps/reservation/src/`（同左 + フッター widget 新設）
- **計測**: LP の GA 計測は consent 取得後のみ動作するように変わるため、analytics 拒否ユーザー分のデータが欠損する
- **依存**: 新規外部依存なし（cookie consent ライブラリは導入せず、自前の薄い実装で済ませる）
- **デプロイ**: 3 アプリ同時デプロイが望ましい（フッターリンク先が LP ページ前提のため、LP 先行デプロイ推奨）
- **ドキュメント**: `docs/06-品質・セキュリティ/` 配下に外部送信規律対応の方針記録を追加
