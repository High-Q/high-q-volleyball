## Context

会員登録フォームの氏名入力が 1 フィールド (`お名前` = `display_name`) で、姓だけ入力して名を入れ忘れる会員が実運用で発生している。DB 側も `members.display_name text NOT NULL` の単一列で、姓・名の構造化情報を持たない（`data-schema/spec.md:41`）。

一方、`display_name` は次の場所から **読み出し** されている（広く拡散している）：

- **DB ビュー**: `event_participants_view` の `coalesce(m.display_name, '退会済み会員')`、`member_withdrawal` の同等処理
- **管理画面**: 会員一覧の検索 ILIKE、ソート、本人確認書類レビュー、イベント参加者表示、AlertDialog の説明文
- **予約サイト**: プロフィール画面の表示・編集、`nickname ?? display_name` のニックネーム fallback
- **Edge Function**: `request-signup` payload・`signup_pending.payload`・`verify-signup` の INSERT
- **seed / テスト**: `update public.members set display_name = ...` を多数含む

商用稼働中 (`feedback_no_premature_deployment`) で会員行も既に存在するため、`display_name` の全置換は影響範囲が広く、移行コストとリグレッションリスクが大きい。**読み出し互換性を維持** しつつ、書き込み側だけ姓・名 2 属性に切り替えるのが現実解。

## Goals / Non-Goals

**Goals:**

- 会員データに姓・名の独立属性を保持し、片方欠落を構造的に防ぐ
- 既存の `display_name` 参照箇所（ビュー / 検索 ILIKE / admin 表示 / ニックネーム fallback / seed）を **無変更で動かす**
- signup フォーム / プロフィール編集 / signup_pending / Edge Function の入力契約を姓・名 2 属性に切り替える
- 既存会員データを安全に分離移行する（分離不能行は運営に検知可能な形で残す）

**Non-Goals:**

- `display_name` 列の削除・リネーム
- ふりがな（姓 / 名）列の追加
- ミドルネーム / 外国人名のフル対応
- 表示順序の国際化（常に「姓 名」順固定）
- admin 検索 UI への「姓のみ」「名のみ」絞り込みフィルタ追加（部分一致でカバーする）

## Decisions

### 決定 1: 姓・名 2 列を追加し、`display_name` は派生属性として維持

`members` に `last_name` / `first_name` を新規追加（NOT NULL, ≥1 文字）。`display_name` は **既存の通常列として残し**、姓・名の更新時にトリガで `last_name || ' ' || first_name`（半角スペース区切り）に同期する。

**Why X over Y:**

- 案 A（`display_name` 削除 + 2 列に置換）: 全 spec / 全ビュー / seed / テスト / admin 検索の同時改修が必要。MVP1 期のリグレッション枠を超える
- 案 B（フォームだけ 2 入力にして DB は 1 列）: 構造的保証にならず、片方欠落の本質を解決しない（フォーム送信前に結合してしまえば同じ問題）
- 案 C（generated column 化）: PostgreSQL は通常列を generated column に in-place 変換できず、`display_name` を drop / recreate する必要がある。依存する `event_participants_view` 等を全て drop → recreate せねばならず影響が大きい
- **採用案 D（2 列追加 + トリガ同期）**: 通常列のまま維持なので依存ビューを触らない。書き込み経路だけが姓・名を扱う形になり、読み出し側は無変更

セパレータは半角スペース固定（`'山田 太郎'`）。既存データの 99% が半角または全角スペース区切りであることを前提とし、移行時に全角→半角に正規化する。

### 決定 2: 既存会員データの移行ポリシー

DDL は次の順序で適用：

1. `last_name` / `first_name` を **nullable** で追加
2. 既存行を SQL で分離してバックフィル：
   - 全角スペース・タブ・連続スペースを単一半角に正規化した上で、**最初の半角スペース** で分割
   - 分割成功（前後とも 1 文字以上）: `last_name`, `first_name` をセット
   - 分割不能（スペース無し / 片側空）: `last_name = display_name`, `first_name = '(未設定)'` を一時値としてセットし、`profile.name_split_needed = true` をマーク
3. NOT NULL 制約 + CHECK 制約 (`length(last_name) >= 1 and length(first_name) >= 1`) を付与
4. トリガで `display_name = last_name || ' ' || first_name` を BEFORE INSERT/UPDATE で同期
5. 既存行の `display_name` を念のため再計算して整合させる

`profile.name_split_needed = true` の会員は、次回 reservation サイトログイン時に補正モーダルを必須表示（後続フォローのスコープに含めるか別 Issue に切るかは tasks.md で確定）。

**Why X over Y:**

- 「分離不能行は手動で運営が直す」案: 商用 DB に手作業を強いる運用負担が読みにくい。検知可能なフラグを残して画面で補正する方が運用しやすい
- 「分離不能行は migration 自体を失敗させる」案: prd リリース時に未知の入力パターンで止まると本番ダウンタイム化する

### 決定 3: トリガ方式 vs アプリ側で同期

`display_name` の同期は **DB トリガ** で行う。アプリから直接 `last_name` / `first_name` のみを UPDATE しても自動で `display_name` が追従するため、書き込み側の取りこぼし（admin から直接 SQL を打つ場合等）を防げる。

トリガ内ロジックは決定的かつ純粋（`new.display_name := new.last_name || ' ' || new.first_name`）。`display_name` を直接 UPDATE する経路は本 change 後は無くなる想定だが、レガシー seed / verify-signup 等が一時的に直接更新する間もトリガが最終整合を担保する。

