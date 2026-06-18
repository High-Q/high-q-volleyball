## Context

予約サイト (`apps/reservation`) は満員イベントに対して「予約締切」と表示して CTA を無効化するのみで、会員が待機する手段が無い。`reservations.status` には既に `'waitlist'` が CHECK 制約・各種集計 view に組み込まれているが（#154 admin 管理用に先行整備済み）、行を生成する経路がアプリ全体に存在しない。本 change はその唯一の入口を会員側に設ける。

現状の制約・前提（実装確認済み）:

- `reservations` の INSERT ポリシー WITH CHECK は `member_id` の本人一致のみを検証し、`status` を制限していない。会員は自分の行に任意のステータスで INSERT できてしまう（管理者専用の `'attended'` 等を含む潜在ホール）。
- `reservations` の UPDATE ポリシー WITH CHECK は会員を `status ∈ {reserved, cancelled}` に限定している。このため「過去にキャンセル済みの同一イベント行」をキャンセル待ちへ再活性化する UPDATE は現状の会員権限では通らない。
- 既存の予約確認 Bottom Sheet は create / edit の 2 モード兼用。満員 CTA を持つイベント詳細ページは、当該会員自身の当該イベントへの予約状態を取得していない。
- 予約作成は Supabase クライアントからの直接 INSERT（RLS 防御）で行われ、`(event_id, member_id)` UNIQUE 違反時はキャンセル済み行を `'reserved'` に戻す再活性化パターンを既に持つ。

## Goals / Non-Goals

**Goals:**

- 満員イベント詳細から会員が `status='waitlist'` 行を作成できる導線を提供する。
- 会員が自分の行に設定してよいステータス集合を RLS で明示限定し、キャンセル待ちを許可しつつ管理者専用ステータスの自己設定を遮断する。
- 二重登録（既に reserved / waitlist 済み）を UI と DB 制約の両面で防ぐ。
- 過去キャンセル済み行が残るイベントへのキャンセル待ち登録を、行の再活性化で成立させる。
- 登録結果を画面内フィードバックで完結させる。

**Non-Goals:**

