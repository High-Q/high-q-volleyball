## Context

`docs/07-テスト/01-テスト戦略・方針.md` で「E2E は Playwright、主要フローのみ、CI で main マージ時のみ実行」と方針定義済み。Phase 1 のテスト整備は次の3レイヤー構成:

| レイヤー | 担当 Issue | 状態 |
|---|---|---|
| Vitest 基盤（unit / component） | #78 | ✅ 完了（archived） |
| GitHub Actions CI | #80 | ✅ 完了（archived） |
| **Playwright E2E 基盤** | **#79（本 change）** | **進行中** |

Issue #79 完了条件:
- ✅ `pnpm test:e2e` が実行できる
- ✅ LP トップページのスモークテストが通る

加えて、E2E は無計画追加で**スイートが肥大化し開発のボトルネックになる**典型的な失敗パターンがある（業務系プロジェクトで頻発）。本 change ではスモーク 1 件の追加に留めず、**E2E 運用ルール**（テストピラミッド原則 / 機能あたり件数上限 / トリガー分離 / 四半期リトラクト / ハードリミット閾値）を docs / CLAUDE.md に明記し、回帰試験戦略全体を文書化することで将来の腐敗を防ぐ。

ステークホルダー: 個人開発オーナー（=ユーザー）／ Claude Code（実装エージェント）／後続 #135（既存機能 catch-up）／後続 CI 統合 Issue。

参照: `docs/07-テスト/01-テスト戦略・方針.md`、`render.yaml`、`apps/lp/vite.config.js`、Issue #75（Phase 1 Epic）/ #79 / #135。

## Goals / Non-Goals

**Goals:**
- ローカル `pnpm test:e2e` で Playwright が起動し、LP の preview サーバー（build 済み静的ファイルを `vite preview` で配信）に対して chromium 1 件でスモークテストを実行・PASS する
- スモークテストは「LP が壊滅していない」を検出する最小スコープ（title / 主要セクション 5-6 個 / カレンダー widget root の存在）に留め、データ依存 / 動的挙動 assert を含めない
- Vitest（`*.spec.ts`）と Playwright（`*.e2e.ts`）のファイル種別が明確に分離されている（一方の runner が他方を拾わない）
- E2E 運用ルール（肥大化対策 + 回帰戦略）を docs / CLAUDE.md に明記し、将来の機能追加で守るべき基準を提示する
- 後続作業（#135 既存機能 catch-up + 新規 CI 統合 Issue）への引き継ぎ事項が明確
- Playwright のブラウザバイナリインストール手順が明記され、新規 clone 後でもセットアップ可能

**Non-Goals:**
- CI への E2E 組込み（別 Issue で扱う、本 change のタスク内で Issue 作成は行う）
- LP の動的挙動 E2E（カレンダー月切替 / イベント表示 / 詳細ダイアログ等）→ #135 で別途対応
- データ供給戦略の決定（MSW / fixture / test DB）→ #135 の design で詰める
- 時刻固定戦略（Playwright `page.clock`）→ 動的 E2E が必要になった時点で決定
- admin / reservation の E2E 環境セットアップ（実機能が乏しいため Phase 2 以降）
- ビジュアル回帰テスト（VRT）/ パフォーマンス回帰（Lighthouse CI）→ Phase 2 以降
- ブラウザバイナリの CI キャッシュ設計 → CI 統合 Issue で扱う
- Playwright の trace / video 自動アップロード → CI 統合 Issue で扱う
- フレーク自動 retry の閾値設計 → 動的 E2E が増えた時点で決定（スモーク 1 件ではフレーク発生しない想定）

## Decisions

### D1. Playwright のインストール先 = root の devDependencies

`@playwright/test` は root `package.json` の `devDependencies` に追加。`apps/*` には置かない。

**Why:**
- E2E は workspace 横断のユーザー視点テストであり、特定アプリへの依存ではない
- ブラウザバイナリ（chromium 約 200MB）を 1 セットだけ管理できる
- `pnpm test:e2e` を root から叩くだけで完結する DX
- CI 統合時もインストール対象が 1 箇所で済むため `actions/cache` のキー設計がシンプルになる

