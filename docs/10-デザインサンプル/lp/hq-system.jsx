// High Q — design tokens, primitives, and shared bits
// Hi-fi version. Calm, grown-up, friendly. Photo-led.

const HQ = {
  // type
  jp: '"Zen Kaku Gothic New", "Noto Sans JP", system-ui, sans-serif',
  jpSerif: '"Shippori Mincho", "Noto Serif JP", serif',
  en: '"Cormorant Garamond", "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',

  // surface
  paper: '#f7f3ea',
  paperWarm: '#f1ece0',
  ink: '#1f1d1a',
  inkSoft: '#3a3833',
  muted: '#8a857a',
  hairline: 'rgba(31,29,26,0.12)',
  accent: '#b85c3c', // muted terracotta
  accentSoft: 'rgba(184,92,60,0.08)',
};

// stripe placeholder for photos — calm warm tone
const Photo = ({ label, h = 200, w = '100%', radius = 0, style = {} }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: radius,
      background: `
        repeating-linear-gradient(135deg,
          rgba(31,29,26,0.06) 0,
          rgba(31,29,26,0.06) 1px,
          transparent 1px,
          transparent 9px
        ),
        linear-gradient(180deg, #d9cfbe 0%, #c8bba6 100%)
      `,
      position: 'relative',
      flexShrink: 0,
      ...style,
    }}
  >
    <span
      style={{
        position: 'absolute',
        bottom: 8,
        right: 10,
        color: 'rgba(31,29,26,0.45)',
        fontFamily: HQ.mono,
        fontSize: 9,
        letterSpacing: 1.2,
      }}
    >
      [ {label} ]
    </span>
  </div>
);

// inline kicker (small all-caps label)
const Kicker = ({ children, color = HQ.accent, style = {} }) => (
  <div
    style={{
      fontFamily: HQ.mono,
      fontSize: 11,
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      color,
      fontWeight: 500,
      ...style,
    }}
  >
    {children}
  </div>
);

// section title — single typeface system
const SectionTitle = ({ kicker, jp, en, color = HQ.ink, accentColor = HQ.accent, align = 'left' }) => (
  <div style={{ textAlign: align }}>
    {kicker && <Kicker color={accentColor} style={{ marginBottom: 14 }}>— {kicker}</Kicker>}
    <h2
      style={{
        fontFamily: HQ.jpSerif,
        fontSize: 30,
        lineHeight: 1.4,
        fontWeight: 500,
        margin: 0,
        color,
        letterSpacing: '0.02em',
      }}
    >
      {jp}
    </h2>
    {en && (
      <div
        style={{
          fontFamily: HQ.jp,
          fontSize: 12,
          fontWeight: 400,
          color: HQ.muted,
          marginTop: 8,
          letterSpacing: 1.5,
        }}
      >
        {en}
      </div>
    )}
  </div>
);

// CTA button — pill, primary or ghost
const Button = ({ children, primary = true, dark = false, full = false, arrow = true }) => {
  const bg = primary ? (dark ? HQ.paper : HQ.ink) : 'transparent';
  const fg = primary ? (dark ? HQ.ink : HQ.paper) : dark ? HQ.paper : HQ.ink;
  const border = primary ? bg : (dark ? 'rgba(247,243,234,0.4)' : HQ.hairline);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: full ? '100%' : 'auto',
        padding: '14px 22px',
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: 999,
        fontFamily: HQ.jp,
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: 1.5,
        boxSizing: 'border-box',
        cursor: 'pointer',
      }}
    >
      <span>{children}</span>
      {arrow && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
};

// thin divider with optional center label
const Divider = ({ label, color = HQ.hairline }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: HQ.muted }}>
    <div style={{ height: 1, flex: 1, background: color }} />
    {label && <span style={{ fontFamily: HQ.mono, fontSize: 10, letterSpacing: 2 }}>{label}</span>}
    <div style={{ height: 1, flex: 1, background: color }} />
  </div>
);

// status bar lite for iPhone frame body
const StatusBar = ({ dark = false }) => (
  <div
    style={{
      height: 44,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      padding: '0 24px 6px',
      fontFamily: HQ.jp,
      fontSize: 13,
      fontWeight: 600,
      color: dark ? HQ.paper : HQ.ink,
    }}
  >
    <span>9:41</span>
    <span style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11 }}>
      <span>●●●●</span>
      <span>5G</span>
      <span style={{
        display: 'inline-block',
        width: 22,
        height: 11,
        border: `1px solid ${dark ? HQ.paper : HQ.ink}`,
        borderRadius: 2,
        position: 'relative',
        opacity: 0.8,
      }}>
        <span style={{ position: 'absolute', inset: 1, background: dark ? HQ.paper : HQ.ink, borderRadius: 1 }} />
      </span>
    </span>
  </div>
);

// top nav — minimal
const Nav = ({ dark = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 24px',
      color: dark ? HQ.paper : HQ.ink,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
      <span style={{ fontFamily: HQ.jpSerif, fontSize: 22, fontWeight: 600, letterSpacing: 1, whiteSpace: 'nowrap' }}>
        High Q
      </span>
      <span style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 2, opacity: 0.6 }}>EST.21</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ width: 22, height: 1, background: 'currentColor' }} />
      <span style={{ width: 22, height: 1, background: 'currentColor' }} />
    </div>
  </div>
);

Object.assign(window, { HQ, Photo, Kicker, SectionTitle, Button, Divider, StatusBar, Nav });
