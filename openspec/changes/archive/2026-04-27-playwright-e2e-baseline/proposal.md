## Why

`docs/07-テスト/01-テスト戦略・方針.md` で「E2E は Playwright、主要ユーザーフローのみ、CI で main マージ時のみ実行」と定義しているが、現状 Playwright のインストールも設定も存在せず、Issue #79 完了条件「`pnpm test:e2e` が実行できる」「LP トップページのスモークテストが通る」を満たしていない。Phase 1 で Vitest 基盤（#78）と GitHub Actions CI（#80）が整った今、最後の自動回帰検出レイヤーである E2E 環境を整備し、後続の機能開発で E2E TDD を回せる土台を作る。

加えて、E2E は無計画に追加すると確実にスイートが肥大化し開発のボトルネックになるため、本 change で **E2E 運用ルール（テストピラミッド原則 / 機能あたり件数上限 / PR vs master のトリガー分離 / 四半期リトラクト / ハードリミット閾値）** を docs と CLAUDE.md に明記し、回帰試験戦略全体を文書化する。

## What Changes

- root の `devDependencies` に `@playwright/test` を追加（workspace 横断、`apps/lp` 配下には置かない）
- root に `playwright.config.ts` を新規作成（chromium のみ、`testMatch: '**/*.e2e.ts'`、`webServer` は `pnpm --filter @high-q/lp build && pnpm --filter @high-q/lp preview` 起動）
- root の `package.json` `scripts` に `"test:e2e": "playwright test"` と `"test:e2e:ui": "playwright test --ui"` を追加
- `e2e/lp/` ディレクトリを新規作成し、`smoke.e2e.ts` を 1 件追加
  - `<title>` に "High Q" 等のキーワードを含む
  - hero / Concept / Activities / Footer の主要セクション見出し or 主要要素存在確認（5-6 件の assert）
  - **カレンダー widget root 要素の存在確認のみ**（データ非依存、`<v-calendar>` の wrapper や `[data-testid="event-calendar"]` が DOM 上に存在することの assert）
- 必要に応じて `apps/lp/src/widgets/event-calendar/ui/EventCalendar.vue` 等に E2E 用の `data-testid` 属性を追加（最小限）
- Playwright のブラウザバイナリインストール手順（`pnpm exec playwright install chromium`）を docs/README に明記
- `.gitignore` に `playwright-report/` / `test-results/` / `node_modules/` 配下の Playwright 関連を追加（root の既存 `.gitignore` に追記）
- `packages/shared` / `apps/admin` / `apps/reservation` には何も変更を加えない
- CI 組み込みは本 change では実施しない。ローカル `pnpm test:e2e` で完結。CI 統合は別 Issue（本 change の tasks.md で新規 Issue を切る作業を含める）

### ドキュメント拡充（sync フェーズで実施）

- `docs/07-テスト/01-テスト戦略・方針.md` に以下を新設・更新
  - **「回帰試験戦略」セクション新設**: 独立した「回帰試験フェーズ」は持たず、CI で走る typecheck / lint / unit / component / E2E / build と Render Preview 手動確認の組み合わせで担保。スキーマ回帰 / ビジュアル回帰 / パフォーマンス回帰の戦略は将来検討として明記
  - **「E2E スケーラビリティ運用ルール」セクション新設**: テストピラミッド原則 / 機能あたり E2E 1-2 件上限 / PR=smoke / master=full のトリガー分離 / 並列実行（Playwright shards）方針 / 四半期リトラクト / ハードリミット閾値表（PR CI < 3分、master E2E < 5分、機能あたり 1-2 件、フレーク率 < 1%）
  - 既存「主要フロー」表に「優先度: 低」のスモーク行を追加し、`#79` で導入された smoke の位置付けを明示
- `CLAUDE.md` Pillar 3（UI 品質）に「新規 feature の Apply に E2E を含める際、機能あたり 1-2 件まで（happy path + 主要 edge case）。詳細バリエーションは component test に押し下げる」を追記
- `CLAUDE.md` Pillar 3 の Design チェックリストに「E2E ハッピーパス試験の対象シナリオ列挙」を追加
- `docs/03-アーキテクチャ/05-開発ワークフロー.md` の Apply フェーズ説明に「E2E が必要な機能では Playwright 試験コードを feature change と同じ PR で提供」を追加

## Capabilities

### New Capabilities
- `playwright-e2e-baseline`: モノレポルートで `pnpm test:e2e` が実行できること、Playwright 設定ファイル（chromium のみ、preview server 起動）の存在、`e2e/lp/` 配下にテストファイルが命名規則 `*.e2e.ts` で配置されること、LP トップページのスモークテストが PASS すること、Vitest の `*.spec.ts` と E2E の `*.e2e.ts` が混在しないこと、を含む E2E ベースラインを定義する。

### Modified Capabilities
（なし — 既存 capability の要求は変更しない。`vitest-baseline` は `*.spec.ts` を扱い、本 change の `*.e2e.ts` とはファイル種別で分離されるため非干渉。）

## Impact

- **コード**: root に `playwright.config.ts` / `e2e/lp/smoke.e2e.ts` 新規追加、root `package.json` に `test:e2e` / `test:e2e:ui` スクリプト追加、`apps/lp/src/widgets/event-calendar/ui/EventCalendar.vue` 等に `data-testid` 属性を必要分だけ追加
- **依存関係**:
  - root: `@playwright/test` を devDependencies に追加
  - apps/lp / apps/admin / apps/reservation / packages/shared: 変更なし
- **インフラ**: 本 change ではインフラ変更なし（Render / GitHub Actions CI への組込みは別 Issue）
- **ブラウザバイナリ**: Playwright の chromium が `~/Library/Caches/ms-playwright/`（macOS）等にインストールされる。`pnpm install` 時に自動インストールはされず `pnpm exec playwright install chromium` の手動実行が必要（CI 統合時はキャッシュ前提）
- **ドキュメント**: 上記「ドキュメント拡充」スコープに従い更新
- **GitHub 設定**: 変更なし
- **コスト**: ローカル実行のみで開始するため無料。CI 統合時は public repo のため無料、ただしブラウザバイナリのキャッシュ設計が必要（GitHub Actions cache 10GB 枠を圧迫しないよう注意）
- **スコープ外**:
  - CI への E2E 組込み（別 Issue で対応）
  - LP の動的挙動 E2E（カレンダー月切替 / イベント表示 / 詳細ダイアログ等）= #135 で別途対応
  - admin / reservation / 予約フローの E2E（Phase 2 以降）
  - ビジュアル回帰テスト（VRT）= Phase 2 以降
  - パフォーマンス回帰テスト（Lighthouse CI 等）= Phase 2 以降
  - データ供給戦略の決定（MSW / fixture / test DB）= #135 の design で詰める
  - 時刻固定戦略（Playwright `page.clock`）= 動的 E2E が必要になった時点で決定
- **後続作業**:
  - **Issue #135（既存機能 E2E catch-up）**: 本 change ship 後に着手可能になる、LP 既存 widget の動的挙動 E2E カバレッジ追加。データ供給戦略は #135 の design で決定
  - **Issue #136（Playwright E2E を GitHub Actions CI に統合）**: 本 change の Apply 中に作成済み。GitHub Actions に E2E job を追加（PR=smoke / master=full のトリガー分離設計、ブラウザバイナリ `actions/cache`、artifact アップロード）
  - **将来検討**: VRT / Lighthouse CI / Supabase migration 試験（時期は未定、Phase 2 以降で別 Issue 化）