- 枠が空いた際の繰り上げ（promote）処理・通知。これは admin 側キャンセル待ち管理 (#154) の責務。
- キャンセル待ち登録完了メールの送信（Edge Function / メール文面には触れない）。
- 予約履歴画面のキャンセル待ちバッジ表示の変更（既存 `reservation-history-page` 仕様で対応済み）。
- `reservations` のテーブル列・スキーマ変更（既に `waitlist` は CHECK・view 整備済み）。

## Decisions

### D1: 会員が設定可能なステータス集合を RLS で明示限定する（migration）

会員が自分の行に設定してよいステータスを **`reserved` / `cancelled` / `waitlist` の 3 値**と定義し、INSERT・UPDATE 双方の WITH CHECK 句で強制する。

- INSERT: 本人一致 + `member_id IS NOT NULL`（退会経路保護は維持）に加え、`status ∈ {reserved, waitlist}` を会員に許可する（新規行で `cancelled` を直接作る意味は無いため除外）。管理者は従来どおり全ステータス可。これにより `'attended'` / `'no_show'` の会員自己 INSERT を遮断する。
- UPDATE: 会員の許可ステータスを `{reserved, cancelled, waitlist}` に拡張する。これにより「キャンセル済み行 → waitlist へ再活性化」「waitlist 行 → cancelled でキャンセル待ち辞退」が会員権限で成立する。`'attended'` / `'no_show'` への遷移は引き続き不可。

代替案: 現行ポリシーのまま（INSERT は status 無制限なので waitlist 行自体は作れる）。却下理由 — 過去キャンセル済み行の再活性化が UPDATE 制限で詰む、かつ `'attended'` 自己 INSERT ホールが残り参加実績偽装が可能。応急手当てではなく境界の明文化で根本対処する（CLAUDE.md Pillar 5）。

migration は新規テーブルではなくポリシー差し替えのため、`drop policy if exists` → `create policy` の冪等パターンで記述し、ロールバック手順コメントを付す。RLS 有効化は既存のまま（テーブル新設なし）。

### D2: 予約 Bottom Sheet に waitlist モードを追加（3 モード化）

既存 Sheet を create / edit に続く第 3 モード `waitlist` として再利用する。共有部分（同伴者数 stepper・二重送信防止・4 状態・a11y）を流用し、モード単位で以下を切り替える:

- kicker / 見出し / 説明文をキャンセル待ち向けに差し替える。
- 合計金額カードは **非表示**（この段階で支払いは確約されないため、金額提示は誤解を生む）。
- 確定 CTA ラベルをキャンセル待ち登録向けに差し替える。
- 確定経路を waitlist 用の作成処理に向ける。成功遷移は完了画面へは行かず、起動元のイベント詳細に留まりフィードバックを出す。
- localStorage 連動は持たない（create 専用の下書き保持とは独立）。

代替案: 専用 ConfirmDialog。却下理由 — 同伴者数スナップショット（admin 繰り上げ時に必要）を取れず、Issue の snapshot 要件から外れる。Sheet 再利用が DRY かつ既存パターンと一貫。

### D3: イベント詳細ページが当該会員の自己予約状態を取得する

CTA を「未登録 → キャンセル待ちに登録」「予約済み → 当該予約へ」「キャンセル待ち登録済み → 登録済み表示」に分岐させるため、詳細ページは当該会員の当該イベントに対する予約行（status を含む）を取得する。取得は RLS（自分の予約のみ）に加えアプリ層でも `member_id` と `event_id` を明示条件に含めて二重防衛とする。取得失敗時は CTA を安全側（満員なら従来の無効表示）に倒す。

### D4: waitlist 作成と再活性化を booking API に追加

既存の予約作成 API と対称な waitlist 作成関数を設ける。`(event_id, member_id)` UNIQUE 違反を捕捉した場合、既存行の状態で分岐する:

- 既存行が `cancelled`: その行を `waitlist` へ再活性化（同伴者数・連絡事項・電話スナップショットを更新、`cancelled_at` をクリア）。D1 の UPDATE 拡張により会員権限で成立する。
- 既存行が `reserved` または `waitlist`: 二重登録としてエラー通知（UI は「既に登録済み」案内）。

エラー分類は既存の `duplicate` / `rls` / `network` 体系を流用する。

### D5: 登録完了メールは送らない

`triggerReservationNotification` は呼ばない。価値の高い通知は「枠が空いた」繰り上げ時であり、それは #154 の責務。本 change の通知範囲は画面内フィードバックに限定する。

### D6: 登録後フィードバックは画面内で完結

確定成功で Sheet を閉じ、イベント詳細に留まったまま完了トーストを表示し、CTA を「キャンセル待ち登録済み」状態へ即時に切り替える（再 fetch に依存せず楽観的に反映し、整合のための状態更新を行う）。

### D7: テスト方針

`apps/reservation` は component test 中心（E2E 環境は #201 で別整備）。本 change の検証は component / unit test に寄せ、E2E ハッピーパスは最小 1 件に留める（CLAUDE.md / テスト戦略のスケーラビリティ運用）。RLS のステータス境界（会員による waitlist INSERT 可・attended INSERT 不可・cancelled→waitlist UPDATE 可・attended UPDATE 不可）は migration の検証クエリ + booking API の単体テストで担保する。

## Risks / Trade-offs

- [RLS ポリシー差し替えが既存の予約作成・キャンセル・編集の挙動を壊す] → INSERT は会員許可集合に `reserved` を含め、UPDATE は `reserved`/`cancelled` を維持したうえで `waitlist` を追加する差分に限定。既存 booking API のシナリオ（新規予約・再予約・キャンセル・編集）を component / API テストで回帰確認する。
- [本番 `reservations` に既存行があり、ポリシー強化で既存運用が阻害される] → 変更は WITH CHECK（新規書き込みの検証）のみで、既存行の読み取り・admin 操作には影響しない。USING 句の本人/admin 条件は不変。
- [会員が waitlist 行を作った後、当該イベントが満員でなくなった場合の整合] → 本 change のスコープは「登録の入口」。満員解消時の扱い・繰り上げは #154。会員は自分の waitlist 行を `cancelled` へ辞退でき、通常予約に進み直す導線は満員解消後の通常 CTA で担保される。
- [自己予約状態 fetch 追加による詳細ページの初期表示遅延] → イベント本体と並行取得し、CTA 領域のみ取得完了まで安全側（無効表示）にフォールバックして主要情報の描画は阻害しない。

## Migration Plan

1. `reservations` の INSERT / UPDATE ポリシーを差し替える migration を追加（`drop policy if exists` → `create policy`、`-- ROLLBACK:` コメント付き）。dev DB に適用し、ステータス境界の検証クエリで会員/admin 各ロールの可否を確認する。
2. アプリ層（自己予約状態 fetch・booking API の waitlist 作成/再活性化・Sheet の waitlist モード・詳細 CTA 分岐・フィードバック）を実装。
3. component / unit / API テストを追加し、既存予約フローの回帰を確認。
4. PR 作成 → ローカル動作確認 → merge で prd migration apply（承認ゲート経由）。

ロールバック: ポリシー migration は旧ポリシー定義（INSERT は status 無制限・UPDATE は reserved/cancelled）を再 create する逆 SQL を `-- ROLLBACK:` コメントに記す。

## Open Questions

なし（RLS 方針・登録 UI・メール要否はいずれもユーザー承認済み）。
