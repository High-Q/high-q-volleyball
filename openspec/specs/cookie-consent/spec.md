# cookie-consent Specification

## Purpose
TBD - created by archiving change external-transmission-compliance. Update Purpose after archive.
## Requirements
### Requirement: 全アプリ初回アクセス時に Cookie 同意バナーが表示される

`apps/lp` / `apps/admin` / `apps/reservation` の各アプリで、同意状態が未決定のユーザーが任意ページにアクセスしたとき、Cookie 同意バナーが画面下部固定で表示される MUST。

#### Scenario: 未決定ユーザーへの初回表示
- **WHEN** localStorage に `hq.consent.v1` が存在しないユーザーがいずれかのアプリの任意ページを開く
- **THEN** 画面下部に同意バナーが固定表示される

#### Scenario: 決定済ユーザーへの非表示
- **WHEN** localStorage に有効な `hq.consent.v1` が存在するユーザーが任意ページを開く
- **THEN** 同意バナーは表示されない

### Requirement: 同意バナーは「説明文上 / ボタン群下」の縦構成、ボタンは「全て許可」「拒否」を横並びで主アクション（左 = 全て許可）の順に配置する

同意バナーは **上 = 説明文 / 下 = アクションボタン群** の縦構成を取る MUST。ボタンは「全て許可」「拒否」の 2 つのみで、横並びに配置し、左から「全て許可」「拒否」の順とする MUST（主アクションを左に置く）。

カテゴリ別の「設定」ボタンや analytics トグル等の詳細パネルは設置しない MUST NOT。理由: necessary は固定 ON、analytics は ON/OFF の 2 値しかない 2 区分構成のため、詳細パネルでの選択肢は「全て許可」「拒否」と完全に等価になり、UI を増やす意味がないため。

「拒否」は任意カテゴリ（analytics）のみを拒否する挙動である。「必須のみ」のように必須/任意の混合表現はユーザーに認知負荷を与えるため使用しない MUST NOT。

カードの縦高さを最小化するため、説明文は「分析・計測のための任意 cookie は、同意がある場合のみ有効化される」という意思決定に直接必要な情報と、外部送信ポリシーへのリンクのみで構成する MUST。カード幅は説明文が概ね 2 行以内に収まるように `max-width` を確保する SHALL（目安 1000px）。

#### Scenario: 全て許可
- **WHEN** ユーザーが「全て許可」を押下する
- **THEN** `necessary: true, analytics: true` で同意状態が保存され、バナーが閉じる

#### Scenario: 拒否
- **WHEN** ユーザーが「拒否」を押下する
- **THEN** `necessary: true, analytics: false` で同意状態が保存され、バナーが閉じる

#### Scenario: 説明文上 / ボタン群下の縦構成
- **WHEN** バナーが描画される
- **THEN** 上に説明文、下にボタン群が配置される

#### Scenario: ボタンの横並び順序
- **WHEN** バナーが描画される
- **THEN** 「全て許可」「拒否」が横並びで、左から「全て許可」「拒否」の順に配置される（「設定」ボタンは存在しない）

### Requirement: 同意状態は 2 区分のカテゴリで管理される

同意は `necessary`（拒否不可）と `analytics`（任意）の 2 区分のみで管理される MUST。3 区分以上に細分化しない。

#### Scenario: state の構造
- **WHEN** 同意が保存される
- **THEN** state は `{ necessary: true, analytics: boolean, decidedAt: ISO8601 string }` の構造を取る

### Requirement: 同意状態は packages/shared 経由で 3 アプリ共通管理される

同意状態の schema / storage I/O / 変更通知は `packages/shared` に一元実装され、3 アプリは shared API 経由で同意状態を読み書きする MUST。各アプリの UI コンポーネント自体は UI スタックの差異により個別実装される SHALL。

#### Scenario: 共通 API の存在
- **WHEN** いずれかのアプリのコードから consent 状態を取得する
- **THEN** `packages/shared` の `getConsent()` / `setConsent()` / `onConsentChange()` を経由して取得する

#### Scenario: storage key の統一
- **WHEN** いずれかのアプリで `setConsent()` が呼ばれる
- **THEN** localStorage の key `hq.consent.v1` に値が保存される

#### Scenario: schema バージョニング
- **WHEN** schema 互換性を破壊する変更が必要になる
- **THEN** key を `hq.consent.v2` に上げ、旧 key は migration もしくは無視で扱う

### Requirement: 同意状態は localStorage に永続化され再表示されない

同意状態は localStorage に保存され、同一ブラウザでの再訪時はバナーを再表示しない MUST。

#### Scenario: ブラウザ再訪
- **WHEN** 同意済ユーザーが翌日同一ブラウザで再訪する
- **THEN** バナーは表示されず、同意状態は保たれている

#### Scenario: localStorage 無効環境
- **WHEN** プライベートブラウジング等で localStorage が無効
- **THEN** セッション中はメモリ保持、リロードでバナー再表示する（仕様として許容）

### Requirement: 任意タグは consent gate でロードされる

analytics 区分に属するタグ（GTM / GA 等）は、ユーザーが analytics 同意を与えるまで動的 script として挿入されない MUST。同意を取り消した場合、既にロード済のタグはページ遷移までは動作するが、次回以降のページロードでは再挿入されない SHALL。

#### Scenario: analytics 同意前
- **WHEN** ユーザーが analytics 同意を与えていない状態で LP を訪れる
- **THEN** `googletagmanager.com` への HTTP リクエストが発生しない

#### Scenario: analytics 同意取得直後
- **WHEN** ユーザーが「全て許可」または analytics トグルを ON にして保存する
- **THEN** 動的 script tag が挿入され、`googletagmanager.com/gtm.js` がロードされる

#### Scenario: analytics 拒否後の再訪
- **WHEN** 「拒否」で同意したユーザーが翌日再訪する
- **THEN** GTM はロードされない

### Requirement: フッターから後発の同意設定変更ができる

各アプリのフッターには「Cookie 設定」リンクが表示され、押下で同意バナーが再表示される MUST。再表示されたバナーで「全て許可」/「拒否」を選び直すことで同意状態を更新できる。

#### Scenario: フッターからの再表示
- **WHEN** ユーザーが任意アプリのフッターの「Cookie 設定」を押下する
- **THEN** 同意バナーが再表示され、「全て許可」「拒否」の 2 ボタンで選び直せる

