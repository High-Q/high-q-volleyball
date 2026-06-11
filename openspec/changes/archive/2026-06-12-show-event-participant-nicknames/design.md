## Context

会員サイト (`apps/reservation`) の予約詳細画面は現在「予約 1 件に紐付くイベント情報・自分の予約状態・予約埋まり具合」までを表示するが、**同じ回に参加する他会員のニックネーム一覧** は持っていない。Issue #278 はこのギャップを埋め、Epic #170 のユーザージャーニーで掲げた「参加 → 継続」の継続率向上を狙う。

前提として、`members.nickname` は #200 で導入済み (1〜15 文字 / 日本語+ASCII 英字 / 数字・記号・絵文字禁止 / 未設定可)、admin 側予約者一覧での nickname 表示は #271 で完了済み。会員サイト側だけが未実装の状態にある。

セキュリティ・プライバシー観点での既存制約:
- `reservations` の SELECT RLS は「自分の予約のみ閲覧可」を維持する方針 (会員間の予約データ直接照会は禁止)
- 個人特定可能情報 (本名 / メール / 電話番号 / 生年月日 / 経験レベル) は会員間に絶対露出させない
- service_role 経由のクライアント側照会は禁止
- `members.nickname` を「他参加者に表示する」運用同意は spec のどこにも明文化されておらず、本 change でプライバシーポリシー側の明文化を伴う

## Goals / Non-Goals

**Goals:**
- 自分が有効な予約 (`status='reserved'`) を持つイベントに対して、他参加者のニックネーム一覧を予約詳細画面で取得・表示できる
- nickname 未設定者は汎用マスク表記 (本名 fallback はしない) で個人特定を防ぐ
- 自分自身も一覧に含めて表示し、「あなた」マーカーで識別可能にする
- 同伴者は個別 nickname を持たないため、末尾サマリ「同伴者 +N 名」で集約する
- 直接の reservations RLS 開放は行わず、SECURITY DEFINER の RPC 1 本に集約する
- プライバシーポリシーに「予約イベント内で nickname を他参加者に表示する」を明記し、プロフィール nickname 行に補足説明を追加する

**Non-Goals:**
- イベント詳細画面 (`/events/:id`) での全員公開 (MVP2 で再評価)
- ニックネーム公開可否のオプトイン toggle (会場で本人が名乗るのと等価という運用解釈で、設定 UI は導入しない)
- 同伴者の個別 nickname 管理 (data model 拡張が必要 + 本人以外の同意取得が困難)
- 経験レベルバッジ表示 (MVP1 スコープアウト確定済み)
- リアルタイム購読 (Supabase Realtime での自動更新は不要、画面遷移時の再取得で十分)
- 退会会員 (`auth_user_id IS NULL` または論理削除済) の参加履歴表示
- アバター画像・自己紹介文の表示

## Decisions

### D1: SECURITY DEFINER RPC で取得する (vs view + RLS)

参加者一覧を返す Postgres 関数を SECURITY DEFINER で 1 本作成する方針を採用する。

**選定理由:**
- 「自分がそのイベントに有効 reservations を持つ」前提チェックを関数本体の先頭で 1 回行えば、戻り値の集合に対して個別 RLS を組まずに済む
- view + RLS は `reservations × members` の集約 view を構成する必要があり、view に対する RLS は元テーブル RLS の影響を継承しないケース (security_barrier 設定) があり、検証コストが高い
- 関数なら戻り値スキーマ (`nickname text`, `is_self bool`, `guest_count int`) を明示でき、UI 層に余計な列を返さない契約が組める
- 関数経由のみ authenticated に EXECUTE 権限を付与し、`SELECT reservations.*` 系の直接照会権限は引き続き拒否できる

**代替案と却下理由:**
- view のみ: RLS 設計の二重チェックが必要、戻り値の絞り込みが煩雑
- 関数 INVOKER モード: 呼び出し元 RLS の影響を受け、本来「自分の参加者リスト全体」を返したい意図に対し他参加者の reservations 行が RLS で 0 行に削られて返らない問題が発生する

### D2: 関数のシグネチャと前提条件

```
public.get_event_participant_nicknames(p_event_id uuid)
  returns table (
    member_id uuid,           -- UI で自分判定用 (auth.uid() との比較)
    nickname  text,            -- NULL または空のときは UI 側でマスク表記
    is_self   boolean,         -- 自分の reservations 行に対応する true
    guest_count smallint       -- その reservations に紐付く同伴者数
  )
language plpgsql
security definer
set search_path = public
```

前提チェック (関数本体先頭):
- `auth.uid()` が `p_event_id` に対して `reservations.status IN ('reserved', 'attended')` の有効 reservations を 1 行以上持つこと
- 持たないときは空集合を返す (例外を投げない — 不正参照・404 状態でも UI が破綻しないため)

戻り値の集合:
- 該当イベントの `reservations.status IN ('reserved', 'attended')` の全行に対し、各行の `member_id` 経由で `members.nickname` を JOIN
- nickname は NULL も含めて返す (マスクは UI 側で行う)
- `'cancelled'` / `'no_show'` の reservations は除外
- 並び順は `reservations.created_at ASC` を SHALL とし、UI 側で並び替えしない

退会会員の扱い:
- 既存退会フロー (`20260516000000_member_withdrawal_flow.sql`) で `reservations.member_id` は `ON DELETE SET NULL` に設定済み。退会すると過去 reservations は残るが `member_id IS NULL` になる
- 本 RPC は `reservations.member_id IS NOT NULL` で SHALL フィルタする。退会済み参加者を「参加メンバー (退会済)」として表示する価値は薄く、Epic #170「今回会える顔ぶれ可視化」の意図から外れるため

