## Why

Issue #92 で MVP1 必須機能と位置付けられた **本人確認書類アップロード画面** が、reservation 側に未実装である。DB スキーマ (`identity_documents` テーブル) / RLS / Storage バケット / SOP は既に確立済み (`openspec/specs/data-schema`, `openspec/specs/rls-policies`, `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`) だが、ユーザーが書類を提出する経路がない。さらに既存スキーマは表裏 1 ファイル前提 (`storage_path` 単一カラム) であり、Issue 原文の「両面など複数枚可」要件を満たすには列分割が必要。

提出が必須化されないと: ① 参加者の身元確認手段がなく安全担保ができない、② 江東区 / 都への団体登録 (スポーツ団体・社会教育団体) の証憑が集まらず、コミュニティとしての信頼基盤が立ち上がらない。Claude Design による画面意匠 (`/tmp/hq-design/high-q/project/hq-reserve-screens.jsx:1283-1764` の `ScreenRIDUpload`) は基本構造の出典として参照する (ただし枚数は両面対応へ拡張)。

## What Changes

- **NEW**: reservation アプリにルート `/signup/identity` を追加し、会員登録フローの **Step 3 of 3** として位置付ける
  - フロー再定義: マジックリンク認証 → `/signup/profile` (Step 2/3) → **`/signup/identity` (Step 3/3)** → `/` (ホーム)
  - 既存 `reservation-member-auth` spec の段階表現を「2 段階」→「3 段階」へ更新する必要あり (詳細は design.md で検討)
- **NEW**: 10 種書類を 2 列グリッドの **チップ選択 UI** で表示 (Issue 原文の "select" は採用せずデザインに従う)
  - 各チップは選択時にアクセント色のリング表示。マイナンバーチップには「注意」赤バッジ
- **NEW**: 書類選択直後に **受付条件カード** (`— ACCEPTED IF` Kicker + 書類名 + 条件文言) を表示
  - 条件文言は `packages/shared/src/types/labels.ts` の `DOCUMENT_TYPE_REQUIREMENTS` を **唯一の真実の源** として利用
- **NEW**: マイナンバーカード選択時のみ **三重防壁ブロック** に切り替え:
  1. 赤帯アラート「個人番号 (裏面 12 桁) を完全に隠してください」
  2. ❌ マスク不十分 / ⭕ マスク適切 のサンプル比較カード (CSS による視覚表現、画像アセット非依存)
  3. 必須同意チェックボックス「個人番号を完全に隠して撮影したことを確認しました」
- **NEW**: 画像アップロードタイル (アスペクト比 85:54、jpg / png / heic、最大 10MB / 1 ファイル) を **「表面 (必須) + 裏面 (任意)」の 2 スロット** で表示
  - Empty: 破線枠 + カメラアイコン + 「画像を選択 / 撮影」
  - Loading: アクセント枠 + プログレスバー + 「アップロード中… N%」(各スロット個別)
  - Error: 赤枠 + ファイル名 + サイズ (各スロット個別)
  - Success: 緑枠 + ✓ + ファイル名キャプション (各スロット個別) + 削除ボタン
  - 裏面スロットには「任意」バッジ表示 (運転免許証の本籍欄・在留カードの裏面情報・住民票見開き 2 ページ目などに対応)
- **NEW**: 書類別の必要枚数: **全書類とも表面 1 枚 (必須) + 裏面 1 枚 (任意)** に統一。Issue 原文の「両面など複数枚可」と整合
  - マイナンバーカードも同じ枠組み。ただし三重防壁の同意チェック (個人番号マスク) は選択時に常に必須
- **NEW**: 状態駆動 sticky CTA (ラベル切替):
  - empty/書類未選択 / 表面未アップロード: 「送信する」/disabled
  - loading: 「アップロード中…」/disabled + spinner
  - error: 「もう一度試す」
  - success: 「完了する」 (押下で `/` ホームへ遷移)
  - mynumber 同意 OFF: 「送信する」/disabled
- **NEW**: 上部エラーバナー (書類セレクター上) は形式不正・サイズ超過などのファイル受付エラーに使用 (どちらのスロットで起きたかを明示)
- **NEW**: 成功バナー (緑) 「アップロードが完了しました／オーナーが内容を確認します (最長 3 日以内)」
- **NEW**: footer 注記「画像はオーナーによる本人確認のためのみ使用し、確認完了後は安全に削除されます。」
- **NEW**: Supabase Storage `identity-documents` バケットへの **2 ファイル並列アップロード処理** (パス: `<member_id>/<document_id>-front.<ext>` 必須 + `<member_id>/<document_id>-back.<ext>` 任意) と `identity_documents` テーブルへの行作成 (status='pending')
- **MODIFIED (DB スキーマ)**: `identity_documents.storage_path` (NOT NULL text) を `storage_path_front` (NOT NULL text) と `storage_path_back` (NULL 可 text) の 2 列に分割。表裏のペアを 1 行で表現 (admin レビューで対応関係が明確になる)
  - migration: `RENAME COLUMN storage_path TO storage_path_front` + `ADD COLUMN storage_path_back text NULL`
  - 本番 DB は現状空のため互換維持不要、シンプルな migration で完結
