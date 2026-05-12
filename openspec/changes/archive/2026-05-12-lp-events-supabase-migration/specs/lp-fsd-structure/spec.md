## ADDED Requirements

### Requirement: shared/api レイヤーが Supabase クライアントを提供する

`apps/lp/src/shared/api/` 配下に Supabase クライアントの単一エントリポイントを置かなければならない（MUST）。LP 内のすべての Supabase 接続は本エントリポイント経由でなければならず（SHALL）、`@supabase/supabase-js` の `createClient` を別の場所から直接呼んではならない（MUST NOT）。クライアントは `@high-q/shared` の `createSupabaseClient()` を内部で呼び出すラッパーとして実装し、env バリデーションを再実装してはならない（MUST NOT）。

#### Scenario: shared/api に Supabase クライアントが存在する

- **WHEN** 開発者が `apps/lp/src/shared/api/` を参照した場合
- **THEN** Supabase クライアントを提供するエントリポイントが存在し、`getSupabase()`（または同等の関数）が外部に公開されている

#### Scenario: createClient の直接呼び出しが存在しない

- **WHEN** `apps/lp/src/` 配下で `import { createClient } from '@supabase/supabase-js'` を grep
- **THEN** マッチが 0 件である（`@high-q/shared` 経由のみが許される）

#### Scenario: クライアントがアプリ起動を超えて単一インスタンスである

- **WHEN** LP の異なる entities / widgets から複数回 Supabase クライアントが要求される
- **THEN** 同一プロセス内では同一のクライアントインスタンスが返る（admin / reservation の `supabase.ts` と同パターン）
