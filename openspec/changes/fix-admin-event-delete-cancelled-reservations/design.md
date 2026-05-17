## Context

admin の `useEventDelete` は Supabase 経由で `DELETE FROM events WHERE id = ?` を叩き、PostgreSQL からの `23503` (FK 違反) を `RESERVATIONS_EXIST` として扱っている。FK 制約は `ON DELETE RESTRICT` のため、reservations 行が 1 件でも残ると削除がブロックされる。これは:

1. **キャンセル済 / no-show 行が残骸として残ると削除不能になる** という不整合（#253 のバグ）
2. **有効予約があると主催が削除できない** という運用上の不便（雨天中止等）

の 2 つを同時に引き起こしている。当初の RESTRICT は「うっかり削除防止」のつもりだったが、削除には既に AlertDialog 二段階確認が入っており、FK レベルの防御は過剰だった。

関連 spec: `admin-events-crud`（削除挙動）/ `data-schema`（reservations FK）。

## Goals / Non-Goals

**Goals:**
- UI 表示と削除挙動の不整合を解消する
- 主催者の権限で予約付きイベントを削除可能にする
- 削除前に予約内訳を可視化し、誤操作を防ぐ
- DB 整合性を維持（orphan な reservations を発生させない）

**Non-Goals:**
- 論理削除（soft delete）導入 — MVP2 で再設計
- 削除前のキャンセル通知メール自動送信 — Open Question として別 Issue 化候補
- 役所提出書類との関係見直し（identity_documents は users 紐付けで events と無関係）
- 予約状態（status 列挙値）の見直し

## Decisions

### FK 制約を `ON DELETE CASCADE` に変更

**選択肢比較:**

| 案 | 概要 | 採否 |
|---|---|---|
| A. アプリ層で reservations を先に DELETE → events を DELETE | 既存 FK 維持 / Supabase client では複数 DML を原子的に実行できない | ✗ |
| B. Postgres RPC (`SECURITY DEFINER`) で多段 DELETE | アトミック / FK 維持 / 機能は満たす | △ 過剰 |
| C. FK を `ON DELETE CASCADE` に変更 | DDL 1 行 / アプリ実装最小 / UI 側 AlertDialog が唯一の砦 | ✓ 採用 |

**採用理由（C）:**
- 削除には AlertDialog 二段階確認 + 件数表示が入る → UI レベルの防御で十分
- RPC は実装・テスト・運用（GRANT 管理）のコストが見合わない
- ロールバックは DDL 逆方向（`ON DELETE RESTRICT` に戻す）が常に可能

**採用しない理由:**
- A: Supabase client は単一トランザクションでの複数 DML を保証できない（RPC 必須）
- B: AlertDialog 二段階確認の上に DB 層防御を重ねるのはオーバーエンジニアリング

### 予約内訳の事前取得

AlertDialog を開く前 / 開いた直後に `select status, count(*) from reservations where event_id = $1 group by status` 相当のクエリを発火し、内訳を表示する。

- 取得失敗時は Skeleton から Error 状態に切替（削除ボタンは disabled）
- 取得中は Skeleton 表示
- 取得済み件数を主催者が確認 → 「削除する」押下 → DELETE

### 削除確定後の挙動

`DELETE FROM events WHERE id = $1` 一発で CASCADE により reservations も削除される。アプリ側は:

- Toast 内容を内訳に応じて分岐:
  - 予約 0 件: 「削除しました」
  - 予約あり: 「削除しました（N 件の予約も同時に整理されました）」
- `/events` に redirect

### キャンセル通知メールについて（Open Question）

本 Issue では送信しない方針で実装し、AlertDialog に「予約者には別途ご連絡ください」を明記する。自動送信が必要となった時点で別 Issue として切り出す。

## Risks / Trade-offs

- **誤削除のリスク増** → AlertDialog 二段階確認 + 件数明示で緩和。CASCADE への変更は「意図しない event 削除があった場合の被害が大きくなる」副作用があるため、二段階確認の UX は弱めない
- **キャンセル履歴が失われる** → 役所提出書類 (#172) との連携を必要とする場合は履歴アーカイブが必要。現時点ではスコープ外（#172 側で対応）
- **予約者への通知漏れ** → 主催者の運用負担として残る。Open Question として将来 Issue 化を検討
- **migration の rollback 容易性** → FK 制約変更は逆向き DDL で復元可能。#269 (DB バックアップ / rollback SQL 運用) のルール検証も兼ねる

## Migration Plan

1. forward migration `<timestamp>_change_reservations_event_fk_to_cascade.sql`:
   - `ALTER TABLE reservations DROP CONSTRAINT <既存 FK 名>;`
   - `ALTER TABLE reservations ADD CONSTRAINT <新 FK 名> FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;`
2. rollback SQL: 上記の逆順（CASCADE → RESTRICT に戻す）
3. アプリ側を新ダイアログ・新 deleteEvent 実装に切替（feature flag 不要）
4. dev → prd の順に `pnpm db:push`（#268 が整備されるまで翔太郎くん / レム手動）

ロールバック: アプリ revert → migration rollback SQL を手動実行。アプリだけ revert すれば FK CASCADE のままでも既存 deleteEvent は機能する（誤動作はしない）。

## Open Questions（決定済）

- **キャンセル通知メールの自動送信**: ✅ 別 Issue **#272** として切り出し済。本 Issue では送信せず、AlertDialog に「予約者には別途ご連絡ください」を明記する方針で確定
- **削除済 event の id を監査ログに残すか**: ✅ 本 Issue ではノータッチで進める。admin audit log は **#267 (Sentry / エラー監視)** または将来の audit log 専用 Issue で扱う
