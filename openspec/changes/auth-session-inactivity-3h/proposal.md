## Why

admin 業務中に 15 分無操作で強制ログアウトされ、当日運営オペレーション (受付待機・参加者対応の合間) が頻繁に中断される。Issue #297 当初の採用方針 (Supabase Auth `inactivity_timeout`) は Pro プラン限定機能であり、memory `feedback_cost_zero_default` の費用ゼロ運用方針上、現時点では選択できない (2026-05-25 Dashboard 上で確認: "Inactivity timeout — Pro plan で変更可能")。

代替として、admin が既に持っている**クライアント側 `useIdleTimeout` の閾値を 15 分 → 3 時間に引き上げる**ことで、Free プランの制約下で Issue 趣旨「無操作 3 時間まで継続」を実現する。同時に admin-auth spec の「JWT 30 分」記述が実装 (`jwt_expiry = 3600` = 1 時間) と乖離している問題も解消する。

## What Changes

- admin クライアントの idle timeout を **15 分 → 3 時間** に延長する (`apps/admin/src/features/auth/composables/useIdleTimeout.ts` の `IDLE_LIMIT_MS` 定数変更)
- 既存の `useIdleTimeout` Vitest の時間定数を 3 時間 (10,800,000 ms) ベースに更新する
- admin-auth spec の「JWT 30 分 + idle timeout 15 分」要件を「JWT 1 時間 + クライアント側 idle timeout 3 時間」に書き換え、spec と実装の整合を取る
- Issue #297 当初の Supabase 側 `inactivity_timeout` 設定変更 (config.toml / Dashboard) は本 change の **scope に含めない** (Pro 昇格 trigger 達成時に別 Issue で対応)
- **BREAKING**: admin 運用者は 15 分から 3 時間に体感継続時間が延びる (セキュリティ的にはやや弱化、業務継続性は大幅改善)

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `admin-auth`: 「JWT 30 分 + idle timeout 15 分」要件を「JWT 1 時間 + クライアント側 idle timeout 3 時間」に変更する (spec / 実装の jwt_expiry 表記乖離も同時解消)

## Impact

- **admin コード**: `apps/admin/src/features/auth/composables/useIdleTimeout.ts` の `IDLE_LIMIT_MS` 定数変更 (`15 * 60 * 1000` → `3 * 60 * 60 * 1000`)、JSDoc 内の「15 分」「JWT 30 分」記述更新
- **テスト**: `useIdleTimeout.spec.ts` の時間定数を 3 時間ベースに置換 (リテラル `900_000` を `10_800_000` 等に)
- **エンドユーザー影響**: admin のみ (reservation / lp 側は idle timer 未実装で変更なし)
- **セキュリティ責務**: idle timeout が 15 分 → 3 時間に延びることで、admin オペレータが端末から離席して 15 分〜3 時間の間に物理アクセスされた場合のリスクが上がる。業務 PC の OS スクリーンセーバ (5〜10 分でロック) を併用する運用前提に切り替わる
- **Supabase Auth 設定**: 変更なし (`jwt_expiry = 3600`, `[auth.sessions]` 未設定のまま維持)。Pro プラン昇格時に `inactivity_timeout` をサーバ側へ移行する別 change を起こす想定