**Alternatives considered:**
- `apps/lp/devDependencies` に配置 → 将来 admin / reservation にも E2E を持つ時に重複インストール、ブラウザバイナリも 3 セット → 却下
- `e2e/` を独立 workspace として `package.json` を持たせる → 過剰、scripts 1 個追加で済む → 却下

### D2. webServer 起動方式 = preview（build 済みを配信）

Playwright の `webServer` 設定で:
```ts
webServer: {
  command: 'pnpm --filter @high-q/lp build && pnpm --filter @high-q/lp preview --port 4173 --strictPort',
  url: 'http://localhost:4173',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
}
```

**Why:**
- E2E は本番挙動の検証なので preview（= 本番ビルドの静的配信）が適切
- dev サーバーは HMR や source map で動作するため、bundle サイズや prod-only コードが検証できない
- `vite preview` は `apps/lp/vite.config.js` の resolve / proxy 設定をそのまま使うため、開発時の API モックも効く
- `reuseExistingServer: !process.env.CI` → ローカル開発時は手動起動した preview を再利用、CI は毎回新規起動

**Alternatives considered:**
- dev サーバー起動 → HMR の不安定さ、初回起動の遅さ、本番との乖離 → 却下
- 別途 docker compose で nginx 配信 → 過剰、`vite preview` で十分 → 却下

### D3. 対象ブラウザ = chromium のみ

`projects` には `chromium` のみを定義。`firefox` / `webkit` は将来拡張枠として `playwright.config.ts` のコメントで触れるに留める。

**Why:**
- LP は静的サイト + Vuetify 3。modern evergreen ブラウザでの動作差はほぼない
- chromium はインストールサイズ最小（200MB）、起動も最速
- CI 統合時の実行時間と GitHub Actions cache 圧迫を抑える
- 必要になったら `projects` に行追加だけで拡張可能

**Alternatives considered:**
- chromium + webkit（Safari 互換性も担保） → Phase 1 では overkill、必要性が出たら追加 → 却下
- chromium + firefox + webkit（フル） → 起動時間 3 倍、Phase 1 で価値が見えない → 却下

### D4. テストファイル命名 = `*.e2e.ts`、配置 = `e2e/<app>/*.e2e.ts`

- 命名: `*.e2e.ts`（Vitest の `*.spec.ts` と区別）
- 配置: `e2e/lp/smoke.e2e.ts`（アプリ単位でディレクトリ分け）
- Playwright config の `testMatch: '**/*.e2e.ts'` で明示

**Why:**
- Vitest は `*.spec.ts` を拾い、Playwright は `*.e2e.ts` を拾う → 一方の runner が他方を誤って拾わない
- アプリ単位ディレクトリ → 将来 admin / reservation を追加する時 `e2e/admin/` `e2e/reservation/` で並行運用可能
- 配置を root 直下にすることで、`apps/*/src/` の本番バンドルから物理的に分離（誤 import を防ぐ）

**Alternatives considered:**
- `apps/lp/e2e/*.e2e.ts` → アプリ独立性が上がるが、root 一括方針（D1）と矛盾、却下
- `tests/e2e/*.spec.ts` → Vitest と命名衝突、却下
- `e2e/*.e2e.ts` フラット → アプリ追加時に区別が難しくなる → 却下

### D5. スモークテストの assert スコープ = 「壊滅していない」検出のみ

含むもの:
- `<title>` がブランド名を含む
- 主要セクション 5-6 個の見出し or 主要要素の DOM 存在確認（hero / Concept / Activities / Footer）
- カレンダー widget root 要素の存在（`<v-calendar>` wrapper or `[data-testid="event-calendar"]`）

含まないもの:
- API レスポンス内容に依存する assert（具体的イベント名等）
- 動的挙動（月切替・詳細ダイアログ等）
- ビジュアル比較

