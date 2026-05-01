# Design: admin イベント CRUD 画面

> 関連: proposal.md / specs/admin-events-crud/spec.md / specs/shadcn-vue-integration/spec.md / specs/admin-events-list/spec.md / Issue #86 / Epic #167
> Apply 開始時の宣言: 「project.md と本 design.md を読み直しました。現在の進捗: 0 / N タスク完了。技術制約: FSD レイヤー / shadcn-vue 機能系プリミティブ / Tailwind preset / 1 EventForm を mode で create/edit 共有 / 即時公開ポリシー（visibility = 'published' 固定投入）」

---

## 0. Context

`apps/admin` は #85（admin-events-list）で `/events` の閲覧 UI が完成した。一覧の「新規作成」CTA と行「編集」リンクは `/events/new` / `/events/:id/edit` へのプレースホルダ遷移として配線済みだが、遷移先のページが存在しない。本 change で **遷移先の Create / Edit 画面**を作り、admin が DB を直接触らずにイベント運用を完結できる状態にする。

**スコープ縮小（2026-05-01）**: Issue #86 本文は 5 セクション構成（基本情報 / 募集要項 / 紹介文 / サムネイル / 公開設定）と「下書き保存 / 公開のステータス切替」を要求しているが、MVP1 では「**いつ・どこで・いくらで**」を素早く登録できることを優先し、以下を MVP2 に押し下げ:
- 定員（capacity）— 当面は無制限運用
- 紹介文（Section 03）
- サムネイル画像（Section 04）
- 公開設定 Radio（Section 05）
- キャンセル期限
- 下書き保存ボタン / 限定公開
- プレビュー / 過去から複製 / Markdown プレビュー / 会場 inline 追加

結果としてフォームは **1 セクション（基本情報）に統合**。残るフィールドは 6 つ（タイトル / 開催日 / 開始 / 終了 / 会場 / 参加費）。

**運用方針**: 「**登録 → 即時表示 / 削除 → 即時非表示**」。INSERT 時は `events.visibility = 'published'` を固定投入し、保存と同時に LP / 予約サイトに公開される。削除すると公開からも消える（reservations の ON DELETE RESTRICT 制約あり）。

スキーマは db-schema-foundation で確立済みで、events.INSERT/UPDATE/DELETE は admin のみ可能（RLS 完備）。本 change での **DB Migration は不要**（既存スキーマで十分。`thumbnail_path` 列追加 / Storage バケット / RLS は MVP2 でサムネ機能が戻ったときに別 change で実施）。

UI スタックは admin-reservation-ui-foundation（#175）で確立済みで、Login（#84）と Events List（#85）で `Input` / `Label` / `FormField` / `Select` / `Table` / `Skeleton` を取り込み済み。本 change では `AlertDialog` / `Toast` を新たに admin に取り込む。`Button` は意匠系として `@high-q/ui` の `Button` を使い続ける（棲み分け維持）。

---

## 1. Goals / Non-Goals

### Goals

- 認証済み admin が `/events/new` から空フォーム → 入力 → 「保存」で events を作成できる
- 認証済み admin が `/events/:id/edit` から既存値をロード → 編集 → 「保存」で events を更新できる
- 認証済み admin が Edit 画面の「削除」→ AlertDialog の「削除する」を押下 → events を delete し `/events` に戻れる
- 保存時は `visibility = 'published'` 固定で LP / 予約サイトに即時公開される
- 削除すると LP / 予約サイトの公開イベント一覧からも即時に消える
- Create / Edit / Delete の各操作で 4 状態（Loading / Empty / Error / Success）を網羅し、操作結果を Toast で通知する
- バリデーション（必須 / 整合性）を純関数として切り出し、Vitest で単体テストできる
- `EventForm` を Create と Edit で**共有**し、コード重複を避ける（mode props で分岐）
- 一覧画面（#85）の CTA / 編集リンクを実画面に接続する

### Non-Goals

- **定員 / 紹介文 / サムネイル画像 / キャンセル期限**（MVP2 押し下げ — スコープ縮小）
- **下書き保存 / 限定公開 / 公開設定 Radio**（MVP2 押し下げ — 即時公開固定で運用）
- **過去から複製 / テンプレート機能**（MVP2 押し下げ）
- **公開前プレビュー画面**（MVP2 押し下げ）
- **会場 inline 追加**（venues マスタ画面は別 Issue。MVP1 では seed 固定）
- **タイトル一致タイプによる削除確認**（AlertDialog 2 段ボタンで十分）
- **下書きの自動保存**
- **他 admin のイベント編集ロック / リアルタイム衝突検知**（運用上 admin は当面 1 名）
- **events.fee の通貨単位**（円固定。i18n は別 Issue）
- **DB schema 変更**（thumbnail_path 列 / Storage バケット / Storage RLS は本 change では追加しない）

