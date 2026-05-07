## Context

会員サイトのホーム (`/events`) は #90 (`reservation-events-and-booking`) で「ログイン後の到達先 = upcoming events 一覧」として整備された。一覧画面は EventCard を縦に並べる構造で、Loading/Empty/Error/Success の 4 状態を持つ。

その後 #91 (history) / #213 (reservation detail) で「自分の予約」周辺機能が積み上がり、次の予定を引き当てる動線は 3 タップ (ホーム → 履歴タブ → 予約行 → 予約詳細) を要する状態になっている。本 change はこのリピート動線を **ホーム最上部の 1 タップ (NEXT カード)** に短縮することを狙う。

参照デザインは `docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx` 内の `ScreenRHomeV2`。NEXT カードのレイアウト・カウントダウン表記・予約番号フッタ等は既存の `ReservationDetailPage` の Dark Fact Card と類似する。

## Goals / Non-Goals

**Goals:**

- リピート会員が「次の予定」をホーム到達 1 タップ以内で確認できる状態を作る
- 予約済みイベントとそうでないイベントを **視覚的に明確に分離** し、ホームの情報優先度を「自分の予約 > 他の探索対象」に揃える
- ホーム画面のレイアウト変更によって既存の URL / ルート / 認証ガードを破壊しない
- 既存コンポーネント (`DarkFactCard` / `EventCard` / `formatCountdownLabel` / `formatReservationNumber` / `resolveMemberDisplayName`) と format ヘルパを最大限再利用し、新規実装の表面積を最小化する

**Non-Goals:**

- 「他のイベント」の truncate 表示と「すべて ›」リンクは見送り (MVP1 開催頻度では不要)。将来 Issue で再検討する
- 「他のイベント」行のバッジ表示 (満員 / 初心者 / 残席数) は MVP1 スコープオフ済み (`admin-events-crud` spec L30: 定員 / 紹介文 / サムネイル / キャンセル期限 / 公開設定は INSERT 時 NULL のまま) のため対応しない
- アバター押下先の `/profile` 自体の改修は本 change 外 (既存画面に遷移するだけ)
- Bottom Tab Bar の構造変更は本 change 外
- E2E (Playwright) でのホーム検証は #201 に押し下げる (本 change は component test で代替する)
- イベント詳細画面 / 予約詳細画面 / 履歴画面のレイアウト変更は本 change 外

## Decisions

### NEXT カードのデータ取得は専用 composable に切り出す

ホームは「自分の最早未来予約 1 件」と「他のイベント (= upcoming events から NEXT のイベントを除外)」の **2 系統のデータ** を組み合わせる。

採用案: `useUpcomingEvents` (既存) はそのまま流用し、新規に「自分の最早未来予約 1 件」を返す composable を `features/event-listing` 配下に追加する。NEXT 対象のイベントを「他のイベント」リストから除外するフィルタは、ホームページコンポーネント側で `computed` として組み立てる。

代替案: 単一の composable で両方を返す。→ 2 系統の loading / error 状態管理が複雑化し、片方だけ失敗したときの UI 表現が困難になるため見送り。

### NEXT カードの取得元は既存の自分の予約取得 API を再利用する

`entities/reservation/api/myReservations.ts` の `fetchMyReservations` は自分の全予約 (status / 過去含む) を取得する。NEXT カード用に新規 API を切ることはせず、本関数の戻りに対し以下のフィルタを composable 内で適用する:

1. `status === 'reserved'` (キャンセル / 参加済 / no_show を除外)
2. `event.startAt > now()` (過去開催を除外)
3. `event.startAt` 昇順で先頭 1 件

理由: 履歴画面と予約一覧で同じ取得関数を使うことで、RLS 適用範囲とエラーハンドリングの実装パスを 1 系統に保つ。NEXT 専用クエリを切ると `member_id = auth.uid()` 条件 / `events JOIN` / `venues JOIN` の重複コードが増える。

将来的に予約数がスケールしたら最早 1 件だけを引く専用クエリ (LIMIT 1 + filter on server) に最適化する余地があるが、MVP1 の予約件数 (会員 1 人あたり数件) では性能的には不要。

### NEXT カードの押下先は `/reservations/:reservationId`

会員視点のあるべき UX は「予約済みのイベントを押したら予約自体の詳細 (予約番号 / 同伴者数 / キャンセル動線) が見える」状態。Issue 本文の `/events/:id` 指定は機械的な記述で、実際のユーザー意図と噛み合わない。本 change では NEXT カード全体を予約詳細画面 (`reservation-detail-page` capability) のリンクとして扱う。

「他のイベント」行は引き続きイベント詳細画面 (`/events/:id`) に飛ぶ (こちらは未予約イベントの探索動線のため、予約 CTA がある画面に向かうのが正しい)。

### NEXT カード UI は新規ウィジェットとして切り出す

採用案: `widgets/home-next-card/` を新設し、`DarkFactCard` の見た目を踏襲しつつホーム文脈に必要な要素 (NEXT 円形バッジ / 予約番号フッタ / 「詳細を見る →」アフォーダンス) を追加する。

