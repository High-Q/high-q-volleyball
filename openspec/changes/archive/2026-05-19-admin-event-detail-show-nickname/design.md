## Context

admin の `/events/:id` 予約者一覧は MVP1 で `event_participants_view` 経由のクライアント render として確立済み（#87）。基盤 view は #200 で `member_id` の LEFT JOIN 化 + 退会済み会員の COALESCE 表示まで進化している。

会員サイト側では `members.nickname`（任意 / 1〜15 文字 / 日本語 + ASCII 英字のみ）が既に運用されており（#200, `reservation-profile-page`）、会員自身が任意に登録 / 解除する。一方で admin 側は当該列を view 出力にも entity 型にも持っておらず、運営からの「ニックネームで誰か照合する」というユースケースには応えていない。

本変更は「admin の予約者一覧に nickname を **表示** として併記する」ことを最小スコープとし、編集 UI（reservation 側で完結）や予約者一覧レイアウトの刷新は触れない。

## Goals / Non-Goals

**Goals:**
- 予約者一覧の名前列で、氏名とニックネームを同時に確認できる
- ニックネーム未登録の会員でも従来通り氏名のみで自然に並ぶ（プレースホルダー禁止）
- 検索キーとしてもニックネームが使える（運用者の習慣に合わせる）
- 取得経路の単一性（クライアント join 禁止）を維持しつつ追加情報を取り込む
- モバイル表示で破綻しない（admin 画面が PC 中心とはいえ、現場運用時にスマホで確認するケースを想定）

**Non-Goals:**
- admin からの nickname 編集 UI（reservation 側機能。今回は閲覧のみ）
- 「ニックネーム → 氏名」優先表示への切替（会員視点では nickname 優先だが、admin 視点では氏名が一次キーであるべき）
- アバターのイニシャルロジック変更（氏名先頭文字を維持）
- 予約者一覧の列構成・順序・幅の刷新
- キャンセル代行 AlertDialog 等の他箇所での nickname 併記（今回は表 / 検索のみ。Dialog の表記には触れない）

## Decisions

### D1. 取得経路 — view 列拡張 vs クライアント追加 fetch

**決定**: `event_participants_view` の出力列に `nickname` を **追加**し、entity 型・widget で連鎖的に取り込む。

**Why**: 既存仕様（`admin-event-detail` spec の「取得方法の単一性」）でクライアント join を禁止している。reservation 一覧の取得は `event_participants_view` 一発で完結する設計が確立しているため、view 列を伸ばすのが最小差分で整合する。

**代替案 — クライアントで `members` を別 fetch して結合**: N+1 と RLS 漏れの可能性を再導入することになり既存方針と矛盾するため棄却。

### D2. 表示フォーマット — 全角括弧併記

**決定**: 氏名の直後に全角括弧で nickname を併記する（`山田 太郎（たろちゃん）`）。ニックネーム部分も氏名と同サイズ・同ウェイトで描く。

**Why**: Issue の指定文言（`例: 山田 太郎（たろちゃん）`）に従う。同サイズ・同ウェイトとしたのは、admin から見ると nickname が会員照合の主な手掛かりになる場面があり、視覚的に "副情報" にしないため。

**代替案 — 氏名の下に小さく薄く出す（2 段組）**: 列セルの高さが揃わず、テーブル全体のリズムが崩れる。また、入店時の照合などスキャン目的では同サイズで横並びの方が拾いやすい。棄却。

### D3. モバイル幅での挙動 — 折返し禁止・横スクロールに乗せる

**決定**: 名前セルは引き続き `whitespace-nowrap` を維持し、行内折返しはしない。表示領域を超えた場合は table 全体の横スクロールでハンドリングする。

**Why**: 行ごとに高さが揺らぐと、初回 Badge / 経験 Badge / Switch などの縦位置整列が崩れる。既存挙動と一貫させる。

**Trade-off**: ニックネームが長い会員のいるイベントでは横スクロール量が増える。会員側の入力制約（最大 15 文字 / 日本語 + ASCII 英字のみ）で上限がかかっているため、現実的な破綻は起こらない見込み。

### D4. 検索キーへの nickname 追加

**決定**: `useEventParticipantsData.applyFilter` の検索条件に `nickname` への部分一致を追加する。`nickname IS NULL` の行は NULL を空文字に丸める前に短絡評価でスキップし、空文字検索などでの誤マッチを防ぐ。

