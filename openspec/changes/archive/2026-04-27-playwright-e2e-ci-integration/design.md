## Context

#79（playwright-e2e-baseline）で Playwright E2E 環境がローカル運用可能になった。現状:
- `playwright.config.ts` が repo root に存在し、`webServer` で `pnpm --filter @high-q/lp build && preview --port 4173 --strictPort` を起動して LP の本番ビルドに対し E2E を回す
- `e2e/lp/smoke.e2e.ts` の 1 件のみ存在（データ非依存・「壊滅していない」検出）
- `pnpm test:e2e` がローカルで動作

CI 側（`.github/workflows/ci.yml`）は #80 で確立済み:
- `install` → `typecheck / lint / test / build` の 4 並列構成
- `concurrency` 設定で PR の古い run は自動キャンセル、master push はキャンセルしない
- pnpm store キャッシュは `actions/cache` でヒット運用
- Render の `autoDeployTrigger: checksPass` で「CI 全パス」がデプロイの前提

テスト戦略 (`docs/07-テスト/01-テスト戦略・方針.md`) では「PR=smoke / master=full」のトリガー分離方針が確立されており、ハードリミット閾値（PR < 3 分、master E2E full < 5 分、フレーク率 < 1%）も定義済み。

本変更はこの基盤の上に「CI における E2E 自動実行」を実装する。後続 #135 でテスト本体を追加するため、本変更は **#135 のための足場** という位置付けである。

## Goals / Non-Goals

**Goals:**
- `.github/workflows/ci.yml` に `e2e` job を 5 番目の並列 job として追加し、PR / master push の双方で自動起動する
- PR=smoke / master=full のトリガー分離を **Playwright の test tag (`@smoke`) ベース** で実現する
- Playwright のブラウザバイナリを `actions/cache` で再利用し、毎回 chromium を再 download しない
- 失敗時のみ `playwright-report/` と `test-results/` を artifact として 14 日 retention でアップロードし、フレーク調査を可能にする
- ローカルでも `pnpm test:e2e:smoke` で同じ smoke サブセットを再現可能にし、CI と乖離を生まない
- ハードリミット閾値（PR smoke < 1 分目安、master full < 5 分目安）を運用ルールとして spec に組み込む

**Non-Goals:**
- 新規 E2E テストの追加（#135 で対応）
- 動的データ供給戦略の決定（MSW / fixture 等は #135）
- ビジュアル回帰テスト（Phase 2）
- セルフホストランナー対応（不要）
- Playwright shards による並列実行（テスト件数が増えたら別 Issue で）
- Render preview デプロイへの E2E 実行（`webServer` で local preview を起動するため不要）

## Decisions

### Decision 1: トリガー分離は Playwright の `--grep '@smoke'` で実装する

**選択**: 案 A（test tag）

**比較**:
| 案 | 内容 | 評価 |
|---|---|---|
| A | Playwright の `--grep '@smoke'` で smoke タグの test を絞り込み、PR で実行 | ✅ Playwright 標準機能、`testDir` 設計を変えない、test 単位で柔軟。タグ付け忘れリスクは PR レビューで対応可能 |
| B | `e2e/lp/smoke/` と `e2e/lp/full/` のディレクトリ分離 | ❌ test の意味で smoke / full を分けるのが自然なのに、ディレクトリ移動が必要。後で「smoke から外したい」test を移動するコストが高い |
| C | GitHub Actions 側で `if: github.event_name == 'pull_request'` でコマンド分岐のみ | △ A との実質的な違いは「タグ運用ルールが spec 化されないか」。本変更ではタグ運用を spec 化したいため、A のほうがクリーン |

**意思決定の根拠**: タグはテストコード自体に意味を持たせる方法であり、ローカル `pnpm test:e2e:smoke` も同じセマンティクスで動く。ディレクトリ分離は「物理配置」と「テストの性質」を結合させてしまい、リファクタコストが高い。

### Decision 2: ブラウザバイナリのキャッシュキーは `pnpm-lock.yaml` の hash を含める

**選択**: `playwright-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}`

**理由**:
- `@playwright/test` のバージョンが上がると `pnpm-lock.yaml` の hash が変わるため、自動的に再 install される
- 別途「Playwright バージョン」を抽出して key にする運用は煩雑（lockfile から正規表現で抜く必要がある）
- pnpm store キャッシュと同じ命名規則（`<purpose>-${{ runner.os }}-${{ hashFiles(...) }}`）に揃え、ワークフローの一貫性を保つ

**インストール戦略**: キャッシュ miss 時は `pnpm exec playwright install chromium --with-deps`。`--with-deps` は OS 依存ライブラリ（フォント等）も入れるため `apt-get install` を CI 内で書く必要がない。`firefox` / `webkit` は **明示的にインストールしない**（Phase 1 chromium のみ方針）。

### Decision 3: `e2e` job の `needs` は `install` のみで `build` を含めない

**選択**: `needs: install`、build と並列

