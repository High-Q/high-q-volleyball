## Context

会員サイト (`apps/reservation`) はイベント一覧・詳細・本人確認書類アップロード・会員登録までが実装済み。イベント詳細画面の「予約に進む」CTA は現在「予約機能は準備中です」案内表示で停止しており、reservations テーブルへの実書き込み経路が存在しない。

DB 側は data-schema spec で reservations / events / venues / members の列定義・制約・トリガー・RLS が確定済みであり、本 change は新規列追加 / 新規ポリシーなしで成立する。design / RLS / Branded Types は既存資産を流用する方針。

ユーザージャーニー上、本 change で予約 1 件の最小サイクル (確認 → 完了 → キャンセル) が成立すれば Epic #170 の MVP1 後半が動き始める。

issue #148 のスコープ縮小に伴い独立した「予約フォーム入力画面」は持たず、確認画面に入力 UI を統合する設計を採る (Issue #159 の 3 画面化 + StepIndicator は MVP2)。キャンセル可否は MVP1 では `events.start_at > now()` のみで判定し、`events.cancel_deadline` の予約サイト側参照は MVP2 へ押し下げる。

## Goals / Non-Goals

**Goals:**

- 予約 1 件を成立させる最小フローを完結させる (確認 (入力統合) → 確定 → 完了 → キャンセル)
- 入力負担を最小化 (プロフィール由来の値は再入力させない)
- リロード・「修正する」での詳細戻りに耐える入力ローカル保持
- 既存 RLS / DB 制約のみで安全性を担保 (新規ポリシー追加なし)
- デザインサンプル (`ScreenRConfirm` / `ScreenRDone`) のレイアウト忠実再現に、`ScreenRForm` の入力 UI を確認画面に統合する形で再構成
- アクセシビリティ AA + 4 状態網羅
- component test で happy path とキャンセル境界 (start_at 前後) を検証

**Non-Goals:**

