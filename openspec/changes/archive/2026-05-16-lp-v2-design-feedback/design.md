## Context

`lp-redesign-v2` (#160) で LP の主要セクション群を実装し Render Preview に出したところ、翔太郎くんから複数ラウンドの詳細フィードバックが入った。レムが翔太郎くんの過去指示 ("accent 過剰排除") を拡大解釈して全 kicker を ink 化してしまうなど、対話を重ねる中で「プロトタイプ準拠が正解」という結論に収束した。並行して Issue #238 (Button variant の意味乖離) も顕在化し、デザイントークンレベルの整理が必要になった。

本変更は LP の商用リリース前の最終ポリッシュとして、これらすべてを 1 つの change にまとめ、`release/lp-redesign-v2` ブランチに統合する。

## Goals / Non-Goals

**Goals:**
- プロトタイプ (docs/10-デザインサンプル/lp/hq-lp.jsx + hq-system.jsx) と LP 実装の差分をゼロにする
- accent 色の用途を「主軸アクセント」(kicker / 番号 / Q マーカー / NEXT タグ / focus outline) に限定し、過剰使用を排する
- PC レスポンシブを成立させ、モバイル幅のデザインを維持しつつ大画面でも崩れないレイアウトにする
- ヘッダーにモバイル前提のハンバーガーメニューを追加し、サイト内ナビゲーション動線を確保する
- Button variant の名前と実色の意味乖離を解消する

**Non-Goals:**
- 既存 LP コピー (本文・見出し) の表現変更
- 画像素材の差し替え (#160 本体と同じく Photo プレースホルダー維持)
- Admin の Button variant リネーム以外の UI 改修
- Reservation の Button variant リネーム以外の UI 改修
- Render Preview の Supabase 接続先変更や環境変数追加

## Decisions

### Button variant 体系の再定義 (破壊変更回避)

| 名前 | 背景 | 文字 | 用途 |
|---|---|---|---|
| `primary` | `--hq-color-ink` (#1f1d1a) | paper | 主要 CTA (プロトタイプの `<Button primary>` 相当) |
| `outline` | 透明 | ink (hairline border) | 通常の二次操作 (旧 `secondary` をリネーム) |
| `ghost` | 透明 | ink (border なし) | 控えめなテキスト型 |
| `danger` | `--hq-color-danger` (#9c4030) | paper | 退会 / 削除専用 (旧実装が accent 流用していたのを正規化) |

新規 `accent` variant は追加しない。accent 色は kicker / 番号 / NEXT タグなど widget 側で直接 `var(--hq-color-accent)` を当てる用途で、Button としては必要ない。**理由**: accent 色を Button 背景に使うと「主要 CTA = オレンジ」が支配的になり、プロトタイプの落ち着いた配色 (ink CTA + accent ピンポイント強調) から逸脱する。

### accent / warn のトーン調整

- accent: `#b85c3c` → `#a44e30` (モカ寄り) — paper 背景での WCAG コントラスト比を 4.4 → 5.0+ に引き上げ、kicker (11px) を含む小さい文字でも AA 通常テキスト基準を確保
- warn: `#c08442` → `#d4a04a` (マスタード) — accent との色相重なりを解消し、badge UI で「警告 (warn) vs 強調 (accent)」を視覚的に区別可能にする

### accent 色の使用箇所を限定する

| 用途 | 場所 |
|---|---|
| 全 13 セクション kicker | "— About" "— Why High Q" "— Before you join" "— Join us" 等 |
| 番号系 | Features 数字 (01/02/03)、FirstTimeFlow bullet (01〜06)、FAQ index (01〜06) |
| 強調マーカー | Worries Q マーカー (Q.) |
| 強調 border | FirstTimeFlow reassurance border-left |
| 予約導線 | NextStrip NEXT タグ (color + border) |
| a11y フォーカス | 各ボタン/リンクの `:focus-visible` outline |

これ以外で accent は使用しない。hover border は `rgba(31,29,26,0.24)` 等の hairline 強度上げで代替、link 色は `ink-soft` underline で代替。**理由**: アクセント色は「強調点として 1 画面 1〜2 箇所」が原則。プロトタイプ準拠で kicker + 番号 + NEXT に集約することで、目線の優先順位が明確になる。

### セクション背景色のリズム (プロトタイプ完全準拠)

| セクション | 背景 |
|---|---|
| Hero | ink + 写真 + overlay |
| NextStrip | **ink** (dark theme) |
| Reassurance | paper |
| MetaStrip | paper |
| About | paper |
| Features | paper-warm |
| FirstTimeFlow | paper-warm |
| Worries | **ink** (dark theme) |
| Events | paper |
| FAQ | paper-warm |
| NotForYou | paper |
| Gallery | paper-warm |
| FinalCTA | ink + 写真 + overlay |
| Footer | ink |

「dark で挟む」(NextStrip / Worries / FinalCTA + Footer) でメリハリを出す。**理由**: 過去の試行錯誤で paper / surface / paper-warm を均等にリズム化した実装はプロトタイプから逸脱しており、Worries の「不安への回答」が drama を失っていた。プロトタイプの dark を信じて復元する。

### PC レスポンシブ: 全幅 + 内側 max-width クランプ

各セクション root の padding に `padding-inline: max(<モバイル値>, calc((100% - <max>px) / 2))` を当てて、モバイル幅では padding を維持しつつ PC 幅では内側コンテンツを 640 / 720 / 880px にキャップする。**理由**: モバイル幅 480px キャップで PC を狭い 1 列に固定するのは "PC で見ると貧弱" 問題を生む。プロトタイプはモバイル前提だが、実 LP は全幅で背景を伸ばし、コンテンツのみキャップする方式が正しい。

### SiteHeader にハンバーガーアイコン + ドロップダウンメニュー

プロトタイプの Nav は「左: ブランド名 + EST.21 / 右: 2 本線ハンバーガー」の構成。本変更ではプロトタイプの 2 本線をそのまま実装し、加えてタップで開閉する **ドロップダウンメニュー** を追加する。メニュー内容は Footer のアンカーリンク 5 つ (About / Features / 当日の流れ / Events / FAQ) と同一。**理由**: プロトタイプはモバイル静的フレーム前提なのでメニュー機能なし。実 LP では PC / モバイル両対応で、サイト内ナビ動線が必要。Footer まで送るより上部から飛べる方が UX 良い。

開閉条件: ハンバーガークリック / メニュー項目クリック / ESC キー / 外側クリック / ルート遷移時。

### Cookie Consent Banner を HQ トークン化

Vuetify `v-snackbar` 依存を撤去し、`<Teleport to="body">` + `<Transition>` ベースで再実装。HQ デザイントークン (paper bg / hairline border / md radius / md shadow) だけで描画。**理由**: Vuetify テーマ撤去後も v-snackbar が rgba(255,255,255,0.72) フロステッドガラスを当てており、HQ トークン外色のハードコードが残っていた。

### スクロール連動フェードインの廃止

`useFadeInOnScroll` 経由の `.is-visible` 切替と関連 CSS を全 widget から削除。全セクションは初期から即時表示。**理由**: 全セクションに一律で opacity 0 → 1 を当てる実装は、ファーストビュー以下で複数同時発火し演出として機能しない。段階遅延を入れるコスト対効果が低く、新デザインの落ち着いたトーンに合わない。

### Google Fonts の load

`apps/lp/index.html` の `<link rel="stylesheet">` で Klee One / Shippori Mincho / Zen Kaku Gothic New / JetBrains Mono を Google Fonts から load する。**理由**: HQ デザイントークンは font-family の宣言だけで Web フォントを load していなかったため、OS デフォルトに fallback していた。

## Risks / Trade-offs

- **[リスク] Button variant の `danger` 色変更 (accent → 本物 destructive #9c4030)** が admin の `EventDeleteDialog` 削除ボタンの色を切り替える: → 意味的には正しい挙動 (destructive ボタンが赤茶色) なので破壊と見なさない。Render Preview で admin の見た目を翔太郎くん確認する
- **[リスク] Worries / NextStrip を dark theme に戻すと、画面全体で dark セクションが増えて重く感じる**: → プロトタイプの drama 演出に従う。リズムは Hero (dark) → NextStrip (dark / 帯) → 明 → ... → Worries (dark) → 明 → FinalCTA + Footer (dark) で全体の 4 箇所
- **[リスク] ハンバーガーメニューの追加で初期描画コンテンツが増える**: → メニューは閉じた状態が default、開いた時だけドロップダウン DOM を描画 (v-if)。コスト微小
- **[トレードオフ] PC で max-width 720〜880px に内側をキャップすると、PC ユーザーには「中央のカラム + 左右大きな余白」のレイアウトに見える**: → モバイル設計を中央寄せ + 安定した余白で提示するプロトタイプ意図。1280px ワイドでも崩れないが余白が大きい

## Migration Plan

1. **前提確認**: `release/lp-redesign-v2` ブランチが master から派生 / `feature/238-button-variant-tokens-refactor` が release から派生し既に多くの commit を積んでいる
2. **#238 関連の先行実施分を整理**: Button variant rename / accent + warn トーン調整 / kicker・番号・Q マーカーの accent 集約 / セクション配色復元 / PC レスポンシブ / Google Fonts load / ConsentBanner HQ トークン化 / Footer アンカー追加 — 既に commit 済み
3. **新規実装**: SiteHeader にハンバーガーアイコン + ドロップダウンメニュー追加
4. **検証**: vitest / build / e2e すべて緑、Render Preview で翔太郎くん視認
5. **ship**: 本 change を sync / archive → PR #239 を `release/lp-redesign-v2` に merge → 後続の #237 待ち → release → master の最終 PR

ロールバック: feature/238-... ブランチを破棄し master に戻す。LP は #160 本体の状態に戻り、#238 関連の改善は未反映。

## Open Questions

- ハンバーガーメニュー閉じ時のアニメーションは `transition: max-height 200ms` で十分か → プロトタイプは静的なので Render Preview で確認しつつ調整
- ハンバーガーメニューの a11y (Esc / 外側クリック / focus trap) はどこまで実装するか → 最小限 (Esc + 外側クリックでクローズ) で実装、focus trap は後回し