**理由**:
- Playwright の `webServer` 設定が **e2e job 内部で** `pnpm --filter @high-q/lp build && preview` を独自起動する。CI レベルで build job の成果物を共有する必要がない
- `needs: build` で直列化すると wall time が build 時間（~1〜2 分）分増える。並列のまま e2e 内部で build を走らせたほうが全体時間は短い
- 既存 4 ジョブの「1 ジョブ失敗が他ジョブをキャンセルしない」方針と一貫する

**トレードオフ**: e2e job 内で build を二重実行するため CPU コストはかかる。ただし PR 時の wall time（feedback loop）を優先。

### Decision 4: artifact upload は失敗時のみ・retention 14 日

**選択**: `if: failure() || cancelled()`、`retention-days: 14`

**理由**:
- 成功時は HTML report も trace も不要。GitHub Actions の artifact ストレージ上限（個人プラン 500 MB）と転送速度を考えると、成功時 upload は害でしかない
- フレーク調査には trace が必要。失敗時 + キャンセル時（タイムアウト等）の両方をカバー
- retention 14 日は「2 週間以内にフレーク調査を始める」前提の妥当な期間。GitHub のデフォルト 90 日は長すぎてストレージを浪費する
- `path` には `playwright-report/`（HTML）と `test-results/`（trace / video / screenshot）の両方を含める

### Decision 5: Playwright config の `webServer.command` は変更しない

**選択**: 既存の `pnpm --filter @high-q/lp build && pnpm --filter @high-q/lp preview --port 4173 --strictPort` をそのまま使用

**理由**:
- ローカルでも CI でも同じコマンドで起動するほうが「ローカルで通るが CI で落ちる」を減らせる
- `reuseExistingServer: !process.env.CI` は既に正しく設定済み（CI では毎回新しい preview を起動）
- Render preview に E2E を当てる選択肢もあるが、PR ごとに Render プレビューが立つのを待つ + プレビュー URL を取得する複雑化が割に合わない。CI 内 self-contained を維持

### Decision 6: ハードリミット閾値は spec に書かず、テスト戦略 doc に閉じる

**選択**: 数値（< 1 分、< 5 分）は `docs/07-テスト/01-テスト戦略・方針.md` 側で運用ルールとして管理し、spec には書かない

**理由**:
- 数値閾値は運用が始まってから調整したい。spec に書くと毎回 OpenSpec change で更新する必要が出てしまう
- spec は「PR のときは smoke、master のときは full」「失敗時に artifact が出る」など **挙動の保証** に集中させる
- 閾値違反の検出は手動運用（CI 時間の継続観察）で当面 OK。自動 fail させるのは過剰

## Risks / Trade-offs

- **[リスク] `@smoke` タグ付け忘れで smoke のつもりの test が PR で走らない** → Mitigation: PR レビュー時の確認をワークフローに組み込む。さらに #135 でテスト追加時、smoke 相当を書く時は必ず `@smoke` を付ける運用ルールを spec 化済み（`playwright-e2e-baseline` の更新）。
- **[リスク] ブラウザバイナリキャッシュが汚染されて CI が壊れる** → Mitigation: cache key に `pnpm-lock.yaml` hash を含めることで、`@playwright/test` のバージョン変更時に自動的に新キーになる。手動で cache を消す手段（GitHub Actions UI）も用意されているため復旧可能。
- **[リスク] e2e job 内で build を再実行するコストが増える** → Mitigation: 並列実行による wall time 短縮を優先。テスト件数が増えて build が支配的になったら、`actions/upload-artifact` で build 成果物を共有する案へ移行可能（その時に別 Issue で）。
- **[リスク] フレーク発生時に artifact が大きすぎる（trace + video）** → Mitigation: Playwright config 既定の `trace: 'retain-on-failure'` に従い、失敗 test のみ trace 保存。video は明示的に有効化していないため出ない。retention 14 日で自然削除。
- **[リスク] PR 時のキャンセル動作が e2e の途中停止を生む** → Mitigation: 既存 `concurrency` 設定（PR のみ cancel-in-progress: true）に従う。途中キャンセルの artifact もアップロード対象（`cancelled()`）にしてあるため調査可能。
- **[トレードオフ] CI 内で local preview に E2E を当てるため、Render の実環境差異は検出できない** → 受容。Render preview への E2E は別 Issue で検討（Phase 2 候補）。

## Migration Plan

ロールフォワード戦略のみ。ロールバックは `.github/workflows/ci.yml` の `e2e` job を削除し、`@smoke` tag をコードから外し、root scripts の `test:e2e:smoke` を消すだけで完全に元に戻る。spec 上は本 change を archive 後に再度逆方向の change を切れば取り戻せる。

実装順序（tasks.md で詳細化）:
1. ローカルで `e2e/lp/smoke.e2e.ts` に `@smoke` タグ付与 → `pnpm exec playwright test --grep '@smoke'` で動作確認
2. root `package.json` に `test:e2e:smoke` script 追加 → `pnpm test:e2e:smoke` で動作確認
3. `.github/workflows/ci.yml` に `e2e` job 追加（cache → install → smoke/full 切替 → upload-artifact failure-only）
4. PR を立てて GitHub Actions 上で smoke 実行を確認
5. master merge 後、master push をトリガに full 実行を確認

## Open Questions

なし。すべての検討事項（Issue 本文の 1〜6）は上記 Decisions で確定。

