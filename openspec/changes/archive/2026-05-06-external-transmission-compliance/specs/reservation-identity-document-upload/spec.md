## MODIFIED Requirements

### Requirement: footer 注記でデータ利用目的・第三者提供・関連ポリシーへのリンクを明示する

`SignupIdentityPage` は本文末尾 (CTA 上) に MUST 以下の注記を表示する (個人情報保護法 + 改正電気通信事業法対応):

> アップロードいただいた画像は、参加者の身元確認 (安全担保) と、江東区・東京都への団体登録 (スポーツ団体・社会教育団体) の証憑提出のためにのみ使用します。第三者への提供は法令に基づく場合を除き行いません。
>
> 画像は Supabase (米国法人運営の SaaS、データは日本リージョン保管) を経由して安全に保管されます。
>
> 詳細は[プライバシーポリシー](/privacy)・[外部送信ポリシー](`<lp-origin>/external-transmission`)をご覧ください。

外部送信ポリシーは LP に集約された単一 source of truth (`<lp-origin>/external-transmission`) を別オリジンとして参照する。reservation アプリ内には `/external-transmission` ルートを持たない MUST。プライバシーポリシー (`/privacy`) のページ本文は別 Issue #193 で reservation 内に実装される。

実装は `apps/reservation/src/shared/ui/PolicyFooter.vue` に共通プリミティブとして抽出され、`SignupIdentityPage` と `SignupProfilePage` の両方から再利用される SHALL (テキストのリードのみ各ページで差し替え可能、リンク部は固定)。

#### Scenario: footer 注記の存在
- **WHEN** 画面が描画される
- **THEN** 本文末尾に上記の利用目的 + 第三者保管 + 関連ポリシーリンクが表示される

#### Scenario: プライバシーポリシーリンクの遷移先
- **WHEN** ユーザーが「プライバシーポリシー」リンクをクリック
- **THEN** reservation アプリの `/privacy` ルートに遷移する (ページ本文は別 Issue #193 で実装、リンク先 404 でも本要件は受入可)

#### Scenario: 外部送信ポリシーリンクの遷移先
- **WHEN** ユーザーが「外部送信ポリシー」リンクをクリック
- **THEN** lp の `<lp-origin>/external-transmission` が新規タブで開かれる (`target="_blank"` + `rel="noreferrer"`)