代替案: 既存 `DarkFactCard` を拡張する。→ 予約詳細画面 (`ReservationDetailPage`) の Dark Fact Card は「日付・時間・会場名」までしか持たず、NEXT カードは予約番号フッタや詳細導線まで含むため、責務が異なる。コンポーネントを分離して、各々が単一責務に留まるほうが将来の改修時に副作用が出にくい。

ただし内部のカウントダウン文字列生成 (`formatCountdownLabel`) と JST 日付フォーマットは共通ユーティリティを再利用する。

### ホームヘッダ (アバター付き) は新規ウィジェットとして切り出す

採用案: `widgets/home-header/` を新設。左にロゴ + サブテキスト、右に円形アバター。

代替案: 既存の `widgets/profile-header` を流用する。→ プロフィール画面のヘッダは「氏名 + メール + short id」を主軸としており、ホームヘッダの「ロゴ + アバター」とはレイアウトが異なる。流用は無理筋なので新規切り出し。

円形アバターのスタイルはプロフィールヘッダ (`bg-accent-soft text-accent` 円形) を踏襲し、サイズだけホームヘッダ用に縮小する。

左ロゴは押下不可の静的テキストとし、ホームへの自己リンクは設けない (ホーム画面専用ヘッダのため、押下動機が存在しない)。

### 「他のイベント」行は既存 `EventCard` を流用するか新行コンポーネントを作るか

採用案: 新行コンポーネント `widgets/home-event-row/` (または `features/event-listing/ui/EventRow.vue`) を追加する。デザインサンプルの「日付ブロック | イベント名 + 時刻 + 参加費 | (将来バッジ)」横並びレイアウトは、既存 `EventCard` (縦積み・カード型) と異なる。

代替案 1: 既存 `EventCard` を流用 (同一情報量だがレイアウトだけ違う)。→ デザインサンプルとの乖離が大きく、ホームの「NEXT を主役、他は脇役」という情報優先度演出が弱くなる。
代替案 2: 既存 `EventCard` をオプションで横並びレイアウトに切り替える。→ プロップ責務が増え、再利用箇所のテストも肥大化する。

新行コンポーネントは `EventListItem` 型をそのまま受け取り、内部で日付・時刻・参加費フォーマット (既存 `format-date.ts`) を呼ぶ。`router-link` で `/events/:id` に飛ぶ。

### パンくず非表示はルータ / ガード変更ではなくホームページの DOM レベルで実現

採用案: ホームページコンポーネント (`EventsListPage.vue`) から `<PageBreadcrumb>` の呼び出しを削除する。`PageBreadcrumb` 自体やレイアウト共通ラッパには変更を入れない。

代替案: ルータの `meta` に `hideBreadcrumb: true` を立て、共通レイアウトで分岐する。→ 現状ホーム以外のすべての画面がパンくずを描画しており、共通レイアウト分岐を導入する利得はない。「ホームだけ呼ばない」で十分。

`reservation-events-and-booking` の現行 spec はパンくず構造として「イベント一覧画面: マイページ > イベント」を要件化していたため、本 change の specs delta で当該記述を「ホーム画面: パンくずなし」に修正する。

### 「他のイベント」の全件表示

採用案: truncate なし、開催日昇順で全件描画。

代替案: デザインサンプル準拠で 4 件 truncate + 「すべて ›」リンク。→ MVP1 の開催頻度 (週 1) では upcoming は常時 1〜4 件想定で、truncate はほぼ発火しない。「すべて」リンクの遷移先を別画面として作るとコストが増え、将来再検討する余地を残す方針で見送り。

スクロール量が増えた場合の UI 影響は許容する。Bottom Tab Bar は固定配置のため、リスト末尾に到達すれば履歴・プロフィール導線にすぐアクセスできる。

## Risks / Trade-offs

- **既存 `/events` ルートの体験が大きく変わる** → 既存ユーザーのブックマークは維持されるが、UI が一変する。リリース時に「ホーム画面が新しくなった」旨を `apps/reservation` 内のリリースノート的なお知らせで触れる余地を残す (本 change 外、運用判断)
- **NEXT カード描画のために `fetchMyReservations` を再フィルタするオーバーヘッド** → 自分の予約全件を JS でフィルタする。MVP1 の会員 1 人あたり予約件数 (年間 ≤ 50) では無視できる。スケール時は専用クエリへ切り替え可能
- **アバター押下先 `/profile` と Bottom Tab Bar の「プロフィール」が同じ動線で重複** → Issue で「併存」と判断済み。スマホで右上アクセスは指の移動量が短く、Bottom Tab とは利用シーンが異なる (片手操作 / 両手操作) ため、UX 上の冗長性は許容する
- **NEXT カードの「最早 1 件」判定がクライアント時刻に依存** → タイムゾーンずれや端末時刻ずれの影響を受けるが、`event.start_at` を JST/UTC ISO 文字列で扱う既存規約に従えば破綻しない。判定境界 (start_at とちょうど一致) は「未来扱いしない (= 開催開始時点で NEXT から外れる)」で統一する
- **「他のイベント」が空になる稀ケース** → 予約済みイベントのみがあり upcoming が他にないシナリオ。NEXT カードのみ描画して空セクションは出さない、で扱う
