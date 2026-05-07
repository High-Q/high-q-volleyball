## Why

`apps/reservation` の Playwright E2E 基盤は #84 (admin-login-magic-link) / #92 (reservation-member-auth-magic-link) 以降の change で漸進的に整備され、`playwright.config.ts` の reservation project / `e2e/_global-setup.ts` / `e2e/reservation/_helpers/supabaseGuard.ts` / 認証・プロフィール・履歴・予約詳細・本人確認画像アップロードのガード統合 E2E まで揃っている。一方で **イベント一覧画面 (`/events`) を直接叩いた時のルートガード挙動だけが未確認**で、認証バイパス回帰の盲点として残っている。Issue #201 が想定する「最初の 1 ケース」は本来ログイン後の happy path だったが、既存 reservation E2E が一貫してガード統合 1 件 + 詳細は component test 押し下げで運用されている (CLAUDE.md「機能あたり 1〜2 件」「E2E ピラミッド原則」) ため、本 change ではその運用方針に揃える。

## What Changes

- 「未認証ユーザーが `/events` に直接アクセスすると `/login` にリダイレクトされ、ログインフォームが描画される」というガード統合 E2E を 1 ケース新規追加する
- 既存 `e2e/reservation/_helpers/supabaseGuard.ts` を `beforeEach` で適用するのみで、新規 helper は導入しない
- 本 E2E は API レスポンスやユーザー操作に依存しないが、auth ガードのリダイレクトという dynamic 挙動のため `@smoke` タグは付けない (既存 reservation ガード統合 E2E と運用を揃える)
- イベントカード押下後の詳細画面表示・主要要素 (開催日 / イベント名 / 会場名 / 会場住所 / 参加費 / 「予約に進む」CTA) の検証は component test の責務と整理し、本 change のスコープから除外する

Issue #201 文面では「ログイン後の happy path + Supabase 認証/データ取得を MSW でモックする helper」が想定されていたが、既存 reservation E2E 運用方針 (ガード統合のみ) との一貫性、CLAUDE.md の E2E スケーラビリティ運用ルール、および MSW 不採用 (page.route() 統一) の既存判断と整合する形へ縮退する。詳細 happy path のテスト充足は EventsListPage / EventDetailPage の component test 群で達成されている。

## Capabilities

### New Capabilities

- `reservation-e2e-coverage`: reservation アプリの E2E 検証範囲を仕様化する。本 change ではイベント一覧 (`/events`) のルートガード統合確認 1 件を定義する

### Modified Capabilities

(なし。`playwright-e2e-baseline` の root config / e2e ディレクトリ規約は既に reservation project を含んでおり、本 change では行動契約を変更しない)

## Impact

- 新規ファイル: `e2e/reservation/events-list.e2e.ts` 1 本のみ
- 既存変更なし (playwright.config.ts / global-setup / 既存 helpers / 既存 e2e ファイルは触らない)
- CI: 既存 `e2e` ジョブの master full 実行で本 test も対象になる。PR の smoke ジョブには影響しない (タグ無し)。実行時間増加は数秒オーダー
- Issue #201 を完了として close できる