---

## 2. Decisions

### D1. Create / Edit を 1 つの `EventForm` で共有（mode prop で分岐）

**選択**: `EventForm` は `mode: 'create' | 'edit'` props と `initialEvent?: Event` props を受け取る単一コンポーネント。

**理由**:
- 1 セクションの DOM 構造 / バリデーション / Submit ハンドラの 90% は共通
- Create と Edit を別コンポーネントにすると、片方の変更が他方に伝播せず仕様乖離を起こす（過去のリポジトリ全体で繰り返された苦い経験）
- mode による違いはヘッダのアクション構成（Edit のみ「削除」）/ Submit 後の遷移（Create は URL 置換、Edit はその場 stay）の 2 点のみ。これは props と composable レベルで吸収可能
- `useEventForm(mode, initialEvent)` composable に state（reactive form state + dirty フラグ）と submit ロジックを集約

**代替案**:
- ❌ `EventCreateForm` / `EventEditForm` を別ファイル → 重複が大きく、保守コスト高
- ❌ 抽象 `BaseEventForm` + 継承 → Vue Composition API の利点を活かせず冗長

### D2a. バリデーション表示タイミング: late validation（保存押下まで非表示）

**選択** (2026-05-01 翔太郎くん要望): バリデーションは内部で常に評価しているが、UI に表示するのは **保存ボタンが押された後** から。それ以降はリアルタイム反映（修正されればすぐエラーが消える）。

**実装**:
- `useEventForm` に `showErrors: ref<boolean>` を持つ（初期 false）
- `displayErrors` computed が `showErrors=false` のとき空オブジェクトを返す
- `submit()` 開始時に `showErrors.value = true` をセット
- `reset()` で `showErrors=false` に戻す
- 保存ボタンの disabled は `isSubmitting` のみで判定（押せる状態）

**理由**:
- 入力中の即時バリデーション（aggressive validation）は Nielsen Norman / Material Design / Apple HIG 等で「フォーム UX のアンチパターン」として明確に否定されている: ユーザーが入力途中なのに「未入力エラー」で埋め尽くされフラストレーション源
- 保存ボタンが「なぜか disabled」状態は認知負荷が高い。「押せる → 押す → 何が足りないか分かる」のほうが直感的
- エラー表示後は inline でリアルタイム反映するため「修正されたかすぐ分かる」UX も両立

**代替案**:
- ❌ aggressive validation（input 中即時表示） → 上記の理由で却下
- ❌ blur 時のみ表示（フィールドベース touched） → きめ細かいが状態が増えて複雑。MVP1 では submit ベース 1 フラグで十分
- ❌ 保存ボタン disabled で防御 → 「なぜ押せないか」がユーザーに伝わらない

### D2. バリデーションは Zod 風純関数（外部依存なし）

**選択**: `model/eventFormSchema.ts` に `validateEventForm(form): ValidationErrors` を純関数として実装。Zod や VeeValidate などのスキーマライブラリは導入しない。

**理由**:
- バリデーション項目は 7 件以下で、Zod の表現力を必要としない
- `@high-q/shared` の `Result<T>` 型を流用してエラー型を統一できる
- 純関数のため Vitest で網羅テストが容易（依存注入不要）
- Submit 直前と各フィールドの blur 時で同じ関数を呼べば挙動が揃う

**代替案**:
- ❌ Zod 導入 → bundle size +13kb / 学習コスト / 既存に類似機能なし。後続 Issue（会員登録フォーム等）でも採用するなら別途検討
- ❌ HTML 標準の制約 (`required` / `min` / `max`) のみ → エラーメッセージの日本語化と aria 関連付けが煩雑

### D3. visibility は `'published'` 固定投入

**選択**: Create / Edit ともに `events.visibility = 'published'` を投入する（Create は INSERT で固定、Edit は読み込んだ値をそのまま戻す）。下書き / 限定公開 への切替 UI は MVP1 では提供しない。

**理由**:
- 「登録 → 即時表示 / 削除 → 即時非表示」という運用方針が翔太郎くんから明示された
- 公開状態の切替は MVP2 で公開設定セクションが戻ってきたときに併せて再設計する方が一貫性が高い
- MVP1 で admin が間違って「下書きのまま」公開し忘れる UX 事故を構造的に防ぐ

**代替案**:
- ❌ Create で `'draft'` 固定 + 別画面で「公開」ボタン → 2 画面化で UX が複雑化
- ❌ 下書き保存ボタンを残す → 「即時表示」要件と矛盾

**Risk**: 既存の seed データや別経路で `'draft'` / `'private'` の event が存在しても、本 change の Edit 画面で誤って `'published'` に書き換えてしまう。
**Mitigation**: Edit の UPDATE ペイロードに `visibility` を **含めない**（読み込んだ値を保持して送らない）。`useEventForm` の submit 処理で edit mode 時は `visibility` キーを omit。

