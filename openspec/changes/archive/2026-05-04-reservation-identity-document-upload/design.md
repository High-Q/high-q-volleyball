## Context

- **Issue**: #92 — reservation 側「本人確認書類アップロード」MVP1 必須機能
- **Epic**: #170 (会員ジャーニー: 出会い → 登録 → 予約 → 当日 → 管理 → 繰り返し)
- **デザイン**: Claude Design ハンドオフバンドルに `ScreenRIDUpload` (`/tmp/hq-design/high-q/project/hq-reserve-screens.jsx:1283-1764`) として確定。6 アートボード (Empty / Selected / Mynumber / Loading / Error / Success)
- **DB / RLS**: `identity_documents` テーブル + RLS + Storage バケット `identity-documents` は `openspec/specs/data-schema` / `openspec/specs/rls-policies` に定義済 (#147 で完了)。本 change は **既存スキーマを利用するのみで、変更しない**
- **SOP**: `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` に運用設計 (アップロード時の三重防壁・admin レビュー・マスク漏れ即時削除) が記述済。reservation 側実装状況のみ更新が必要
- **既存資産**:
  - `packages/shared/src/types/entities.ts`: `DocumentType` (10 種 enum)、`IdentityDocument` 型、`IdentityDocumentRow` 型、`IdentityDocumentId` Branded Type
  - `packages/shared/src/types/labels.ts`: `DOCUMENT_TYPE_LABELS` / `DOCUMENT_TYPE_REQUIREMENTS` (10 種の日本語ラベル + 受付条件文言の SSOT)
  - `apps/reservation/src/features/auth/composables/useAuthSession.ts`: `isProfileComplete` / `member` を提供、`evaluate()` で 1 度だけ DB fetch
  - `apps/reservation/src/app/router.ts`: `beforeEach` ガードで未認証 → `/login`、プロフィール未完成 → `/signup/profile` 強制誘導
  - `apps/reservation/src/shared/api/supabase.ts`: 共通クライアント取得 (`getSupabase()`)
- **未整備**: 画面・composable・router 拡張・Storage upload 経路

## Goals / Non-Goals

**Goals:**
- 会員が登録フローの最終ステップとして本人確認書類 1 点を 30 秒以内 (操作時間) で提出できる UI
- マイナンバーカード提出時に**個人番号露出を運用上ゼロに近づける** UX 三重防壁 (注意喚起 + サンプル比較 + 必須同意) を実装
- Empty / Loading / Error / Success の 4 状態 + マイナンバー特殊 UI を網羅し、各状態が独立してテスト可能
- 受付条件文言の単一の真実の源 (SSOT) を `packages/shared/src/types/labels.ts:DOCUMENT_TYPE_REQUIREMENTS` に置き、画面・admin・SOP・将来のメール文面で再利用
- DB 行作成と Storage オブジェクト作成の **整合性 (孤立行ゼロ)** を担保するアップロード手順
- a11y AA: フォーカス順序・ARIA radio group・error は `role="alert"`・タップ領域 44×44px

**Non-Goals:**
- admin 側の確認・承認画面 (#171 別 Issue)
- 役所提出用一括ダウンロード (#172 別 Issue, MVP2)
- 再アップロード UX (rejected 後の再提出フロー) — Phase 2 で「マイページ → 書類状況 → 再提出」として別 Issue 化
- pending 状態会員の予約可否ロジック (別 Issue 想定。本 change では提出までを対象、提出後は無条件でホームへ)
- 退会時の Storage オブジェクト削除 (退会機能は MVP1 範囲外。SOP 5 章「退会時」も Phase 2)
- 画像の EXIF 削除・自動マスク・OCR 検証 — クライアント側自動マスクは安全保証ができず、admin 目視レビューを真の検証点とする
- 音声・動画ファイル対応 (静止画のみ jpg / png / heic)
- 監査ログテーブル (MVP2 — SOP 5 章参照)

## Decisions

### D1. ルート設計: `/signup/identity` を Step 3/3 として追加

`apps/reservation/src/app/router.ts` に以下のルートを追加:

```ts
{
  path: "/signup/identity",
  name: "signup-identity",
  component: SignupIdentityPage,
}
```

`meta.public` は付与しない (認証必須)。

**代替案と却下理由:**
- (A) `/profile/identity` 配下に置く案 → プロフィール画面 (Phase 2) と混在し、登録フローのステップとしての位置付けが曖昧になる
- (B) モーダルで `/signup/profile` 内に重ねる案 → 戻る・直リン・スクロール挙動が複雑化、デザイン (フルスクリーン Step 3/3) と齟齬

### D2. 認証ガード拡張: `hasIdentityDocument` を AuthSession に追加

`useAuthSession` に `hasIdentityDocument: ComputedRef<boolean>` を追加し、`evaluate()` で `members` fetch と並行に `identity_documents` の存在チェック (`select id from identity_documents where member_id = ? limit 1`) を実行する。

router guard を以下の順序で評価:

```ts
1. !authed → /login (既存)
2. authed && !profileDone → /signup/profile (既存)
3. authed && profileDone && !hasIdentityDocument → /signup/identity (新規)
4. authed && profileDone && hasIdentityDocument && (login|signup-* に居る) → /
```

upload 成功時は `session.refresh()` で `hasIdentityDocument` を再評価。

**代替案と却下理由:**
- (A) 専用 composable `useIdentityDocumentStatus()` を独立化 → guard で毎回呼ぶと N+1 query 化、SSR/初期表示が遅延
- (B) `members.profile.identity_uploaded` フラグを member 側に持つ → DB 設計変更が必要、ON DELETE CASCADE 後の整合性保証コスト増。現スキーマで `identity_documents` の existence query 1 回で済むため不要

### D3. フロー段階の再定義: 2 段階 → 3 段階

`reservation-member-auth` capability の「会員登録フローは 2 段階」記述を「3 段階」へ MODIFIED:

- Step 1: `/login` (メール送信)
- Step 2: `/signup/profile` (氏名・生年月日・電話・経験レベル・利用規約同意)
- **Step 3 (NEW): `/signup/identity` (本人確認書類 1 点)**

Step 2 完了時の遷移先を `/` から `/signup/identity` へ変更。Step 3 完了時にホーム `/` へ。

### D4. 書類選択 UI: select 廃止 → 2 列チップグリッド

Issue #92 原文は `select` 要素を指定するが、デザインは **2 列のチップグリッド** (10 種を 5 行 × 2 列) を採用。理由:
- 各書類の選択肢が視覚的に一覧でき、選択前から「これしか提出できない人」(例: 学生) が自分の書類を素早く特定できる
- マイナンバーチップに「注意」赤バッジを表示できる (select 内では不可)
- モバイルで select の native UI が iOS / Android で異なる体験になるのを回避

実装: `role="radiogroup"` 配下に 10 個の `<button role="radio" aria-checked>` を配置 (a11y AA)。

### D5. 受付条件文言の SSOT: `DOCUMENT_TYPE_REQUIREMENTS`

書類選択時の受付条件カードに表示する文言は、`packages/shared/src/types/labels.ts:DOCUMENT_TYPE_REQUIREMENTS` を **唯一の真実の源** として参照する。チップ・条件カード・将来の admin 画面・メール文面・SOP すべてが同じ定数を参照。

法令変更 (例: パスポートの令和 2 年基準改定) があった際の更新ポイントを 1 箇所に限定。

### D6. マイナンバー三重防壁: 純 CSS で表現、画像アセット非依存

サンプル比較カード (❌ マスク不十分 / ⭕ マスク適切) は **CSS のみで表現** し、画像アセットを使わない:
- ❌: 数字 `1234 5678 9012` をモノスペースで表示、赤枠 + 右上に ❌ バッジ
- ⭕: 黒帯の `<div>` で塗りつぶし、緑枠 + 右上に ✓ バッジ
- 共通: アスペクト比 85:54 (マイナンバーカードの実比率)

理由: ① 公式マイナンバーカード画像の使用は法的にグレー、② 画像アセットの版管理を回避、③ デザイン側 jsx と完全に同等の見た目が CSS で再現可能

同意チェックボックスの状態は **localState のみで管理** (DB 保存しない)。理由: アップロード時に必須チェック済みであることは「アップロード成功」の事実で証明される。チェックフラグを別管理する意味がない。

### D7. ファイル検証: クライアント 3 段階 + heic は jpeg へ自動変換

クライアント側で以下を順に処理 (失敗時は Error 状態へ遷移):

1. **MIME type / 拡張子**: `file.type` または拡張子 (大文字小文字無視) が以下のいずれか
   - `image/jpeg` (`.jpg` / `.jpeg`)
   - `image/png` (`.png`)
   - `image/heic` / `image/heif` (`.heic` / `.heif`)
2. **サイズ**: `file.size <= 10 * 1024 * 1024` (10 MB)
3. **heic 変換 (Android / iOS Safari 共通)**: heic / heif の場合、後述 D18 のクライアント変換で `image/jpeg` に変換してから upload

それぞれ別エラーメッセージ:
- type/拡張子: 「ファイル形式が不正です。jpg / png / heic のみ受け付けています。」
- サイズ: 「ファイルサイズが大きすぎます (10MB まで)。」
- heic 変換失敗: 「画像の変換に失敗しました。jpg または png でお試しください。」

サーバ側 (Storage) では MIME type はクライアント宣言値で扱われ、検証手段が限定的。**真の偽装防止は admin 目視レビュー** が担保する (SOP §2)。

### D8. アップロード手順: DB 先 INSERT → Storage 表裏並列 upload → 成功で path UPDATE → 失敗時ロールバック

Storage パスに `<document_id>` が必要なため、DB 行を先に作成する必要がある。表裏 2 ファイル対応の順序:

```
1. supabase.from('identity_documents').insert({
     member_id: <auth.uid()>,
     document_type: <selected>,
     storage_path_front: '<placeholder>',
     storage_path_back: null,
     status: 'pending',
   }).select('id').single() → newDoc.id
2. const ext = file.name.split('.').pop()!.toLowerCase()
   const frontPath = `${memberId}/${newDoc.id}-front.${ext}`
   const backPath  = backFile ? `${memberId}/${newDoc.id}-back.${backExt}` : null
3. Promise.all([
     supabase.storage.upload(frontPath, frontFile, { contentType }),
     backFile ? supabase.storage.upload(backPath, backFile, { contentType }) : null,
   ])
4a. 全成功 → supabase.from('identity_documents').update({
       storage_path_front: frontPath,
       storage_path_back: backPath,  // 裏面なしなら null
     }).eq('id', newDoc.id)
4b. いずれか失敗 → 成功した方の Storage オブジェクトを削除 + identity_documents 行を DELETE (ロールバック)
```

裏面アップロード単独失敗時の取り扱い: **トランザクション全体を巻き戻す** (表裏セットで 1 つの提出として扱うため、片方欠けの中途半端な状態を許容しない)。これにより admin レビューが「裏面アップロードに失敗した行」を扱う必要がなくなる。

孤立行・孤立 Storage オブジェクトを許容しない設計。Step 4a の UPDATE が失敗した場合のみ「DB に行はあるが storage_path がプレースホルダ」という不整合が残るが、admin レビュー画面 (#171) で異常検出可能。

**代替案と却下理由:**
- (A) Storage 先 upload → DB INSERT (path 確定後) → Storage 上のオブジェクトに `<member_id>/<temp-uuid>` のような暫定名がついて **RLS パスチェックと衝突するリスク**。member_id 配下なら通るが、`<document_id>` を後付けで rename する API は Supabase Storage に存在しない (move のみ)
- (B) Edge Function でトランザクション統合 → 過剰、運用コスト増
- (C) 表裏で別行 (2 行) として保存 → admin レビュー時のペアリングが `created_at` 等の脆弱な手がかりに依存。1 行 2 列構造の方が安全 (D17 参照)

### D9. ファイル名命名規則: `<member_id>/<document_id>-<side>.<ext>` (side ∈ {front, back})

SOP §4 の `<member_id>/<document_id>-(front|back).<ext>` 形式に従う。`side` は固定 enum:
- 表面: `front` (常に必須)
- 裏面: `back` (任意・アップロードされたときのみ存在)

`ext` は元ファイル名末尾を `toLowerCase()` で正規化 (`.HEIC` → `.heic`)。MIME type と組み合わせて検証済の値のみ採用。

マイナンバーカードも他書類と同じ命名規則。Storage パスから「この画像が個人番号を含むか」は判定できないため、admin は `document_type === 'my_number_card_masked'` の行を見たら **両方** (front / back) を目視確認する。

### D10. 提出枚数: 表面必須 + 裏面任意に統一 (Issue 原文「両面など複数枚可」と整合)

全 10 書類とも **表面 1 枚 (必須) + 裏面 1 枚 (任意)** に統一する。

理由:
- Issue 原文「両面など複数枚可」と整合 (Claude Design jsx の 1 枚仕様は本 spec で上書き)
- 書類別に枚数規則を分岐すると UI / 検証ロジックが複雑化、ユーザーも混乱
- 裏面が情報を持つ書類 (運転免許証の本籍欄・在留カードの在留資格・住民票の見開き 2 ページ目) で完全な確認が可能になる
- マイナンバーカードも同枠組み: 表面 (顔写真側) で身元確認、裏面 (個人番号マスク済み) は任意提出。三重防壁の同意は選択時に常に要求 (裏面提出有無に関わらず、誤って裏面を撮らないよう注意喚起する意義がある)
- admin 側 (#171) でも「表 + 裏」の 2 スロットを並べて確認するシンプルな UI に統一可能

書類ごとに「裏面が情報を持つかどうか」のラベル提示は受付条件カードの文面で行う (例: 運転免許証「本籍・住所変更履歴がある場合は裏面も提出」)。本 change 範囲ではラベルレベルで吸収し、enforce はしない。

### D11. 状態モデル: 全体 state + スロット別 state の 2 層

画面全体の state とスロット (front / back) ごとの state を分離して管理する:

```ts
// 画面全体 (送信プロセスの段階)
type PageState =
  | 'empty'      // 書類未選択
  | 'selecting'  // 書類選択済み (通常 or mynumber)、ファイル未確定または編集中
  | 'submitting' // 送信中 (Storage upload + DB UPDATE 進行中)
  | 'success'    // 送信成功 (CTA 押下でホームへ)

// 各スロットの状態 (front 必須、back 任意)
type SlotState =
  | 'empty'      // ファイル未選択
  | 'validating' // type/size 検証中 (一瞬)
  | 'ready'      // 検証通過、送信待ち
  | 'uploading'  // Storage upload 中 (進捗 N%)
  | 'uploaded'   // Storage upload 成功
  | 'error'      // 検証失敗 or upload 失敗

interface SlotData {
  state: SlotState
  file: File | null
  progress: number       // 0-100
  errorMessage?: string  // unsupported_format / file_too_large / network 等
}
```

`PageState` は両スロットの状態とマイナンバー同意状態から導出される computed。CTA は `PageState` から純関数で `label / disabled / spinner` を導出。

スロットを 2 つに分けることで:
- 表面のみの提出 (back='empty' でも送信可) と、両方提出 (back='uploaded') の両方を同じ state model で扱える
- 各スロットに削除ボタン / 再選択ボタンを独立配置できる
- エラーが発生したスロットだけ赤枠化、もう片方は ready 状態を維持

### D12. composable `useUploadIdentityDocument` の Result 型

`features/identity-document/composables/useUploadIdentityDocument.ts` を切り、以下の Result を返す:

```ts
type UploadError =
  | 'unsupported_format'    // type/拡張子不正
  | 'file_too_large'        // 10MB 超
  | 'consent_required'      // マイナンバーで同意未チェック (UI 側で防ぐが念のため)
  | 'front_required'        // 表面ファイル未指定
  | 'storage_failed_front'  // 表面 Storage upload エラー
  | 'storage_failed_back'   // 裏面 Storage upload エラー
  | 'db_failed'             // identity_documents INSERT/UPDATE エラー
  | 'network';              // 一般的な通信エラー

interface SubmitInput {
  documentType: DocumentType
  frontFile: File           // 必須
  backFile?: File           // 任意
  consented: boolean        // mynumber のみ意味を持つ
}
```

`submit(input: SubmitInput) => Promise<Result<IdentityDocumentId, UploadError>>` のシグネチャ。表裏が片方失敗したらロールバック処理 (D8) を実行し、成功スロットの Storage オブジェクトも削除する。技術エラー (network/storage/db) と業務異常系 (format/size/consent/front_required) を明示的に区別。

### D13. 画像のリサイズ・圧縮: しない (MVP1)

クライアント側で画像の縮小リサイズ・再エンコード (ピクセル数削減) はしない。理由:
- iOS Safari / Android Chrome で画像処理 API の挙動差が大きく、不具合源
- 10MB 上限で十分 (5MP 程度のスマホ写真は 2-3MB)
- 解像度を下げると admin の目視レビューで個人番号マスクの十分性確認が難しくなるリスク

ただし heic → jpeg の **形式変換のみ** は D18 で実施する (リサイズではない)。

Phase 2 で容量最適化が必要なら別 Issue。

### D14. アクセシビリティ詳細

- 書類チップ: `<div role="radiogroup" aria-labelledby="docTypeLabel">` 配下に `<button role="radio" aria-checked={selected}>`
- アップロードタイル: `<label>` で `<input type="file" accept=".jpg,.jpeg,.png,.heic,.heif" capture="environment" hidden>` を覆う
- マイナンバー同意 checkbox: `<input type="checkbox" required aria-describedby="consentDesc">`
- エラーバナー: `role="alert"` + `aria-live="polite"`
- 成功バナー: `role="status"` + `aria-live="polite"`
- Sticky CTA: disabled 時は `aria-disabled="true"` + `tabindex="-1"`、フォーカスは前のフォーム要素に保持

### D15. テスト戦略

| 層 | 範囲 | 件数目安 |
|---|---|---|
| **unit (vitest)** | `useUploadIdentityDocument` の Result 型分岐 (各 UploadError) | 6-8 件 |
| **component (vitest + @vue/test-utils)** | `SignupIdentityPage` の各状態描画・三重防壁・CTA disabled 制御・チップ選択切替 | 10-15 件 |
| **router (vitest)** | `hasIdentityDocument` ガードのリダイレクト挙動 | 3-4 件 |
| **E2E (Playwright)** | happy path 1 件: 書類選択 → 画像アップロード → 送信 → ホーム遷移 | **1 件のみ** (CLAUDE.md の「機能あたり 1〜2 件」上限) |

E2E は Storage upload を mock する (実 Supabase に書き込まない)。`page.route('**/storage/**')` で intercept。

### D16. 既存 SOP との整合

`docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` の記述で本 change の振る舞いを変更する必要なし (SOP は「reservation 側 #92 で実装」と既に予告済)。本 change の Apply 完了後、SOP 内の「(reservation 側 #92 で実装)」表記を「(reservation 側 #92 ✅実装済)」に更新する。

加えて、SOP §4 の `<member_id>/<document_id>-(front|back).<ext>` 形式は本 change の D9 と完全一致 (SOP の方が先に表裏想定で書かれていた)。スキーマ列名分割 (D17) に伴い、SOP §4 「DB」項目の列名 (`storage_path` → `storage_path_front` / `storage_path_back`) を更新する。

### D17. DB スキーマ変更: `storage_path` → `storage_path_front` + `storage_path_back`

既存の `identity_documents.storage_path` (text NOT NULL) を以下に分割:
- `storage_path_front` (text NOT NULL) — 表面パス。常に存在
- `storage_path_back` (text NULL) — 裏面パス。任意提出時のみ値を持つ

migration SQL (1 ファイル):

```sql
-- supabase/migrations/<timestamp>_split_identity_documents_storage_path.sql
ALTER TABLE public.identity_documents
  RENAME COLUMN storage_path TO storage_path_front;

ALTER TABLE public.identity_documents
  ADD COLUMN storage_path_back text NULL;
```

**互換性**: 本番 DB は現状 0 行 (#147 完了時点で seed なし、#92 未実装で会員操作なし) のため、データ移行不要。RLS は列名に依存しないため変更不要。CHECK 制約・インデックスも影響なし。

**TypeScript 型の追従**: `packages/shared/src/types/entities.ts` の `IdentityDocumentRow` / `IdentityDocument` 型を以下に更新:

```ts
export interface IdentityDocumentRow {
  id: string
  member_id: string
  document_type: DocumentType
  storage_path_front: string          // 旧 storage_path
  storage_path_back: string | null    // NEW
  status: IdentityDocumentStatus
  rejection_reason: string | null
  uploaded_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}
```

**代替案と却下理由:**
- (A) 1 行 = 1 ファイル (front 行 + back 行で 2 行) + `side` 列追加 → admin レビューでペアリングが `created_at` 等の脆弱な手がかりに依存。RLS / DELETE もペア整合性を別途担保する必要あり
- (B) `storage_paths text[]` 配列列 → 順序保証が型レベルで弱い (front/back の判別が index に依存)、JSON 風アクセスで型安全性低下
- (C) 別テーブル `identity_document_files` を切る → 単純なペア構造に対しオーバーエンジニアリング、RLS ポリシーが二重化

採用案 (列分割) が概念的に最もシンプル: 「1 つの書類提出セット = 1 行 = 表 + 裏 (任意)」が DB 型と一致する。

**Migration 実行タイミング**: 本 change の Apply 内で migration ファイルを追加し、ローカル `supabase db push` で適用、PR レビュー時に Supabase Dashboard 経由で本番に反映 (既存運用と同じ流れ)。

### D18. heic / heif 自動変換 (Android 含む全環境対応)

iPhone のデフォルトカメラは heic/heif で撮影する。Android Chrome / Firefox 等では `accept=".heic,.heif"` でもファイル選択ダイアログに heic を出さない / 選択できないケースがある。本 change は **iOS 限定サービスに退化させない** ため、heic/heif を選んでも upload 完了に至る経路を必ず保証する。

**採用方針**: クライアント側で `heic2any` (or 同等の WebAssembly ベースのライブラリ) を使い、upload 直前に jpeg に変換する。

```ts
import heic2any from 'heic2any'  // dynamic import で初回ロードを軽量化

if (file.type === 'image/heic' || file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)) {
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  const jpegBlob = Array.isArray(blob) ? blob[0] : blob
  file = new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'),
                  { type: 'image/jpeg' })
}
```

変換後のファイルを通常の jpeg として扱い、Storage パスの拡張子は `.jpg` に正規化する。サイズ検証 (10MB) は変換 **後** のサイズで再評価 (jpeg は heic より一般に大きくなる)。

**Bundle size への影響**: `heic2any` は ~500KB (gzip 後 ~200KB)。本 change では:
- **dynamic import** を使い、heic ファイル選択時のみダウンロード
- 通常 jpg/png ユーザーには影響なし
- 初回 heic アップロード時の追加ロード時間は許容 (本人確認は登録フロー中の 1 度きり)

**Android 側ファイル選択の改善**: `<input type="file" accept="image/*">` (image/* ワイルドカード) を追加し、Android のファイルピッカーで heic も含めた全画像を選択可能にする。`.heic,.heif` のみだと Android で選択肢に出ない場合がある。

```html
<input type="file"
       accept="image/jpeg,image/png,image/heic,image/heif,image/*"
       capture="environment"
       hidden>
```

**代替案と却下理由:**
- (A) サーバ (Edge Function) で変換 → 運用コスト + heic を一旦 Storage に上げると RLS 設計が複雑化
- (B) ユーザーに「Android では jpg で撮り直してください」と誘導 → iPhone 限定サービスに等しく、Android ユーザーを排除する
- (C) PWA + native API 統合 → MVP1 ではオーバーエンジニアリング

### D19. プライバシーポリシー掲示 (個人情報保護法対応)

本 change は会員の **本人確認書類画像** という極めてセンシティブな個人情報を取得・保管する。個人情報保護法 (個情法) §17 - §22 に基づき、以下の対応を本 change の Apply 範囲内で MUST 実装する:

1. **利用目的の明示**: SignupIdentityPage の footer 注記 (既存) を強化:
   > 「アップロードいただいた画像は、参加者の身元確認 (安全担保) と、江東区・東京都への団体登録 (スポーツ団体・社会教育団体) の証憑提出のためにのみ使用します。第三者への提供は法令に基づく場合を除き行いません。詳細は[プライバシーポリシー](/privacy)をご覧ください。」
2. **プライバシーポリシーへのリンク**: 既存 SignupProfilePage の `<a href="#">プライバシーポリシー</a>` を `/privacy` 実ページへ張り替える
3. **プライバシーポリシー本文ページ**: **本 change のスコープ外** (別 Issue で着手)。本 change の Apply 完了時点ではリンクが 404 になる可能性があるため、Apply 完了 = ship の前提として「プライバシーポリシー Issue の完了」を待つ

本 change の Apply 範囲:
- footer 注記の文言強化
- 同意チェックボックスの文言調整 (プライバシーポリシー / 利用規約への同意は SignupProfilePage で既に取得済 = 本人確認書類アップロード時点で再同意は不要、ただし footer に注記は必須)

別 Issue (法令対応):
- プライバシーポリシー本文ページ作成 (#privacy-policy 着手順 2)
- 利用目的・取得項目・保管期間・第三者提供・開示請求窓口を明示
- 安全管理措置 (RLS / 暗号化 / SOP) の記載

### D20. 改正電気通信事業法 (外部送信規律) 対応

2023 年 6 月施行の改正電気通信事業法 §27の12 「外部送信規律」により、ユーザー情報を第三者に送信するサービスは、**送信される情報・送信先・利用目的の事前公表** および **オプトアウト等の機能提供** が必要。High Q が利用する外部送信先:

| 送信先 | 送信される情報 | 利用目的 |
|---|---|---|
| Supabase (米国 / 主要リージョン日本) | メール / 認証セッション / 会員情報 / 本人確認書類画像 | 認証・データ保管 |
| Render (米国) | アクセスログ (IP / User-Agent) | ホスティング |
| Google Fonts CDN | フォントリクエスト時の IP / Referer | Web フォント配信 |

**本 change の Apply 範囲外**: Cookie 同意 UI / 外部送信ポリシーページ自体は本 change のスコープ外 (別 Issue で実装、着手順 1 として最優先)。

**本 change での対応**: SignupIdentityPage の footer に以下を追加:
> 「画像は Supabase (米国法人運営の SaaS、データは日本リージョン保管) を経由して安全に保管されます。詳細は[外部送信ポリシー](/external-transmission)をご覧ください。」

リンク先ページの本文は別 Issue で実装する (Apply 完了 = ship の前提)。

### D21. 法令対応の着手順位

本 change (#92) の Apply 範囲は「reservation 側 UI + DB 列分割 + 文言・リンク張り替え」までとし、以下の法令対応 Issue は **ファーストリリース前にいずれも完了させる**。順序は問わない (#192-#196 と #92 は独立に進めて構わない) (Project の `着手順` field は単に開発順序の目安として管理):

| 着手順 | Issue | 必須 / 推奨 | 理由 |
|---|---|---|---|
| **1** | #192 改正電気通信事業法 (外部送信規律) 対応 — Cookie 同意 UI + 外部送信ポリシーページ (/external-transmission) | **必須** | 法令違反リスクが最も切実 (施行済 / 罰則あり) |
| **2** | #193 プライバシーポリシー本文ページ + 利用目的明示 (/privacy) | **必須** | 個情法上の義務、本 change の footer リンク先 |
| **3** | #194 個人情報開示請求窓口・規定整備 | 推奨 | 個情法上必須、メール窓口で代替可。プライバシーポリシー (#193) のサブセクションとして実装 |
| **4** | #195 安全管理措置の文書化・漏洩時報告体制 | 推奨 | 個情法上必須、既存 SOP の補強 |
| **5** | #196 pending status 会員の予約禁止ガード | 推奨 | 本件 (#92) + admin 承認画面 (#171) 完了が前提、Open Question 1 の解決実装 |
| **6** | #92 (本件): reservation 本人確認書類アップロード | **本件** | — |

**特商法対応**: 翔太郎くんの判断 (2026-05-04) により High Q の運営形態 (任意団体・参加費は実費のみ) は特定商取引法の対象外として整理。Issue 化しない。

**ファーストリリース条件**: ファーストリリース未実施のため、本 change と #192-#196 はいずれも順不同で進めて良い。ファーストリリース時点で必須 Issue (#192 / #193) がそろっていれば運用開始可能とし、推奨 Issue (#194-#196) は MVP1 期間内で順次完成させる。本 change 単独での Render PR Preview / merge には法令 Issue 完了の前提条件はない。

## Risks / Trade-offs

| Risk | 影響 | Mitigation |
|---|---|---|
| マスク漏れ画像が pending の間 Storage に残る | 個人番号露出・SOP 違反 | アップロード成功画面で「最長 3 日以内に確認」明示 + admin レビュー優先度 (#171 で「pending マイナンバー」を最上位に表示) + 翔太郎くん毎朝の admin チェック |
| ファイル形式偽装 (gif → jpg リネーム) | 不正ファイルの DB 記録 | クライアント検証は best-effort、admin 目視で最終判定。サーバ側は `identity-documents` バケット public:false で公開リスクなし |
| マイナンバー同意 checkbox の誤チェック | マスク不十分画像のアップロード | 同意 ON でも admin レビューでマスク不十分なら reject + Storage 削除 (SOP §2「マスク漏れ即時削除 SOP」) |
| upload 中ネットワーク切断 → DB 行残存 | 孤立行 (storage_path = placeholder) | composable で必ず DELETE を呼ぶ try/catch/finally。それでも残ったら admin レビュー画面で異常検出可能 |
| ブラウザ画像ピッカーの heic 非対応 (一部 Android) | アップロード失敗 | accept 属性で heic を含めるが、検証で弾かれた場合のエラー文言を明確に。iOS は標準対応、Android は環境差を許容 (再アップロードで jpg に切替可能) |
| MVP1 段階で予約は本人確認なしでも可能 | 身元未確認会員の参加 | 本 change のスコープ外。別 Issue (想定 #173) で「予約時の status='approved' 必須化」を検討。MVP1 では admin が手動で「未承認会員からの予約」を発見・対処 |

## Migration Plan

### デプロイ
1. **本 PR を master へ merge** (Render Preview で動作確認後)
2. Render で reservation アプリが自動 redeploy される
3. **既存会員への影響**: 既に `/signup/profile` を完了したユーザーは次回ログイン時にガードで `/signup/identity` へ強制誘導される (`hasIdentityDocument === false` のため)
   - 翔太郎くんが事前に Slack/メール等で「本人確認書類提出のお願い」を告知することを推奨 (本 change の Apply 範囲外)

### ロールバック
- 不具合発覚時: Render の前回 deploy へ revert (1 click)
- DB / Storage 側の変更なし (既存スキーマのみ利用) のため、ロールバックは即座・安全

### マイグレーション SQL
- **不要** (新規テーブル追加なし、既存スキーマ利用のみ)

## Open Questions (解決済)

| 質問 | 起票理由 | 翔太郎くんの決定 (2026-05-04) |
|---|---|---|
| pending 状態会員の予約可否 | 本人確認未完了で予約可能とすると、admin reject 時の予約取消フローが必要 | **NO**。pending 会員は予約不可とする。実装は別 Issue **#196 (着手順 5)** で行う |
| 既存会員の遡及対応 | 本 change deploy 後、既存ログイン済み + プロフィール完成済 + 書類未提出会員はガードで `/signup/identity` 強制誘導される | **不問**。ファーストリリース前のため既存会員は存在しない |
| heic ファイルが Android で開けないケース | 一部 Android ブラウザで heic ファイル選択不可 | **対応必須** → D7 + D18 で **クライアント側 heic2any 変換** を採用、Android 含む全環境で heic を扱えるよう実装 |
| マイナンバー以外で「特別な注意」が必要な書類 | 学生証の有効期限切れ・住民票の3か月超など | **受付条件カード表示 + admin 目視で判定**。プログラム的検証は MVP1 範囲外 |
| 法令対応 (個情法 / 改正電気通信事業法) | 本 change で個人情報を取得・第三者 (SaaS) へ送信するため、関連法令の対応が必要 | **D19 / D20 / D21 で整理**。法令対応は別 Issue 群として切り出し済 (#192 着手順 1 → #193 着手順 2 → #194 着手順 3 → #195 着手順 4 → #196 着手順 5 → 本件 #92 着手順 6)。特商法は対象外 (任意団体・実費徴収のみ) |