**Why:**
- スモーク = 「煙が出るかどうか」= 「壊滅的に壊れていない検出」。動的挙動はスモークの定義を超える
- データ依存 assert はテストフレークの温床。スモーク 1 件で導入するべきではない
- 動的挙動と詳細バリエーションは #135（既存機能 catch-up）で別途設計
- 「カレンダー widget が完全に消滅した」regression は本 smoke で検出可能なので、最低限の検出力は確保

**Alternatives considered:**
- カレンダーの動的挙動も含める → データ供給戦略 / 時刻固定の決定が必要、scope 拡大 → 却下、#135 へ
- title 検証だけ → 検出力が低すぎる、widget の構造変更を検出できない → 却下

### D6. data-testid 属性の追加方針 = 必要最小限

Playwright のセレクタはまず `getByRole` / `getByText` 等の意味的セレクタを優先する。それで取得できない場合に限り `data-testid` を追加する。

スモーク 1 件で必要になりそうな箇所:
- カレンダー widget root（`<v-calendar>` 自体は Vuetify auto-import で wrapper の意味的ロールがない可能性）→ `[data-testid="event-calendar"]` を追加する判断は実装時に確認

**Why:**
- 意味的セレクタは a11y にも貢献する
- `data-testid` の濫用は本番コードにテスト関心事が漏れ続ける温床
- とはいえ Vuetify の auto-import コンポーネントは role が一意でないことがある → 必要箇所のみピンポイント追加

**Alternatives considered:**
- 全セクションに `data-testid` を貼る → 過剰、メンテコスト → 却下
- 全部 `getByText` に頼る → ブランド名やセクション名のテキスト変更でテストが落ちる脆さ → 一部セクションは `data-testid` で安定化

### D7. CI 統合は本 change スコープ外、別 Issue で対応

`.github/workflows/ci.yml` への E2E job 追加、ブラウザバイナリのキャッシュ設計、PR=smoke / master=full のトリガー分離設計、trace / video のアップロード等は本 change では実施しない。

**Why:**
- Issue #79 の完了条件は「`pnpm test:e2e` が実行できる」「スモークが通る」のみ。CI 統合は要求外
- 本 change が太りすぎる（CI 設計だけで proposal/design 1 サイクル分の議論）
- ローカルで E2E が安定してから CI に持ち込む段階的アプローチが安全
- 本 change の tasks.md の最後に「CI 統合 Issue を切る」作業を含めることで取りこぼしを防ぐ（Apply 中に Issue #136 として作成済み）

**Alternatives considered:**
- 本 change で CI 統合まで一気にやる → scope creep、設計議論が複雑、却下

### D8. ドキュメント拡充 = 回帰試験戦略 + E2E スケーラビリティ運用ルール を docs/CLAUDE.md に明記

#### docs/07-テスト/01-テスト戦略・方針.md に新設
- **「回帰試験戦略」セクション**: 独立工程は持たず CI で全テスト実行することで担保。スキーマ / ビジュアル / パフォーマンス回帰は将来検討として明記
- **「E2E スケーラビリティ運用ルール」セクション**: 以下を明記
  - テストピラミッド原則（unit/comp 多、E2E 少、E2E でしか取れない場合だけ E2E に書く）
  - 機能あたり E2E 件数上限（1-2 件 = happy path + 主要 edge case）
  - PR=smoke / master=full のトリガー分離方針（CI 統合時の前提）
  - 並列実行（Playwright shards）方針
  - 四半期リトラクト（重複・低価値 E2E を意識的に削る運用）
  - ハードリミット閾値表

#### CLAUDE.md Pillar 3 に追記
- 「新規 feature の Apply に E2E を含める際、機能あたり 1-2 件まで（happy path + 主要 edge case）。詳細バリエーションは component test に押し下げる」
- Design チェックリストに「E2E ハッピーパス試験の対象シナリオ列挙」を追加

#### docs/03-アーキテクチャ/05-開発ワークフロー.md
- Apply フェーズ説明に「E2E が必要な機能では Playwright 試験コードを feature change と同じ PR で提供」を追加

**Why:**
- E2E は腐敗しやすい。導入時点で運用ルールを文書化しないと数ヶ月で形骸化する
- 回帰試験を独立工程として作らないことを明示しないと、後で「回帰テストフェーズはどこ？」と毎回問われる
- CLAUDE.md は Claude / 人間の判断基準として常時参照される最上位の指針