### D4. Create / Edit ともに保存成功後は `/events`（一覧）に **置換遷移**（履歴非追加）

**選択**: Create / Edit いずれも 200 が返ると `router.replace("/events")` する。`router.push` は使わない。Toast「保存しました」は **router.replace の前** に発火し（モジュール state の `toasts` ref に entry を積む）、その後 navigation。Toaster は App.vue 永続マウントなので画面遷移後の一覧画面で同じ entry を描画する。

**Toast を replace の前に呼ぶ理由 (2026-05-01 翔太郎くん要望で更新)**:
- 旧実装は `await router.replace(...) → toast(...)` の順だった
- 実機モバイルで「Toast が出ない」事象が観測された
- 原因: `await router.replace` が解決する頃には EventCreatePage / EventEditPage が unmount 過渡期にあり、後続の `toast()` 呼び出しに到達しないケースがあった
- 修正: `toast()` を先に呼んで entry を module state に積んでから navigation。これで navigation 後の Toaster が確実に描画する。順序の見え方は「ボタン押下 → 一覧画面 → Toast 表示」で変わらない

**理由**（2026-05-01 翔太郎くん要望で更新）:
- 「保存 → 即時公開 → 一覧で公開中ステータスを確認」という運用フローが Create / Edit ともに自然
- `replace` でブラウザ履歴上「一覧 → 一覧」となり、`/events/new` や `/events/:id/edit` を履歴から落として「戻る」で空フォームに戻ったり、編集中の表示に戻る事故を防ぐ
- Edit 後に stay する旧設計は「再編集続行したい」UX を意図したが、運用上は「保存したら一覧で確認」が翔太郎くんの認知モデルと整合し、再編集が必要なら一覧から再度入る方が明確

**代替案**:
- ❌ `push("/events")` → ブラウザ「戻る」で前画面に戻り、空 / dirty フォームから再 submit してしまう
- ❌ Create 後 `/events/:id/edit` に遷移（旧仕様） → 翔太郎くんの運用イメージと不一致
- ❌ Edit 画面に stay → 「保存できたか一覧で確認したい」要望に応えられない

### D5. 削除確認は AlertDialog の 2 段ボタンで実装（タイトル一致タイプは MVP2）

**選択**: 「削除」押下 → AlertDialog 表示 → 「キャンセル」/「削除する」の 2 ボタン。

**理由**:
- イベント削除の取り消し不能性は中程度（reservations が刺さっていれば RLS の ON DELETE RESTRICT で **そもそも削除できない**ため、misclick による予約データ消失リスクは構造的に防がれる）
- タイトル一致タイプは「重い操作の保護」として有効だが、本 capability では DB 側制約で十分 → 過剰実装を避ける
- shadcn-vue の `AlertDialog` は `role="alertdialog"` / focus trap / ESC 閉鎖 を a11y 準拠で提供するため、自前実装より堅牢

**代替案**:
- ❌ confirm() → ブラウザネイティブで意匠統一不可。a11y 不十分
- ❌ タイトル一致タイプ → 過剰。reservations 結合制約で防げる箇所をユーザーに負わせる

### D6. 「ゆる練 vol.XX」テンプレ補完は best-effort（取得失敗時は補完なし）

**選択**: Create 画面の onMounted で events から `name LIKE 'ゆる練 vol.%'` の最大 vol 番号を抽出 → +1 をタイトルのプレースホルダに表示。クエリ失敗時は何もせず空のまま描画し、フォーム全体の Error 状態にはしない。

**理由**:
- 補完は UX 改善であり、機能の要件ではない
- 失敗時に Error 状態にすると「サークルの命名規則が違う回」「初回作成時」など正常ケースまで阻害する
- vol.XX の抽出は単純 regex（`/vol\.(\d+)$/`）で十分。LIKE 検索は events のインデックスを使う

**代替案**:
- ❌ events_meta テーブルに連番を保持 → MVP1 のスコープ外
- ❌ admin が手動で連番を管理 → UX 退化

### D7c. 一覧テーブル: 会場名短縮 + 「予約 X 件」→「X 件」+ モバイル改行抑止

**選択** (2026-05-01 翔太郎くん要望):
- 会場名は「亀戸スポーツセンター」→「亀戸」のように施設種別末尾を削った主要部のみ表示
- capacity NULL 時の予約件数表示は「予約 12 件」→「12 件」（列ヘッダ「予約」と冗長）
- 全テーブルセルに `whitespace-nowrap` を付与し、モバイルでの縦長改行を抑止（はみ出した場合は親 `<Table>` の `overflow-auto` で横スクロール）

