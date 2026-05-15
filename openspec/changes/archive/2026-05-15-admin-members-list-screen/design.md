## Context

Issue #150 は Epic #169「オーナーがサークルを見える化・効率化する」の最初の機能 Issue である。現状 admin は会員を横断的に見る画面を持たず、参加者一覧（イベント単位の `event_participants_view` 経由）からしか会員に辿り着けない。サークル運営は中長期的に「過去の参加者を声かけ対象にする」「初心者の継続率を観察する」「メール届かず要連絡の会員を追跡する」などの判断を要するため、会員を起点にした閲覧軸が必要になる。

本 change は MVP1 完了後の早期 MVP2 機能として位置づけられ、参加者数が 10 〜 50 名規模で運用される想定。RLS / FSD / Branded Types / Result 型といった既存規約（`docs/03-アーキテクチャ/04-開発・コーディング規約.md`）と、admin の既存画面パターン（`/events` の DataTable + Toolbar + Pagination 構成、URL クエリ同期、4 状態管理）に揃える。

ステークホルダーは PO 兼開発者（翔太郎くん）、運用利用者は admin 1 名。MVP1 期間中の会員 1 名 + 移行された AWS Legacy 由来の少数会員（既存 dev / prd データ参照）。

## Goals / Non-Goals

**Goals:**

- admin が会員を一覧 + フィルタ + 検索 + ページネーションで横断閲覧できる画面を提供する
- 会員ごとに「初回参加日 / 累計参加回数 / 最終参加日 / 経験レベル / 運営メモ」を 1 行で把握できる
- 一覧の右側に slide-in する詳細 sheet で「参加履歴（イベント名 + 日時 + 状態） + 運営メモ編集」を提供する
- 運営メモを `members.admin_note` 列に保管し、admin 以外（本人含む）から閲覧 / 編集できないことを RLS とアプリ層 SELECT 列指定で担保する
- 既存の `admin-events-list` 画面と一貫した URL クエリ同期 / 4 状態管理 / DataTable 表現を踏襲する

**Non-Goals:**

- CSV エクスポート / 一斉メール送信（別 Issue）
- ダッシュボード（StatCard + 通知 + 最近の予約）（別 Issue）
- 会場マスタ CRUD / 設定画面（別 Issue）
- 会員の削除 / role 変更 UI（Supabase Dashboard 直接操作で対応）
- 会員のメールアドレス変更 / 退会フロー
- 会員サイト (`apps/reservation`) 側の UI 変更（admin_note は会員に見せない）
- キャンセル待ち専用 UI（MVP1 は 0 件運用、`waitlist` も通常の状態として詳細 sheet に表示するのみ）
- 集計のリアルタイム性保証（view 経由のため SELECT 時点で集計される、キャッシュは導入しない）

## Decisions

### D1. 集計は専用 view で取得し、N+1 を回避する

会員一覧の集計列「初回参加日 / 累計参加回数 / 最終参加日」は、reservations × events から都度集計する必要がある。`admin-events-list` で `event_list_view` を採用したのと同じ思想で、専用の `member_list_view` を作成し、admin 画面は単一クエリで一覧を取得する。

- **検討した代替案**: アプリ層で members を取得後、reservations を会員ごとに別クエリで集計（N+1）
- **不採用理由**: 会員数の増加に従って N+1 のクエリ数が比例増し、ページネーション境界での集計欠落が発生する（行を 25 件取得した後の集計だと、`status` フィルタの組み合わせで「累計が条件に合うが行が見えない」状態を作る）。view にすることで `WHERE attended_count >= 11` のような累計レンジ絞り込みも SQL 側で完結する
- **トレードオフ**: view のメンテナンスコストが発生する（reservations の `status` 値が変わった場合に view 定義も更新）。既存の `event_detail_view` / `event_participants_view` の `is_first_time` 判定（過去 attended 有無）と整合させる責務を持つ

### D2. 累計参加回数の定義は「attended のみ」とし、`event_participants_view` と整合させる

`member_list_view.attended_count` は **`reservations.status = 'attended'` の件数**として定義する。`reserved`（予約中）/ `cancelled`（キャンセル）/ `no_show`（不参加）/ `waitlist`（キャンセル待ち）は累計に含めない。

- **検討した代替案**: `reserved` + `attended` 合計（active な予約全件）
- **不採用理由**: 「累計参加回数」というラベルは「実際に来た回数」を期待される。`reserved` は未来予約を含むため、当該会員が未来予約のキャンセルで件数が増減する不自然さを生む。`event_participants_view.is_first_time` の判定（過去 attended 有無）とも整合する
- **トレードオフ**: チェックイン操作（status 'reserved' → 'attended'）を admin が遅延すると当該イベント分の累計が反映されない。MVP1 / MVP2 の規模では当日チェックインが運用上必須なので問題なし

