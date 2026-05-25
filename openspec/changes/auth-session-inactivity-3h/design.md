## Context

Issue #297 の当初採用方針 (案 A) は Supabase Auth `[auth.sessions].inactivity_timeout = "3h"` をサーバ側で有効化することだったが、Apply 着手時の dev Dashboard 検証で「**Inactivity timeout は Supabase Pro プラン限定**機能」であることが判明した (2026-05-25)。memory `feedback_cost_zero_default` 「課金昇格は trigger 達成時のみ、費用ゼロ運用が基本」より、本 Issue 単独で Pro 昇格を行うことはできない。

しかし admin の業務継続性問題 (15 分無操作で強制ログアウト → 受付待機・運営合間で頻繁に中断) は依然として解決が必要。本 change は **Free プラン制約下で Issue 趣旨を最短達成する代替案 (案 B)** を採用する: 既存の admin クライアント側 `useIdleTimeout` composable の閾値を 15 分から 3 時間に延長する。

同時に `openspec/specs/admin-auth/spec.md` の「JWT 30 分 + idle timeout 15 分」記述が実装 (`jwt_expiry = 3600` = 1 時間) と乖離している問題も整合する。

## Goals / Non-Goals

**Goals:**
- admin の当日運営オペレーションが業務中に強制ログアウトで中断されない (3 時間まで継続)
- Free プラン制約下で Issue #297 趣旨「無操作 3 時間まで継続」を実現
- admin-auth spec の「JWT 30 分」記述を実装に合わせて 1 時間に修正、spec / 実装の乖離を解消
- 将来の Pro プラン昇格時にサーバ側 inactivity_timeout に移行できる経路を設計上残す

**Non-Goals:**
- Supabase Auth サーバ側設定の変更 (`jwt_expiry` / `[auth.sessions]` は触らない)
- Supabase Pro プランへの昇格提案
- reservation 会員側へのクライアント idle timer 追加実装
- MFA / TOTP まわりの挙動変更
- `timebox` (絶対的セッション上限) の導入

## Decisions

### Decision 1: クライアント側 useIdleTimeout の閾値を 3 時間に変更する

**選択肢:**
- (A) Supabase Auth `inactivity_timeout = "3h"` をサーバ側で一本化 ← **Pro 限定で却下**
- (B) クライアント `useIdleTimeout` の `IDLE_LIMIT_MS` を `15 * 60 * 1000` → `3 * 60 * 60 * 1000` に変更 ← **採用**
- (C) `jwt_expiry` を 1 時間 → 3 時間に延長
- (D) 本 change を撤回し、現状 15 分を維持

**判断理由:**
- 案 A は Pro プラン限定機能で Free プランでは選択不可
- 案 C は access token の生存期間を伸ばすだけで、refresh token rotation 有効下では事実上永続セッション化する。Issue 趣旨「3 時間で auto signOut」を達成しないどころか、access token 漏洩窓口を 1 時間 → 3 時間に拡大するためセキュリティ純減
- 案 D は業務継続性を諦める選択肢で、Issue 起票動機に反する
- 案 B は既存の useIdleTimeout 仕組みをそのまま流用し、定数 1 行変更で Issue 趣旨を達成可能。テスト構造も変えずに数値だけ更新できる
- セキュリティ評価: クライアント側 timer は JS 停止タブや古い token 使い回しには弱いが、admin オペレータが操作する前提の脅威モデル下では実用上の劣化は限定的

### Decision 2: Supabase Auth サーバ側設定は触らない (Pro 昇格時に別 change)

**選択肢:**
- (A) `supabase/config.toml` の `[auth.sessions]` 編集を残す (将来の declarative source として) ← **不採用**
- (B) Supabase Auth 設定は本 change で一切触らない ← **採用**

**判断理由:**
- declarative source として記述 (案 A) しても、Free プランでは dev / prd どちらにも反映できず、リポジトリ上に「未反映の設定」が存在する状態は読み手を混乱させる
- 本 change は完全にクライアント側完結とし、Supabase 設定変更が必要になる Pro 昇格時に別 change で `config.toml` 修正と Dashboard 同期をセットで行うほうが、Pro 昇格 trigger 達成時の作業境界が明確になる
- Apply 中に試した `config.toml` 編集は restore で巻き戻し済み

