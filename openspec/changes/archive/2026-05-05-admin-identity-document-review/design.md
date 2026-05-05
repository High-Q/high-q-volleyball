## Context

- **Issue**: #171 — admin 側「本人確認書類の確認・承認」MVP1 必須機能
- **Epic**: #169 (会員受け入れ運用基盤 想定。Epic 一覧は実装時に再確認)
- **DB / RLS**: `identity_documents` テーブル + RLS + Storage バケット `identity-documents` は `openspec/specs/data-schema` / `openspec/specs/rls-policies` に定義済 (#147 / #92 で完了)。本 change は既存スキーマと既存 RLS を **変更せずクライアント実装で利用するのみ**
- **SOP**: `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md` に admin レビューフロー / マスク漏れ即時削除 SOP / 緊急時エスカレーションが既に記述済。本 change は SOP の admin レビュー実装フェーズに該当
- **既存資産**:
  - `packages/shared/src/types/entities.ts`: `DocumentType` enum (10 種)、`IdentityDocument` 型、`IdentityDocumentRow` 型、`IdentityDocumentId` Branded Type、`IdentityDocumentStatus` enum (`'pending'` / `'approved'` / `'rejected'`)
  - `packages/shared/src/types/labels.ts`: `DOCUMENT_TYPE_LABELS` / `DOCUMENT_TYPE_REQUIREMENTS` (10 種日本語ラベル + 受付条件文言の SSOT)
  - `apps/admin/src/features/auth/`: `useAuthSession` で AAL2 + role=admin を担保、`router.ts` の `beforeEach` で `/login` / `/mfa` / `/login?reason=not-admin` リダイレクトを既存実装
  - `apps/admin/src/shared/ui/`: `Table`, `Select`, `Skeleton`, `AlertDialog` (グループ), `Toast` (グループ), `Input`, `Label`, `FormField` を取り込み済
  - `apps/admin/src/widgets/event-detail/`, `event-participants/`, `events-list/`: DataTable / Toolbar / 4 状態 / URL クエリ同期 / 個別 mutation の参考実装
  - `apps/admin/src/features/reservation-cancel-by-admin/`: AlertDialog + mutation のパターン参考実装
- **未整備**: 一覧 / 詳細画面・signed URL 発行 composable・mutation 群・pending Badge composable・Dialog プリミティブ (画像プレビューモーダル用)
- **デザイン**: 既存 admin 画面 (events-list / event-detail) の意匠言語を踏襲する。Issue 原文は「DataTable + 画像プレビューモーダル」「shadcn/ui の Dialog / Image / Button を HQ token で着色」を要請。本件専用の Claude Design ハンドオフ jsx は未提供のため、events-list / event-detail のレイアウトと `@high-q/ui` プリミティブ (`Kicker`, `Badge`, `Button`) で統一感を出す

## Goals / Non-Goals

**Goals:**
- admin が pending 書類を 30 秒以内 (操作時間) で承認 / 差し戻しできる UI
- マイナンバーカードのマスク漏れを **発見即削除** できる SOP 準拠フロー (1 タップで Storage 削除 + DB rejected + 再提出依頼メール起動)
- 4 状態 (Loading / Empty / Error / Success) を一覧 / 詳細画面ともに網羅、各状態が独立してテスト可能
- `DOCUMENT_TYPE_LABELS` / `DOCUMENT_TYPE_REQUIREMENTS` を SSOT として再利用し、reservation 側 (#92) と同じラベル / 受付条件を表示
- signed URL の発行・有効期限管理を中央化し、admin 認証が切れた状態で URL 漏洩しても 1 時間で無効化される
- 二重承認 / 二重操作 / 二重削除を **DB の WHERE 句条件 + client side の disabled / in-flight ガード** で多層防御
- a11y AA: フォーカス順序 / ARIA / role="alert" / role="alertdialog" / コントラスト比

**Non-Goals:**
- 自動メール送信 (Phase 2 Resend 移行後に別 Issue で実装)。本 change は **mailto: 起動方式** で MVP1 完結
- 監査ログテーブル (削除操作のログ等は MVP2 — SOP §5)
- 役所提出用一括ダウンロード (#172, MVP2)
- 一覧の bulk 操作 (一括承認 / 一括差し戻し) — MVP1 は個別操作のみ
- 画像 OCR / 自動マスク検出 — admin 目視レビューが真の検証点 (SOP §2)
- 画像の EXIF 削除 / メタデータ除去 — Storage バケットへの私的アクセスのみ、外部公開しない前提
- pending 会員予約禁止ガード (#196 を本件で代替実装、#196 はクローズ予定 — D22 参照)
- realtime な pending Badge 件数更新 (画面遷移 / リロード時の再 fetch のみ)
- マイナンバーカード以外の書類で「マスク漏れ削除」操作 — そもそもマスク要件が存在しない書類のため UI に表示しない
- 同じ member の複数書類の管理画面 (現状 1 member = 1 行を想定。member が再提出した場合は新規行として追加されるが、本 change の一覧では時系列で並ぶのみ)
- 連鎖予約キャンセル時の **個別ユーザー通知メール** (本件は mailto: の再提出依頼メール body にキャンセル件数を含めるのみ、各イベントの予約キャンセル通知は MVP2 で reservation 側のメールトリガーと統合)

## Decisions

### D1. ルート設計: `/identity-documents` + `/identity-documents/:id` の 2 ルート構成

`apps/admin/src/app/router.ts` に以下のルートを追加:

```ts
{
  path: "/identity-documents",
  name: "identity-documents",
  component: IdentityDocumentsListPage,
},
{
  path: "/identity-documents/:id",
  name: "identity-document-detail",
  component: IdentityDocumentDetailPage,
},
```

両ルートとも既存 `beforeEach` guard を通過。Issue 原文の `/admin/identity-documents` は admin アプリがサブパスを持たない (apps/admin はドメイン全体が admin) ため `/identity-documents` に正規化。

**代替案と却下理由:**
- (A) 単一画面に一覧と詳細を併載 (split view) → MVP1 範囲外、モバイルで使いにくい
- (B) 一覧から AlertDialog で詳細表示 → Dialog で画像プレビュー + 承認 / 差し戻し / マスク漏れ削除 + 理由入力 + mailto: リンクと UI 要素が多すぎ、AlertDialog の用途と合わない (AlertDialog は確認系専用)
- (C) `/identity/list` `/identity/:id` のような短縮 path → events list が `/events` で複数形を使っているため統一感を優先

### D2. 一覧の DataTable 列構成

events list 画面 (`admin-events-list` spec) と同じパターンで以下 6 列:

1. **提出日時**: `uploaded_at` を `MM/DD HH:mm` で表示。mono フォント
2. **ユーザー名**: アバター (先頭文字の丸チップ) + `members.display_name` を join 取得 (event-participants spec の参加者列と同じパターン)
3. **メール**: `members.email`。mono + muted 色
4. **書類種別**: `DOCUMENT_TYPE_LABELS[document_type]` を Badge で表示。マイナンバーカードのみ赤系 (`bg-danger-soft text-danger`) で警告色
5. **ステータス**: `status` を翻訳した Badge — `pending` (neutral / 黄系) / `approved` (success / 緑) / `rejected` (danger / 赤)
6. **操作**: 「詳細」リンク (`<router-link to="/identity-documents/:id">`)

行全体クリックでの遷移はしない (events-list と同じ判断、誤操作リスク回避)。

#### ソート規則

デフォルトソート: `status = 'pending'` を最上位に固定 (運営の見落とし防止)、その内では `uploaded_at desc` (新しい提出が上)。`status != 'pending'` の行はその下で `uploaded_at desc` のみ。

URL クエリ `?sort=` は提供せず (events-list は `?sort=date&dir=` を持つが、本画面は固定ソートで十分)。フィルタ + ページネーションのみ URL 同期。

### D3. ステータスフィルタの仕様

URL クエリ `?status=pending|approved|rejected|all` で同期。デフォルト `pending` (運用優先度が最も高い)。

UI: events-list 画面と同じ `Select` プリミティブで実装。ラベルは「ステータス」、選択肢は「未対応 (pending)」「承認済 (approved)」「差し戻し (rejected)」「すべて (all)」。

#### 検索仕様

- 対象列: `members.display_name` または `members.email` (`ILIKE %q%`)
- URL: `?q=...`
- デフォルト: 空文字 (無効)
- UI: events-list と同じ Toolbar 配置

#### ページネーション

- 1 ページ 25 件固定 (events-list と同じ)
- URL: `?page=N`
- 範囲外 (実データ少 + page=999) は Empty 状態を表示

### D4. 詳細画面の構成

`/identity-documents/:id` の画面を 4 ブロックで縦に並べる:

1. **TopBar**: パンくず「本人確認書類 > <提出日時 MM/DD>」+ ユーザー display_name + email + 書類種別 Badge + ステータス Badge
2. **ユーザー情報カード**: display_name / email / birthday (`YYYY/MM/DD`) / phone / experience_level Badge — `members` から join 取得
3. **書類カード**:
   - 書類種別ラベル (`DOCUMENT_TYPE_LABELS[document_type]`)
   - 受付条件 (`DOCUMENT_TYPE_REQUIREMENTS[document_type]`) — マイナンバーカード以外で表示。マイナンバーは「個人番号 12 桁が完全マスク済みであること」固定文言を表示
   - 画像プレビュー: 表面 (常に表示) + 裏面 (`storage_path_back IS NOT NULL` のときのみ表示)
   - マイナンバーカード時のみ画像エリア上部に赤系リマインダーバナー
4. **アクションフッター**: 承認 / 差し戻し / マスク漏れ削除 (マイナンバーのみ) のボタン群 + 既に処理済 (`status != 'pending'`) のときは disabled + 「確定済」表示

ブロック間は `gap-hq-6` 程度の余白で区切る。モバイル (375px) では各ブロックを縦積み、画像プレビューは画面幅に合わせて `aspect-ratio: 85/54`。

### D5. 画像プレビュー実装

#### サムネイル

- 表面 / 裏面とも `aspect-ratio: 85/54` (マイナンバーカード実比率) のタイルで表示
- `<img src={signedUrl} loading="lazy" decoding="async">` で実装
- 画像 click で Dialog モーダル拡大表示 (D6)
- signed URL 取得失敗時は タイル内に「画像を取得できませんでした」+ 「再試行」ボタンを表示 (4 状態 inline error)

#### Dialog 拡大モーダル

- shadcn-vue `Dialog` プリミティブを `apps/admin/src/shared/ui/Dialog.*` として copy-paste 取り込み (新規)
- モーダル内: `<img src={signedUrl}>` + ズーム切替ボタン (1x / 2x / 4x)
- ズームは CSS `transform: scale()` のみで実装。スクロール / パン操作は MVP1 範囲外 (4x で画面に収まらない場合は overflow-auto の親要素でスクロール)
- ESC キー or × ボタン or 背景クリックで閉じる (Dialog プリミティブ標準)

**代替案と却下理由:**
- (A) ズーム外部ライブラリ (`panzoom`, `lightgallery` 等) → 依存 + 学習コストの割に MVP1 のレビュー作業時間短縮効果が小さい
- (B) AlertDialog で代用 → AlertDialog は確認 / アクション系専用、UX 上不適合
- (C) 別画面 `/identity-documents/:id/preview` → ナビゲーションが煩雑、レビュー中に状態が失われる懸念

### D6. signed URL の発行と有効期限

`apps/admin/src/entities/identity-document/api/getSignedUrl.ts`:

```ts
export async function getSignedUrl(path: string): Promise<Result<string, 'storage_failed'>> {
  const { data, error } = await getSupabase()
    .storage
    .from('identity-documents')
    .createSignedUrl(path, 3600); // 1 時間
  if (error || !data?.signedUrl) return { ok: false, error: 'storage_failed' };
  return { ok: true, value: data.signedUrl };
}
```

- **有効期限 1 時間**: admin がブラウザを開いたまま長時間放置しても URL を再生成、URL 漏洩時のリスク窓口を最小化
- **有効期限切れ時**: 画像 `<img>` の onerror で再 fetch を試みる。連続失敗で「再試行」ボタンを表示
- **同一画像の再生成**: 表面 / 裏面ともに画面表示時に各 1 回発行。Dialog 拡大時は同じ URL を流用 (再発行しない)
- **RLS 通過**: 既存 Storage RLS で admin は他人配下のオブジェクトを SELECT できるため、signed URL も admin 権限で発行可能

**代替案と却下理由:**
- (A) public URL を使う → バケットを public にする必要があり、URL 知っている第三者がアクセス可能になり SOP 違反
- (B) Edge Function で proxy 経由 → 過剰、無料枠の冷起動 latency が UX に響く

### D7. 承認アクション

`features/identity-document-approve/`:

```ts
async function approve(id: IdentityDocumentId, adminMemberId: MemberId): Promise<Result<void, ApproveError>> {
  const { error } = await getSupabase()
    .from('identity_documents')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminMemberId,
    })
    .eq('id', id)
    .eq('status', 'pending'); // 二重承認防止 (WHERE 条件)
  if (error) return { ok: false, error: 'db_failed' };
  return { ok: true, value: undefined };
}
```

UX フロー:
1. admin が「承認」ボタン押下
2. `AlertDialog` 表示: タイトル「この書類を承認しますか？」 + 説明「<display_name> さんの <document_type> を承認します。承認後はユーザーが予約できる状態になります。」 + ボタン「キャンセル」「承認する」
3. 「承認する」確定で mutation 発行
4. 成功時: Toast「承認しました」+ 一覧 `/identity-documents` へ戻る
5. 失敗時: AlertDialog 内に inline error「承認に失敗しました」+ 状態は変化しない (再試行可能)
6. WHERE 句で 0 行更新の場合 (既に他 admin が承認済 / 差し戻し済): エラーコード `ALREADY_REVIEWED` で「既に他の管理者が処理しました」を表示し一覧へ戻る

### D8. 差し戻しアクション

`features/identity-document-reject/`:

```ts
async function reject(id: IdentityDocumentId, adminMemberId: MemberId, reason: string): Promise<Result<{ memberEmail: string; memberName: string }, RejectError>> {
  if (reason.trim().length === 0 || reason.length > 500) return { ok: false, error: 'invalid_reason' };

  const { data, error } = await getSupabase()
    .from('identity_documents')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminMemberId,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('member:members(display_name, email)')
    .single();
  if (error || !data) return { ok: false, error: 'db_failed' };
  return { ok: true, value: { memberEmail: data.member.email, memberName: data.member.display_name } };
}
```

UX フロー:
1. admin が「差し戻し」ボタン押下
2. `AlertDialog` 表示: 理由テキストエリア (必須、最大 500 字、placeholder「例: 画像が不鮮明で氏名・住所が読み取れません」) + ボタン「キャンセル」「差し戻す」
3. テキスト未入力では「差し戻す」ボタン disabled
4. 「差し戻す」確定で mutation 発行
5. 成功時: Toast「差し戻しました」+ Dialog を mailto: リンク表示モードに切替 (D9 参照) + 「メール送信ボタン」を中央配置
6. 失敗時: Dialog 内に inline error
7. mailto: リンク押下後 (実際の送信は admin の手元のメーラーで完了) admin が「閉じる」を押すと一覧へ戻る

### D9. mailto: 起動方式 (再提出依頼メール送信)

差し戻し / マスク漏れ削除完了後、Dialog に以下のボタンを表示:

```html
<a
  href="mailto:{memberEmail}?subject={subject}&body={body}"
  class="hq-button-primary"
  target="_blank"
  rel="noopener noreferrer"
>
  ユーザーへ再提出依頼メールを送信
</a>
```

- `subject`: `[High Q] 本人確認書類の再提出のお願い` (URL エンコード済)
- `body`: テンプレート文言 + rejection_reason (URL エンコード済)

#### body テンプレート (差し戻し用)

```
{memberName} 様

High Q バレーボールサークルです。
ご提出いただいた本人確認書類について、以下の理由で再提出をお願いいたします。

差し戻し理由:
{reason}

恐れ入りますが、再度 https://reservation.high-q-volleyball.com/signup/identity からご提出ください。

ご不明点があればこのメールに返信ください。

High Q バレーボールサークル
```

#### body テンプレート (マスク漏れ削除用)

```
{memberName} 様

High Q バレーボールサークルです。
ご提出いただいたマイナンバーカード画像について、個人番号 (裏面 12 桁) のマスクが不十分だったため、安全のため Storage から完全削除いたしました。

お手数ですが、個人番号を完全に隠した状態で再撮影し、再度 https://reservation.high-q-volleyball.com/signup/identity からご提出ください。

マスキング方法は再提出画面の「サンプル比較」をご参照ください。

High Q バレーボールサークル
```

両テンプレート文言は `apps/admin/src/features/identity-document-reject/templates/` に切り出し、テストで body 構築の URL エンコード結果を検証する。

**代替案と却下理由:**
- (A) Edge Function 経由で Resend を呼ぶ → Resend 契約 + 独自ドメイン取得 + DNS 設定が前提、本件単独の Apply で完結しない
- (B) Supabase Auth の `inviteUserByEmail()` を流用 → 文面が固定 (招待メール文面)、差し戻し理由を載せられない、招待 token も生成され混乱
- (C) 完全に手動運用 (admin が画面外で Gmail を開いて手書き) → ヒューマンエラーで宛先間違い・rejection_reason のコピペ漏れの可能性

採用案 (mailto:) は **件名 / 本文 / 宛先がすべて URL に埋め込まれた状態でメーラーが起動** するため、admin は中身を確認して送るだけ。ヒューマンエラーを最小化しつつ Phase 1 の運用コストもゼロ。

### D10. マスク漏れ即時削除アクション

`features/identity-document-mask-delete/`:

```ts
async function maskDelete(id: IdentityDocumentId, adminMemberId: MemberId, paths: { front: string; back: string | null }): Promise<Result<{ memberEmail: string; memberName: string }, MaskDeleteError>> {
  const supabase = getSupabase();

  // 1. Storage から表 + 裏 (任意) のオブジェクトを削除
  const pathsToRemove = [paths.front, paths.back].filter((p): p is string => p !== null);
  const { error: storageError } = await supabase.storage.from('identity-documents').remove(pathsToRemove);
  if (storageError) return { ok: false, error: 'storage_failed' };

  // 2. DB を rejected + storage_path クリア + rejection_reason 固定文言で UPDATE
  const FIXED_REASON = '個人番号がマスクされていないため削除しました。再提出をお願いします';
  const { data, error } = await supabase
    .from('identity_documents')
    .update({
      status: 'rejected',
      rejection_reason: FIXED_REASON,
      storage_path_front: null, // 削除済みマーカー
      storage_path_back: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminMemberId,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('member:members(display_name, email)')
    .single();
  if (error || !data) {
    // Storage は削除済だが DB UPDATE 失敗 → 不整合状態。admin が手動で再操作で解消するしかない (Toast で通知)
    return { ok: false, error: 'db_failed_after_storage_delete' };
  }
  return { ok: true, value: { memberEmail: data.member.email, memberName: data.member.display_name } };
}
```

#### `storage_path_front` を NULL に設定する判断

DB 列を `NULL` に設定する目的:
- Storage オブジェクトが削除済みであることを DB レベルで明示 (`storage_path_front IS NULL` で「削除済」を判定可能)
- 将来 (#172 役所提出ダウンロード等) で Storage 存在チェックする際に DB 側で先にフィルタできる
- admin レビュー画面 (本件) で「削除済み」表示を簡単にする

ただし `storage_path_front` は現状 `NOT NULL` 制約 (data-schema spec)。本 change で **既存の NOT NULL 制約を解除** する必要があるか?

**判断**: NOT NULL 制約を解除するか、もしくは削除済みマーカー文字列 (例: `'<deleted>'`) を入れるかの選択。

採用: **NOT NULL 制約を解除** する。マイグレーション `ALTER TABLE identity_documents ALTER COLUMN storage_path_front DROP NOT NULL` を本 change の Apply で発行。本番 DB は存在する書類が存在しない / または検証段階のため互換問題なし。`storage_path_back` は元から NULL 可。

**代替案 (削除済みマーカー文字列)** との比較: マーカー文字列は CHECK 制約で形式チェックするか、コードで `if (path === '<deleted>')` 分岐するか必要で、マジック文字列の意味が薄れる。NULL の方が概念的にクリア。

**マイグレーション**: 本 change の design に追加。data-schema spec も Modified Capabilities に格上げが必要 → 再判断。

実は data-schema spec の「identity_documents テーブル」Requirement で `storage_path_front (text NOT NULL — Supabase Storage 内の表面画像キー)` とあり、これを変更する必要がある。よって **data-schema を Modified Capabilities に追加** し、本 change の specs に delta spec を作成する。

→ proposal.md の Capabilities セクションを修正する必要がある (Decisions 確定後に proposal も更新)。

UX フロー:
1. admin が「マスク漏れ削除」ボタン押下 (マイナンバーカードの場合のみ表示)
2. `AlertDialog` 表示: タイトル「この画像を Storage から完全削除しますか?」 + 説明「個人番号のマスクが不十分な可能性のあるため、Storage から完全削除し、ユーザーに再提出を依頼します。この操作は元に戻せません。」 + ボタン「キャンセル」「削除する」
3. 「削除する」確定で mutation 発行
4. 成功時: Toast「削除しました」 + Dialog を mailto: リンク表示モードに切替 + 「メール送信ボタン」表示
5. 失敗時:
   - Storage 失敗: Dialog 内 inline error「Storage 削除に失敗しました。再試行してください」
   - DB 失敗 (Storage 削除済): Dialog 内 inline error「DB 更新に失敗しました。Storage は削除済みです。Supabase Dashboard から手動で DB を更新してください」 + admin への通知 (Toast / 緊急時エスカレーション SOP §6 参照)
6. mailto: リンク押下後 admin が「閉じる」で一覧へ戻る

### D11. 二重承認 / 二重操作の防御

複数 admin が同じ書類を同時に処理した場合:

#### DB レベル

すべての mutation で `WHERE status = 'pending'` を WHERE 句に含める。先着 1 件のみヒット、後着は 0 行更新で `ALREADY_REVIEWED` エラー。

#### クライアント レベル

- 詳細画面マウント時に取得した `status` が `'pending'` 以外の場合、アクションボタン全体を disabled + 「処理済」表示
- アクション in-flight 中は全ボタンを `aria-busy="true"` で disabled (連打防止)
- 承認 / 差し戻し / マスク漏れ削除 mutation の Promise.all は **行わない** (相互排他、1 つのみ実行)

### D12. pending 件数 Badge / TopNav / Dashboard サマリ

`features/identity-document-pending-badge/composables/usePendingCount.ts`:

```ts
export function usePendingCount(): Ref<number> {
  const count = ref(0);
  async function fetch() {
    const { count: c } = await getSupabase()
      .from('identity_documents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    count.value = c ?? 0;
  }
  onMounted(fetch);
  // visibilitychange でフォアグラウンド復帰時に再 fetch
  onMounted(() => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetch();
    });
  });
  return count;
}
```

#### 表示位置

- **TopNav (層): 既存 admin layout (`apps/admin/src/app/AppLayout.vue` 相当) の `/identity-documents` リンクの右側に件数 Badge** (count > 0 のときのみ赤系で表示、0 のときは非表示)
  - 既存 layout の実装場所は Apply 開始時に確認し、適切な箇所に追加 (events list の例を参考)
- **HomePlaceholder (`/`)**: 「未確認の書類: N 件」のサマリカードを `/events` カードの隣に追加。0 件のときは「すべて処理済」と表示
- **更新タイミング**: ページマウント時 + visibilitychange + 各 mutation 成功後 (manual invalidate)

#### 同時 admin 操作との整合

usePendingCount は composable instance ごとに別 ref を持つ。複数の admin が同時に承認した場合、自分の操作後に再 fetch するため数値はやや揺れる (他 admin の影響反映までに数秒の lag)。MVP1 ではこれを許容。

### D13. 取得方法の単一性 (admin 用 view を作るか)

events-list / event-detail では `event_list_view` / `event_detail_view` / `event_participants_view` を作成し、N+1 と RLS 漏れを回避している。

本件で同等の view (`identity_documents_review_view`) を作るかの判断:

**作らない判断を採用**。理由:
- 一覧の必要列: `identity_documents.{id, member_id, document_type, status, uploaded_at}` + `members.{display_name, email}`。**Supabase の Foreign Table 暗黙 join** (`select *, member:members(display_name, email)`) で 1 クエリで取得可能
- 詳細画面の必要列: 上記 + `members.{birthday, phone, experience_level}` + `identity_documents.{rejection_reason, reviewed_at, reviewed_by, storage_path_front, storage_path_back}`。これも `select *, member:members(*)` で 1 クエリ
- pending 件数: `count(*)` のみ、view 不要
- view を作るメリットは「is_first_time のような派生列を view 側で計算する」ようなケース。本件の必要列はすべてベーステーブルの直接列なので view を作る理由がない
- view を作らない代わりに、admin 用 entities `entities/identity-document/api/identityDocumentQueries.ts` に取得関数を集約 (関数レベルで再利用性確保)

**RLS 漏れリスクへの対処**: members の RLS は `auth.uid() = id OR is_admin()`。本件は admin が呼ぶ前提のため、`is_admin() = true` で member 全件取得可能。anon / 一般 member が直接呼んでも自分の member のみ取得 = 漏洩なし。

#### Supabase クライアントクエリ例

```ts
// 一覧
const { data } = await supabase
  .from('identity_documents')
  .select('id, member_id, document_type, status, uploaded_at, member:members(display_name, email)')
  .eq('status', 'pending')
  .order('uploaded_at', { ascending: false })
  .range(0, 24);

// 詳細
const { data } = await supabase
  .from('identity_documents')
  .select(`
    id, member_id, document_type, status, rejection_reason,
    storage_path_front, storage_path_back,
    uploaded_at, reviewed_at, reviewed_by,
    member:members(display_name, email, birthday, phone, experience_level)
  `)
  .eq('id', id)
  .single();
```

### D14. テスト戦略

| 層 | 範囲 | 件数目安 |
|---|---|---|
| **unit (vitest)** | mutation 関数の Result 型分岐 (approve / reject / maskDelete の各エラー) + mailto: body 構築の URL エンコード | 10-12 件 |
| **composable (vitest + Supabase mock)** | useIdentityDocumentsList (ページ + フィルタ + 検索の URL クエリ同期) / useIdentityDocumentDetail (取得 + 4 状態) / useIdentityDocumentApprove / useIdentityDocumentReject / useIdentityDocumentMaskDelete / usePendingCount | 15-20 件 |
| **component (vitest + @vue/test-utils)** | IdentityDocumentsListPage (4 状態 / フィルタ / 検索 / ページネーション) / IdentityDocumentDetailPage (4 状態 / 各アクション AlertDialog 開閉 / 二重承認防止 / マイナンバーリマインダー / mailto: リンクの href 構築) / Dialog プリミティブ (新規取り込み分の単体 spec) | 20-25 件 |
| **E2E (Playwright)** | happy path 1 件: 認証済 admin で `/identity-documents` を開く → pending 行を選択 → 詳細画面で承認 → 一覧から消える / approved 件数が増える | **1 件のみ** (CLAUDE.md ルール遵守) |

E2E は Storage の signed URL 発行を mock する (実 Supabase に画像を置かない、画像表示は dummy data)。Storage operations は `page.route('**/storage/**')` で intercept。

### D15. アクセシビリティ詳細

- 一覧 DataTable: `<table>` + ヘッダ `<th>` + データ `<td>`。フィルタ Select は `<label>` で関連付け
- 詳細画面の各アクションボタン: `aria-label` を持つ。disabled 時は `aria-disabled="true"`
- AlertDialog: `role="alertdialog"` + フォーカストラップ + `aria-labelledby` + `aria-describedby`
- 画像プレビュー: `<img alt="<書類種別> の表面" />` でスクリーンリーダー対応。Dialog 内も alt 属性継承
- マイナンバーリマインダー: `role="alert"` + 朱色サイドボーダー
- pending Badge: `aria-label="未対応の書類 N 件"` を付与
- Tab キーで TopBar → ユーザー情報 → 画像プレビュー → アクションボタンの順にフォーカス移動
- ESC で Dialog (画像プレビュー / AlertDialog) を閉じる

### D16. FSD レイヤー配置

```
apps/admin/src/
├── pages/
│   ├── IdentityDocumentsListPage.vue
│   └── IdentityDocumentDetailPage.vue
├── widgets/
│   ├── identity-documents-list/
│   │   ├── ui/IdentityDocumentsListWidget.vue
│   │   ├── ui/IdentityDocumentsTable.vue
│   │   ├── ui/IdentityDocumentsToolbar.vue
│   │   ├── ui/IdentityDocumentsListSkeleton.vue
│   │   ├── ui/IdentityDocumentsListEmpty.vue
│   │   ├── ui/IdentityDocumentsListError.vue
│   │   ├── composables/useIdentityDocumentsListData.ts
│   │   └── index.ts
│   └── identity-document-detail/
│       ├── ui/IdentityDocumentDetailWidget.vue
│       ├── ui/IdentityDocumentDetailTopBar.vue
│       ├── ui/IdentityDocumentMemberCard.vue
│       ├── ui/IdentityDocumentImagePreview.vue
│       ├── ui/IdentityDocumentImageDialog.vue
│       ├── ui/IdentityDocumentMynumberReminder.vue
│       ├── ui/IdentityDocumentActionsFooter.vue
│       ├── composables/useIdentityDocumentDetailData.ts
│       └── index.ts
├── features/
│   ├── identity-documents-filter/
│   │   ├── composables/useIdentityDocumentsFilter.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── identity-document-approve/
│   │   ├── composables/useIdentityDocumentApprove.ts
│   │   ├── ui/IdentityDocumentApproveDialog.vue
│   │   └── index.ts
│   ├── identity-document-reject/
│   │   ├── composables/useIdentityDocumentReject.ts
│   │   ├── ui/IdentityDocumentRejectDialog.vue
│   │   ├── templates/rejectMailBody.ts
│   │   └── index.ts
│   ├── identity-document-mask-delete/
│   │   ├── composables/useIdentityDocumentMaskDelete.ts
│   │   ├── ui/IdentityDocumentMaskDeleteDialog.vue
│   │   ├── templates/maskDeleteMailBody.ts
│   │   └── index.ts
│   └── identity-document-pending-badge/
│       ├── composables/usePendingCount.ts
│       ├── ui/PendingCountBadge.vue
│       └── index.ts
├── entities/
│   └── identity-document/
│       ├── model/identityDocument.types.ts
│       ├── api/identityDocumentQueries.ts
│       ├── api/getSignedUrl.ts
│       └── index.ts
└── shared/ui/
    ├── Dialog.vue (新規, shadcn-vue)
    ├── DialogContent.vue
    ├── DialogTrigger.vue
    ├── DialogHeader.vue
    ├── DialogFooter.vue
    ├── DialogTitle.vue
    ├── DialogDescription.vue
    └── DialogClose.vue
```

依存方向は `pages → widgets → features → entities → shared` の一方向のみ。`features` 同士の相互依存禁止。

### D17. デザイントークン使用方針

- 色: `var(--hq-paper)` / `var(--hq-ink)` / `var(--hq-accent)` / `var(--hq-success)` / `var(--hq-danger)` / `var(--hq-hairline)` 等を Tailwind preset utility 経由で使用 (`bg-paper text-ink border-hairline` 等)
- spacing: `gap-hq-4` / `p-hq-6` / `py-hq-2` (preset の HQ spacing utility)
- font: 既存 admin の font-jp / font-mono を流用
- Badge / Button 系は `@high-q/ui` の Button (確定) と shadcn-vue の Badge (未取り込み、必要なら追加)

マジックナンバー (`#xxxxxx` / `[12px]` 等) 禁止。実装時に grep で検証 (events-list spec の Scenario と同じ)。

### D18. SOP 更新内容

`docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`:

- §2「admin レビュー時の確認フロー」: 「(admin 側 #171 で実装)」表記を「(admin 側 #171 ✅ 実装済 / <日付>)」へ更新
- §2「マスク漏れ即時削除 SOP」: 実装に合わせて「mailto: リンクからメーラー起動 → admin が手動送信」のフローを 1 ステップ追加
- §4「DB」: storage_path_front が NULL 可能になったことを反映 (削除済みマーカーとして NULL を使う方針を追記)
- §6「緊急時のエスカレーション」: 「DB UPDATE が Storage 削除後に失敗した場合の手動復旧手順」を追記
- 改訂履歴: 本 change の行を追加

### D19. data-schema の Modified Capabilities

`storage_path_front` の NOT NULL 制約を解除する必要があるため、`data-schema` capability の `identity_documents テーブル` Requirement を Modified Requirements として変更する。

specs/data-schema/spec.md (delta) に MODIFIED Requirements として該当箇所をフルコピー + storage_path_front の制約を NULL 可に変更した版を記載する。

migration SQL:

```sql
-- supabase/migrations/<timestamp>_relax_identity_documents_storage_path_front.sql
ALTER TABLE public.identity_documents
  ALTER COLUMN storage_path_front DROP NOT NULL;
```

本番 DB の現状: 数行レベル (#92 マージ後の検証 / 翔太郎くん本人のテスト提出のみ)。NOT NULL 解除は既存値に影響しないため、安全。

### D20. テンプレート文言の SSOT

差し戻しメール / マスク漏れ削除メールの body テンプレートは `apps/admin/src/features/identity-document-{reject,mask-delete}/templates/` に配置。Phase 2 で Resend 化する際にも同テンプレートを再利用するため、関数として export し純粋な文字列構築に留める (副作用なし)。

```ts
export function buildRejectMailBody(memberName: string, reason: string): string { ... }
export function buildMaskDeleteMailBody(memberName: string): string { ... }
```

URL エンコードは呼び出し側 (Vue の computed) で `encodeURIComponent()` を適用。

### D22. pending 会員の予約可否方針 (#196 の方針逆転)

翔太郎くん 2026-05-05 判断: **pending 会員の予約は可能** (許容) とする。

旧方針 (#196 で予定していた「pending 予約禁止ガード」): pending 会員は本人確認未承認のため予約不可。reservation 側で予約 mutation の前段に `hasIdentityDocument === 'approved'` の guard を設ける案。

新方針 (本件 2026-05-05 確定): pending 会員も予約可能。承認はベストエフォートで運用 (admin が SLA 3 日以内にレビュー)。差し戻し時のみ後始末ロジックを admin 側で発動 (D23 / D24)。

**採用理由:**
- 会員ジャーニーの「軽さ」: 書類提出 → admin 承認待ちの間も予約できる方が体験が良い
- admin の承認 SLA が短い (3 日以内目標) ため、pending → approved への遷移はほぼ自動的
- 差し戻し率は実運用で 5-10% 程度を想定 (マスク漏れ + 不鮮明 + 期限切れ)。差し戻された場合のみ後始末で対処すればよい
- pending を予約不可とすると「初回参加までの摩擦」が増えて初動の会員獲得が鈍る懸念

**トレードオフ:**
- pending 会員の予約をそのまま active で残すと、後で reject されたときにイベント定員に「実は来ない人」がカウントされる期間が発生
- これを D23 (連鎖予約キャンセル) で解消

**#196 の扱い**: 本件マージ時にクローズ。本件 PR 本文に `Closes #171, Supersedes #196` を明記。

### D23. 差し戻し / マスク漏れ削除時の連鎖予約キャンセル

差し戻し / マスク漏れ削除のいずれの mutation でも、identity_documents の UPDATE 成功後に **当該 member の active 予約を一括キャンセル** する。

#### 対象範囲

| reservations.status | 対象 | 理由 |
|---|---|---|
| `'reserved'` | **対象 (cancelled に UPDATE)** | 未来のイベント予約。本人確認未承認のためキャンセル相当 |
| `'waitlist'` | **対象 (cancelled に UPDATE)** | キャンセル待ちも本人確認未承認のため無効化 |
| `'attended'` | **除外** | 来場済の事実は保持。運営ログ・統計の整合性を優先 |
| `'no_show'` | **除外** | 過去イベントの記録なので変更しない |
| `'cancelled'` | **除外** | 既にキャンセル済 |

#### 実装

`features/identity-document-reject/composables/useIdentityDocumentReject.ts` および `features/identity-document-mask-delete/composables/useIdentityDocumentMaskDelete.ts` の mutation に以下を組み込む:

```ts
// identity_documents UPDATE 成功後
const { error: cancelError, count: cancelledCount } = await supabase
  .from('reservations')
  .update({ status: 'cancelled' })
  .eq('member_id', memberId)
  .in('status', ['reserved', 'waitlist'])
  .select('*', { count: 'exact', head: true });

if (cancelError) {
  // identity_documents は rejected 化済 + 予約キャンセルが失敗
  // → admin に Toast で通知し、Supabase Dashboard で手動キャンセルを誘導
  return { ok: false, error: 'cancel_failed_after_reject', cancelledCount: 0 };
}

return { ok: true, value: { memberEmail, memberName, cancelledCount: cancelledCount ?? 0 } };
```

#### 既存トリガーとの関係

`set_reservations_cancelled_at` トリガー (data-schema spec) が `cancelled_at = now()` を自動設定するため、明示的な cancelled_at 指定は不要。

#### RLS の整合

既存 reservations RLS で admin は全 member の reservations を `'cancelled'` に UPDATE 可能 (`is_admin()` 通過、UPDATE は全件・全 status へ可)。本件で RLS 変更不要。

#### キャンセル件数の通知

mutation の Result.value に `cancelledCount` を含める。Dialog の mailto: リンクの body 構築時にこの値を埋め込み、ユーザーに「<N> 件の予約がキャンセルされた」を明示する。

mailto: body テンプレート更新 (差し戻し用、マスク漏れ削除も類似):

```
{memberName} 様

High Q バレーボールサークルです。
ご提出いただいた本人確認書類について、以下の理由で再提出をお願いいたします。

差し戻し理由:
{reason}

なお、本人確認の再提出が必要となったため、お持ちの予約 {cancelledCount} 件をキャンセルさせていただきました。
お手数ですが書類を再提出いただいたのち、改めて予約をお願いします。

再提出: https://reservation.high-q-volleyball.com/signup/identity

ご不明点があればこのメールに返信ください。

High Q バレーボールサークル
```

`cancelledCount === 0` のときは「予約はキャンセルされていません」相当の文言に切り替える (条件分岐をテンプレート関数内に実装)。

**代替案と却下理由:**
- (A) 連鎖キャンセルしない (本人確認未承認でも予約は active のまま) → イベント当日に「来ない人」が定員にカウントされ続ける、admin が個別に手動キャンセルする手間 (運用負荷増)
- (B) 連鎖キャンセルを **別 mutation として手動実行** (Dialog で「予約もキャンセルしますか？」と問う) → 翔太郎くんが毎回判断する手間 + 操作忘れリスク。差し戻しは原則として「本人確認未完了なので予約も無効」が正しい運用、自動化が安全
- (C) reservations.status に新規 `'pending_review'` を追加 → DB スキーマ変更が大きい、既存の `'cancelled'` で十分 (cancelled_at + cancel reason 列があれば追跡可能だが、MVP1 では reason 列なしで OK)

採用案 (自動連鎖キャンセル) はコード量も少なく、admin の手間ゼロ。

### D24. hasIdentityDocument 判定ロジック変更 (reservation 側)

reservation 側 `useAuthSession.hasIdentityDocument` の判定ロジックを変更:

#### 旧 (#92 で実装済)

```ts
// apps/reservation/src/entities/member/api/identity-document-existence.ts
const { data, error } = await supabase
  .from('identity_documents')
  .select('id')
  .eq('member_id', memberId)
  .limit(1);
return data && data.length > 0;
```

→ identity_documents 行が **1 件以上 (status 不問)** で `hasIdentityDocument = true`。差し戻し後も rejected 行が残るため true のまま、`/signup/identity` 強制誘導が **発動しない** という問題があった。

#### 新 (本 change で変更)

```ts
const { data, error } = await supabase
  .from('identity_documents')
  .select('id')
  .eq('member_id', memberId)
  .in('status', ['pending', 'approved'])
  .limit(1);
return data && data.length > 0;
```

→ `'pending'` または `'approved'` の行が 1 件以上で true。`'rejected'` のみ持つ member は false 扱いとなり、router guard で `/signup/identity` へ強制誘導される。

#### auth guard との連動 (reservation 側 既存 router.ts)

reservation の auth guard は `authed && profileDone && !hasIdentityDocument → /signup/identity` の分岐を持つ (既存)。本判定ロジックの変更で、rejected member もこの分岐にヒットして再提出フローが開始する。

#### 影響を受ける spec / file

- `apps/reservation/src/entities/member/api/identity-document-existence.ts` の SQL 変更
- `apps/reservation/src/entities/member/api/identity-document-existence.spec.ts` に「rejected のみ持つ member は false」「pending と rejected を混在で持つ member は true」の Scenario 追加
- `apps/reservation/src/features/auth/composables/useAuthSession.spec.ts` に同上 Scenario 追加
- `openspec/specs/reservation-identity-document-upload/spec.md` の 2 Requirement (`AuthSession に hasIdentityDocument` / `/signup/identity 強制誘導`) を MODIFIED で更新

**代替案と却下理由:**
- (A) `hasIdentityDocument` を 3 値 (none / pending / approved / rejected) に変更 → router guard ロジックが複雑化、関数戻り値の boolean 簡潔さを損なう
- (B) 差し戻し時に identity_documents 行を **物理削除** (DELETE)、`status='rejected'` 行は残さない → 差し戻し履歴が消えて admin の運用追跡が不可能 (rejection_reason / reviewed_at が見えなくなる)。SOP §5 監査運用の方針に反する
- (C) 専用の `members.identity_status` 列を追加して同期 → DB スキーマ追加 + トリガー / アプリ層同期コスト + 整合性リスク

採用案 (SQL 条件変更のみ) は最も軽量で、rejected 履歴も DB に保持される (admin レビュー画面で可視化可能)。

### D25. Dialog プリミティブ取り込み手順

shadcn-vue は CLI で copy-paste 取り込みできるが、本プロジェクトでは既存の AlertDialog / Toast / Table / Select と同じく **手動コピー方式** を採用 (CLAUDE.md「shadcn-vue を CLI で `apps/<app>/src/shared/ui/` に copy-paste」)。

ファイル一覧:
- `Dialog.vue` (root)
- `DialogContent.vue`
- `DialogTrigger.vue`
- `DialogHeader.vue`
- `DialogFooter.vue`
- `DialogTitle.vue`
- `DialogDescription.vue`
- `DialogClose.vue`

参考実装: `apps/admin/src/shared/ui/AlertDialog.*` の構造を踏襲し、`radix-vue` の `DialogRoot` / `DialogContent` ベースで実装。意匠は HQ token (`var(--hq-paper)` 等) で着色。

`shared/ui/index.ts` に追加 export。

## Risks / Trade-offs

| Risk | 影響 | Mitigation |
|---|---|---|
| マスク漏れ削除中に DB UPDATE が失敗 | Storage 削除済 + DB に古い path が残る不整合 | mutation 関数で error code `db_failed_after_storage_delete` を明示的に返し、admin に手動復旧 (Supabase Dashboard で UPDATE) を Toast で指示。SOP §6 に手動復旧手順を追記 |
| signed URL の漏洩 (admin 環境のスクリーンショット等) | URL を持つ第三者が 1 時間以内に画像取得可能 | URL 有効期限 1 時間 (D6) + URL は admin の画面外に出さない運用注意 (SOP §6 に追記) |
| 同時 admin 操作で承認後の状態反映ラグ | A admin が承認 → B admin の画面に反映が visibilitychange まで遅れる | 各 mutation 成功後に composable 側で再 fetch (D12) + visibilitychange でフォアグラウンド復帰時に再 fetch。pending Badge と詳細画面の status は数秒のラグを許容 |
| mailto: が admin の Gmail と紐付かない (デフォルトメーラーが別アプリ) | メール送信できない / スパム扱い | admin は翔太郎くん 1 人を想定 (CLAUDE.md)、本人の Mac に Gmail を mailto: ハンドラーとして登録するセットアップ手順を SOP に追記 |
| Dialog プリミティブの a11y 不足 (新規取り込み) | スクリーンリーダー / キーボード操作で利用不可 | radix-vue の Dialog はデフォルトで a11y AA 準拠 (フォーカストラップ / ESC / aria-labelledby)。component test で aria 属性を検証 |
| pending 件数取得の頻発で Supabase へのクエリ増 | Free プラン上限の早期消費 | composable は mount 時 + visibilitychange + mutation 後のみ fetch (リアルタイム購読しない)。head=true count クエリは軽量 |
| Issue 原文「個人番号 12 桁が見える場合」の判定が admin 主観 | 誤って approved にマスク漏れ画像が残るリスク | admin 目視で 100% ズーム拡大 (Dialog) + 判断に迷ったら reject 安全側 (SOP §2)。本 change で 4x ズームを提供することで目視精度を担保 |
| 連鎖予約キャンセル時にユーザーがイベント当日に「来ない人」と気付かないリスク | ユーザーが空手で会場へ来てしまう | mailto: の body にキャンセル件数 + 再予約誘導を明記 (D23)。MVP2 で予約キャンセル時の自動メール通知を別 Issue で実装 |
| 連鎖予約キャンセル mutation が部分失敗 (identity_documents は rejected 化済 / reservations UPDATE 失敗) | 不整合状態 (member は再提出フローへ誘導されるが予約は active のまま) | mutation の error code `cancel_failed_after_reject` で admin に Toast 通知し、Supabase Dashboard で手動キャンセルを誘導。SOP §6 に手動復旧手順追記。実運用で発生確率は極低 (両 UPDATE とも単純なため) |
| `hasIdentityDocument` 判定変更で既存 rejected member (本件マージ前から rejected を持つ member) が突然 `/signup/identity` へ誘導 | 体験が破壊的 | ファーストリリース前のため既存 rejected member は不在 (現状本番 DB は #92 マージ後 0 行レベル)。マージ後の運用で初めて rejected 行が増える |

## Migration Plan

### デプロイ

1. 本 PR を master へ merge (Render Preview で動作確認後)
2. Render で admin アプリが自動 redeploy される
3. **既存会員への影響**: reservation 側 (#92 ✅ 実装済) で書類提出していた pending 行が admin 画面で見えるようになる。承認 / 差し戻しが可能に
4. **既存 admin (翔太郎くん) への影響**: TopNav に新規メニュー「本人確認書類」+ pending 件数 Badge が出現。最初のアクセスで自分の手元の pending 行をレビュー
5. **DB Migration**: 本 change の Apply で `ALTER TABLE identity_documents ALTER COLUMN storage_path_front DROP NOT NULL` を発行。本番反映は翔太郎くん手動 (Supabase Dashboard or `supabase db push`)

### ロールバック

- 不具合発覚時: Render の前回 deploy へ revert (1 click)
- DB の NULL 可化はロールバックしても既存データには影響しない (NULL 値が無ければ DROP NOT NULL → 再 ADD NOT NULL は安全)
- Storage オブジェクト変更なし、RLS 変更なし

### マイグレーション SQL

`supabase/migrations/<timestamp>_relax_identity_documents_storage_path_front.sql`:

```sql
ALTER TABLE public.identity_documents
  ALTER COLUMN storage_path_front DROP NOT NULL;
```

本番 DB は新スキーマ (#92 で `storage_path_front` 列が NOT NULL で定義済) に対して NOT NULL を解除するのみ。既存値は影響を受けない。

## Open Questions (翔太郎くん 2026-05-05 確定済)

| 質問 | 確定 |
|---|---|
| pending Badge を表示する場所 | **TopNav (`/identity-documents` リンクの右) + HomePlaceholder サマリ** の 2 箇所 |
| 一覧のデフォルトステータスフィルタ | **pending** (運用優先度) |
| 自動メール通知を本 change スコープに含めるか | **含めない (別 Issue で MVP2)**、本件は mailto: で完結 |
| 一覧ソートのデフォルト | **pending 上位 + uploaded_at desc** |
| マスク漏れ削除時の DB 列 | **NULL** (D10) — 既存 NOT NULL 制約を解除する migration を本 change に含む |
| Dialog プリミティブの取り込み形態 | **手動コピー** (既存 AlertDialog と同じ方針) |
| **pending 会員の予約可否** | **可能 (許容)** — D22 |
| **差し戻し / マスク漏れ削除時の予約処理** | **`status IN ('reserved', 'waitlist')` を一括 `'cancelled'` に UPDATE** — D23 |
| **`hasIdentityDocument` の判定ロジック** | **`status IN ('pending', 'approved')` の行が 1 件以上で true** — D24 |
