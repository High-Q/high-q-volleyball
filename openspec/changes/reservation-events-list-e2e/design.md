## Context

`apps/reservation` の Playwright E2E は、root `playwright.config.ts` の `reservation` project (port 4175) と `e2e/_global-setup.ts` (本番 Supabase fail-fast)、および `e2e/reservation/_helpers/supabaseGuard.ts` (Supabase 全エンドポイントを `page.route()` で許可リスト方式に縛る) という基盤上で運用されている。既存 reservation E2E (auth / profile-page / history-page / reservation-detail-page / identity-document-upload) は **すべて「未認証アクセス → /login リダイレクト」のガード統合 1 件のみで構成され、ログイン後 happy path の詳細検証は component test に押し下げる方針**で揃っている (CLAUDE.md「機能あたり 1〜2 件まで」「E2E ピラミッド原則」)。

イベント一覧画面 `/events` (router 上 `events-list`) は `/` の redirect 先でもあり、`auth.e2e.ts` 既存ケース「未認証で `/` アクセス → /login」では redirect chain を経由した間接的な検証となっている。`/events` を直接 URL で叩いた場合のガード挙動は明示的に検証されていない。本 change ではこの盲点を 1 ケースで埋める。

## Goals / Non-Goals

**Goals:**

- `/events` への未認証直接アクセスが `/login` にリダイレクトされることを 1 件の Playwright E2E で検証する
- 既存 `installSupabaseGuard` のみを利用し、新規 helper を追加しない
- 既存 E2E ファイル / 既存 helper / 既存 config 一切に手を入れない

**Non-Goals:**

- ログイン済み happy path (events-list 描画 / カード押下 / event-detail 表示) の E2E 検証 → component test (`EventsListPage.spec.ts`) に押し下げ済み
- `event-detail` (`/events/:id`) への直接アクセス時のガード検証 → 別 Issue で必要時に追加
- イベント取得 API モック helper (`page.route()` の events / event_fees intercept) の導入 → 不要
- ログイン済みセッション注入 helper の導入 → 不要
- MSW を E2E で利用する案 → 不採用 (既存 reservation/admin/lp の E2E 運用が `page.route()` に統一)
- `@smoke` 化 → 既存 reservation ガード統合 E2E に揃えてタグなし

## Decisions

### D1. イベント一覧画面のガード統合のみ検証する (ログイン後 happy path は対象外)

**選択肢:**

- (A) ログイン済み session 注入 + events モック + 詳細画面要素の visibility までフルカバー
- (B) ガード統合 1 件のみ (採用)
- (C) 両方 (ガード + ログイン後) を 2 ケース実装

**選定: (B)**

既存 reservation E2E (profile-page / history-page / reservation-detail-page / identity-document-upload) はすべて (B) パターンで統一されており、CLAUDE.md「機能あたり 1〜2 件」「component で取れるなら component に降ろす」原則と整合する。`EventsListPage.vue` の描画詳細 / イベントカード押下時の遷移 / 詳細画面の主要要素 visibility は component test (`EventsListPage.spec.ts` と `EventDetailPage` 関連 spec) で網羅されている前提。(A) を採るとログイン済み session 注入手法を新規に立ち上げる必要があり、既存 E2E との方式分裂と保守コスト増を招く。

### D2. ファイル名は `events-list.e2e.ts`、describe 名は `reservation events-list`

既存 `e2e/reservation/{auth,profile-page,history-page,reservation-detail-page,identity-document-upload}.e2e.ts` の命名規則と整合。`@smoke` タグは付けない (既存ガード統合 E2E と運用を揃える)。

### D3. `installSupabaseGuard` のみ `beforeEach` で適用、追加 mock は不要

ガード統合は「`/events` リクエスト → router beforeEach で auth セッション無し判定 → `/login` redirect」だけを観察する。Supabase auth/REST/Storage への余計なリクエストは `installSupabaseGuard` が許可リスト方式で一括処理するため、`page.route()` 追加設定は不要。これは既存 `profile-page.e2e.ts` / `reservation-detail-page.e2e.ts` と完全に同じ構成。

### D4. assertion は URL + ログインフォーム要素 2 種

既存ガード統合 E2E と一致させる:

- `expect(page).toHaveURL(/\/login/)` (URL リダイレクト確認)
- `expect(page.locator('input[type=email]')).toBeVisible()` (ログインフォーム描画)
- `expect(page.getByRole('button', { name: /メールでリンクを受け取る/ })).toBeVisible()` (送信 CTA)

これにより既存 4 ファイルとの assertion 形状が完全に揃い、保守時に「ガード統合 E2E は同じパターン」と認識できる。

## Risks / Trade-offs

- **[`/events` ガード統合は `auth.e2e.ts` の `/` ケースと意味が重複する可能性]** → `/` は `events-list` への redirect 元のため間接的に同じ guard を経由するが、redirect chain 経由か直接 URL かの差は CSR ルーターの実装次第で挙動が異なりうる。本 E2E は直接 URL アクセスを担保するため、機能が 1 つ減るのではなくむしろ補完関係。
- **[`@smoke` 無しは PR CI で実行されない]** → 既存ガード統合 E2E と同じ運用方針。PR では認証バイパス回帰を直接捕まえないが、master push の full E2E で必ず実行される。これは設計意図 (smoke はデータ非依存・「壊滅検出」のみ)。
- **[Issue #201 文面との乖離]** → 文面では「ログイン後 happy path + MSW」を想定していたが、既存 E2E 運用方針との一貫性を優先した。proposal にこの判断と根拠を明記する。

## Migration Plan

新規追加のみで既存挙動への影響が無いため、ロールバックは PR revert で完結する。CI への影響は master full E2E 実行時間が数秒程度増えるのみ。

## Open Questions

なし (D1-D4 で意思決定済み)。