- **NEW**: 4 状態 (Loading / Empty / Error / Success) を含む 6 アートボード相当 + 表裏 2 スロットレイアウトを実装
- **MODIFIED**: 既存 `reservation-member-auth` capability の「会員登録フローは 2 段階」記述を 3 段階に更新 (Step 3 として本機能を後置) — 詳細スコープは design.md で確定
- **NEW**: E2E happy path (1 件): 書類選択 → 表面画像アップロード → 送信 → 成功バナー表示 (Playwright)
- **NEW**: SignupIdentityPage の footer に法令対応リンク (`/privacy`、`/external-transmission`) を **dead link 込みで** 配置。リンク先ページは別 Issue (#192 / #193) で実装、本件マージ時点では 404 でも OK (順不同で進めて良い、ファーストリリース時点で揃っていれば良い)

## Capabilities

### New Capabilities
- `reservation-identity-document-upload`: reservation アプリの会員登録フロー Step 3/3 として、本人確認書類 1 点を Supabase Storage にアップロードし `identity_documents` 行を作成する UI / 振る舞い。10 種書類のチップ選択、受付条件表示、マイナンバー三重防壁 (赤帯アラート + サンプル比較 + 必須同意)、4 状態 + 三重防壁の視覚表現、状態駆動 sticky CTA を含む。

### Modified Capabilities
- `reservation-member-auth`: 会員登録フローを 2 段階から 3 段階へ拡張する (Step 3 = 本人確認書類アップロード)。`/signup/profile` 完了後に `/signup/identity` へ遷移、未提出会員はホーム遷移時に再誘導。詳細フローは design.md で確定する。
- `data-schema`: `identity_documents.storage_path` (NOT NULL) を `storage_path_front` (NOT NULL) と `storage_path_back` (NULL 可) の 2 列に分割する。表裏 2 ファイルのペアを 1 行で表現することで、admin レビュー時の対応関係を明確化し、ON DELETE CASCADE / RLS の単純さを維持する。

## Impact

### コード
- **追加**: `apps/reservation/src/pages/SignupIdentityPage.vue` (画面本体)
- **追加**: `apps/reservation/src/features/identity-document/` (composable + api スライス)
- **追加**: `apps/reservation/src/entities/identity-document/` (model + api スライス、Branded Types `IdentityDocumentId` を `packages/shared` から再 export)
- **追加**: `apps/reservation/src/shared/ui/` 必要に応じて `Checkbox` プリミティブ (shadcn-vue)
- **更新**: `apps/reservation/src/app/router.ts` に `/signup/identity` ルート追加 + 認証ガード拡張 (プロフィール完成済 + 書類未提出を本ページへ誘導)
- **更新**: `apps/reservation/src/pages/SignupProfilePage.vue` の遷移先を `/` から `/signup/identity` へ変更
- **更新**: `apps/reservation/src/features/auth/composables/useAuthSession.ts` (相当) に `hasIdentityDocument` 派生プロパティ追加検討

### Storage / DB
- **既存**: `identity_documents` テーブル / RLS / Storage バケット (data-schema #147 で完了済) — テーブル / バケット / RLS は流用
- **MIGRATION**: `identity_documents` の `storage_path` 列を分割する 1 件の SQL migration を追加 (`RENAME` + `ADD COLUMN`)。本番 DB が現状空のため、互換維持・データ移行不要
- **更新**: `packages/shared/src/types/entities.ts` の `IdentityDocument` / `IdentityDocumentRow` 型を新スキーマに追従 (`storage_path` → `storage_path_front` + `storage_path_back?`)
- **不要**: RLS ポリシーの変更 (RLS は `member_id` ベースで列名に依存しない)
- **追加**: シードや初期データなし (会員アクションで行が増えるのみ)

### 環境変数 / インフラ
- **変更なし**: 既存 Supabase クライアント (`shared/api/`) と `VITE_SUPABASE_*` をそのまま利用

### 依存関係
- **追加検討**: 画像のクライアント側 EXIF / ファイル形式検証ライブラリは追加しない (ブラウザ標準 `File.type` + 拡張子チェック + サイズチェックのみ)
- **追加**: shadcn-vue の `Checkbox` プリミティブを `apps/reservation/src/shared/ui/Checkbox.vue` として copy-paste 取り込み

### ドキュメント
- **更新**: `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` の reservation 側実装状況を「未実装」→「実装済 (#92)」へ
- **更新**: 同 SOP §4 の DB 列名を `storage_path` → `storage_path_front` / `storage_path_back` に追従
- **不要**: 新規 SOP 追加 (既存 SOP で reservation 側 UX 三重防壁の運用ルールは記載済)

### 関連 Issue (法令対応・順不同で OK)

ファーストリリース未実施のため、本件 (#92) と法令対応 Issue (#192-#196) は順不同で進めて良い。本件単独のマージに法令 Issue 完了の前提はない。ただしファーストリリース前にはいずれも完了が必要。

- **#192** 改正電気通信事業法 (外部送信規律) — Cookie 同意 + /external-transmission [必須]
- **#193** プライバシーポリシー本文 (/privacy) [必須]
- **#194** 開示請求窓口・規定整備 [推奨]
- **#195** 安全管理措置文書化・漏洩時報告体制 [推奨]
- **#196** pending 会員予約禁止ガード [推奨・本件 + #171 後に着手]
- **#92** 本件

### テスト
- **追加**: vitest component test (各状態 / マイナンバー三重防壁 / CTA disabled 制御)
- **追加**: E2E happy path 1 件 (Playwright) — 書類選択 → 画像 upload → 送信 → ホーム遷移
- **方針**: バリエーションは component test に押し下げ、E2E は 1 件に抑える (`docs/07-テスト/01-テスト戦略・方針.md` に従う)
