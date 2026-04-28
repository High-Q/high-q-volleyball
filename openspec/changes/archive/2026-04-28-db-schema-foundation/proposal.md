## Why

既存の初期スキーマ (events / members / reservations) は LP のカレンダー表示しか想定していなかった。MVP1 で着手する admin (#84-#87, #171) と reservation (#89-#92, #148, #91) のフィーチャー群が要求する以下を満たす土台が欠けている:

- 会場マスタ (#86 イベント作成時に select で選択する)
- 本人確認書類 (#92 アップロード / #171 admin 承認 — 参加者の安全 + 役所への団体登録の証憑)
- 会員プロフィール拡張 (生年月日 / 経験レベル / 同伴者人数 / 電話番号)
- 公開ステータス区別 (公開 / 下書き / 限定公開)

また、マイナンバーカードの取り扱い方針を見直す。既存 spec は "収集禁止" だが、ユーザー要件は "個人番号 12 桁を完全マスクした画像なら受付" である (参加者本人確認書類の選択肢拡張)。

## What Changes

- **新テーブル `venues`**: 会場マスタ (events から FK で参照)
- **新テーブル `identity_documents`**: 本人確認書類のメタデータ (画像本体は Supabase Storage)
- **events 拡張**: `venue_id` (NOT NULL FK to venues — 本番 DB は空のため `location` 列を DROP して一本化), `fee` (参加費), `visibility` (公開 / 下書き / 限定公開), `cancel_deadline` (任意)
- **members 拡張**: `birthday` (生年月日 NOT NULL), `phone` (任意), `experience_level` (enum: beginner / intermediate / experienced)
- **reservations 拡張**: `guest_count` (同伴者数), `phone_at_booking` (当日連絡用スナップショット), `checked_in_at` (チェックイン), `cancelled_at` (キャンセル日時)
- **RLS ポリシー**: venues (公開 SELECT, admin のみ INSERT/UPDATE/DELETE) / identity_documents (自分のみ INSERT/SELECT/DELETE, admin は全件 SELECT/UPDATE)
- **Storage バケット `identity-documents`**: プライベート, RLS と整合
- **マイナンバー取扱方針更新 (BREAKING)**: 既存の "マイナンバーカード収集禁止" 方針を "個人番号マスク済み画像のみ受付" に変更。`docs/06-品質・セキュリティ/` 配下にマスク漏れ削除 SOP を追加 (実装は #92 / #171 の Apply で参照)
- **seed データ**: 主要 5 会場 (亀戸スポーツセンター / 東砂スポーツセンター / 深川スポーツセンター / 深川北スポーツセンター / 有明会場 ※ 学校名は秘匿し駅住所のみ保管)
- **Branded Types 拡張**: `VenueId` / `IdentityDocumentId` を追加

## Capabilities

### New Capabilities
- なし (既存 capability の拡張で完結)

### Modified Capabilities
- `data-schema`: events / members / reservations の列追加, venues / identity_documents テーブル追加, マイナンバー要件の修正
- `rls-policies`: venues / identity_documents のポリシー追加

## Impact

- **DB**: 新 migration 1 本 (`supabase/migrations/<timestamp>_db_schema_foundation.sql`) で 5 テーブル変更 (新 2 + 拡張 3)
- **Storage**: 新バケット `identity-documents` (プライベート)
- **packages/shared/src/api/**: 新エンティティ型 `Venue` / `IdentityDocument` + Branded Types
- **packages/shared/src/api/supabase.ts**: 既存 client は変更なし
- **下流 Issue (依存解消)**: #84 / #85 / #86 / #87 / #89 / #90 / #91 / #92 / #148 / #171 が本 change の完了を前提として開始可能になる
- **docs**:
  - `openspec/project.md` "マイナンバーカードは受け付けない" 記述を更新
  - `docs/06-品質・セキュリティ/` にマスク漏れ画像削除 SOP 追加
  - `docs/04-システム設計/01-DB設計/01-論理設計/論理設計.md` を更新
- **CLAUDE.md**: マイナンバー関連のセキュリティルール記述を最新化 (個人番号テキスト保管禁止は維持, マスク済み画像は許可と明示)
