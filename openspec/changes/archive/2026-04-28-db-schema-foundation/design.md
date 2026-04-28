## Context

LP (events のカレンダー閲覧のみ) を想定した既存の初期スキーマでは、admin / reservation の MVP1 機能群 (#84-#91, #92, #148, #171) を実装できない。具体的に欠けているのは:

- **会場マスタ** (#86 イベント作成時に master select)
- **本人確認書類** (#92 / #171 — 参加者の安全 + 役所への団体登録の証憑として MVP1 必須)
- **会員プロフィール拡張** (生年月日 / 経験レベル / 同伴者数 / 電話番号 / 公開ステータス)

加えて、マイナンバーカード取扱方針を「収集禁止」から「個人番号マスク済み画像のみ受付」に変更する必要がある (翔太郎くん要件: 参加可能な本人確認書類の選択肢を広げる)。

下流 10 Issue (#84-#92, #148, #171) は本 change 完了を待っている。

## Goals / Non-Goals

**Goals:**
- 1 本の SQL Migration で 5 テーブル (events / members / reservations / venues / identity_documents) を整合のある状態に揃える
- RLS を 5 テーブル全件 + Storage バケットに適用し、未認証 / 他者アクセスを完全遮断する
- マイナンバー方針の運用設計 (マスク UX + admin レビュー + 削除 SOP) を文書化し、CLAUDE.md / project.md と整合させる
- TypeScript Branded Types で 5 種類の識別子を表現し、生 string の混入をビルド時に検出する
- 主要 4 会場の seed を投入して、admin が venue を新規作成しなくても #86 を着手できる状態にする

**Non-Goals:**
- 本 change 内では UI を実装しない (アップロード画面 / レビュー画面は #92 / #171 の Apply で実装)
- 役所提出用 ZIP 一括ダウンロード (#172) は MVP2 のため対象外
- 既存 LP の AWS DynamoDB → Supabase 移行は対象外 (LP 刷新 #160 で別途扱う)
- payments / billing 関連テーブルは対象外 (現状 fee は events 列のみで完結)

## Decisions

### D1. テーブル命名は既存に揃える (members / reservations を維持)

#147 Issue body は users / bookings という命名を提案していたが、既存 spec / migration は members / reservations で確立済み。リネームは関連 RLS / トリガー / TS 型 / その他コードに広範な変更を強い、便益が薄い。

**結論**: members / reservations を維持。Issue body はリネーム提案を撤回し、列追加で要件を満たす。

### D2. events テーブル: visibility と status を別列に分離

Design サンプル ([docs/10-デザインサンプル/admin/hq-admin-screens.jsx](../../../docs/10-デザインサンプル/admin/hq-admin-screens.jsx)) では「公開中 / 下書き / 終了」のような混在ステータスがあり、これを 1 列で表現すると「公開済みだが中止」「下書きだが過去日付」のような状態が表現できない。

**結論**: `visibility` (draft / published / private) と既存 `status` (scheduled / cancelled / closed) を独立させる。

**代替案 (却下)**: 1 列に詰める案 → 状態爆発 + 後方互換崩壊リスク。

### D3. events.location 列は DROP、venue_id を NOT NULL で追加

既存 events.location は free text 列だが、本番 DB にはまだ何の行も入っていない (LP は AWS DynamoDB 経由で events を扱っており、Supabase 側 events テーブルは未使用)。互換用に NULL 許可で残す価値がない。

**結論**: events から `location` 列を DROP し、`venue_id` を NOT NULL FK で追加。新規作成時は必ず venues マスタから選択する運用で確定。

**代替案 (却下)**: location を NULL 許可で残置 → 将来の運用ミスで venue_id NULL の行が混入するリスクが残る。空の今こそ厳しく縛る方が安全。

### D4. members 拡張: birthday 必須・experience_level enum・phone optional

会員登録フォーム (#89) で生年月日は必須入力。経験レベル (beginner/intermediate/experienced) は当日のチーム分け運用に直結するため必須。電話番号は当日連絡用で任意。

**結論**: birthday NOT NULL / experience_level NOT NULL DEFAULT 'beginner' / phone NULL。

**サインアップトリガーとの両立**: `on_auth_user_created` は auth.users 作成時に発火するが、その時点では birthday / display_name は不明。トリガーは placeholder (`birthday = current_date`, `display_name = ''`) で先に行を作り、登録フォーム送信時に UPDATE で正式値を入れる二段階方式とする。アプリ側で空 display_name のユーザーは「登録未完了」として扱い、登録完了画面に誘導する。

### D5. reservations 拡張: status enum に waitlist 追加

#154 (キャンセル待ち) は MVP2 だが、enum を後から拡張すると既存 RLS / アプリのバリデーションを再修正することになる。今のうちに enum に含めて将来のリスクを潰す。

**結論**: status に `'waitlist'` を含めて enum を 5 値で確定。

### D6. identity_documents: enum 値は英語 snake_case + 通知カード明示禁止

UI 表示は日本語ローカライズ層 (#92 アップロード画面) で対応。DB enum は安定文字列にする。マイナンバー通知カードは法的に本人確認書類として認められないため、CHECK 制約で明示的に存在しない値を選ぶ運用 (10 種類のみ許容)。

**結論**: 10 種類の英語 snake_case enum。`my_number_card_masked` だけ受付、`my_number_notification_card` は enum 値自体に存在しない。

### D7. Storage パス命名は member_id プレフィックス

Supabase Storage の RLS は `storage.objects` の name 列のパスを LIKE / split で評価する。`<member_id>/<doc_id>-<side>.<ext>` 形式にすると、RLS で `(storage.foldername(name))[1] = auth.uid()::text` の判定が単純に書ける。

**結論**: `<member_id>/<doc_id>-(front|back).(jpg|png|heic)` で固定。

### D8. マイナンバー方針: spec 修正 + 運用 SOP 文書化

既存 data-schema spec の "Requirement: マイナンバーカード収集禁止" は MODIFIED で書き換える。CLAUDE.md と openspec/project.md の関連記述も合わせて更新する。マスク漏れ削除 SOP は `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` (新規) に記載。

**結論**:
- spec 上は「マイナンバー個人番号のテキスト保管禁止 (列追加禁止)」 + 「マスク済みマイナンバーカード画像は受付可」を両立させる文面に修正
- アプリ実装側 (#92 / #171) で UX とレビュー運用を担保
- 削除 SOP を docs に追加

**代替案 (却下)**: マイナンバー一律拒否を維持 → 受付可能書類が狭まり、ユーザー体験に悪影響 (翔太郎くんが拡張を要求)。

### D9. seed データはマイグレーションに含める

主要 4 会場の seed は migration 内で `INSERT ... ON CONFLICT (name) DO NOTHING` で投入。これにより repo を clone して migration 適用 → admin が即 #86 に着手できる。

**代替案 (却下)**: 別 SQL ファイル (e.g. `supabase/seed.sql`) に分離 → CI / 本番の適用フローが二重化、管理コスト増。

#### 投入する venues seed (5 行)

正式情報は江東区健康スポーツ公社 公式サイト ([koto-hsc.or.jp](https://www.koto-hsc.or.jp/)) から取得。営業時間は全施設共通で 9:00–12:00 / 13:00–17:00 / 18:00–21:30 (深川北のみ夏季は 21:45 まで)。

| name | address | default_fee | access_note | is_primary |
|---|---|---|---|---|
| 亀戸スポーツセンター | 〒136-0071 東京都江東区亀戸 8-22-1 | 1000 | 東武亀戸線「亀戸水神」駅 徒歩 3 分 / JR 総武線「亀戸」駅 徒歩 15 分 / 21:30 完全撤収 | false |
| 東砂スポーツセンター | 〒136-0074 東京都江東区東砂 4-24-1 | 1000 | 都営バス「東砂四丁目」徒歩 5 分 / 東京メトロ東西線「南砂町」駅 徒歩 20 分 / 21:30 完全撤収 | false |
| 深川スポーツセンター | 〒135-0044 東京都江東区越中島 1-2-18 | 1000 | JR 京葉線「越中島」駅 徒歩 2 分 / 東京メトロ東西線・都営大江戸線「門前仲町」駅 徒歩 5 分 / 21:30 完全撤収 | false |
| 深川北スポーツセンター | 〒135-0023 東京都江東区平野 3-2-20 | 1000 | 東京メトロ東西線「木場」駅 徒歩 10 分 / 東京メトロ半蔵門線・都営大江戸線「清澄白河」駅 徒歩 12 分 / 21:30 完全撤収 (夏季 21:45) | false |
| 有明会場 | 〒135-0063 東京都江東区有明 1-8-14 先 | 500 | ゆりかもめ「有明テニスの森」駅 / 詳細な会場位置は予約確定後にメールで通知 | **true** |

##### 有明会場の特別扱い (D9.1)

5 件目の会場は実態としては有明テニスの森駅近隣の小学校だが、**未認証ユーザーへの校名露出を避けたい**運営方針により:
- DB の name は **`有明会場`** とし、学校名を保管しない
- DB の address は **ゆりかもめ「有明テニスの森」駅の駅前住所 (有明 1-8-14 先)** を投入
- access_note に「詳細な会場位置は予約確定後にメールで通知」を明記
- LP / 予約サイトの公開イベント詳細は駅住所のみ表示
- 予約確定メール (#148) で正確な会場住所を伝達 (将来 #152 設定画面でテンプレ管理予定)

これは **public な venues.address は "ぼかした" 値で良い** という明示的な設計判断。本人確認書類提出 (#92) を経た会員のみが正確な場所を知る運用になる。

##### 留意事項

- **default_fee** は Design サンプルベースの初期値。実際の運用に合わせて #151 (会場マスタ CRUD・MVP2) で admin が個別更新する想定。Apply 前に値を見直したい場合は翔太郎くんから指示
- **map_url** は migration では空文字または NULL で投入し、admin が #151 で個別に Google Maps URL を設定 (有明会場は地図公開せず NULL 維持)
- **以前案にあった「東陽町コミュニティセンター」「有明スポーツセンター」は廃案**。実在する施設名に置き換えた

#### Enum マスタ値 (CHECK 制約で定義、データ行ではない)

参考までに、本 change で定義する enum 値の一覧:

- `members.role`: `'member'` (default) / `'admin'`
- `members.experience_level`: `'beginner'` (default) / `'intermediate'` / `'experienced'`
- `events.visibility`: `'draft'` (default) / `'published'` / `'private'`
- `events.status`: `'scheduled'` (default) / `'cancelled'` / `'closed'`
- `reservations.status`: `'reserved'` (default) / `'cancelled'` / `'attended'` / `'no_show'` / `'waitlist'`
- `identity_documents.status`: `'pending'` (default) / `'approved'` / `'rejected'`
- `identity_documents.document_type` (10 値):
  - `'drivers_license'` (運転免許証)
  - `'driving_history_cert'` (運転経歴証明書)
  - `'residence_certificate'` (住民票)
  - `'disability_certificate'` (身体障害者手帳等)
  - `'residence_card'` (在留カード)
  - `'special_permanent_resident_cert'` (特別永住者証明書)
  - `'student_id'` (学生証)
  - `'passport'` (パスポート — 令和 2 年 2 月 4 日以前発給のみ)
  - `'my_number_card_masked'` (マイナンバーカード — 個人番号マスク済み)
  - `'health_insurance_cert'` (健康保険資格確認書)

UI 表示の日本語ラベルは `packages/shared/src/entities/<entity>/labels.ts` に集約 (本 change 範囲)。

#### 初期管理者アカウント (bootstrap・seed ではない)

`members.role = 'admin'` の初期アカウントは migration では作成しない。理由: auth.users に紐付く必要があり、Supabase Auth 側でユーザーを発行 → admin 1 名 (翔太郎くん) を手動 UPDATE で role を昇格させる流れ。手順は `docs/06-品質・セキュリティ/` に運用 SOP として記載 (本 change tasks 6.6 で追加)。

### D10. Branded Types は packages/shared に集約

各アプリで重複定義しないよう、`packages/shared/src/entities/<entity>/types.ts` に branded id + 行型 を集約。これは既存の supabase-foundation spec の Branded Types 要件に整合。

**結論**: 既存 `EventId` / `MemberId` / `ReservationId` に加え `VenueId` / `IdentityDocumentId` を追加。Smart constructor `createXxxId(value: string): Result<XxxId>` を併設。

### D11. Migration ファイル名と適用順序

既存 migration は `20260426000000_init_high_q.sql`。本 change は `20260428XXXXXX_db_schema_foundation.sql` (timestamp は実行時刻) で追加。`ALTER TABLE` で既存テーブル拡張、`CREATE TABLE` で新テーブル、`CREATE POLICY` で RLS 追加、`INSERT INTO venues` で seed という順序。

**ロールバック**: Supabase Dashboard で SQL を逆順実行する手順を migration ファイル内コメントに記載 (Phase 1 暫定)。

### D12. テスト戦略: pgTAP 不採用、SQL アサーション + Vitest 統合テスト

pgTAP は学習コストが高く Phase 1 規模では過剰。代わりに:
- migration 適用後に手動で `psql` で `SELECT relrowsecurity FROM pg_class` 等を実行する確認手順を tasks.md に記載
- Vitest で Supabase client 経由の RLS 振る舞いテストを書く (例: anon で `select * from members` → 0 行、ログイン後 → 1 行)

## Risks / Trade-offs

### R1. members トリガーの placeholder 値が事故の温床になりうる

birthday=current_date / display_name='' で先に行を作る方式は、登録未完了ユーザーがアプリ内に滞留する可能性がある。

**緩和策**: アプリ側で `display_name = '' OR display_name = NULL` のユーザーを「登録未完了」状態として扱い、強制的に登録フォームに誘導する middleware を #89 で実装。

### R2. マイナンバーカード方針変更に伴うセキュリティリスク

「収集禁止」を緩和することは、運用ミスでマスク漏れ画像が長期保管されるリスクを引き受けることを意味する。

**緩和策**:
- アップロード時の UX 三重防壁 (注意喚起 + サンプル比較 + チェックボックス同意)
- admin レビュー時の目視確認 + 即時削除フロー
- 削除 SOP の文書化と CLAUDE.md への明記
- (将来) 自動マスク検出 ML の検討余地を MVP2+ で残す

### R3. venues seed の事前確認なしに events を作ろうとするミス

events.venue_id は NOT NULL のため、venues に対象行が存在しないと events INSERT が FK 違反で落ちる。

**緩和策**: migration 内で venues seed を先に INSERT してから events 拡張を適用。アプリ側 (#86) は venue select を required UI にし、選択肢が空なら「会場を先に登録してください」エラー (admin 向け運用ガイダンス)。

### R4. seed データの会場名が将来変わる

会場の正式名称は自治体側の都合で変わりうる。seed で固定した name を後で UPDATE するのは UNIQUE 制約と衝突する可能性。

**緩和策**: name は UNIQUE 維持しつつ、表示名と内部 key を分離する案 (display_name 列追加) を MVP2 で検討。今は name UNIQUE で運用開始。

### R5. ON DELETE CASCADE による意図しない削除

identity_documents は members.id ON DELETE CASCADE。member 削除時に書類が消えるのは意図通りだが、admin が誤って member 削除すると証憑も消える。

**緩和策**: members の DELETE は admin RLS でも UI 上ボタンを置かず、緊急時の SQL 直接操作のみとする (現状仕様)。論理削除フラグは将来検討。
