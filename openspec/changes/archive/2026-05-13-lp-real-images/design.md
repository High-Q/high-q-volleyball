## Context

現状の `@high-q/ui` の `Photo` コンポーネントはデザイン段階の placeholder 専用で、CSS 背景（縞模様 + 角丸）とラベル文字のみを描画する。`src` を受け取って `<img>` を描画する機能を持たないため、実画像化には拡張が必要。

LP の利用箇所は 5 widget（hero / about / features × 3 / gallery × 4 / final-cta）合計 9 個の `<Photo>` がある。今回の更新で:
- hero / about / final-cta の 3 個は実画像を表示
- features × 3 と gallery × 4 の合計 7 個は `<Photo>` を完全に削除（widget の構造変更）

翔太郎くんから提供された画像 3 枚:
- **Hero**: Mikasa 2020 公式球 + 屋外背景（`chandan-chaurasia-tAcoHIvCtwM-unsplash (1).jpg`、すでに `apps/lp/public/` に配置済み）
- **About**: 体育館の床に座る 3 人 + ボール（`ChatGPT Image 2026年5月13日 02_04_12.png`、Downloads にあり、AI 生成）
- **Final CTA**: 並んだシューズ 3 足 + 木目床（`ChatGPT Image 2026年5月13日 22_29_00.png`、Downloads にあり、AI 生成）

admin / reservation アプリでも `Photo` を使用しているが、現状は placeholder 用途のみのため、今回の拡張は完全に後方互換（`src` 未指定なら従来通り）。

## Goals / Non-Goals

**Goals:**
- hero / about / final-cta の 3 widget が実画像で描画される
- Why High Q セクションが画像なしカードに整理され、視覚的にバランスが取れている
- Gallery & Social セクションが画像 grid なしでも違和感のない SNS 文脈の文言になっている
- `Photo` コンポーネントが将来 admin / reservation で実画像表示する際にも再利用できる
- a11y: 実画像には適切な日本語 alt テキストが設定される
- 既存 placeholder 利用箇所（admin/reservation/lp showcase 等）は壊さない

**Non-Goals:**
- 画像 CDN（Cloudinary 等）の導入。当面は public/ 配下に静的配置
- 画像最適化パイプライン（ビルド時の自動 WebP 変換等）の構築。今回は手作業で最適化済みファイルを配置
- features-section の構造再設計（番号 + カードレイアウトの大幅刷新）。Photo 削除に伴う最小限の調整のみ
- 将来の Instagram 連携実装（別 Issue で実施）

## Decisions

### D1: Photo に `src` / `alt` prop を追加し、optional として後方互換を維持

```ts
// packages/ui/src/Photo.vue（追加 prop）
src?: string;  // 未指定なら従来の placeholder
alt?: string;  // src 指定時に推奨。未指定なら alt='' で装飾画像扱い
```

レンダリング切替:
- `src` あり → `<img>` を描画、placeholder 用の背景パターンと label を非表示
- `src` なし → 現状通り placeholder + label

**Why:** 既存利用箇所を壊さない最小拡張。`Photo` を起点に「placeholder/real」を切替えられるので、admin/reservation でも将来同じパターンで実画像化できる。

**Alternative:** Photo は placeholder 専用に固定し、widget 側で直接 `<img>` を書く → コードが分散し、placeholder/real の切替が widget ごとに発散するため不採用。

### D2: 画像ファイルは `apps/lp/public/images/` 配下に最終ファイル名で配置

- `apps/lp/public/images/hero.jpg`（既存 `chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg` をリネーム移動）
- `apps/lp/public/images/about.jpg`（Downloads から取り込み、PNG → JPG 変換）
- `apps/lp/public/images/final-cta.jpg`（Downloads から取り込み、PNG → JPG 変換）

参照 URL は `/images/hero.jpg` 形式（Vite の public/ 解決規約）。

**Why:** ファイル名を役割で固定することで、将来の差し替え（実写撮影完了時など）が widget 側のコード変更なしに行える。JPG に統一する理由は、写真用途では PNG より軽量で（特に AI 生成画像はディテール多めで PNG だと数 MB になる）、品質劣化もブラウザレンダリングで目視できないため。

**Alternative:**
- WebP 変換 → さらに軽量だが、変換ツール（cwebp 等）の用意・運用フローが必要。当面は JPG で十分。今後 Issue 化を検討
- src/assets/ 経由でビルドにバンドル → Vite が hash 付与してくれるがファイルサイズが大きいと初期ロードに乗る。public/ で別 fetch にする方が hero/about/final-cta の遅延読み込み余地が残る

