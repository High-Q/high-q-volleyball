## MODIFIED Requirements

### Requirement: 最低 2 つのルート（Home プレースホルダ / Login プレースホルダ）が動作する

各アプリは、本基盤整備時点で以下の最低 2 ルートが動作しなければならない（SHALL）:

- ホーム URL (`path: '/'`) の到達先:
  - `apps/admin`: **ダッシュボード画面**（`admin-dashboard` capability で実装）。従来の「`/events` へのリダイレクト」は廃止 MUST。auth guard が AAL2 + admin ユーザーを `/login` から元の `/` (= dashboard) へ戻す動作も同様に変更される
  - `apps/reservation`: **イベント一覧画面へリダイレクト**（#90 で導入。従来の「準備中」プレースホルダは廃止 MUST）
  - `apps/lp`: ランディングページ（既存）
- ログイン URL (`path: '/login'`): `apps/admin` および `apps/reservation` の両方でログイン画面（マジックリンクログイン本実装）

ルートのコンポーネント実装は HQ デザイントークン経由（Tailwind preset の utility または `@high-q/ui` プリミティブ経由）で描画される。マジックナンバー禁止。

#### Scenario: トップルートが LP で動作する
- **WHEN** `apps/lp` でブラウザで `/` にアクセスする
- **THEN** LP の本体ページが描画される

#### Scenario: 会員サイトのトップがイベント一覧へリダイレクトされる
- **WHEN** プロフィール完成済みユーザーが会員サイトのホーム URL にアクセスする
- **THEN** イベント一覧画面に到達する

#### Scenario: 「準備中」プレースホルダが会員サイトから廃止されている
- **WHEN** 会員サイトの画面群を確認
- **THEN** 「準備中」プレースホルダ画面は存在しない

#### Scenario: ログイン画面が apps/admin で本実装されている
- **WHEN** `apps/admin` でブラウザがログイン URL にアクセスする
- **THEN** ログイン画面が描画され、メール入力フォームと「マジックリンクを送る」CTA が表示される

#### Scenario: ログイン画面が apps/reservation で本実装されている
- **WHEN** `apps/reservation` でブラウザがログイン URL にアクセスする
- **THEN** ログイン画面が描画され、メール入力フォームと「ログインリンクを送る」CTA が表示される

#### Scenario: admin の `/` がダッシュボードに到達する
- **WHEN** AAL2 + admin ユーザーが `apps/admin` の `/` にアクセスする
- **THEN** `/events` への redirect は発生せず、Dashboard 画面 (`admin-dashboard` capability) が描画される

#### Scenario: admin ログイン直後の到達先
- **WHEN** AAL2 + admin ユーザーがログイン完了 (`/login` 経由) 直後に auth guard で再評価される
- **THEN** redirect 先は Dashboard (`{ name: 'dashboard' }` 相当の `/`) になる。従来の「`/events`」ではない
