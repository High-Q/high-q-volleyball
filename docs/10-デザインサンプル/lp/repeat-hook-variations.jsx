// Repeat Hook Variations — show 3 ways to surface "next session"
// without splitting pages or using accordions.
//
// Pattern 2: persistent "next" pill in the top header
// Pattern 3: thin "next session" strip directly below the hero
// Pattern 2+3: both at once
//
// Each variant shows just the top portion of the LP (Nav + Hero + start of next section)
// so the comparison is focused on the hook area.

const NEXT = {
  m: 'MAY',
  d: '14',
  dow: 'SAT',
  time: '18:00–20:00',
  loc: '江東区スポーツ会館',
  title: 'ゆる練 vol.21',
  remain: '残り 5/12',
};

// ─── Variant primitives ──────────────────────────────────────

// (2) Header pill — sits inside the dark hero header, top-right
const HeaderNextPill = () => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      background: 'rgba(247,243,234,0.12)',
      border: '1px solid rgba(247,243,234,0.28)',
      borderRadius: 999,
      padding: '6px 12px 6px 10px',
      backdropFilter: 'blur(6px)',
      cursor: 'pointer',
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: HQ.accent,
        boxShadow: '0 0 0 3px rgba(184,92,60,0.25)',
      }}
    />
    <span
      style={{
        fontFamily: HQ.mono,
        fontSize: 9,
        letterSpacing: 1.5,
        color: 'rgba(247,243,234,0.7)',
      }}
    >
      NEXT
    </span>
    <span
      style={{
        fontFamily: HQ.jpSerif,
        fontSize: 12,
        fontWeight: 500,
        color: HQ.paper,
        letterSpacing: '0.02em',
      }}
    >
      5/14 (土)
    </span>
    <span style={{ color: 'rgba(247,243,234,0.6)', fontSize: 12, marginLeft: 2 }}>›</span>
  </div>
);

// Custom Nav with the pill embedded (replaces hamburger area)
const NavWithPill = ({ withPill }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 24px',
      color: HQ.paper,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: HQ.jpSerif, fontSize: 22, fontWeight: 600, letterSpacing: 1 }}>
        High Q
      </span>
      <span style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 2, opacity: 0.6 }}>EST.21</span>
    </div>
    {withPill ? (
      <HeaderNextPill />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ width: 22, height: 1, background: 'currentColor' }} />
        <span style={{ width: 22, height: 1, background: 'currentColor' }} />
      </div>
    )}
  </div>
);