### D3: object-fit: cover を CSS で適用、SVG / iframe / video には対応しない

`Photo` 内の `<img>` は親 `.hq-photo` の h/w に従って `object-fit: cover` で切り抜く。

**Why:** hero/final-cta は `h="100%" w="100%"` で全画面背景的に使われ、about は h=260 の横長領域で使われる。元画像のアスペクト比は様々なので、cover でクロップしつつ枠を埋める方が破綻が少ない。

**Risk:** 元画像のフォーカス点が中央以外にあるとクロップで主要被写体が切れる可能性 → 必要に応じて `object-position` を後続で追加する。今回提供された 3 枚はいずれも主要被写体が中央〜やや下なので、デフォルト `center` で問題ない見込み。

### D4: features-section から `<Photo>` 削除後のレイアウト

現状:
```
[ Photo h=280 ]
01  KICKER
[ 日本語タイトル ]
本文テキスト
```

変更後（写真ナシ、番号と本文だけで成立させる）:
```
01  KICKER
[ 日本語タイトル ]
本文テキスト
（→ 各 item に上下マージンと細い hairline をはさみ、3 つのカードが視覚的に区切られるよう調整）
```

具体策:
- `<Photo>` 行を削除
- `.features__body` の `padding-top: 20px` を見直し（Photo 直下前提から、セクションヘッダ直下になるため少し詰める）
- 各 `.features__item` 間に `border-top: 1px solid var(--hq-color-hairline)` を入れて 3 つの区切りを視覚化（一番上は除く）

### D5: gallery-sns の β案文言

heading 「ある日の、High Q。」は写真連動の文言のため、写真撤去にあわせて以下に変更:

**確定案**: `heading = フォローして、繋がる。` / `lead = Follow along.`（lead は元のまま維持）

理由:
- 「フォローして、繋がる。」は短く、SNS への誘導として行動と結果が一気通貫で繋がる
- HQ のクラフトトーン（控えめ・押し付けない）と整合し、命令形（〜してください）を避けて軽い印象
- lead `Follow along.` はオリジナル英語コピーがそのまま SNS 文脈で自然に成立するため温存

### D6: Instagram 連携用のプレースホルダ残置

Gallery & Social は将来 Instagram 連携で grid を復活させる前提なので、`gallery-sns` widget 自体は残し、画像 grid `.gallery__grid` のみテンプレートから削除する。スタイル（`.gallery__grid` の CSS）は将来復活時にすぐ使えるよう残置（dead code とのトレードオフ）。

### D7: a11y - alt テキスト方針

実画像 3 枚それぞれに具体的な日本語 alt を付与する:
- hero: `バレーボールが置かれた風景（公式球と緑の植物）`
- about: `体育館の床に座って休憩するメンバーとバレーボール`
- final-cta: `体育館の床に並べられた 3 足の体育館シューズ`

「装飾」ではなく「情報」として扱う方針。スクリーンリーダー利用者にも LP の世界観を伝える。

## Risks / Trade-offs

- **[Risk]** AI 生成画像（about / final-cta）が将来の実写撮影で差し替えられる際、`apps/lp/public/images/{about,final-cta}.jpg` のファイル名を据え置けば widget 側無変更で差し替え可 → **Mitigation**: ファイル名を役割固定にする運用（D2）
- **[Risk]** `Photo` 拡張が admin/reservation の placeholder 利用に副作用を出す → **Mitigation**: 既存テストを維持し、src 未指定時の挙動が変わらないことを spec で保証
- **[Risk]** `object-fit: cover` で主要被写体が切れる → **Mitigation**: Apply 中の目視確認で必要なら `object-position` を後付け
- **[Trade-off]** dead code（gallery__grid CSS）を残すことで将来 Instagram 連携時の差し戻しは楽になるが、現時点の bundle にやや余分なバイトが乗る → 数十バイト程度なので許容
- **[Risk]** AI 生成画像のサイズが大きい（特に PNG 元のまま）と初期ロードが重くなる → **Mitigation**: Apply 時に各画像のファイルサイズを確認し、500KB 超なら手動圧縮で 200KB 以下を目標とする

## Open Questions

- 画像ファイルの最適化レベル（圧縮率・最終サイズ）は Apply 中に翔太郎くんと相談しながら決める
- gallery-sns の β案文言は D5 の「確定案」で進めるが、Apply 中の見た目確認で気に入らなければ別案に切替
