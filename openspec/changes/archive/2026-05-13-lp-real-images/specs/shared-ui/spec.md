## MODIFIED Requirements

### Requirement: Photo プレースホルダープリミティブが提供される
`Photo` コンポーネントは、写真未投入時のプレースホルダーと、`src` を指定した実画像表示の両方を扱えなければならない（SHALL）。

- `src` 未指定時: 温かいトーンの斜めストライプ背景に右下のラベル（指定時）を表示する placeholder モードで描画する
- `src` 指定時: 指定された画像 URL を `<img>` として描画し、placeholder 背景とラベルは表示しない。画像は親 `Photo` の `w` / `h` に従って `object-fit: cover` で切り抜く
- `alt` prop は `src` 指定時の a11y 用テキスト。未指定時は `alt=""`（装飾画像扱い）でフォールバックする

#### Scenario: width / height / radius / label を props で制御できる
- **WHEN** `<Photo :h="240" w="100%" :radius="12" label="EVENT_001" />` を render する
- **THEN** 高さ 240px・幅 100%・border-radius 12px のボックスが斜め 135deg のストライプで描画され、右下に `[ EVENT_001 ]` がモノフォントで表示される

#### Scenario: label 未指定時はラベルを表示しない
- **WHEN** `<Photo :h="120" />` を label なしで render する
- **THEN** ラベル領域は描画されず、ストライプ背景のみが表示される

#### Scenario: src 指定時は実画像が描画され、placeholder 装飾は表示されない
- **WHEN** `<Photo src="/images/hero.jpg" alt="バレーボール" :h="320" />` を render する
- **THEN** 内部に `<img src="/images/hero.jpg" alt="バレーボール">` が描画され、`object-fit: cover` で親サイズに収まる。placeholder の縞模様背景とラベル `[ ... ]` は表示されない

#### Scenario: src 指定時に alt 未指定なら alt 空文字でフォールバックする
- **WHEN** `<Photo src="/images/hero.jpg" :h="320" />` を alt なしで render する
- **THEN** `<img>` の `alt` 属性が空文字（`alt=""`）として描画され、装飾画像扱いになる

#### Scenario: src と label の両方を指定した場合、label は表示されない
- **WHEN** `<Photo src="/images/hero.jpg" label="hero" :h="320" />` を render する
- **THEN** `<img>` のみ描画され、`[ hero ]` のラベル要素は描画されない