**会場名短縮の判断基準**:
- ❌「先頭 N 文字で切る」（翔太郎くん指摘どおり 2/3 の判断基準が立たない、SaaS 化で他オーナーの命名と相性悪い）
- ✅ **末尾 suffix リスト方式**（`apps/admin/src/entities/venue/lib/venueLabel.ts`）
  - 「総合スポーツセンター」「スポーツセンター」「コミュニティセンター」「総合体育館」「コミュニティ」「区民センター」「区民館」「市民センター」「市民館」「公民館」「体育館」「ホール」を網羅
  - 「センター」単独は意図的に含めない（「江東文化センター」の "文化" を保持）
  - 削ると空になる場合は元の name を返す（"スポーツセンター" 単独命名を考慮）
- 元の name は `<TableCell title="...">` で hover 時に確認可能（情報損失なし）
- 将来 SaaS 化時は `venues.short_name` 列を追加してオーナー任意設定（別 Issue）

**改行抑止 + 横スクロール**:
- 各セルに `whitespace-nowrap`、タイトル列のみ `truncate max-w-[12rem] sm:max-w-xs` で省略
- `<Table>` プリミティブが `overflow-auto` でラップしているので、画面幅を超えたら横スクロールに自動対応
- モバイルで「1 つの長い会場名で行が縦に 2-3 段になる」現象が解消

### D7b. Create のデフォルト時刻 18:00 - 20:00

**選択** (2026-05-01 翔太郎くん要望): Create mode の初期値で `startTime = "18:00"` / `endTime = "20:00"` をセット。Edit mode は対象 event の値を hydrate するため影響なし。

**理由**:
- ゆる練の典型的な開催時間が 18:00 – 20:00（デザインサンプル / seed データの値もこの帯）
- 「ほとんど変えずにそのまま使える」初期値があると、空からの選択工数 4 回（時 / 分 × 開始 / 終了）が省ける
- 違う時刻にしたい場合は select で上書きするだけなので導線は壊さない

**代替案**:
- ❌ 全空 → 毎回 4 回 select するのは admin の負担
- ❌ 19:30 - 21:30 (デザインサンプルの「ゆる練 vol.43」値) → 18-20 のほうが「ゆる練」の標準像に近い

### D7a. 時刻入力は「時 select」+「分 select（00 / 15 / 30 / 45 の 4 択）」

**選択** (2026-05-01 翔太郎くん要望): `<input type="time">` を廃止し、時 (06–23 の 18 択) + 分 (00 / 15 / 30 / 45 の 4 択) の 2 つの native `<select>` に分割する。state 上は引き続き `"HH:mm"` 文字列で保持。

**理由**:
- ゆる練の運用上、開始 / 終了は 15 分刻みで十分（19:23 のような中途半端な時刻は事実上発生しない）
- `<input type="time">` のブラウザ実装は OS / モバイル / デスクトップで UX が大きくばらつき、誤入力（19:00 のつもりが 19:01）が発生しがち
- 4 択 select は誤操作余地が小さく、運用ミスを構造的に防げる
- native `<select>` を使うことで OS picker（モバイル）と通常 dropdown（PC）両方で快適

**代替案**:
- ❌ shadcn-vue の Select で時 / 分 → DOM が膨れる（22 オプション × 4 select）
- ❌ 5 分刻み → 「中途半端」が増えて運用判断にブレ
- ❌ Free input → 上記の OS 差異と誤入力問題が再発

**Edit 互換性**: 既存値が "19:30" のように 4 択に該当する形式なら自然に表示される。万一 "19:23" のような値が DB に残っていても、splitTime → 時 = "19" / 分 = "23" となり、分の select には該当 option が無いため空欄になる（バリデーションが必須エラーで弾く）。MVP1 では考慮不要。

### D7. Toast 通知は `useToast` composable + `<Toaster>` のシングルマウント (mobile/desktop 共に画面下部、自前アニメーション)

**選択**: shadcn-vue の `useToast` パターンを踏襲。`apps/admin/src/app/App.vue` の root で `<Toaster />` を 1 度だけマウントし、各 composable が `useToast().toast({...})` で通知を発行する。

**配置 / アニメーションの追加判断 (2026-05-01 翔太郎くん要望で更新)**:
- ToastViewport は **mobile / desktop ともに `bottom-0`** 配置（mobile=top の shadcn 公式デフォルトは sticky ヘッダーに被るため不採用）
- Toast の slide-in アニメーションは `tailwindcss-animate` プラグインに依存しない自前 keyframes（`hq-toast-slide-in-bottom` / `hq-toast-slide-out-right`）を Toast.vue の `<style scoped>` に書く。プラグイン未導入で `data-[state=open]:animate-in slide-in-from-top-full` 系クラスが解決されず Toast が画面外で停止する不具合を防ぐ
- 初期状態を `opacity: 1; translateY(0)` に固定する保険を入れる（万一 keyframes が効かない環境でも見える）
- `prefers-reduced-motion: reduce` でアニメーション無効化に対応
- iOS Safari の home indicator / bottom URL bar への配慮は `<style scoped>` で `padding-bottom: max(env(safe-area-inset-bottom), 16px)` を直接書く（Tailwind JIT の任意値クラスに `theme()` を入れると解決されない端末がある）