### D3. 初回参加日 / 最終参加日も「attended のみ」で集計する

- `first_attended_at` = `MIN(events.start_at)` WHERE `reservations.status = 'attended'` AND `reservations.member_id = members.id`
- `last_attended_at` = `MAX(events.start_at)` WHERE 同上
- どちらも attended 履歴ゼロのときは NULL

設計サンプルのフィルタ「最終参加: 今月 / 3 ヶ月以内 / 半年以上前」も `last_attended_at` ベースで実装。NULL（未参加）は「最終参加: すべて」以外のフィルタには該当しない（条件式から自動除外）。

- **検討した代替案**: 「最終参加なし」を「半年以上前」に含める
- **不採用理由**: 「過去 attended が 0 件の会員」と「過去 attended があるが半年以上前」は運営判断上意味が異なる（初参加待ち vs 離脱）。NULL は別軸で扱う
- **トレードオフ**: 「最終参加なし」を独立フィルタとして必要になった場合は後続 Issue で追加（現在は累計 0 件の絞り込みでカバー可能）

### D4. メモ列は `members.admin_note text NULL`、アプリ層上限 500 文字

`members.admin_note` を text NULL で追加する。DB 側に CHECK 制約は付けず、長さ / 内容のバリデーションは admin アプリ層で行う（上限 500 文字、改行可、HTML エスケープは表示時）。

- **検討した代替案 1**: `members.profile` jsonb に `admin_note` キーを格納
- **不採用理由 1**: 会員自身が UPDATE 可能な `profile` 列に admin 専用情報を混ぜると、RLS の WITH CHECK 句で「`profile` のキーごとの編集権限」を表現する必要があり、PostgreSQL の RLS では現実的に書けない。専用列の方が認可が明確
- **検討した代替案 2**: `member_admin_notes` 別テーブル + 履歴管理
- **不採用理由 2**: MVP2 では「現在の最新メモ 1 つ」しか UI で見せない。履歴 UI が無い段階で履歴テーブルを作るのは過剰。後続で「メモ変更履歴を残したい」要望が出た時点でテーブル化する
- **トレードオフ**: text 列でフリーフォーマット保管のため検索性が低い（一覧の検索ボックスで「メモ部分一致」は ILIKE でカバー）。500 文字制限はアプリ層のみのため、Supabase Dashboard 直接編集で超過値が入る可能性があるが、運用想定外として受容

### D5. 本人 SELECT 経路で `admin_note` を返さない実装規約を spec 化する

`members` の SELECT RLS は admin と本人のいずれも自分の行を見られる前提（`rls-policies` 既存 Requirement）。`admin_note` 列を追加した場合、列レベル RLS は PostgreSQL で扱いにくいため、**reservation 側のアプリコードで `members.*` ではなく明示的列指定の SELECT に変える運用ルール**を `rls-policies` capability に固定する。

並行して `members` の UPDATE WITH CHECK 句に「本人は `display_name` / `nickname` / `phone` / `experience_level` / `profile` のみ更新可、`admin_note` を含めようとした場合は拒否」を明示追加する。

- **検討した代替案**: PostgreSQL の column privilege（`GRANT SELECT (col1, col2, ...) ON members TO authenticated`）で列レベル制御
- **不採用理由**: column privilege は Supabase の RLS と組み合わせると挙動が複雑で、PostgREST 経由のエラー表現も読みにくい。アプリ層列指定 + UPDATE WITH CHECK の二重防御で十分
- **トレードオフ**: 本人が直接 SQL コンソール経由で `SELECT admin_note FROM members WHERE id = auth.uid()` を実行すれば見えてしまう。本番運用では会員が SQL コンソールへアクセスする経路はなく実害ゼロ、アプリ経由では確実に列除外される。リスクは Risks 節で明記

### D6. 詳細は slide-in sheet で表示、ルートは別ページではなく `/members?detail=:id` のクエリ同期

「一覧の右側に slide-in する sheet」で詳細を表示する。URL は `/members?detail=:id` のクエリパラメータで同期し、ブラウザ戻る / 進む / リロード / URL 共有でも詳細状態を復元できる。