**Alternatives considered:**
- 運用ルールは別 Issue で文書化 → 環境セットアップと同時に landing しないと、ルールがないまま E2E が増える期間が発生 → 却下
- 全部 docs に書く（CLAUDE.md は触らない） → CLAUDE.md は最重要原則の真実の源、E2E ルールは判断基準に直結するので CLAUDE.md にも書く必要がある → CLAUDE.md と docs の両方に書く（CLAUDE.md は短く、docs は詳細）

### D9. ハードリミット閾値表の数値設計

`docs/07-テスト/01-テスト戦略・方針.md` に以下の表を新設:

| 指標 | 健全 | 警告 | 危険 |
|---|---|---|---|
| PR の CI 全体時間 | < 3分 | 3-5分 | > 5分 |
| master の E2E フル時間 | < 5分 | 5-10分 | > 10分 |
| 機能あたり E2E 件数 | 1-2 | 3-4 | 5+ |
| E2E のフレーク率 | < 1% | 1-3% | > 3% |

**Why:**
- 数値で書かないと「肥大化したかどうか」の判断が主観的になる
- 個人開発で 5 分超の CI 待ちは確実に開発体験を損なう
- フレーク率 3% を超えると「テスト = 信頼できない」認識が定着し回帰検出力が崩壊する

危険ゾーンに入った時点で**最適化 Issue を切る運用**を docs に明記。

**Alternatives considered:**
- 数値を明記しない（定性のみ） → 判断が主観化 → 却下
- 厳しい数値（PR < 1分） → 現実離れ、達成不可 → 却下

### D10. Playwright のブラウザバイナリインストールフロー

`pnpm install` 後に `pnpm exec playwright install chromium` を**手動実行**する設計。`pnpm install` 時の自動インストール（postinstall hook 等）は **しない**。

**Why:**
- ブラウザバイナリは ~200MB、不要な開発者（E2E を触らない人）にも強制ダウンロードさせない
- CI 統合時はキャッシュ前提なので install スクリプトを統一しやすい
- README / docs に明示すれば 1 行コマンドで済む

**Alternatives considered:**
- root の `package.json` に `"prepare": "playwright install chromium"` を追加して `pnpm install` 時自動実行 → 不要な開発者にもインストール強制、CI でも余計に走る → 却下

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Playwright のブラウザバイナリインストールを忘れて E2E が「No browsers found」で落ちる | tasks.md でセットアップ手順を明示、README にも記載、エラーメッセージ自体が `npx playwright install` を案内するので回復可能 |
| `vite preview` の port 4173 が他のプロセスと衝突する | `--strictPort` で衝突時は明示的エラー、ローカル開発の `vite dev`（5173）と被らない |
| `pnpm --filter @high-q/lp build && preview` の build 部分で時間がかかる（初回 ~1分） | ローカル E2E では `reuseExistingServer: true` で 2 回目以降は build スキップ可、CI 統合時は別途キャッシュ設計 |
| カレンダー widget の root 要素が Vuetify の auto-import で意味的セレクタを持たない | `data-testid="event-calendar"` を最小限追加して安定化、D6 方針に従う |
| E2E が 1 件しかない状態で運用ルールを大量に文書化することで「設計過剰」と見える | docs では「Phase 1 ではスモーク 1 件、運用ルールは将来の肥大化を防ぐため」を明記、現状と将来の方針を区別して書く |
| Playwright のメジャーバージョンが頻繁に上がり breaking change で壊れる | `^1.x` でメジャー pin、Dependabot の major 更新 PR で慎重にレビュー |
| `*.e2e.ts` を Vitest が拾ってしまう、または `*.spec.ts` を Playwright が拾ってしまう | Vitest config の include は `src/**/*.spec.{ts,tsx,js,jsx}` で `e2e/` 配下を含まない、Playwright config の `testMatch: '**/*.e2e.ts'` で `*.spec.ts` を拾わない、両側で明示 |
| 既存 LP コードに `data-testid` を追加することで本番コードにテスト関心事が漏れる | D6 で「最小限」を明記、追加は smoke で必要な 1-2 箇所に留める |
| 運用ルールが docs に書かれても、Apply 時に Claude / 人間が読まずに E2E を増やす | CLAUDE.md にも要点を書き、Design チェックリスト項目化することで Apply 前に必ず参照される構造にする |