**理由**:
- 各画面で独自に toast を持つと配置がブレる
- shadcn-vue 公式の最も標準的なパターン
- a11y は `<ToastViewport role="region" aria-label="Notifications">` で確保

**代替案**:
- ❌ window.alert → 意匠統一不可、a11y 弱い
- ❌ ページ内 inline message のみ → 削除完了後に画面遷移するケースで通知が消えてしまう

---

## 3. Architecture & Data Flow

### 3.1 FSD レイヤー配置

```
apps/admin/src/
├── app/
│   ├── App.vue                  ← <Toaster /> をマウント
│   └── router.ts                ← /events/new / /events/:id/edit を追加
├── pages/
│   ├── EventCreatePage.vue      ← /events/new ページ
│   └── EventEditPage.vue        ← /events/:id/edit ページ（event 取得 + EventForm）
├── widgets/
│   └── event-form/
│       ├── ui/
│       │   ├── EventForm.vue              ← 1 セクションを束ねる
│       │   ├── FormSection.vue            ← kicker + title + hint + slot
│       │   └── SectionBasic.vue           ← 01 基本情報（タイトル/日時/会場/参加費）
│       ├── composables/
│       │   ├── useEventForm.ts            ← state + submit
│       │   └── useVolumeSuggest.ts        ← vol.XX 補完
│       ├── model/
│       │   └── eventFormSchema.ts         ← 純関数バリデーション
│       └── index.ts                       ← Public API: EventForm
├── features/
│   └── event-delete/
│       ├── ui/EventDeleteDialog.vue       ← AlertDialog
│       ├── composables/useEventDelete.ts  ← delete + Toast + redirect
│       └── index.ts
├── entities/
│   ├── event/
│   │   ├── api/
│   │   │   └── eventQueries.ts            ← +getEventById/createEvent/updateEvent/deleteEvent
│   │   └── model/
│   │       └── event.types.ts             ← 既存（変更なし）
│   └── venue/                             ← useVenues を昇格移動
│       ├── composables/useVenues.ts
│       └── index.ts
└── shared/
    └── ui/
        ├── AlertDialog.vue + 子           ← 新規取り込み
        ├── Toast.vue + 関連                ← 新規取り込み
        └── (既存) Input/Label/FormField/Select/Table/Skeleton
```

### 3.2 データフロー（Create）

```
[User Input]
   ↓ (v-model)
useEventForm.state (reactive)
   ↓ (Submit click)
validateEventForm(state) → ValidationErrors
   ↓ (errors empty)
entities/event/api.createEvent({
  ...state,
  visibility: 'published',     ← 固定投入（D3）
  capacity: null,               ← MVP1 でフォームに無い（無制限運用）
  description: null,            ← MVP1 でフォームに無い
  cancel_deadline: null,        ← 同上
})
   ↓ (200, 新 id 取得)
useToast().toast({ title: "保存しました" })
   ↓
router.replace("/events")  ← 一覧画面に置換遷移（D4）
```

### 3.3 データフロー（Edit）

```
onMounted: fetchEventById(id)
   ↓ (200)
useEventForm.state ← initialEvent から hydrate
                    ※ 状態保持のため visibility / description / cancel_deadline /
                      thumbnail_path も内部に保持するが、UI では編集対象外

[User Input] → state 更新（dirty=true）

[Submit "保存"]
   ↓
validateEventForm(state)
   ↓
updateEvent(id, {
  name, start_at, end_at, venue_id, fee
  // ↑ 編集対象列のみ送る。visibility / capacity / description / cancel_deadline /
  //   thumbnail_path は意図的に送らない（既存値保護）
})
   ↓ (200)
Toast「保存しました」 / dirty=false
```

### 3.4 データフロー（Delete）

```
[User] Edit 画面で「削除」押下
   ↓
EventDeleteDialog 表示
   ↓
[User] 「削除する」押下
   ↓
deleteEvent(id)
   ↓ (200)
Toast「削除しました」
   ↓
router.push("/events")
```

reservations が刺さっている event の削除は ON DELETE RESTRICT で DB 側エラー（PostgREST が 409 相当を返す）→ Dialog 内 inline で「予約があるため削除できません。先にすべての予約をキャンセルしてください」を表示する。

---

## 4. Schema Changes

