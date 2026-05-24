## Context

prd Supabase は #184 で商用稼働を開始し、現在は会員登録・本人確認書類提出・予約フローまでが本番運用されている。にもかかわらず「会員データ・予約データ・本人確認書類画像が壊れたら / 消えたら何が起きるか」「どう戻すか」が明文化されていない。`docs/08-移行/01-環境戦略・本番リリース計画.md` § 6 リスク表に「Phase 1 で運用ルール化」と書かれたまま放置されており、商用稼働中の今、最低限の運用フロアを引く必要がある。

本変更は **process / docs / spec の改訂が主体** であり、新たなコード実装はほぼ無い（rollback SQL ファイルの追加は SQL 記述のみ）。設計の焦点は「どこに何を書くか」「既存ドキュメント / SOP との責任境界」「判断仰ぎ 4 項目のデフォルト方針の根拠付け」の 3 点に置く。

## Goals / Non-Goals

**Goals:**

- 商用稼働中の prd に対し「いつ・誰が・どのバックアップから戻すか」が緊急時に SOP を見れば辿れる
- Supabase Free プランは自動バックアップ非対応である事実を SOP に明記し、GitHub Actions 週次自動 pg_dump (#299) + 重要 migration 適用前の手動 pg_dump の 2 段構えで合理的水準を確保する設計を文書化
- 新規 migration を書く開発者（翔太郎くん / レム）が、rollback SQL を併設すべきか判断できる明確なルールがある
- 既存 21 migrations が全件カテゴリ 3 として一括宣言され、現在の運用ギャップが可視化される
- 漏洩時 SOP（事故後）とバックアップ復旧 SOP（事故予防 + 復旧）の責任境界が明確で、両 SOP の参照が双方向に貼られている
- 判断仰ぎ 4 項目（Pro 昇格 / Storage 別エクスポート / 訓練頻度 / 既存 migration 後追い）について翔太郎くん承認済みの方針が SOP に反映されている

**Non-Goals:**

- Storage バケットの別ストレージへの定期エクスポート実装（MVP3 オフロード、別 Issue で起票）
- Pro プラン昇格の実施（trigger 条件達成時に別 Issue で起票）
- Point-in-Time Recovery（PITR）の自動化（Pro プラン以降の機能）
- 復旧訓練の定期実施規定（法令上必須でなく、形骸化リスク回避のため SOP では頻度を縛らない）
- CI による rollback SQL 存在検証の自動化（運用が回り始めてから検討）
- Disaster Recovery（別リージョン構成）— Issue #269 スコープ外と明記済
- リアルタイムレプリケーション

## Decisions

### 1. SOP ドキュメントの新規追加先と命名

`docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` として新規作成する。同ディレクトリ内既存 SOP（08-本人確認書類取扱SOP / 09-管理者ブートストラップ手順 / 10-メール送信設定SOP / 13-漏洩時対応SOP）と並ぶ番号付与で、目次の連続性を保つ。

**Alternatives:** `docs/08-移行/` 配下に置く → 移行は Phase 設計の真実の源であり、平時運用 SOP が混ざると目的が散逸するため不採用。

### 2. spec 変更は supabase-foundation への ADDED Requirement のみ

新規 spec capability（例: `db-backup-and-rollback`）は作らず、既存 `supabase-foundation` spec に「rollback SQL 併設ルール」の Requirement を追加する形で運用上のルールを spec 化する。バックアップ・復旧運用の SOP 本体は spec 化せず docs で管理する（SOP は手順そのもので、変更時に spec の Scenario として表現しづらいため）。

**Alternatives:**
- 新規 spec `db-backup-and-rollback` を切る → SOP 手順そのものを Scenario 化する負担が大きく、変更時に spec / docs 二重管理になるため不採用。spec はあくまで「コード / 構成が満たすべき性質」を定義する場所と整理。
- spec 変更なし → migration 作成時の rollback SQL 併設ルールがコードレビューで強制できず、属人化するため不採用。

### 3. 既存 migrations は全件カテゴリ 3 一括宣言、新規から 3 分類運用開始（翔太郎くん承認済み）

新規 migration を以下 3 カテゴリで分類して運用する:

| カテゴリ | 定義 | rollback SQL |
|---|---|---|
| **forward-only / 加算的** | CREATE TABLE / CREATE VIEW / ADD COLUMN（NOT NULL なし or DEFAULT 付き）/ INSERT seed | 不要 |
| **データ変換 / 構造変更** | column rename / FK 変更 / column 削除 / NOT NULL 化 | 必須（`<元タイムスタンプ>_<元名称>_rollback.sql` を同 PR で併設） |
| **rollback 不可** | DROP TABLE / TRUNCATE / 不可逆な data migration | 不可と明示し、戻すには Supabase Daily Backup point-in-time restore のみと migration ファイル冒頭コメントに記載 |

**既存 21 件の扱い**: 全件を「カテゴリ 3 (rollback 不可)」として SOP § 5 分類表に一括宣言する。理由:

- 商用稼働中の prd に既に適用済み・運用安定状態であり、「rollback したい」シナリオが実質発生しない
- UPDATE データ修正系（`fix_ariake_venue_address` / `fix_known_split_needed_members`）は元に戻すと再度バグるため、機構上 rollback してはいけない
- 姓名分離 `split_members_name_last_first` は既存会員データを backfill 済で、元に戻すと商用データが壊れる
- FK 変更・NOT NULL 化系は商用データを失わずに戻す rollback SQL が複雑で、Daily Backup point-in-time restore のほうが安全

既存 migration ファイル本体への冒頭コメント追記は行わない（git の実行履歴を汚さず、ファイル変更を最小化）。SOP § 5 で「全 21 件カテゴリ 3」と一括宣言することで spec の網羅要件を満たす。

**新規 migration からのみ 3 分類運用を開始**。レビュー時に分類が明示されていない PR はマージしない運用とする。

**Alternatives:**
- 全件 rollback SQL 作成（元案）: 商用稼働中で実用価値が薄く工数過大、不採用
- カテゴリ 2 のみ後追い（中間案）: 「戻すと壊れる」性質が多く、実装が誤った安全感を与えるため不採用
- 分類なしで「forward-only」一律ルール: 商用稼働中のリスク許容できないため不採用

### 4. 復旧訓練の頻度（翔太郎くん承認済み）

**方針: SOP に手順のみ記載、頻度は規定しない**。

法令確認結果（proposal.md 参照）により、訓練頻度は法律上必須でなく、形骸化リスクの高い頻度規定は採らない。SOP には「いつ実施するか」を縛らず、「実施するならどう実施するか」の手順のみを記載する:

- 訓練手順: dev プロジェクトに prd backup を restore → dev URL で会員ジャーニー（reservation 登録 → 本人確認書類提出 → 予約作成）を 1 周通す → dev を元のテストデータに戻す
- 訓練ログ表は SOP に持たない（実施が任意なため記録形骸化を避ける）
- 会員規模成長時（Pro 昇格 trigger と同じ閾値到達時）に訓練習慣導入を別 Issue で再検討する旨を SOP の「MVP3 で検討する別 Issue」セクションに明記

**Alternatives:**
- 月次（Issue 原案）/ 四半期（レム初期提案）: 法令上不要かつ Solo dev に重く、形骸化リスク高で不採用
- 「重要 migration 適用前のみ訓練」: 強制実施を SOP に書くとブロッカー化、運用判断は翔太郎くん都度判断に委ねる

### 5. Pro プラン昇格の trigger 条件（判断仰ぎ 1）

**レム提案デフォルト: MVP2 では Free 継続**。Pro 昇格の trigger 条件を SOP に明記し、達成時に別 Issue 化:

- 会員登録数が 50 名を超えた時点
- 月次予約件数が 30 件を超えた時点
- インシデント（漏洩 / 復旧不能なデータ破損）が 1 件でも発生した時点
- 役所提出用一括 DL 機能（#172）等の MVP2 機能追加でビジネス継続性要件が上がった時点

Free プラン backup 7 日保持の制約は、SOP に「7 日経過した backup は失われるため、重要 migration 適用前は手動で `pg_dump` を取得する」と運用ルールで補う。

**Alternatives:**
- 商用稼働開始と同時に Pro 昇格 → 早期コスト発生、現状の会員規模に対して過剰投資。
- Pro 昇格判断を本変更で確定 → 翔太郎くんのビジネス判断であり、レム独断不可。SOP に判断材料を提示するに留める。

### 6. Storage 別エクスポート（判断仰ぎ 2）

**レム提案デフォルト: MVP3 へオフロード**。本変更では Storage の現状リスクを SOP に明記するのみ:

- Supabase Free / Pro プランの自動バックアップが Storage を含むか公式仕様を SOP 内に転記
- 本人確認書類画像（`identity-documents` バケット）が失われた場合の業務影響を明記（会員からの再提出依頼が必要、最悪のケースで漏洩時 SOP 連動）
- 別ストレージ（S3 等）への定期エクスポート実装は MVP3 別 Issue として起票

**Alternatives:**
- 本変更で Storage エクスポート実装 → 実装範囲が大幅に拡大、暗号化保管・鍵管理など別領域の設計が必要。
- リスク言及なしで放置 → 個人情報保護観点で SOP として不備。

### 7. 漏洩時 SOP との責任境界

- **本 SOP（バックアップ復旧）**: 事故予防 + 復旧手順 + 平時運用（訓練 / 監視 / 昇格判断）
- **漏洩時 SOP**: 事故発生後の通報 / 法的対応 / 影響評価 / 再発防止策

両 SOP は相互参照を貼り、復旧作業中に漏洩疑いを検知したら漏洩時 SOP に遷移、漏洩確定後の復旧作業手順は本 SOP を参照する構造とする。

**Alternatives:** 1 つの SOP に統合 → 2 つは性質が異なる（予防 / 事後）ため統合すると読者が文脈を取りにくい。

## Risks / Trade-offs

- **[Risk] Free プラン 7 日 backup 期限切れ時に重要 migration 適用 → rollback 不能** → SOP に「重要 migration 適用前は手動 `pg_dump` 取得」を明記、運用で担保
- **[Risk] 訓練頻度を四半期に下げたことで重大な復旧手順ミスを長期間検知できない** → 初回訓練で SOP の手順網羅性を厳格にレビュー、訓練中の気づきは即 SOP 更新
- **[Risk] rollback SQL 後追い作成時の品質保証** → Apply フェーズでカテゴリ 2 の各 migration を翔太郎くん確認のうえ rollback SQL を作成、dev に対し試行で動作確認
- **[Trade-off] spec を最小限変更（rollback ルールのみ）** → バックアップ運用 SOP は spec 化されないため、SOP 違反が CI で検知できない。Solo dev のため SOP 遵守は属人運用に依存する点を許容
- **[Trade-off] Pro 昇格判断を MVP2 で確定しない** → trigger 達成時の判断遅延が発生する可能性。SOP の trigger 条件を翔太郎くんが定期確認することで運用カバー

## Migration Plan

1. SOP ドキュメント `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` を新規作成（レム作業、レビュー後 commit）
2. `supabase-foundation` spec に rollback SQL Requirement を追加（spec 改訂は本変更の specs/ 下で MODIFIED として記述、archive 時に本体 spec に反映）
3. 既存 21 migrations を分類し SOP 内分類表を完成、カテゴリ 2 の対象 migration へ rollback SQL を後追い作成
4. `docs/08-移行/01-環境戦略・本番リリース計画.md` § 6 リスク表を本 SOP 参照に更新
5. `docs/06-品質・セキュリティ/13-漏洩時対応SOP.md` に本 SOP への相互参照リンクを追加
6. PR 作成 → 翔太郎くん確認 → /opsx-ship

**Rollback Plan:**

本変更自体は docs / spec / SQL ファイル追加のみで、prd データには触れない。問題があれば PR を revert すれば原状復帰する。

## Open Questions

- なし（既存は全件カテゴリ 3 一括宣言で確定、新規からの 3 分類運用開始で確定）