// (3) Thin strip under the hero
const NextSessionStrip = () => (
  <div
    style={{
      background: HQ.ink,
      color: HQ.paper,
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      borderBottom: `1px solid rgba(247,243,234,0.08)`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
      <div
        style={{
          fontFamily: HQ.mono,
          fontSize: 9,
          letterSpacing: 1.5,
          color: HQ.accent,
          border: `1px solid ${HQ.accent}`,
          padding: '3px 7px',
          borderRadius: 2,
          flexShrink: 0,
        }}
      >
        NEXT
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: HQ.jpSerif,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          5/14 (土) · {NEXT.title}
        </div>
        <div
          style={{
            fontFamily: HQ.mono,
            fontSize: 9.5,
            letterSpacing: 1.2,
            color: 'rgba(247,243,234,0.6)',
            marginTop: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {NEXT.time} · {NEXT.loc}
        </div>
      </div>
    </div>
    <div
      style={{
        fontFamily: HQ.mono,
        fontSize: 10,
        letterSpacing: 1.5,
        color: HQ.paper,
        flexShrink: 0,
        opacity: 0.85,
      }}
    >
      予約 ›
    </div>
  </div>
);

// ─── Hero block (shared, slightly cropped to focus the comparison) ─────────
const HeroBlock = ({ withPill }) => (
  <div style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
    <Photo label="hero · 体育館" h="100%" w="100%" />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(180deg, rgba(31,29,26,0.7) 0%, rgba(31,29,26,0.2) 35%, rgba(31,29,26,0.2) 60%, rgba(31,29,26,0.85) 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: HQ.paper,
      }}
    >
      <NavWithPill withPill={withPill} />
      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 24px' }}>
        <div
          style={{
            fontFamily: HQ.mono,
            fontSize: 9,
            letterSpacing: 2,
            color: 'rgba(247,243,234,0.85)',
            marginBottom: 14,
          }}
        >
          — TOKYO · KOTO-KU
        </div>
        <h1
          style={{
            fontFamily: HQ.jpSerif,
            fontSize: 26,
            lineHeight: 1.45,
            fontWeight: 500,
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          ひとりで来ても、<br />
          初めてでも、<br />
          だいじょうぶ。
        </h1>
      </div>
    </div>
  </div>
);

// "Below the hero" — a teaser of the next section so the strip context is clear
const BelowHero = () => (
  <div style={{ background: HQ.paper, padding: '28px 24px 36px' }}>
    <div
      style={{
        fontFamily: HQ.mono,
        fontSize: 9,
        letterSpacing: 2,
        color: HQ.accent,
        marginBottom: 10,
      }}
    >
      — EASY TO START
    </div>
    <div
      style={{
        fontFamily: HQ.jpSerif,
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: HQ.ink,
      }}
    >
      来る前に、これだけ。
    </div>
  </div>
);

// ─── Variant containers ──────────────────────────────────────

const VariantA = () => (
  <>
    <HeroBlock withPill={true} />
    <BelowHero />
  </>
);

const VariantB = () => (
  <>
    <HeroBlock withPill={false} />
    <NextSessionStrip />
    <BelowHero />
  </>
);

const VariantC = () => (
  <>
    <HeroBlock withPill={true} />
    <NextSessionStrip />
    <BelowHero />
  </>
);

// ─── Phone-ish frame (just a card, no full iOS chrome) ─────────────────────
const PhoneCard = ({ children }) => (
  <div
    style={{
      width: 360,
      background: HQ.paper,
      borderRadius: 28,
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(31,29,26,0.18), 0 0 0 1px rgba(31,29,26,0.08)',
      fontFamily: HQ.jp,
      color: HQ.ink,
    }}
  >
    {children}
  </div>
);

// ─── Top-level canvas ────────────────────────────────────────

const RepeatHookVariations = () => (
  <DesignCanvas>
    <DCSection
      id="hooks"
      title="リピーター動線 — 3案比較"
      subtitle="ページ分けなし・折り畳みなしで「次の予定」をどう見せるか"
    >
      <DCArtboard id="a" label="A · ヘッダーにピル" width={360} height={720}>
        <PhoneCard>
          <VariantA />
        </PhoneCard>
        <DCPostIt top={-90} left={20} rotate={-3} width={210}>
          常駐するから初回ユーザーにも
          「定期開催感」が伝わる。
          リピーターは1タップで予定へ。
        </DCPostIt>
      </DCArtboard>
      <DCArtboard id="b" label="B · 帯ストリップ" width={360} height={720}>
        <PhoneCard>
          <VariantB />
        </PhoneCard>
        <DCPostIt top={-90} left={20} rotate={2} width={210}>
          情報量が多く、ヒーロー直後で
          完結感が出る。LINE経由のリピーターは
          ファーストビューで用が済む。
        </DCPostIt>
      </DCArtboard>
      <DCArtboard id="c" label="C · 両方" width={360} height={720}>
        <PhoneCard>
          <VariantC />
        </PhoneCard>
        <DCPostIt top={-90} left={20} rotate={-2} width={210}>
          冗長になるリスクあり。
          ピルが補助的、帯がメインCTAとして
          役割分担できれば成立。
        </DCPostIt>
      </DCArtboard>
    </DCSection>
  </DesignCanvas>
);

window.RepeatHookVariations = RepeatHookVariations;
