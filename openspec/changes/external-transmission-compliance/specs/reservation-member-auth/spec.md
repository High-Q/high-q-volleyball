## ADDED Requirements

### Requirement: SignupProfilePage の footer 注記でデータ利用目的・関連ポリシーへのリンクを明示する

`apps/reservation` の `/signup/profile` ページは、本文末尾 (CTA 周辺) に MUST 以下の注記とリンクを表示する (個人情報保護法 + 改正電気通信事業法対応):

> ご入力いただいた情報は、本人確認・連絡・参加管理のためにのみ利用します。第三者への提供は法令に基づく場合を除き行いません。
>
> 詳細は[プライバシーポリシー](/privacy)・[外部送信ポリシー](`<lp-origin>/external-transmission`) をご覧ください。

実装は `SignupIdentityPage` の既存 `PolicyFooter` コンポーネントを `apps/reservation/src/shared/ui/` に共通プリミティブとして抽出して再利用する SHALL。

#### Scenario: footer 注記の存在
- **WHEN** ユーザーが `/signup/profile` を開いて画面を最下部までスクロールする
- **THEN** 利用目的の注記とプライバシーポリシー / 外部送信ポリシーへのリンクが表示される

#### Scenario: 外部送信ポリシーリンクの遷移先
- **WHEN** ユーザーが「外部送信ポリシー」リンクを押下する
- **THEN** lp の `<lp-origin>/external-transmission` が新規タブで開かれる

#### Scenario: プライバシーポリシーリンクの遷移先
- **WHEN** ユーザーが「プライバシーポリシー」リンクを押下する
- **THEN** `/privacy` ルートに遷移する (ページ本文は別 Issue #193 で実装、リンク先存在は前提で 404 でも本要件は受入可)

#### Scenario: PolicyFooter コンポーネントの共通化
- **WHEN** `SignupIdentityPage` と `SignupProfilePage` の両方で PolicyFooter が描画される
- **THEN** 共通プリミティブ `apps/reservation/src/shared/ui/PolicyFooter.vue` が両ページで import されている (テキストや遷移先は同一)