- **検討した代替案 1**: 別ページ `/members/:id`（既存 admin パターン）
- **不採用理由 1**: 一覧でのフィルタ条件を保ったまま個別会員を確認・編集できる UX が運営の比較・連続確認操作と相性が良い（PO 確認 2026-05-15）
- **検討した代替案 2**: modal dialog（中央配置）
- **不採用理由 2**: 一覧と詳細を視認しながら作業する用途には slide-in の方が情報密度が高い
- **トレードオフ**: 既存 admin の `EventDetailPage` / `IdentityDocumentDetailPage` とパターンが分かれる。本 change で sheet パターンを `member-detail-sheet` widget として確立し、将来同種要求が出た際の参考実装とする

### D7. shadcn-vue の Dialog プリミティブを sheet として転用

slide-in sheet は shadcn-vue の `Dialog` を CLI で取得し、開閉アニメーション / フォーカストラップ / Esc クローズ / overlay クリック / a11y 属性を組み込む。サイズ・位置・transition は `@high-q/tailwind-preset` の utility と CSS 変数で右端固定 + 幅 480px に調整する。

- **検討した代替案**: 自前で `<Teleport>` ベースの sheet を作る
- **不採用理由**: フォーカストラップ / aria-modal / Esc クローズなどの a11y 担保が手間。本基盤の方針（CLAUDE.md「機能系 = shadcn-vue」）に従う
- **トレードオフ**: shadcn-vue 取り込み済みプリミティブが Login (#84) 用の `Input` / `Label` / `FormField` のみなので、本 change で `Dialog` を新規取り込む。`apps/admin/src/shared/ui/` に copy-paste する手順を tasks に含める

### D8. 参加履歴は `member_history_view` で member 別に events × reservations を join

詳細 sheet 内の「参加履歴」は、当該 member の reservations を events と join して時系列で表示する。専用 view `member_history_view` を作成し、`member_id` フィルタで取得する。

view の列:
- `reservation_id` (uuid)
- `member_id` (uuid)
- `event_id` (uuid)
- `event_name` (text)
- `start_at` (timestamptz)
- `venue_name` (text)
- `status` (text)
- `guest_count` (smallint)
- `checked_in_at` (timestamptz NULL)
- `is_first_time` (boolean) — 当該 reservation が member の初回 attended 判定対象に該当する場合 true

`status IN ('reserved', 'attended', 'no_show', 'waitlist')` の行のみ返し、`cancelled` は除外する（`event_participants_view` の挙動と一致）。

- **検討した代替案**: 詳細 sheet 開いた時点でアプリ層で reservations + events + venues を join クエリで取得
- **不採用理由**: 既存 `event_participants_view` と同じ思想（DTO は view、UI は単純な SELECT）で一貫させる。SECURITY INVOKER のため RLS 継承も自動
- **トレードオフ**: view が 3 つ（既存 `event_*_view` 3 つ + 本 change の `member_*_view` 2 つ）と増えるが、責務が明確で重複ロジックは出ない

### D9. フィルタの URL クエリ同期キー命名

`admin-events-list` の `?period=` / `?venue=` / `?status=` / `?q=` / `?sort=` / `?dir=` / `?page=` に倣い、本画面は次のキーを採用:
- `?exp=`（経験: `beginner` / `intermediate` / `experienced` / 空 = すべて）
- `?attended=`（累計レンジ: `first` / `2-5` / `6-10` / `11+` / 空 = すべて）
- `?last=`（最終参加期間: `this-month` / `3m` / `6m+` / 空 = すべて）
- `?q=`（検索: 名前 / メール / メモのいずれかに ILIKE 部分一致）
- `?sort=`（`last_attended` / `attended_count` / `first_attended` / `display_name`）
- `?dir=`（`asc` / `desc`、デフォルトは `last_attended desc`）
- `?page=`（1 〜、デフォルト 1、25 件 / ページ固定）
- `?detail=`（詳細 sheet の対象 member id、無ければ sheet 閉）

`q` の対象に `admin_note` を含める運用を採用する（admin 専用フィールドのため、メモ内容で検索する用途が運営判断上有効）。

- **検討した代替案**: q を「名前 / メール」のみに限定
- **不採用理由**: 設計サンプルが「名前・メール・メモで検索…」と明記しており、メモ検索は運営判断（「メール届かず」をメモから追跡）に直結する
- **トレードオフ**: 部分一致検索のため、メモが長くなると検索コストが線形に増える。MVP2 規模では問題なし、検索パフォーマンス劣化時は GIN trigram index で後追い対応可能

### D10. 経験レベルの表示ラベルは既存規約踏襲

`beginner = 初回` / `intermediate = 中級` / `experienced = 経験者` の対応を採用する。これは admin の `event-participants` widget が既に採用している規約で、reservation 側の SignupPage / profile-level-edit も同じ呼び方をしている。

詳細 sheet 内の参加履歴で出る「初回」バッジ（`is_first_time` で当該 event が member の初参加だった場合）と、経験列の「初回」ラベル（experience_level = beginner）が意味的に衝突するが、既存規約踏襲を優先し本 change では変更しない。両者の文脈は十分に異なる（行レベル: 一覧の経験列、サブ要素: 参加履歴行内の Badge）ため UI 上は識別可能。

- **検討した代替案**: 経験列のラベルを「初心者」に変更
- **不採用理由**: 既存規約変更は本 change のスコープ外。必要なら別 Issue で全アプリ横断のラベル統一を行う

### D11. テスト戦略

- **DB**: migration 直後に view 動作を確認する SQL テスト（applied via `pnpm db:push` 後、`docs/07-テスト/01-テスト戦略・方針.md` の DB 検証パターン）
- **Component（vitest）**: widget 単位で 4 状態（Loading / Empty / Error / Success）、フィルタ・ソート・検索の URL 同期、メモ編集の楽観的更新と失敗時ロールバック
- **E2E（Playwright）**: 本 change の機能あたり 1〜2 件（CLAUDE.md「新規 feature Apply の E2E は機能あたり 1〜2 件まで」）。happy path（一覧 → 詳細 sheet 開く → メモ編集 → 保存 → リロード後も保持）と主要 edge case（権限のない非 admin アクセス時の login リダイレクト）

## Risks / Trade-offs

- **リスク**: `admin_note` が本人の SELECT で列指定漏れによりリークする
  → **緩和**: `rls-policies` 側に列指定 SELECT 運用ルールを spec に固定し、reservation 側の `members` 取得経路（`useAuthSession` / `useProfile` 等）すべてを列指定に統一する。tasks 内で `from('members').select('*')` の grep 結果 0 件を完了条件にする

- **リスク**: 累計集計が view レベルで計算されるため、参加者数が増えた際にページネーション境界の集計が重くなる
  → **緩和**: MVP2 規模（〜50 名）では問題なし。100 名超で性能劣化が見えた時点で `member_id` 集計列を materialized view 化 or members テーブルに集計列を caching する。本 change のスコープでは plain view で進める

- **リスク**: 詳細 sheet と URL クエリ同期の組み合わせで、ブラウザ「戻る」操作で sheet が予期せず閉じる体験になる
  → **緩和**: `?detail=:id` を `replaceState` ではなく `pushState` で同期し、戻る = sheet 閉じる として一貫させる。一覧フィルタ変更も pushState のため、戻る = 直前操作の取り消し として直感的

- **リスク**: 設計サンプルの subtitle「累計 184 名 · 今月初参加 12 名」を再現するため、画面 header に member_list_view 全体のメタ集計が必要
  → **緩和**: 本 change では PageHeader に総会員数（COUNT）と今月初参加数（`first_attended_at` が今月の件数）を別クエリで取得。重い場合は sheet 開閉とは独立して memoize する。実測 100ms 超なら別 view にする

- **リスク**: shadcn-vue の Dialog プリミティブを新規取り込むため、既存 admin の Login で導入した shadcn-vue 要素との設計整合性が必要
  → **緩和**: 既存 `apps/admin/src/shared/ui/` に Login で導入された `Input` / `Label` / `FormField` の取り込みパターンを踏襲。Dialog は shadcn-vue CLI が公式に提供しているため標準パスで導入

## Migration Plan

1. dev Supabase へ migration 適用（`members.admin_note` 列追加 + `member_list_view` / `member_history_view` 作成 + members UPDATE WITH CHECK 句更新）
2. reservation 側の `members` SELECT 経路すべてを列指定に修正（`admin_note` を含めない）。grep で `from('members').select('*')` 0 件を確認
3. admin アプリ実装（entity → widget → page → router）
4. dev でローカル動作確認（`pnpm --filter @high-q/admin dev`）。一覧 / フィルタ / 検索 / ページネーション / 詳細 sheet 開閉 / メモ編集 / URL 同期 / 4 状態
5. PR 作成、Render Preview で admin 動作確認
6. 翔太郎くん確認後、`/opsx-ship` で sync → archive → push → merge

ロールバック: migration は逆向き migration（view DROP + 列 DROP + WITH CHECK 句復元）で取り消し可能。`admin_note` 列の DROP はデータ消失を伴うため、roll-back 時はメモのバックアップを取る。

## Open Questions

特記なし。スコープ確定（CSV / 一斉メール の切り出し / 詳細 sheet 方式 / `admin_note` 専用列）は PO 確認済（2026-05-15）。
