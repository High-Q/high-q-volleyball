# lp-announcements Specification

## Purpose
TBD - created by archiving change general-announcements. Update Purpose after archive.
## Requirements
### Requirement: LP 公開トップのお知らせ表示

LP の公開トップは、出す相手が「公開（public / all）」かつ掲載期間内のお知らせを表示する SHALL。表示は匿名（anon）で行い、掲載開始前・掲載終了後・会員専用のお知らせを表示してはならない MUST。複数掲載中の場合は掲載開始の新しい順に表示する SHALL。本文の改行は保持し、HTML は解釈しない MUST。

#### Scenario: 掲載中の公開お知らせが出る
- **WHEN** 公開（public / all）かつ掲載期間内のお知らせがある状態で LP トップを開く
- **THEN** そのお知らせが掲載開始の新しい順に表示される

#### Scenario: 会員専用は出ない
- **WHEN** 出す相手が members のお知らせだけがある状態で LP トップを開く
- **THEN** お知らせは表示されない

#### Scenario: 掲載対象が無いときは何も出さない
- **WHEN** 掲載期間内の公開お知らせが 0 件の状態で LP トップを開く
- **THEN** お知らせ領域は描画されず、ページ本体のレイアウトは崩れない

#### Scenario: 取得失敗でもページは壊れない
- **WHEN** お知らせ取得が失敗する
- **THEN** お知らせ領域は描画されず、LP トップの他の内容は通常どおり表示される（失敗は記録される）

