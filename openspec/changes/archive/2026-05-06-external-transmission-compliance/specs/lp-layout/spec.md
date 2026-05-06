## MODIFIED Requirements

### Requirement: フッターが3カラム構成でリッチに表示される

フッターには、サークル名／アンカーナビ／SNS リンク／**法務リンク**の4要素がレスポンシブに配置されなければならない（SHALL）。法務リンクには「外部送信ポリシー」「Cookie 設定」を最低限含む MUST。

#### Scenario: lg 以上での3カラム表示
- **WHEN** ユーザーが lg 以上の画面幅で LP を開いたとき
- **THEN** フッター内に「サークル名＋紹介文」「ナビ（CONCEPT/ACTIVITIES/EVENT）」「X SNS リンク」の3カラムが横並びで表示され、法務リンク群がカラム下部または独立行に表示される

#### Scenario: md での2カラム表示
- **WHEN** ユーザーが md の画面幅で LP を開いたとき
- **THEN** フッター内が2カラム構成で表示される

#### Scenario: sm 以下での1カラム表示
- **WHEN** ユーザーが sm 以下の画面幅で LP を開いたとき
- **THEN** フッター内の要素が縦に積み上げて表示される

#### Scenario: 法務リンクの常設
- **WHEN** いずれの画面幅でも LP のフッターが表示される
- **THEN** 「外部送信ポリシー」「Cookie 設定」リンクが押下可能な状態で常設されている

### Requirement: フッターが表示される

LP の最下部にフッターが表示されなければならない（SHALL）。フッターには、サークル名・アンカーナビ・SNS リンク・コピーライト表記・**法務リンク群（外部送信ポリシー / Cookie 設定）**が含まれる。

#### Scenario: フッター表示
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ページ最下部にフッターコンポーネントが表示され、サークル名・ナビ・SNS・コピーライト表記・法務リンク群が確認できる

## ADDED Requirements

### Requirement: GTM は Cookie 同意取得後にのみロードされる

LP は Google Tag Manager (`GTM-WNNF9RP` 系) を、ユーザーが analytics 同意を与えた後にのみ動的にロードする MUST。`apps/lp/index.html` の `<head>` に GTM の inline script を直書きしてはならない MUST NOT。

#### Scenario: 同意前は未ロード
- **WHEN** consent 未決定または analytics 拒否のユーザーが LP を開く
- **THEN** ページからは `googletagmanager.com` へのネットワークリクエストが一切発生しない

#### Scenario: 同意後にロード
- **WHEN** ユーザーが「すべて受け入れる」または analytics トグル ON で同意を保存する
- **THEN** 同イベントを契機に動的 script tag が挿入され `googletagmanager.com/gtm.js` がロードされる

#### Scenario: 同意済再訪
- **WHEN** analytics 同意済のユーザーが再訪する
- **THEN** ページ初期化シーケンスの中で動的 script tag 経由で GTM がロードされる（inline 直書きではない）