## Migration Plan

1. root に `@playwright/test` を devDependency 追加、`pnpm install` で lockfile 更新
2. `pnpm exec playwright install chromium` でブラウザバイナリをローカルインストール
3. root に `playwright.config.ts` を作成（chromium / preview server / testMatch）
4. `e2e/lp/smoke.e2e.ts` を作成（title / 主要セクション / カレンダー widget root の assert）
5. 必要なら LP コードに `data-testid` を最小限追加
6. root `package.json` に `test:e2e` / `test:e2e:ui` スクリプト追加
7. `.gitignore` に Playwright 生成物を追加
8. `pnpm test:e2e` で smoke が PASS することを確認
9. PR を作成、レビュー + Render Preview 確認
10. Sync で docs / CLAUDE.md を一括更新
11. Archive で change を `archive/YYYY-MM-DD-playwright-e2e-baseline/` へ移動
12. Merge → 後続作業（#135 + 新規 CI 統合 Issue）に着手可能

### Rollback Plan
- スモークが恒常的に落ちる場合: `e2e/lp/smoke.e2e.ts` を一時的に `test.skip` でスキップし、原因分析の後修正
- Playwright インストール自体に問題がある場合: `@playwright/test` の version を 1 個前に固定、または本 change 全体を revert
- 本 change の docs 変更は独立した PR（sync 内）で revert 可能、E2E 環境部分とは粒度を分けてコミットする

## Open Questions

1. **`vite preview` の port を 4173 固定で OK か、それとも動的 port にするか**
   - 4173 は Vite のデフォルト preview port なので衝突可能性は低い
   - 動的 port の場合 `webServer.url` の組立てが複雑化
   - **推奨: 4173 固定 + `--strictPort`**。実装時に問題が出たら動的に切替

2. **カレンダー widget root のセレクタは `<v-calendar>` の wrapper or `data-testid`？**
   - Vuetify 3 の `<v-calendar>` は Vue で `<div class="v-calendar">` 等の wrapper を生成する
   - 安定性を優先するなら `data-testid="event-calendar"` を `EventCalendar.vue` に追加
   - 既存コードへの侵襲を最小化するなら CSS class セレクタ
   - **推奨: 実装時に Playwright Inspector で確認、安定するセレクタを採用**。`data-testid` 追加が必要なら 1 箇所のみ追加

3. **`pnpm exec playwright install chromium` を `pnpm install` 後の手順として README / docs に記載する場所**
   - README.md に「初回セットアップ」節を新設するか、`docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に追記するか、もしくは新設
   - **推奨: README.md の Quick Start に追記 + `docs/07-テスト/01-テスト戦略・方針.md` の E2E セクションでも触れる**。新規 clone 開発者の動線でまず触れる README が最重要

4. **動的挙動の E2E（カレンダー月切替等）を本 change に少しでも含めるか、完全に #135 に分離するか**
   - 完全分離（推奨方針）の場合、Phase 1 の E2E は title + 構造存在確認のみ → 検出力が薄い印象
   - 一方、混ぜるとデータ供給戦略の決定が必要で scope 拡大
   - **推奨: 完全に #135 に分離**。本 change はあくまで「環境セットアップ + 運用ルール文書化」に集中

5. **`webServer` の `command` に `pnpm --filter @high-q/lp build` を含めるか、別途事前 build を要求するか**
   - 含める案: `webServer.command` で build → preview を一気に。コマンド 1 個で完結
   - 含めない案: `playwright test` 実行前に CI / ローカルが build 済みであることを前提（時間短縮）
   - **推奨: 含める（build → preview）**。ローカル / CI どちらでも 1 コマンドで動く DX を優先。build 時間が問題になった時点で別 Issue で最適化
