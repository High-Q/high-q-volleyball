## MODIFIED Requirements

### Requirement: トークンカテゴリが必要十分にカバーされる
パッケージは MVP1 で必要な以下のトークンカテゴリをすべて提供しなければならない（SHALL）。

- カラー: `paper` / `paperWarm` / `ink` / `inkSoft` / `muted` / `accent` / `accentSoft` / `hairline` / `success` / `successSoft` / `warn` / `warnSoft` / `danger` / `dangerSoft` / `successOnDark` / `warnOnDark` / `dangerOnDark`
- 書体: `jpDisplay`（Klee One 系・見出し用）/ `jp`（Zen Kaku Gothic New 系・本文用）/ `mono`（JetBrains Mono 系・キャプション/コード用）
- spacing: 8pt グリッドで `1` / `2` / `3` / `4` / `6` / `8` / `14`（ピクセル換算 4 / 8 / 12 / 16 / 24 / 32 / 56）
- radius: `none` / `sm` / `md` / `pill`
- shadow: `none` / `sm` / `md`

`successOnDark` / `warnOnDark` / `dangerOnDark` は黒地（NEXT カードのヒーローカード等）に乗せた際の WCAG 2.1 AA 相当のコントラスト確保を目的とする SHALL。light 背景前提の既存 `success` / `warn` / `danger` を黒地に直接乗せると AA に満たないため、明度・彩度を引き上げた専用カラーを提供する MUST。

#### Scenario: 必要なトークンが TypeScript export に含まれる
- **WHEN** `import { HQ } from '@high-q/design-tokens'` で取得したオブジェクトを検査する
- **THEN** `HQ.color` / `HQ.font` / `HQ.space` / `HQ.radius` / `HQ.shadow` の各カテゴリが上記のキーをすべて持つ

#### Scenario: 同じトークンが TS export と CSS variables の両方で利用できる
- **WHEN** トークン X に対して `HQ.color.paper` と `var(--hq-color-paper)` をそれぞれ参照する
- **THEN** 両者が同一の文字列値（`#f7f3ea`）に解決される

#### Scenario: dark トーンカラーが黒地での WCAG AA を満たす
- **WHEN** `HQ.color.successOnDark` / `warnOnDark` / `dangerOnDark` を黒地 (`HQ.color.ink` または近似値) に乗せた場合の輝度コントラスト比を計測する
- **THEN** いずれも 3:1 以上（WCAG 2.1 AA の non-text component 基準）を満たす