**本 change での DB schema 変更は無し**。既存 events スキーマで全要件をカバーできる:

| 既存列 | 本 change での扱い |
|---|---|
| `name` | フォーム「タイトル」で入力 |
| `start_at` / `end_at` | フォーム「開催日 + 開始時刻 / 終了時刻」で合成 |
| `venue_id` | フォーム「会場」で選択 |
| `fee` | フォーム「参加費」で入力（任意） |
| `visibility` | INSERT 時に `'published'` 固定。UPDATE 時は送らない |
| `status` | フォームに無い。DB 既定 `'scheduled'` で投入 |
| `capacity` | フォームに無い。INSERT 時 NULL（無制限運用）、UPDATE 時は送らない |
| `description` | フォームに無い。INSERT 時 NULL、UPDATE 時は送らない |
| `cancel_deadline` | 同上 |
| `created_at` / `updated_at` / `created_by` | DB / トリガで自動 |

### 4.1 TypeScript 型

`packages/shared/src/types/entities.ts` に新規 `EventUpdate` 型を追加（既存 `Event` / `EventInsert` は変更なし）:

```ts
export type EventUpdate = {
  name?: string;
  start_at?: string;
  end_at?: string;
  venue_id?: VenueId;
  fee?: number | null;
  // 注意: visibility / status / capacity / description / cancel_deadline は意図的に
  //       admin-events-crud-screen の UPDATE 対象から除外。
  //       将来 定員・サムネ・公開設定が MVP2 で復活したら拡張する。
};
```

---

## 5. フォーム項目一覧 / バリデーション対応表

### 5.1 セクション × エンティティ対応

UI のフォームフィールドと `events` テーブル列の対応を一覧する。**「必須」は admin が値を埋めなければ保存できない項目、「任意」は空欄のまま保存可能な項目**。デフォルト値は DB or アプリ側で補完される。

| # | セクション | フォームフィールド | events 列 | DB 型 | NULL | UI 必須 | UI 既定値 / 補完 |
|---|---|---|---|---|---|---|---|
| 1 | 01 基本情報 | タイトル | `name` | `text` | NOT NULL | **必須** | 「ゆる練 vol.\<NN+1\>」をプレースホルダ提示（best-effort） |
| 2 | 01 基本情報 | 開催日 | (`start_at` / `end_at` の日付部分) | `timestamptz` | NOT NULL | **必須** | 空 |
| 3 | 01 基本情報 | 開始時刻 | `start_at`（時刻部分） | `timestamptz` | NOT NULL | **必須** | 空 |
| 4 | 01 基本情報 | 終了時刻 | `end_at`（時刻部分） | `timestamptz` | NOT NULL | **必須** | 空 |
| 5 | 01 基本情報 | 会場 | `venue_id` | `uuid FK` | NOT NULL | **必須** | venues マスタの `is_primary = true` を初期選択 |
| 6 | 01 基本情報 | 参加費 | `fee` | `integer` | NULL | 任意 | 選択された会場の `venues.default_fee` をプレースホルダ提示。空欄保存で `fee = NULL`（会場 default 継承） |

**フォームに出さない（DB が自動管理 or 固定投入 or NULL）列**:

| events 列 | 本 change の扱い | 理由 |
|---|---|---|
| `id` | DB 自動採番 | UUID PK |
| `visibility` | INSERT 時 `'published'` 固定 / UPDATE 時は送らない | D3「即時公開ポリシー」 |
| `status` | INSERT 時 DB 既定（`'scheduled'`） | 中止 / 終了の操作は別 Issue |
| `capacity` | INSERT 時 NULL / UPDATE 時は送らない | MVP1 押し下げ（定員フィールド削除）。NULL は DB 上「無制限」を意味する |
| `description` | INSERT 時 NULL / UPDATE 時は送らない | MVP1 押し下げ（紹介文セクション削除） |
| `cancel_deadline` | INSERT 時 NULL / UPDATE 時は送らない | MVP1 押し下げ |
| `thumbnail_path`（将来追加） | 列が存在しないため触らない | サムネ機能ごと MVP2 に押し下げ |
| `created_at` / `updated_at` | DB 既定値 + トリガ | — |
| `created_by` | INSERT 時に `auth.uid()` を自動セット | アプリ層 |

### 5.2 バリデーション対応表

クライアントサイド（`validateEventForm` 純関数）で実施するバリデーションを一覧する。各エラーは該当フィールド直下に inline 表示し、`aria-invalid="true"` + `aria-describedby` を付与する。