### Decision 3: admin-auth spec の JWT 表記を 1 時間に MODIFIED で揃える

**選択肢:**
- (A) 同 change で MODIFIED し、JWT 1 時間 + クライアント側 idle 3 時間に書き換える ← **採用**
- (B) 今回 scope を idle timeout 値変更のみとし、JWT 表記乖離は別 Issue で対応

**判断理由:**
- 今回まさにセッション継続ポリシーを定義する Requirement を触る = 全文書き直すタイミングであり、同じ Requirement を 2 回 MODIFIED するより 1 回でまとめるほうが change history が読みやすい
- 別 Issue 化すると Solo dev では放置されがちで、spec / 実装乖離が長期化する

### Decision 4: 案 A の試行コミットは残さず restore で消す

**選択肢:**
- (A) 案 A 着手時の編集 (useIdleTimeout 削除 / config.toml `[auth.sessions]` 追記) を `git restore` で完全に消し、案 B 用の純粋な差分だけをコミットする ← **採用**
- (B) 案 A 着手分を含めてコミット履歴に残し、reverse commit を追加する

**判断理由:**
- まだコミットしていない作業ディレクトリ上の試行なので `git restore` で消すのが最短
- PR 履歴を「案 B の本質的な差分のみ」に絞ることでレビュー容易性が上がる
- 案 A → 案 B の判断経緯は本 design.md (Decision 1) に文書として残るため、コミット履歴で再現する必要はない

## Risks / Trade-offs

- **[3 時間放置中に PC が物理アクセスされると session が active のまま]** → admin 運用者は OS スクリーンセーバ (5〜10 分でロック) を設定する運用前提に切り替える。本 change の完了報告で言及するに留め、別途運用 SOP 化は scope 外
- **[JS が止まっている (タブ非アクティブ / ブラウザ minimize) と timer が走らない可能性]** → 操作再開時に signOut が呼ばれれば実用上問題なし。重要なのは「アクティブ操作中は切れない」「操作なしで 3h 経過後に最終的に signOut される」の 2 点で、両方とも既存テスト構造でカバーされる
- **[クライアント側 idle timer は古い token 使い回しに対する防御にならない]** → これは元々の admin-auth 設計 (案 A 前の状態) と同等。本 change で防御モデルを下げているわけではなく、案 A 移行を Pro 昇格時まで延期する判断
- **[Pro 昇格後にサーバ側 inactivity_timeout へ移行する際の重複]** → その時点でクライアント側 useIdleTimeout を削除する change を起こす。本 change の `useIdleTimeout` 実装は変えずに値だけ変えるので、将来削除時の差分が小さく保たれる

## Migration Plan

1. dev / prd の Supabase Auth 設定は**触らない** (Free プラン制約により案 A は採用不可)
2. admin クライアント: `useIdleTimeout.ts` の `IDLE_LIMIT_MS` 定数を `3 * 60 * 60 * 1000` に変更、JSDoc コメントの「15 分」「JWT 30 分」記述を「3 時間」「JWT 1 時間」に更新
3. `useIdleTimeout.spec.ts` の時間定数 (`900_000` 等のリテラル) を 3 時間ベース (`10_800_000`) に更新
4. Vitest / build 通過確認 → PR 作成 → Render PR Preview で admin の通常ログイン動線確認 (3h 経過後の動作は実機長時間放置になるため、対象外)
5. 翔太郎くん承認 → `/opsx:sync` → `/opsx:archive` → push → merge

**Rollback 戦略:**
- 仮に「3 時間設定が原因で session 周りで不具合発生」となった場合: `git revert` で 1 コミット戻すだけで 15 分に復元 (TDD で書かれたテストごと復活)
- 別系統での復旧手段は不要 (クライアント側完結変更のため、Supabase 設定や DB migration を巻き込まない)

## Open Questions

- なし (Pro 昇格時のサーバ側移行は別 change で対応する前提で本 change の scope を確定済み)
