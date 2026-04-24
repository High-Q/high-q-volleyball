# lp-layout Specification

## Purpose
TBD - created by archiving change lp-design-fix. Update Purpose after archive.
## Requirements
### Requirement: コンセプトカードが3列横並びで表示される
md ブレークポイント以上の画面幅において、コンセプトカードは1行に3列横並びで表示されなければならない（SHALL）。カード幅は親カラムに追従し固定値を持たない。

#### Scenario: md 以上でのカード3列表示
- **WHEN** ユーザーが md 以上の画面幅（960px+）で LP を開いた場合
- **THEN** コンセプトセクションのカード3枚が1行に横並びで表示される

#### Scenario: sm 以下でのカード縦積み
- **WHEN** ユーザーが sm 以下の画面幅でLP を開いた場合
- **THEN** コンセプトカードは縦に1列ずつ積み上げて表示される

### Requirement: 全セクションの横幅がヘッダーと揃う
LP の各セクション（コンセプト・コンテンツ・イベント）の横幅はヘッダーと同幅でなければならない（SHALL）。

#### Scenario: セクション横幅の一致
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ヘッダー・コンセプト・コンテンツ・イベント各セクションの左右端が揃って表示される

### Requirement: フッターが表示される
LP の最下部にフッターが表示されなければならない（SHALL）。

#### Scenario: フッター表示
- **WHEN** ユーザーが LP を開いた場合
- **THEN** ページ最下部にフッターコンポーネントが表示される

