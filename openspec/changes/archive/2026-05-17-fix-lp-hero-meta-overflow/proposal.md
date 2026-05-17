## Why

商用リリース直後の LP Hero セクションで、「イベントを見る」CTA 直下のメタ情報（開催頻度・参加費）テキストが画面下に見切れ、白い文字の上半分だけがチラ見えしてデザインが崩れている。Hero は流入後の最初の印象を決める要素であり、表示崩れは離脱要因となるため早急に解消する必要がある。

## What Changes

- Hero セクションのテキストブロックを、デバイス幅やテキスト量にかかわらず**常に全文が表示される**状態にする
- 「画像の人物とテキストを被らせない」というデザイン意図は維持しつつ、コンテンツ量に応じてセクション高さが追従する挙動に変更する
- Hero セクションの表示崩れ（テキスト見切れ）が再発しないことを E2E もしくは component test で検知できるようにする

## Capabilities

### New Capabilities

（なし — 既存 capability の要件強化のみ）

### Modified Capabilities

- `lp-layout`: Hero セクション内のすべてのテキスト（kicker / heading / lead / CTA / meta）が、サポート対象ビューポートにおいて常に視認可能であることを要件として明示する

## Impact

- **コード**: `apps/lp/src/widgets/hero-first/ui/HeroFirst.vue` のみ
- **デザイントークン**: 変更なし
- **依存関係**: 変更なし
- **他 widget / page**: 影響なし
- **テスト**: LP 側に Hero 視認性検証を 1 ケース追加（happy path 系の component test を想定）
