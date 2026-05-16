## Why

予約サイトのログインページ下部に置かれた「サークルについて詳しく ›」リンクは、LP（サークル紹介ページ）へ会員を案内するための導線として設置されたが、現状はリンク先が未配線のまま放置されている。ログイン前の見込み会員が「どんなサークルなのか」を確かめようとした瞬間に行き止まりに当たる UI で、入会前接点としての価値を発揮できていない。すでに別の外部リンク（プライバシーポリシー / 外部送信ポリシー）は `VITE_LP_ORIGIN` ベースの配線で稼働しているため、同じ仕組みに乗せれば軽い差分で正規動線にできる。

## What Changes

- ログインページ「サークルについて詳しく ›」リンクの遷移先を、LP のトップページに固定する
- 当該リンクを新しいタブで開き、ログイン中の入力状態を失わせない（外部遷移の慣例に揃える）
- LP オリジンの解決は既存の `VITE_LP_ORIGIN` フォールバックパターンに合わせ、新しい環境変数や独自設定は導入しない
- ログインページの「サークル紹介への動線が存在し、LP へ遷移する」という UX 約束を会員認証 capability の Requirement として明文化する
- 「#90 周辺で正式配線」と書かれていた暫定 TODO コメントは本 change で解消する

## Capabilities

### New Capabilities

- 該当なし（既存 capability への要件追加のみで完結する）

### Modified Capabilities

- `reservation-member-auth`: ログイン画面の構成要件に「サークル紹介への外部リンク（LP への遷移）を提供する」 Requirement を追加する。リンク先・開き方・解決ソース（LP オリジン）に関する振る舞いを規定する

## Impact

- **予約サイトのフロント**: `apps/reservation/src/pages/LoginPage.vue` の該当 anchor を、LP オリジン解決ヘルパー経由のリンクに差し替える。新しいタブで開く属性とアクセシビリティ属性を付与する
- **共有ヘルパー**: `apps/reservation/src/shared/lib/externalLinks.ts` に LP トップ URL を export として追加（既存の `PRIVACY_POLICY_URL` / `EXTERNAL_TRANSMISSION_URL` と同じ責務集約）
- **テスト**: ログインページのコンポーネントテストに、リンクの href・target・rel・テキスト整合性を担保するアサーションを追加する
- **環境変数**: 既存 `VITE_LP_ORIGIN` を再利用するため、新規 secret や Render 設定変更は不要
- **ドキュメント**: LP オリジン参照ヘルパーの責務集約点が増えることに伴い、`openspec/specs/reservation-member-auth/spec.md` を sync フェーズで更新する想定
- **スコープ外**: LP 側の改修（about セクション専用ページ化、アンカー追加、LP の SEO 文言更新など）は本 change では行わない。LP 側で構造を変えるべき判断が出た場合は別 Issue として切り出す
