## Why

admin の `/events/:id` 予約者一覧は現在 `氏名（display_name）` のみで会員を識別する。MVP1 の運用が始まると、同姓・同名の会員、または翔太郎くんが「氏名はすぐに思い出せないが、ニックネームで覚えている」会員が一定数発生する。会員サイトでは `members.nickname` が任意項目として既に運用されている（#200）一方で、admin 画面はその値を取り込んでおらず、当日チェックインや予約代行時に「この『田中』ってどっちだろう」と現場で迷う温床になっている。

本変更は、予約者一覧に nickname を併記して**運営側からの会員照合の摩擦を取り除く**ことを目的とする。

## What Changes

- 予約者一覧の「名前」列に、`members.nickname` が登録されている会員については氏名と並べて表示する（例: `山田 太郎（たろちゃん）`）。`nickname IS NULL` の会員は氏名のみ表示し、空の括弧は出さない。
- 退会済み会員（`member_id IS NULL` で COALESCE により氏名が「退会済み会員」となる行）は nickname も常に NULL 扱いとし、現状の表示のまま変えない。
- データ取得経路の単一性を保つため、参加者一覧 view（`event_participants_view`）の出力列に `nickname` を追加する（クライアント join 禁止ルールを維持）。
- モバイル幅でも氏名 + ニックネームの併記でレイアウトが破綻しないよう、折返し or 省略の表示挙動を仕様で固定する。
- **UX 上の論点として残す**: 検索ボックス（`?q=`）の部分一致対象に nickname を含めるか。今 Issue のスコープには「表示」のみが書かれているが、ニックネームで覚えている翔太郎くんが検索でもニックネームを打つのは自然なため、本 Proposal では **含める**方針として提案する（反対なら Apply 前に差し戻し）。

## Capabilities

### New Capabilities

なし（新規 capability は導入しない）。

### Modified Capabilities

- `admin-event-detail`: 予約者一覧の名前列の表示仕様、および検索対象列の仕様を変更する。
- `data-schema`: `event_participants_view` の DTO に `nickname` 列を追加する。

## Impact

- 影響アプリ: `apps/admin` のみ（reservation / lp は無関係）。
- 影響レイヤー: `apps/admin` の event-participants 系の widgets / entities、および参加者一覧 view を再定義する supabase migration。
- DB 互換性: view の `create or replace` で列を末尾追加するため、既存 select 利用箇所の互換は維持される。
- RLS: 参照テーブル（`members`）の RLS をそのまま継承（view は security_invoker）。新規ポリシー追加は不要。
- Non-Goals: ニックネーム編集機能（reservation 側で完結、admin 側に編集 UI を持たない）／ 予約者一覧レイアウト全体の刷新／ アバターのイニシャル算出ロジック変更（引き続き氏名先頭文字）。