**Why**: 「ニックネームでしか会員を覚えていない」運用者にとって、表示されている nickname を検索ボックスにそのまま打って絞り込めない UX は不自然。Issue の完了条件には書かれていないが、表示と検索は対であるべきとして本変更に含める。

**代替案 — 表示のみで検索は据え置き**: 表示と検索の整合が取れず、運用者から「表示されているのに検索でヒットしない」と必ずフィードバックが来る。スコープに含めた方が ROI が高い。

### D5. 退会済み会員行の取り扱い

**決定**: `member_id IS NULL` の行（退会済み会員）は `nickname` を常に NULL として返し、UI 側でも括弧を出さない。

**Why**: 退会済み会員は個人特定情報を匿名化する既存方針があり、`display_name = '退会済み会員'` と固定 label にしている。そこに `nickname` を出すと匿名化の趣旨に反する。退会前に登録していた nickname が残っていても出さないことで、運用ポリシーと整合する。

**実装メモ**: view 側で `case when r.member_id is null then null else m.nickname end` か、LEFT JOIN の自然な結果としての NULL をそのまま返すか。LEFT JOIN なら member_id NULL → join 失敗 → m.nickname も NULL なので、追加分岐不要。

### D6. Migration の打ち方

**決定**: 新規 migration 1 本（`YYYYMMDDHHMMSS_add_nickname_to_event_participants_view.sql`）で `event_participants_view` を `create or replace view ... with (security_invoker = true) as select ..., m.nickname, ...` に置換する。GRANT は authenticated 既存ポリシーを維持（view 自体は同名なので granted 状態が保たれるが、`create or replace` の挙動上 explicit re-grant を入れる方が安全。既存 #87 / #200 migration でも明示再 GRANT を入れている）。

**Trade-off**: PostgreSQL の `create or replace view` は **列順固定 + 末尾追加のみ** 許可。今回は末尾に `nickname` を追加するのではなく、運用しやすい位置（`display_name` の直後）に挿入したい所だが、`create or replace` 制約に従い `nickname` は **既存末尾 (`is_first_time` の前後)** に追加する。仕様 spec の列順 enum は「概念順」を示しているだけで、SQL 列の物理順序とは独立に entity 型が `nickname` を扱うため UI には影響しない。

### D7. Entity 型の更新

**決定**: `apps/admin/src/entities/reservation/model/reservation.types.ts` の `ParticipantRow` に `nickname: string | null` を追加する。検索や表示でこの型を介すコードはすべて TypeScript の型チェックで網羅できる。

## Risks / Trade-offs

- **Risk: view の列追加で TypeScript 側の型が一時的に view と乖離する** → migration → entity 型更新 → widget 表示の順で 1 PR にまとめて適用。CI 上は migration を実行しない（unit test は mock）ため、型と DB のズレは PR 単位の review で担保。
- **Risk: 既存 component test / unit test が `nickname` undefined で割れる** → `ParticipantRow` を使う既存テストでは row factory がデフォルトで `nickname: null` を返すよう調整。新規 test は nickname あり / なしを最低 1 件ずつ追加。
- **Risk: モバイル幅で横スクロール量が増えて運用感が悪化** → ニックネーム最大 15 文字 + 全角括弧 2 文字 = 17 文字相当の追加。元の名前列が 8〜10 文字想定なので、合計でも 30 文字弱。許容範囲。
- **Trade-off: 検索が表示と整合する分、検索結果に "知らない nickname だが氏名は知っている人" の行も合致する可能性** → 部分一致なので大きな乖離は起きない。元の display_name / email も検索対象として残しているため、ニックネームで打って外れても氏名検索にフォールバックできる。

## Migration Plan

1. dev 環境で migration 適用 → `select nickname from event_participants_view limit 1;` で列追加確認
2. apps/admin のローカル `pnpm dev` で `/events/:id` を開き、nickname あり/なしの会員が並ぶことを目視確認
3. PR Preview にデプロイ後、prd Supabase に対しても **手動で** `supabase db push` を打つ（メモリ: prd Supabase 切替時は migration を手動 sync 必須）
4. master マージ後、本番 Render が再ビルドされて反映

**Rollback**: `create or replace view public.event_participants_view as <旧定義（#200 時点の SELECT）>` を打って巻き戻す。entity 型から `nickname` を消すと TypeScript ビルドが通らなくなるため、UI 側の rollback は revert PR で実施。
