## Context

#269 で策定したバックアップ復旧 SOP (`docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md`) は、Supabase Free プランが自動バックアップを提供しないことを前提に「GitHub Actions による週次自動 pg_dump + 重要 migration 適用前の手動 pg_dump」の 2 段構えで合理的水準を確保する設計を文書化した。本変更はこの SOP の根幹である GitHub Actions 自動 pg_dump ワークフローを実装する。

prd Supabase は商用稼働中で、会員データ・予約データ・本人確認書類画像（の Storage path）が含まれる。本ワークフローは prd に対して **読み取りのみ**（pg_dump）を行い、書き込み・破壊的操作は一切行わない。既存ワークフロー `.github/workflows/db-push-prd.yml` (#268) と同じ Secrets（`SUPABASE_ACCESS_TOKEN` / `SUPABASE_PRD_PROJECT_REF` / `SUPABASE_DB_PASSWORD`）を再利用し、認証構成は流用する。

## Goals / Non-Goals

**Goals:**

- prd Supabase の DB スナップショットを週次自動で取得し、GitHub Artifacts に 90 日保持する
- `workflow_dispatch` で重要 migration 適用前の手動取得をサポートする
- dump は `public` / `auth` の双方のスキーマを含み、復旧時に会員データ（auth.users と FK の members 等）を一貫した状態で復元可能とする
- ワークフロー失敗時の検知を GitHub Actions 標準通知メールで担保する（追加チャネル整備なし）
- 既存 Secrets のみで稼働し、新規認証情報を増やさない
- SOP 14 § 7.2 を「Artifacts からの restore 手順」として更新し、実装と SOP を整合させる

**Non-Goals:**

- Storage バケット (`identity-documents`) の自動エクスポート（MVP3 別 Issue）
- Pro プラン昇格による Supabase 標準バックアップ取得（費用ゼロ方針）
- PITR（Point-in-Time Recovery）の自動化（Pro プラン以降の機能）
- 復旧訓練の定期実施規定（SOP § 6 / § 9 で頻度規定なしと確定済み）
- restore 自動化（手動 SOP 運用、誤発火による prd 上書きリスクが高すぎる）
- CI による「dump 取得失敗率」の SLO 監視（Solo dev 運用に過剰、月次目視で代替）
- Slack / Discord 等の追加通知チャネル

## Decisions

### 1. dump コマンドは Supabase CLI (`supabase db dump`) を採用する

Supabase 公式 CLI の `supabase db dump --linked` を採用する。`pg_dump` 直接実行に比べて以下が優位:

- 接続情報を `supabase link` で project ref 経由で渡せる（既存 `db-push-prd.yml` と同じ認証フロー）
- Supabase インフラの接続ホスト（pooler / direct）変更に対する追従が CLI 側に任せられる
- PostgreSQL クライアントバージョンの GitHub Actions runner 上での揃え方を CLI が抽象化する

**Alternatives:**

- 生の `pg_dump` 直接実行: 接続情報を環境変数から構成する必要があり、Supabase 側の接続ホスト変更（pooler 廃止等）への追従が手動になる。runner の PostgreSQL クライアントバージョンも `apt install postgresql-client-<N>` で固定する必要があり保守コスト増。不採用
- `supabase db pull`: スキーマ DDL のみで data を取得しないため backup 目的に不適合。不採用

### 2. dump 範囲は `public` + `auth` の 2 スキーマ、data + schema 両方を含める

Supabase CLI の `supabase db dump` はデフォルトで `public` スキーマのみを対象とする。本ワークフローでは:

- **`public`**: アプリケーション全データ（members / reservations / identity_documents / events / venues 等）
- **`auth`**: `auth.users`（会員のメール / パスワードハッシュ / Supabase Auth metadata）

の 2 スキーマを含めて取得する。`auth.users` が落ちると会員 ID と FK の整合性が崩れ、`members` を復旧しても認証情報が失われて運用不能になるため、両者を一貫した状態で取得することが必須。

`storage` スキーマは Storage バケット（実体ファイル）の対象外であり、Storage オブジェクトのメタデータのみを持つため、backup の主目的（会員データ復旧）には貢献度が低い。本変更スコープ外とし、必要なら別 Issue で拡張する。

**Alternatives:**

- `public` のみ: 会員復旧不可、不採用
- 全スキーマ（`--all-schemas` 相当）: `storage` の object metadata は Storage 実体無しでは意味が薄く、Supabase 管理スキーマ（`realtime` / `extensions` 等）は backup から除外したい。不採用
- schema-only と data-only を分けて 2 ファイル生成: 復旧時の手数が増え単純 restore の利便性が下がる。1 ファイル統合で採用

### 3. cron スケジュールは毎週日曜 03:00 JST（UTC 土曜 18:00）

High Q のイベント開催は土曜中心。日曜未明 = 土曜の予約・イベント参加データ確定後の最初のアイドル時間。週次 backup として「直近の運用結果を確実に含むタイミング」として最適。

cron 表記: `0 18 * * 6`（UTC、土曜 18:00 = 日曜 03:00 JST）。

**Alternatives:**

- 毎日（daily）: GitHub Actions 利用時間は問題ないが、90 日保持と合わせると Artifacts が 90 個積み上がる。週次で 13 個に絞った方が翔太郎くんの履歴目視が現実的。費用ゼロ方針の精神（過剰投資回避）にも合致
- 平日朝: 商用稼働中アプリのトラフィックタイミングと重なるリスク。読み取りのみとはいえ pooler 経由で一定の負荷をかけるため不採用

### 4. dump ファイル名規約と Artifacts 保持期間

- ファイル名: `prd_<YYYYMMDD_HHMMSS>.sql`（手動 pg_dump SOP § 3 と一貫性を持たせる）
- Artifact 名: `prd-backup-<YYYYMMDD_HHMMSS>`（GitHub Artifacts UI で識別しやすくする）
- 保持期間: 90 日（GitHub 無料プランで指定可能な最大値）

90 日 = 約 13 週分の週次 backup を保持。古い backup は GitHub 側で自動削除されるため、Solo dev 運用に「定期削除作業」を発生させない。

**Alternatives:**

- 365 日保持: GitHub のリポジトリ単位 Artifacts 上限（無料プラン 500MB）に DB サイズ次第で抵触するリスク。dump サイズが拡大した将来に手動 retention 設定を縛り直すより、最初から 90 日で運用 → trigger 時に Pro 昇格で標準 backup に切り替える設計が SOP § 2.1 と整合
- 30 日: Free プラン 7 日に比べれば改善するが、復旧シナリオで「90 日前の状態と比較したい」用途を捨てる必要が無いため最大値採用

### 5. 失敗通知は GitHub Actions 標準通知のみ

ワークフロー失敗時、リポジトリ Owner（翔太郎くん）の GitHub 通知設定に従ってメールが届く（GitHub 既定）。Slack / Discord 等の追加通知チャネルは導入しない。

理由:

- 費用ゼロ方針（追加 SaaS 不要）
- Solo dev 運用で通知先が翔太郎くん 1 人に固定されているため、GitHub 標準で十分
- 月次の SOP 14 運用（§ 1.2「翔太郎くんが GitHub Actions の実行履歴を目視で月次確認」）が二重チェックとして機能

**Alternatives:**

- Slack Webhook: 無料プラン Slack なら費用ゼロだが、High Q では Slack 未導入で別 Workspace を立てる手間が割に合わない
- Issue 自動起票: 失敗時に GitHub Issue を auto-create するアクション併用。Solo dev では Issue が増えるだけで対応速度に寄与しないため不採用

### 6. `workflow_dispatch` での手動実行をサポート

cron 週次に加えて手動トリガーを許可する。SOP § 3「重要 migration 適用前の手動 pg_dump 取得」の手段として、翔太郎くんが SOP § 3 で記載した psql コマンドを端末で叩く代わりに、GitHub Actions UI の "Run workflow" ボタンで取得可能とする。

**Alternatives:**

- cron のみ: 重要 migration 適用直前の取得タイミングが取れず SOP § 3 と乖離。不採用
- 別ワークフロー分離: cron 用と手動用を 2 つに分けると Secrets 設定 / ステップ重複の保守コスト増。同一ワークフローで `on:` に並列指定が単純で採用

### 7. `db-push-prd.yml` との衝突回避は `concurrency` 設定で行う

prd Supabase に対する操作は db-push-prd.yml（migration 適用）と本ワークフロー（pg_dump 読み取り）の 2 系統が存在する。同時実行されると pooler 接続枠の競合・migration 中の不整合 dump リスクがある。

`concurrency` group を `prd-supabase-ops` の単一名にして両ワークフローで共有し、片方実行中はもう片方を待機させる。

ただし concurrency は同一リポジトリの **同一ワークフロー** 単位がデフォルトで、複数ワークフロー横断は不可（GitHub Actions 仕様）。代替として:

- 本ワークフローの concurrency を `backup-prd-${{ github.workflow }}` とし、自身の重複実行のみ防止
- db-push-prd.yml との同時実行は「カテゴリ 2 / 3 migration 適用時は翔太郎くんが手動で `workflow_dispatch` を打たない」運用ルールで担保
- SOP § 3 に「migration 適用と並行して手動 backup を起動しない」と明記

**Alternatives:**

- GitHub Actions Reusable Workflow で集約: 過剰、本ワークフロー単独で完結
- 外部ロック機構（Redis / DynamoDB lock）: コスト発生、費用ゼロ方針外

### 8. dump ファイルへのアクセス権

GitHub Artifacts は private リポジトリでは Repo Read 権限以上の Collaborator のみダウンロード可能。High Q リポジトリは private で翔太郎くん 1 人 Owner のため、実質「翔太郎くんのみ」が dump をダウンロード可能。

これは個人情報保護法 §23 の「アクセス制御」要件に対し、SOP 14 で言及する「ローカル端末保管 + 外部送信禁止」と同等の保護水準を満たす。Slack / Email / Claude 等への外部送信禁止 MUST は SOP § 3.3 で既に明文化済みのため、本変更スコープでは追加文言不要（SOP § 7.2 restore 手順内で参照すれば足りる）。

## Risks / Trade-offs

- **[Risk] 週次 cron では RPO 最大 7 日**: 災害発生タイミングが backup 直前なら最大 7 日分のデータ損失。→ SOP § 3 の重要 migration 適用前手動 pg_dump で部分緩和、Pro 昇格 trigger 条件達成時に PITR 導入で根本解決
- **[Risk] GitHub Actions 障害時の取得失敗**: GitHub Actions Status Dashboard が SLO 99.9% 以上で運用しているとはいえ完全保証ではない。→ 月次目視確認で連続失敗を早期検知（SOP § 0 「月次確認」）
- **[Risk] Artifacts 90 日上限超の古い状態への復旧不可**: 90 日経過で自動削除される backup は復旧不可。→ 商用稼働期間が伸びた段階で Pro 昇格 trigger と合わせて再評価、別 Issue で扱う
- **[Risk] dump ファイル肥大化**: 会員数増加で dump サイズが GitHub Artifacts 1 ファイル制限（10GB）に近付くと取り扱い不能。→ 当面の High Q 規模では数 MB 程度で問題なし、Pro 昇格 trigger 条件と同等の規模到達時に圧縮 (.sql.gz) 採用や Storage 別エクスポート (MVP3) で対応
- **[Risk] `auth.users` の dump 内パスワードハッシュ流出**: Artifacts ダウンロード権限のある Collaborator が増えた場合、ハッシュ漏洩は認証総当たり攻撃の入口になる。→ Solo dev 運用前提・private リポジトリ・Owner 1 名で運用、Collaborator 追加時は本リスクを再評価
- **[Trade-off] Storage 自動エクスポートを本変更で実装しない**: 本人確認書類画像が損失した場合の業務影響は SOP § 1.3 で認識・記録済み。MVP3 別 Issue で恒久対応する設計を SOP § 10 で明示済み
- **[Trade-off] restore の自動化なし**: 誤発火による prd 上書きリスクが高すぎ、復旧フローは SOP § 7.2 の手動運用に委ねる。Solo dev で復旧頻度が低い前提では妥当な割り切り

## Migration Plan

1. `.github/workflows/backup-prd.yml` を新規作成（cron + workflow_dispatch、`supabase db dump --linked --schema public --schema auth`）
2. `workflow_dispatch` で手動 1 回実行し、GitHub Artifacts に dump がアップロードされることを確認（取得した dump はダウンロード後、内容確認したら端末から削除）
3. `supabase-foundation` spec に「prd 週次自動 pg_dump ワークフローの存在」Requirement を ADDED で追加
4. `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` § 7.2 に GitHub Actions Artifacts からの restore 手順を追記、および SOP 内で「#299 で導入予定」表現を「実装済み」へ更新
5. PR 作成 → 翔太郎くん確認 → `/opsx-ship`
6. Sync フェーズで spec と SOP を最終確認

**Rollback Plan:**

本変更はワークフロー追加 + spec / SOP の文言更新のみで prd データには触れない。問題があれば PR を revert すれば原状復帰する。既に取得済みの Artifacts は revert 後も 90 日経過で自動削除されるため後処理不要。

## Open Questions

- なし（dump スキーマ範囲 `public + auth` で確定、cron `0 18 * * 6` で確定、保持期間 90 日で確定）