権限:
- `EXECUTE` を `authenticated` ロールに明示 GRANT
- `anon` および `service_role` への GRANT はしない (anon は機能対象外、service_role は本機能の利用範囲外)

### D3: マスク表記 / 自分マーカーは UI 側で表現する

DB は `nickname text` と `is_self boolean` を素直に返し、UI 表現 (「あなた」マーカー / 「参加メンバー」マスク) は Vue コンポーネント側で組み立てる。

**選定理由:**
- 表記文言は UX 改善で揺れる可能性が高く、DB 側に文字列を持つと変更コストが上がる
- i18n 対応 (将来) も UI 側に統一できる
- DB は事実 (nickname の有無 / 自分か他人か) のみを返す責務に純化

### D4: プライバシーポリシー側の明文化アプローチ

オプトイン toggle 方式は採用せず、`privacy-policy-page` spec に運用追記を行う。

**選定理由:**
- 会場で本人が nickname を名乗るのと等価という運用解釈が成立する (本名・連絡先は出さない)
- toggle 導入は migration + 既存会員のデフォルト判断 + UI 工数が膨らみ、MVP1 のリリース速度を毀損する
- 同意は signup フローでの privacy policy 同意に内包する

**プロフィール側の補足:**
- ニックネーム編集モーダル / ACCOUNT セクションのニックネーム行に「同じイベントの参加者に表示されます」相当の補足文を MUST 表示
- 補足文は HQ デザイントークン経由のスタイル (muted トーン) で実装

### D5: 配置と Loading / Empty / Error フォールバック

予約詳細画面の DOM 順序: `Meta テーブル → 予約状況セクション → 参加者セクション (NEW) → Cancel Policy ボックス → 編集 CTA / キャンセル CTA`。

**Loading**: skeleton 4-5 行 (画面全体 skeleton と整合)。
**Empty**: 自分しか予約していないとき (戻り値 1 行 + 自分) は「現在の参加者: あなたのみ」相当の案内。0 行 (前提チェック失敗時) は **画面全体の 404 / Error 状態に吸収**し、参加者セクション固有の Empty にはしない。
**Error**: RPC 失敗時はセクションに「参加者一覧を取得できませんでした」+ セクション単位の retry なし (画面全体 retry に集約、`reservation-detail-page` の Error 状態運用と整合)。

### D6: 既存予約埋まり具合 (formatAvailability) との関係

参加者セクションの「集計母集団」は `reservation-events-and-booking` capability の予約埋まり具合と一致させる MUST。具体的には:

- 予約埋まり具合: `reservations.status = 'reserved'` の人数を集計 (本人 + 同伴者の guest_count 合算)
- 参加者ニックネーム RPC: `reservations.status = 'reserved'` の行に対応する member の nickname を返す + 各行の guest_count を返す

UI 側で「参加者人数 (本人のみ): N」「同伴者: +M 名」「合計: N+M 名」を組み立て、予約埋まり具合チップとの整合を保つ。

## Risks / Trade-offs

- **R1: nickname 公開ポリシー認識のずれ** → プライバシーポリシー追記 + プロフィール nickname 行の補足表示でカバー。signup 時の privacy 同意 (#193 で導入済) に内包される運用とする
- **R2: SECURITY DEFINER 関数のセキュリティ事故 (`search_path` injection 等)** → `set search_path = public` を明示、関数本文では schema 修飾済みオブジェクト名のみ参照、`EXECUTE` を authenticated にのみ GRANT
- **R3: 高負荷イベントでの参加者数増加** → 当面 1 イベント 30〜40 人規模の想定。`reservations(event_id)` index が既存で十分機能する。Realtime ではなく on-demand 取得で負荷は抑制される
- **R4: nickname 変更直後の他参加者画面でのキャッシュずれ** → 画面遷移時に再フェッチで吸収。stale-while-revalidate 等の凝った戦略は導入しない (MVP1 純化)
- **R5: 退会者の表示** → 既存退会フローで `reservations.member_id` は NULL に SET される。RPC は `r.member_id IS NOT NULL` でフィルタし、退会済み参加者を表示集合から除外する。今後の退会フロー変更 (例: member_id を NULL にせず保持する方針への切替) があれば追従検討

## Migration Plan

1. `supabase/migrations/` に新規 SQL ファイル追加:
   - `get_event_participant_nicknames(uuid)` 関数定義 (SECURITY DEFINER + search_path 固定)
   - `GRANT EXECUTE ... TO authenticated`
   - ロールバック手順 (`-- ROLLBACK: drop function public.get_event_participant_nicknames(uuid);`) コメントを含む
2. dev Supabase に `pnpm db:push` で apply
3. アプリ側実装 (entities/event api + 参加者 widget + プロフィール / privacy 文言)
4. 翔太郎くん動作確認 (Render Preview)
5. prd 適用は本 PR merge 後、`supabase db push` を prd プロジェクトに対して別途実施

ロールバックは関数 DROP のみで完結する。データ破壊は無い。

## Open Questions

- 「参加メンバー」マスク表記の最終文言 → tasks フェーズで翔太郎くんに口頭確認 (「参加メンバー」「ニックネーム未設定」「メンバー」のいずれか)
- 画面遷移時の再フェッチ間隔 / 同一画面で開きっぱなしの間の更新有無 → 当面は遷移時のみ取得とし、必要があれば後続 change で追加検討
