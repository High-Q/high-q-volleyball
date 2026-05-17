## Context

商用リリース後の LP Hero セクションで、CTA ボタン直下のメタテキストが見切れている。原因は Hero テキストブロックに固定の高さ上限（`max-height: 60%`）と、Hero セクション全体への固定 `height` + `overflow: hidden` の組み合わせ。コンテンツの自然な高さが上限を超えた場合に下端が非表示になる構造で、デバイス幅・フォントメトリクス・将来のコピー変更に対して脆い。

「テキストは画面下 1/3 に寄せ、画像の人物（中央〜上半分）と被らせない」というデザイン意図は維持したい。

## Goals / Non-Goals

**Goals:**
- Hero セクション内の全テキストが、サポート対象ビューポートで常に視認できる
- 「テキストは下寄せ」「人物と被らない」というデザイン意図を維持する
- コンテンツ量の変動（コピー追加・フォントレンダリング差）に強い構造にする
- 再発検知できるテストを 1 ケース追加する

**Non-Goals:**
- Hero のコピー文言・フォントサイズ・トーン変更（PO 領域）
- Hero 以外の widget のレイアウト変更
- デザイントークンの追加・変更
- LP 全体のレスポンシブ戦略の見直し

## Decisions

### Decision 1: Hero セクションの高さを「内容に追従する `min-height`」に切り替える

**選択**: `.hero-first { height: 600px / 640px }` を `min-height` に変更し、`.hero-first__body { max-height: 60% }` を撤廃する。

**理由**:
- 高さ上限が消えることで、テキストが押し出されて見切れる根本原因が解消される
- `min-height` により「画像が常にビューポートに見える」という最小視認性は確保される
- `justify-content: flex-end` が維持されるため、テキストの下寄せ意図は崩れない
- 内容が増えてもセクションが縦に伸びるだけで破綻しない

**代替案**:
- B 案: `max-height` を 60% → 80% に緩和。コンテンツ量と日本語フォントメトリクスに依存する微調整となり、別端末・コピー変更で再発するリスクがある
- C 案: meta テキストを CTA の上に移動・lead を 1 行に圧縮。文言・配置変更は PO 判断領域で、本 fix のスコープを超える

### Decision 2: 人物との被り回避は「画像の object-position と body 内余白」で担保する

**選択**: 既存の `Photo` コンポーネント（`tone="hero"` で `object-position: center top` 系の挙動を想定）と `.hero-first__overlay` のグラデーション、`.hero-first__body` の `padding` で被り感を抑える。`max-height` による物理的な切り捨ては行わない。

**理由**:
- 元の `max-height: 60%` は「人物と被らせないため」のガードだったが、副作用として見切れを生んでいた
- 画像の人物は上半分にいるため、テキスト下寄せ（`flex-end`）+ overlay グラデーション（下に行くほど暗い）で十分に分離視認できる
- `min-height` のおかげで小さい端末でも画像表示領域は確保される

### Decision 3: 再発検知は Hero component test で行う

**選択**: `apps/lp/src/widgets/hero-first/` 配下に `HeroFirst.spec.ts` を追加し、「Hero 内の主要テキスト要素（kicker / heading / lead / meta）がすべてレンダリングされ、`meta` 要素が DOM 上に存在する」ことを検証する。jsdom 環境のため厳密な視認性検証はできないが、要素レンダリング欠落の回帰は確実に防げる。

**理由**:
- E2E（Playwright）で視認性検証する案もあるが、CLAUDE.md「LP 機能あたり 1〜2 件まで」に従い E2E は最小化したい
- Hero の表示崩れは「要素が DOM に存在しない / クラスが当たっていない」では検出できず、CSS の `max-height` × `overflow: hidden` の組み合わせが本質。component test では `max-height` が `body` 要素に当たっていないこと（インラインスタイル or 計算スタイル）も追加検証する
- Playwright スナップショットは flaky になりがちで、本 fix の単発検証にはコスト過大

## Risks / Trade-offs

- **[Risk] 内容が極端に増えた場合、Hero セクションが縦に伸びすぎてスクロール量が増える** → 現在のコピー量で見切れていた約 40px 程度の増分のみなので影響軽微。将来コピー追加時は別 Issue で再検討
- **[Risk] component test では「視覚的に被って読めない」状態は検出できない** → デザイントークン・余白・グラデーションは変更しないため、被り再発の確率は低い。Render Preview での目視確認を完了条件に明記
- **[Trade-off] `max-height` 撤廃により「最大高さの保証」を失う** → 元々の意図（人物との被り回避）はもはや CSS だけで担保しきれない領域。デザイン意図の責務を画像と overlay に集約する明示的な選択

## Migration Plan

スキーマ変更・破壊的 API 変更なし。デプロイ手順は通常の PR マージ → Render auto deploy で完結。ロールバックは PR revert で安全に実施可能。