| # | フィールド | UI 必須 | チェック内容 | エラーメッセージ（日本語） | DB 側の最終防衛 |
|---|---|---|---|---|---|
| V1 | タイトル | **必須** | 1 文字以上 | `タイトルを入力してください` | NOT NULL |
| V2 | タイトル | **必須** | 100 文字以下 | `タイトルは 100 文字以内で入力してください` | — |
| V3 | 開催日 | **必須** | 値あり | `開催日を選択してください` | NOT NULL（start_at / end_at） |
| V4 | 開始時刻 | **必須** | 値あり | `開始時刻を入力してください` | NOT NULL（start_at） |
| V5 | 終了時刻 | **必須** | 値あり | `終了時刻を入力してください` | NOT NULL（end_at） |
| V6 | 開始時刻 / 終了時刻 | **必須** | `start_at < end_at` | `終了は開始より後にしてください` | CHECK `start_before_end` |
| V7 | 会場 | **必須** | venues マスタに存在する uuid | `会場を選択してください` | NOT NULL + FK |
| V8 | 参加費 | 任意 | 空 OR 0 以上の整数（円） | `参加費は 0 以上の整数で入力してください` | — |

**「必須」と「任意」の運用ルール**:
- **UI 必須**: ボタン disabled で送信を阻止 + inline エラー表示。空欄送信は API に到達しない。
- **任意（空欄保存可）**: 空欄を意味のある状態として DB に保存（`NULL`）。
  - `参加費空欄 = 会場 default_fee 継承`（LP / 予約サイト側で表示時に解決）

- **MVP1 で UI に出さない列の運用**:
  - `capacity` は常に NULL → DB 上「無制限」。一覧画面は「予約 N 件」テキスト fallback で表示
  - `description` / `cancel_deadline` は常に NULL → LP / 予約サイトでデフォルト表示

**3 段防衛の整理**:
1. **UI 層**（`validateEventForm` 純関数）: 即時フィードバック + 送信阻止。V1〜V9 すべて。
2. **API 層**（Supabase / PostgREST）: RLS で admin のみ書込可能（rls-policies の events 参照）。
3. **DB 層**（CHECK / NOT NULL / FK）: V1（NOT NULL）/ V3-V5（NOT NULL）/ V6（CHECK `start_before_end`）/ V7（NOT NULL + FK）が DB 側でも担保される。UI バリデーションが破られても DB は壊れない。

### 5.3 「保存」ボタンの動作

MVP1 では「保存」ボタンが 1 つだけで、押下時の挙動は mode で異なる:

| mode | 押下時の挙動 |
|---|---|
| Create | `INSERT` + `visibility = 'published'` 固定 + `/events`（一覧）に置換遷移 |
| Edit | `UPDATE`（visibility は送らず既存値維持） |

下書き保存 / 限定公開 / 中止 などの公開状態切替は MVP2 まで実装しない。

---

## 6. UX / UI

### 6.1 ヘッダ アクション構成

| Mode | アクション（左→右） |
|---|---|
| Create | `[キャンセル][保存]` |
| Edit | `[削除][保存]` |

- 「キャンセル」は Create のみ → `/events` に戻る（dirty なら confirm）
- 「保存」は visibility = 'published' で submit（Create）/ visibility 維持で update（Edit）

### 6.2 Loading / Error / Toast の挙動

- **Edit Loading**: 1 セクション分の Skeleton（kicker / title は表示、内部は灰色 bar）
- **Edit Error**: フォーム上部に Banner（`role="alert"`）+ `[一覧へ戻る]` ボタン
- **Save Loading**: ヘッダの「保存」ボタンに spinner、フォーム入力 disabled
- **Save Success Toast**: 右下に「保存しました」/「削除しました」
- **Save Error Toast**: 右下に赤系 Toast（`role="alert"`）+ フォーム上部に詳細 Banner

### 6.3 モバイル

`md:` breakpoint（768px）で grid → stack:
- Section 01 の 開催日/開始/終了: モバイルは縦 3 段、md+ は 3 カラム grid
- 参加費: 全 viewport で 1 カラム
- ヘッダアクション: モバイルは flex-wrap で改行、各ボタン min-h-44px

---

## 7. テスト戦略

### 7.1 Unit (Vitest)

- `eventFormSchema.ts` の `validateEventForm`:
  - 全必須項目の missing パターン
  - 終了 < 開始
  - fee 0 以上の整数 / 負数拒否
  - fee 空欄 OK
  - 全 valid → エラーなし
- `useVolumeSuggest.ts`:
  - events 0 件 → undefined
  - events 1 件「ゆる練 vol.42」 → "ゆる練 vol.43"
  - events 複数件で最大 vol を選ぶ
  - 「ゆる練 vol.X」以外（「GW 特別練習」など）が混ざっても無視
  - クエリ失敗 → undefined（throw しない）

### 7.2 Component (Vitest + @vue/test-utils)

