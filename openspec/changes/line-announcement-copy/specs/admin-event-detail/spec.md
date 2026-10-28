## MODIFIED Requirements

### Requirement: ヘッダ TopBar の構成

`EventDetailPage` の最上段は MUST 以下を表示する `EventDetailTopBar` を持つ:

- **タイトル**: `events.name`
- **パンくず**: 「イベント」/ 開催日（`MM/DD (曜)` フォーマット）
- **サブタイトル**: `YYYY/MM/DD (曜) · HH:mm – HH:mm · 会場名`
- **アクション**: 「告知文をコピー」CTA（押下で告知文ダイアログを開く。挙動は `admin-line-announcement` spec「告知文ダイアログ」に従う）と「編集」CTA（押下で `/events/:id/edit` へ遷移）

CSV エクスポート / 一括メールの CTA は MVP1 では **表示しない**（MVP2）。

#### Scenario: TopBar の表示内容
- **WHEN** event_detail_view が成功取得できた
- **THEN** TopBar にイベント名 / パンくず / サブタイトル / 「告知文をコピー」CTA / 「編集」CTA が表示される

#### Scenario: 編集 CTA の遷移先
- **WHEN** ユーザーが TopBar の「編集」を押下
- **THEN** router が `/events/:id/edit` に push される

#### Scenario: 告知文をコピー CTA でダイアログが開く
- **WHEN** ユーザーが TopBar の「告知文をコピー」を押下
- **THEN** 当該イベントの告知文ダイアログが開く