### 決定 4: signup フォーム / プロフィール編集の UX

- フォーム上は **横並び 2 入力**（姓 | 名）。モバイル 390px でも 2 入力が同一行に収まる程度のラベル幅を確保（`shared/ui/FormField` を 2 つ並べる grid 構造）
- autocomplete: `family-name` / `given-name`
- placeholder: 「田中」「美咲」
- 各フィールドは `1 文字以上 32 文字以下` を Smart constructor で検証
- 既存の「お名前」単一ラベルは廃止。`label` は「姓」「名」の独立 2 ラベル
- プロフィール編集（`/profile`）の「お名前」行も同じく 2 フィールド編集モーダルに変更。既存 `createDisplayName()` Smart constructor は `createLastName()` + `createFirstName()` に置換、`displayName` 自体はアプリ側計算プロパティとして残す

### 決定 5: signup_pending payload schema

`signup_pending.payload` は `jsonb` のため schema 自由。`display_name` を `last_name` + `first_name` に置換する。Phase 1 の Edge Function `request-signup` / `verify-signup` を同時に更新。既存の `signup_pending` 行（30 分 TTL）に旧 schema が残っていても、`verify-signup` 側で旧 schema (`display_name` のみ) を検知したら明確なエラーを返す（コード再発行を促す）。

### 決定 6: admin 側読み出しの取り扱い

`admin-members-list` / `admin-event-detail` / `admin-identity-document-review` などの検索・表示は **無変更で動く**（読み出しは `display_name` ベース、ILIKE もそのまま）。admin の検索仕様は「`display_name` に部分一致」のままだが、トリガ同期により `'田中 美咲'` のような結合文字列が常に最新化されているため、「田中」「美咲」どちらでヒットする。

admin 会員詳細シートで姓・名を分離編集する必要性は本 change では発生しない（CSV エクスポート時に分離列が欲しい等の要望は Issue 化なし。tasks.md で本 change の対象外とする）。

## Risks / Trade-offs

- **トリガによる `display_name` 上書きリスク** → クライアントから `display_name` を直接 UPDATE する経路を残すと意図せず上書きされる。Mitigation: 本 change で `display_name` を直接更新するアプリコードを全廃。RLS の UPDATE 列ホワイトリストからも `display_name` を外す（`last_name` / `first_name` のみ許可）
- **分離不能行のフォロー漏れ** → `profile.name_split_needed = true` の会員にログイン時補正モーダルを出さないと、`first_name = '(未設定)'` の状態が長期化する。Mitigation: 移行直後に対象会員数を運営がカウントし、件数が少なければ admin から直接修正、件数が多ければ補正モーダルを後続 Issue で実装
- **既存 signup_pending 行（30 分 TTL）の schema 互換** → migration デプロイ直後に旧 schema 行が verify-signup に渡ると 500 化する。Mitigation: verify-signup 側で旧 schema (`display_name` のみ) を検知して 400 + 再発行案内を返す
- **dev / prd Supabase の手動 push 順序** → migration を Edge Function 更新より前に prd へ push しないと FK / トリガ未存在で Edge Function が 500 を引く（`feedback_supabase_prd_edge_functions_initial_deploy`）。Mitigation: 移行手順を「migration → Edge Function」順で固定し、ship 時にチェックリスト化
- **seed スクリプトの修正漏れ** → `supabase/seed/dev_event_detail_seed.sql` 等が `update ... set display_name = ...` を含む。トリガがあるため `display_name` を直接更新するとトリガ未介在で姓・名と整合崩れする恐れ。Mitigation: seed を `set last_name = ..., first_name = ...` 形式に書き換える

## Migration Plan

1. **DDL 適用（dev → prd 順）**: 列追加 → バックフィル → 制約付与 → トリガ作成 → RLS 更新を 1 migration ファイルにまとめる
2. **Edge Function 更新**: `request-signup` / `verify-signup` の payload schema を新形式に。旧 schema の `signup_pending` 行への対応エラー分岐も同時投入
3. **アプリコード更新**: signup フォーム / プロフィール編集 / 関連 composable / Smart constructor を新属性に切替
4. **seed / テスト更新**: 全 `display_name = ...` を `last_name = ..., first_name = ...` に置換
5. **動作確認**: dev で signup → verify → profile 編集まで一気通貫、PR Preview で同様確認、prd 手動 migration + Edge Function deploy で最終確認

**Rollback**: トリガ削除 + `last_name` / `first_name` を nullable に戻すだけで `display_name` が引き続き機能する。データ自体は失われない。

## Open Questions

- ~~分離不能行が発生した場合の補正フローは本 change に含めるか後続 Issue に切るか~~ → **確定 (2026-05-21)**: 運営が氏名を把握している既知会員は本 change の追加 migration `20260520164020_fix_known_split_needed_members.sql` で個別に正値上書き。dev のオーナー会員は手動 SQL で補正済。未知の対象は ship 後に `profile.name_split_needed=true` で SELECT 抽出し、運営側で個別ヒアリング→ admin SQL で補正する運用とする
- admin 会員詳細での姓・名表示の見た目変更は必要か → 本 change では現状維持（`display_name` のまま 1 行表示）を推奨
- CSV エクスポート時に姓・名分離列を出すか → 本 change の対象外（必要なら別 Issue）