- `FormSection`: kicker / title / hint / default slot のレンダリング
- `SectionBasic`: 値反映 / 必須属性 / aria-invalid / 参加費プリセットボタンで値反映 / 任意性確認
- `EventForm`:
  - Create mode 初期描画でヘッダが「キャンセル/保存」
  - Edit mode + initialEvent で値が hydrate される
  - validation error 時に submit が走らない
  - Loading 時にボタン disabled
- `EventDeleteDialog`: Open / Cancel / Confirm / ESC / Error states

### 7.3 Integration (Vitest + MSW)

- `useEventForm` Create サイクル: 入力 → submit → MSW 200 → API ペイロードに `visibility: 'published'` が含まれる → router.replace 検証
- `useEventForm` Update サイクル: 入力 → submit → MSW 200 → API ペイロードに `visibility` が **含まれない** → dirty=false 検証
- `useEventForm` Save Error: MSW 500 → Banner 表示 + dirty 維持
- `useEventDelete`: confirm → MSW 200 → router.push("/events") 検証

### 7.4 E2E (Playwright、上限 2 件)

- **Happy path**: 認証済み admin で `/events/new` を開く → 必須項目を入力 → 「保存」を押下 → 一覧で公開中ステータスで表示される
- **Edge case (削除)**: 既存 event の Edit 画面で「削除」→ AlertDialog で「削除する」を押下 → 一覧から消える

---

## 8. Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| reservations が刺さっている event を削除しようとすると DB 側エラー | RLS / FK 制約で防がれる。Dialog 内に明示メッセージ「予約があるため削除できません」 |
| 「ゆる練 vol.XX」テンプレ補完の誤推定（regex で `vol.42 修正版` のような文字列を拾う） | regex を `/vol\.(\d+)$/`（語尾固定）に絞る。失敗時は補完なし |
| `EventForm` を mode で共有することで条件分岐が肥大化 | `mode === 'edit'` のチェックを `useEventForm` 内部に隔離。UI は computed で分岐 |
| AlertDialog の focus trap が SSR / hydration で崩れる | shadcn-vue 公式パターン採用 + Vitest で focus テスト追加 |
| バリデーションを純関数で書いたことで Vue リアクティビティと乖離 | `validateEventForm` を `watch` で再実行。dirty フィールドのみエラー表示する UX で過剰アラートを抑制 |
| 既存 seed の `'draft'` event を Edit で開くと `'published'` に書き換わる | UPDATE ペイロードに `visibility` を含めず、既存値を保護（D3 Mitigation） |
| MVP1 の即時公開で運用が破綻（admin が誤公開する） | MVP1 は admin が当面 1 名なので影響限定。MVP2 で公開設定が戻ってきた時に下書き保存を併設 |

---

## 9. Migration Plan

### 9.1 デプロイ手順

1. PR が CI 全パスでマージされた後、`master` の build / deploy が Render の release コマンドで自動適用される（既存パイプライン）
2. **DB Migration は本 change に含まれない**（既存スキーマで完結）
3. デプロイ後、admin で `/events/new` から実イベントを作成 → 一覧で確認 → LP / 予約サイト（あれば）で公開イベントとして表示されることを確認

### 9.2 ロールバック

- アプリ: `git revert <merge-commit>` で前の master に戻す
- DB: 不要（schema 未変更）

### 9.3 Forward Compatibility

- MVP2 でサムネ機能が戻る際は、`events.thumbnail_path` 列追加 / Storage バケット `event-thumbnails` / Storage RLS を別 change（仮称: `admin-events-crud-extension`）として実装する
- MVP2 で公開設定 Radio が戻る際は、本 change の D3「visibility 固定投入」を緩和し、Section 05 として 3 択 Radio Card を追加する。`useEventForm` の Update ペイロードに `visibility` を含める切替が必要
- MVP2 で紹介文 / キャンセル期限が戻る際も同様に、Section 03 / Section 02 に追加フィールドを足す形で拡張可能

---

## 10. Open Questions

| 項目 | 暫定方針 | 決定タイミング |
|---|---|---|
| Edit 画面の dirty 状態でブラウザを閉じようとした時の警告 | MVP1 では実装せず（routing 内のみ confirm） | 運用 1 ヶ月後フィードバック次第 |
| 過去から複製機能の優先度 | MVP2 押し下げで合意済み | — |
| 会場 inline 追加（venues 新規作成） | MVP2 押し下げ。MVP1 は seed 固定 + venues 管理画面が別 Issue | venues 管理画面 Issue 起票時 |
| 定員 / 紹介文 / サムネ / キャンセル期限の MVP2 復活時期 | LP / 予約サイトで「サムネ無しが寂しい」「定員管理が必要」フィードバックが出てから | LP α 公開後 |
| 下書き保存ボタンの MVP2 復活時期 | 「公開直前に確認したい」要望が出てから | 同上 |
