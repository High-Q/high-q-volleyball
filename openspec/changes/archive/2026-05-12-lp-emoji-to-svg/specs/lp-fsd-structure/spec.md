## ADDED Requirements

### Requirement: LP 固有の SVG アイコンが shared/ui/icons に配置される

LP でのみ利用する SVG アイコンコンポーネントは、`apps/lp/src/shared/ui/icons/` ディレクトリ配下に Vue SFC として配置されなければならない（SHALL）。3 アプリ（lp / admin / reservation）で共有が必要な汎用アイコンに昇格させる場合は別 Issue で `@high-q/ui` への移動を検討する。

#### Scenario: ReassuranceStrip 用のアイコン SFC が shared/ui/icons に存在する

- **WHEN** 開発者が `apps/lp/src/shared/ui/icons/` を参照した場合
- **THEN** 持ち物 / 服装 / 参加費を示す 3 種類の SVG アイコン SFC が存在し、それぞれが `currentColor` ベースで着色できる構造になっている

#### Scenario: アイコン SFC が size prop で寸法を指定できる

- **WHEN** アイコン SFC を呼び出し側がマウントする場合
- **THEN** `size` prop（数値 / デフォルト値あり）を渡すことで `width` / `height` を制御でき、SVG の `viewBox` を維持したままスケールする