- 独立した予約フォーム入力画面 + StepIndicator (進捗バー) — Issue #159 (MVP2)
- メール通知 (送信・文言表示すべて) — MVP2 別 Issue
- カレンダー追加 (.ics) — MVP2 別 Issue
- `events.cancel_deadline` の予約サイト側参照 / 表示 — MVP2 別 Issue
- プロフィール画面 (#91) の予約履歴 + キャンセル動線
- キャンセル待ち (`waitlist`) — Issue #154
- 定員超過の楽観ロック — capacity を UI に出さないため不要
- キャンセルポリシー / 利用規約 同意チェックボックス — 規約未整備のため
- E2E (Playwright) 環境 — Issue #201

## Decisions

### D1. ルーティング構造

予約フローは独立ルート 1 つのみを新設する:

- `/events/:id/book/done?reservation=<id>` — 予約完了画面

予約確認 UI は **Bottom Sheet** として詳細画面 (`/events/:id`) の上に重ねる構成を採る。独立ルート (`/.../book/confirm` 等) は持たない。完了画面は `reservation` クエリで対象 reservations.id を受け取り、未指定 / 不一致なら一覧へリダイレクトする。

**代替案**:
- 入力 / 確認を別 URL に分離した独立ページ構成 → 詳細画面と確認画面でイベント情報が完全重複し UX 不整合 (翔太郎くん指摘で却下)
- インライン展開 (詳細画面下部にフォームが伸びる) → モバイル 390px first だと画面が縦長になりすぎる、スクロール位置の制御が難しい
- 完了画面のクエリに依存せず Pinia store に reservation を持つ → リロードで失われ、URL 共有もできないためクエリ採用

### D2. 入力ローカル保持

`localStorage` にイベント ID 単位でキー `hq:reservation-booking:<eventId>` で JSON 保存。保持内容は { guestCount, note, phone (optional), savedAt }。

完了到達 / 明示的離脱 / イベント開催終了時刻 (`events.end_at`) 超過で破棄。実装は新規 composable `useBookingDraft(eventId)` に閉じ込め、Page から直接 localStorage を触らない。

「修正する」CTA は `router.back()` 相当でイベント詳細へ戻る。再度「予約に進む」を押した際は localStorage から復元する。

**代替案**:
- Pinia store (memory) のみ → リロードで消えるため要件不適合
- IndexedDB → 過剰。localStorage で十分
- sessionStorage → タブ閉じで消えるが、リロード耐性は得られる。ただし「別タブで詳細を開いて戻ってきた」ケースは保持したい → localStorage 採用

### D3. 予約番号の表示形式

reservations.id (UUID v4) を `#HQ-XXXX-XXXX` (英数字 4 桁 × 2) に変換する純関数 `formatReservationNumber(id: ReservationId): string` を `entities/reservation/lib/` に置く。

UUID の hex 部分から 8 文字を取り出し、Crockford Base32 (I/L/O/U を除外) でエンコードして読みやすい英数字列にする方針。決定的かつ衝突確率は実用上問題ない (8 文字で約 1e12 通り)。

**代替案**:
- DB 列 `reservation_number` を追加 → 列追加 + トリガー or アプリ層生成 + UNIQUE 制約と複雑。MVP1 では UUID から計算可能で十分
- UUID 末尾 8 桁をそのまま使用 → ハイフン区切りや O/0 紛れの読みにくさを Base32 で吸収

### D4. キャンセル可否判定

`events.start_at` と現在時刻の比較のみで判定:

- `events.start_at > now()` → 可能
- `events.start_at <= now()` → 不可

判定は client side で行い、UPDATE 試行時の race を考慮するため SQL レイヤーでは既存 RLS (status='reserved' && member_id=auth.uid()) のみを依存する。開催時刻直前のレースで UPDATE が通った場合の扱いは MVP1 では「成功扱い」(救済方向の race) でよく、追加ガードは設けない。

`events.cancel_deadline` 列は本 change では参照しない。判定軸を 1 つ (start_at) に絞ることで、admin 側の cancel_deadline 運用整備 (events 作成 UI に cancel_deadline 入力欄を追加する別 Issue) を待たずに動く。

**代替案**:
- DB 関数 / トリガーで開催開始後 UPDATE を弾く → MVP1 では race の救済方向のため不要
- `cancel_deadline` を併用 → admin 側で cancel_deadline 入力 UI が無い (admin-events-crud spec 未対応) ため運用上 NULL のまま。判定軸として機能しない
- 「開催 1 時間前まで」等の固定オフセット → ハードコード値の根拠が無く運用ポリシーの議論が必要。MVP1 はシンプル化を優先

### D5. ConfirmDialog の実装

shadcn-vue の Dialog プリミティブを取り込んで `apps/reservation/src/shared/ui/Dialog.vue` として配置 (CLI で copy-paste、Tailwind preset utility 経由で着色)。focus trap・Escape 閉じ・role="alertdialog" を持たせる。

**代替案**: 自作 → a11y 担保が手間。shadcn-vue 採用が CLAUDE.md 方針 (機能系プリミティブ) に整合。

### D6. 二重送信防止

確認画面の「予約を確定する」CTA は処理中 ref `submitting` で disabled 化。INSERT 成功時のみ完了画面へ `router.replace` (push でなく replace) で遷移。これでブラウザ戻るで確認画面に戻れない。

UNIQUE 制約 (event_id, member_id) 違反時は Postgres エラーコード `23505` を捕捉し、UI に「既に予約済みです」表示。

### D7. feature 分割 (FSD)

`apps/reservation/src/features/booking/` に集約:

- `api/booking-client.ts` — Supabase 経由の INSERT / UPDATE
- `composables/useBookingDraft.ts` — localStorage 保持
- `composables/useCreateBooking.ts` — INSERT + エラーハンドリング
- `composables/useCancelBooking.ts` — UPDATE + キャンセル可否判定 (start_at 比較)
- `ui/BookingForm.vue` — 確認画面の入力ブロック (同伴者数 / 連絡事項 / 条件付き電話番号)
- `ui/BookingReadOnlyProfile.vue` — 氏名 / メール / 経験レベルの読み取り専用表示
- `ui/BookingTotalCard.vue` — 合計金額カード (黒背景)
- `ui/BookingDoneSummary.vue` — 完了画面の予約サマリ
- `ui/CancelBookingDialog.vue` — キャンセル ConfirmDialog
- `index.ts` — Public API

`entities/reservation/` に reservations の型 / Branded Types / 予約番号フォーマッタを置く。EventDetailPage の StickyCta は遷移先のみ書き換え。

### D8. 合計金額の計算

参加費は `events.fee` (NULL なら `venues.default_fee` を COALESCE) を使用。reservation-events-and-booking で既に詳細画面が `event_list_view` 経由で取得しているため、本 change ではその event 情報を再利用するだけ。

合計 = `fee × (1 + guestCount)`。表示は「FEE · 当日現金」kicker + 内訳「N 名 × ¥X,XXX」+ 合計を黒背景カードで強調 (デザインサンプル準拠)。同伴者数の変更で即時再描画する。

### D9. アクセシビリティ実装

- 入力欄は `shared/ui/FormField` でラップ (CLAUDE.md グローバル UI 規約準拠)
- 必須マークは `*` でなくラベルに「(必須)」追記
- 初期表示で赤枠を出さず、blur or submit 後にエラー表示
- ConfirmDialog は `role="alertdialog"` + `aria-labelledby` + focus trap

### D11. 予約確認の Bottom Sheet 化

詳細画面と確認画面でイベント情報が完全重複する UX 不整合を解消するため、予約確認 UI を **Bottom Sheet** として再構成した。

設計のポイント:

- **背後の詳細画面のコンテキストを維持** — sheet が画面下部から立ち上がり、背後にイベント情報が透ける。ユーザーは「何を予約しているか」を常に視認できるため、sheet 内でイベント情報を再描画する必要がなくなる
- **遷移ゼロ・URL 不変** — `/.../book/confirm` のような独立ルートは持たない。sheet open / close は EventDetailPage 内の ref state で制御、ブラウザ履歴は汚染しない
- **「戻る」 = sheet 閉じる** — ブラウザ戻るボタンとの混乱がない。Escape キー / 背景クリックでも閉じられる (radix-vue 標準)
- **モバイル 390px first** — sheet の最大高さは画面の 90%、内部スクロール許容。640px 以上は中央寄せ・最大幅 32rem
- **Drawer 系プリミティブを新規取り込み** — `shared/ui/Sheet` 系 (Sheet / SheetContent / SheetTitle / SheetDescription) を radix-vue `DialogRoot` ベースで自前ラップ。admin 側 Dialog (中央モーダル) と意味論を分離する

**代替案**:

- インライン展開 (Progressive Disclosure) → 縦長スクロールが伸びる、CTA がスクロール下に隠れて見つけづらい、戻る操作の意味が不明瞭
- 2 画面維持 → 翔太郎くんから「情報重複で UX 違和感」指摘
- Optimistic + Undo (タップで即予約 → トーストで取り消し) → 同伴者数・連絡事項の入力場所がなく機能要件不足

**Sheet 内に表示しない要素 (重要)**:

- 詳細画面に既にある: DATE & TIME / VENUE / MEETING POINT / FEE / イベント名
- 自己プロフィール: 氏名 / メール / 電話番号 / 経験レベル
- 編集可能な電話番号入力欄

つまり sheet 内は「同伴者数 + 連絡事項 + 合計金額 + 戻る/確定 CTA」のみに純化する。これが Bottom Sheet 採用の最大の利点。

### D10. テスト戦略

component test (Vitest + @vue/test-utils) を中心に以下を検証:

1. BookingForm: phone 表示分岐 / バリデーション / ローカル保持
2. BookingTotalCard: 合計金額計算
3. BookingConfirmPage: 修正 CTA で値保持 / 確定処理中の disabled / 重複予約エラー
4. BookingDonePage: 予約番号フォーマット / map_url 条件表示 / メール文言不在
5. CancelBookingDialog: start_at 前後の分岐 / RLS エラー表示
6. useBookingDraft: 復元 / 自動破棄 / イベント別独立
7. useCancelBooking: start_at > now() / start_at <= now() / cancel_deadline 無視
8. formatReservationNumber: 決定性 / 衝突確認 (簡易ハッシュテスト)

E2E は #201 で 1 件 (booking happy path) を追加予定。

## Risks / Trade-offs

- **localStorage の prune 不足** → イベント終了時刻超過の自動破棄ロジックが古い保持データを残し続けるリスク → 起動時 (`useBookingDraft` mount) に該当キーを scan し past-event なら破棄する初期化処理を入れる
- **start_at 直前の race** → 開催直前にユーザーがキャンセル成功するケースが救済方向であることをスペックで明示し、UI 側のみで判定して DB 側にはガードを追加しない
- **予約番号の衝突** → Base32 8 文字で 1e12 通り。MVP1 規模 (年間数千件) では実用上ゼロ。万一同一表示が出ても DB 上は UUID で一意のため業務影響なし
- **shadcn-vue Dialog 取り込みの新規依存** → CLAUDE.md 方針に整合。`@high-q/admin` 側は既に shadcn-vue 利用実績あり、reservation 側でも Input/Label/FormField が既に取り込まれている延長線
- **キャンセル可否を start_at 単独判定にする運用上の弱さ** → 「開催 30 分前にドタキャンされて空席埋まらない」リスクは admin 側の cancel_deadline 運用整備 (別 Issue) で解消する。MVP1 では「会員側で開催前ならいつでもキャンセル可」を許容する運用前提で進める
- **入力 UI と確認 UI の混在によるユーザー混乱** → 「入力欄」と「読み取り専用の確認情報 (氏名・メール)」をセクションで明確に分離し、合計金額は入力欄の下に常時可視で配置することで「これが最終値」と認識させる

## Migration Plan

DB 変更なし。デプロイは通常の CI / CD のみで完結。ロールバック時はコード revert で完全に復旧可能 (DB スキーマ・RLS 不変)。

既存の reservations テーブルは現状空のためデータ移行も不要。

## Open Questions

- 予約番号の表示形式 (`#HQ-XXXX-XXXX`) は Crockford Base32 (I/L/O/U を除外) で確定済 (翔太郎くん承認方針)
- `events.cancel_deadline` の admin 運用 + 予約サイト側での再導入は別 Issue (MVP2) として archive 後に切り出す
