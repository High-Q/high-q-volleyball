// High Q LP — 5 wireframe directions
// Sketchy, low-fi, mobile-first. Black & white + one warm accent.

const { useState } = React;

// ============================================================
// SHARED PRIMITIVES — sketchy hand-drawn vocabulary
// ============================================================

const wfStyles = {
  font: '"Kaisei Decol", "Yomogi", "Klee One", "Caveat", sans-serif',
  ink: '#1a1a1a',
  paper: '#fafaf6',
  accent: '#c8553d',
  muted: '#999',
  line: '#1a1a1a',
};

// rough rectangle (slightly wobbly border)
const Box = ({ children, style = {}, dashed = false, fill, h, ...rest }) => (
  <div
    style={{
      border: `1.5px ${dashed ? 'dashed' : 'solid'} ${wfStyles.line}`,
      borderRadius: '6px 8px 5px 7px',
      padding: 8,
      background: fill || 'transparent',
      height: h,
      boxSizing: 'border-box',
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

// rough scribble lines for "lorem ipsum" body text
const Scribble = ({ lines = 3, width = '100%', short }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width }}>
    {Array.from({ length: lines }).map((_, i) => {
      const w = short && i === lines - 1 ? '55%' : `${85 + ((i * 7) % 12)}%`;
      return (
        <div
          key={i}
          style={{
            height: 2,
            width: w,
            background: wfStyles.ink,
            opacity: 0.55,
            borderRadius: 2,
          }}
        />
      );
    })}
  </div>
);

// rough underline scribble for headings (pen swoop)
const Underline = ({ color = wfStyles.accent, w = 60 }) => (
  <svg width={w} height="6" viewBox={`0 0 ${w} 6`} style={{ display: 'block', marginTop: 2 }}>
    <path
      d={`M 1 4 Q ${w * 0.3} 0, ${w * 0.55} 3 T ${w - 1} 2`}
      stroke={color}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

// placeholder image — diagonal stripes
const ImgPlaceholder = ({ label = 'photo', h = 120, style = {} }) => (
  <div
    style={{
      height: h,
      border: `1.5px solid ${wfStyles.line}`,
      borderRadius: '6px 8px 5px 7px',
      background:
        'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(26,26,26,0.08) 6px, rgba(26,26,26,0.08) 7px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'ui-monospace, "SF Mono", monospace',
      fontSize: 10,
      color: wfStyles.muted,
      letterSpacing: 0.5,
      ...style,
    }}
  >
    [ {label} ]
  </div>
);

// CTA pill
const CTA = ({ children, primary = true, w = '100%' }) => (
  <div
    style={{
      width: w,
      padding: '12px 16px',
      border: `1.5px solid ${wfStyles.line}`,
      borderRadius: 999,
      background: primary ? wfStyles.ink : 'transparent',
      color: primary ? wfStyles.paper : wfStyles.ink,
      fontFamily: wfStyles.font,
      fontSize: 14,
      textAlign: 'center',
      fontWeight: 600,
      boxShadow: primary ? '2px 3px 0 rgba(0,0,0,0.15)' : 'none',
    }}
  >
    {children}
  </div>
);

// status bar lite
const Status = () => (
  <div
    style={{
      height: 24,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0 16px',
      fontFamily: 'ui-monospace, monospace',
      fontSize: 10,
      color: wfStyles.muted,
    }}
  >
    <span>9:41</span>
    <span>● ● ●</span>
  </div>
);

// nav bar (top)
const TopNav = ({ logo = 'High Q', dark = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 18px',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(26,26,26,0.1)'}`,
      color: dark ? wfStyles.paper : wfStyles.ink,
    }}
  >
    <span style={{ fontFamily: wfStyles.font, fontWeight: 700, fontSize: 16 }}>{logo}</span>
    <span style={{ fontSize: 18, letterSpacing: 2 }}>≡</span>
  </div>
);

// section heading
const SectionH = ({ kicker, title, accent = wfStyles.accent, align = 'left' }) => (
  <div style={{ textAlign: align, marginBottom: 14 }}>
    {kicker && (
      <div
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 9,
          letterSpacing: 2,
          color: accent,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        — {kicker}
      </div>
    )}
    <div
      style={{
        fontFamily: wfStyles.font,
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.2,
        display: 'inline-block',
      }}
    >
      {title}
      <Underline color={accent} w={70} />
    </div>
  </div>
);

// scrolling phone container — content scrolls inside
const Phone = ({ children, bg = wfStyles.paper }) => (
  <div
    style={{
      width: 320,
      height: 640,
      background: bg,
      overflowY: 'auto',
      overflowX: 'hidden',
      fontFamily: wfStyles.font,
      color: wfStyles.ink,
      borderRadius: 28,
      border: `1px solid rgba(0,0,0,0.1)`,
    }}
  >
    {children}
  </div>
);

// ============================================================
// WIREFRAME 1 — クラシック縦積み（王道・教科書的）
// Hero photo dominant → features grid → testimonials list →
// upcoming events list → FAQ accordion → SNS feed → footer
// ============================================================

const WF1 = () => (
  <Phone>
    <Status />
    <TopNav />
    {/* HERO */}
    <div style={{ padding: '32px 20px 24px', textAlign: 'left' }}>
      <div
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: 2,
          color: wfStyles.accent,
          marginBottom: 12,
        }}
      >
        TOKYO · KOTO-KU
      </div>
      <h1 style={{ fontFamily: wfStyles.font, fontSize: 32, lineHeight: 1.25, fontWeight: 700, margin: 0 }}>
        ゆるっと、<br />
        でも本気で<br />
        楽しむバレー。
      </h1>
      <Underline w={120} />
      <div style={{ marginTop: 16 }}>
        <Scribble lines={3} short />
      </div>
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CTA>体験参加してみる →</CTA>
        <CTA primary={false}>サークルについて</CTA>
      </div>
    </div>
    <ImgPlaceholder label="hero photo · 練習風景" h={200} style={{ margin: '0 20px', borderRadius: 12 }} />

    {/* ABOUT */}
    <div style={{ padding: '40px 20px' }}>
      <SectionH kicker="ABOUT" title="High Q ってどんな場所？" />
      <Scribble lines={4} />
    </div>

    {/* FEATURES */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="WHY US" title="3つの特徴" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {['初心者でも安心', '落ち着いた雰囲気', '無理しない頻度'].map((t, i) => (
          <Box key={i} style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: `1.5px solid ${wfStyles.line}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                0{i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t}</div>
                <Scribble lines={2} short />
              </div>
            </div>
          </Box>
        ))}
      </div>
    </div>

    {/* VOICES */}
    <div style={{ padding: '0 20px 40px', background: 'rgba(200,85,61,0.06)' }}>
      <div style={{ paddingTop: 32 }}>
        <SectionH kicker="VOICES" title="メンバーの声" />
      </div>
      {[1, 2].map((i) => (
        <Box key={i} fill={wfStyles.paper} style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background:
                  'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(26,26,26,0.1) 4px, rgba(26,26,26,0.1) 5px)',
                border: `1px solid ${wfStyles.line}`,
              }}
            />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>A.M さん / 28歳</div>
              <div style={{ fontSize: 10, color: wfStyles.muted }}>会社員 · 加入1年</div>
            </div>
          </div>
          <Scribble lines={3} />
        </Box>
      ))}
    </div>

    {/* EVENTS */}
    <div style={{ padding: '40px 20px' }}>
      <SectionH kicker="SCHEDULE" title="今後のイベント" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 0',
            borderBottom: `1px dashed rgba(26,26,26,0.2)`,
          }}
        >
          <div style={{ textAlign: 'center', minWidth: 48 }}>
            <div style={{ fontSize: 10, color: wfStyles.muted }}>5月</div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{10 + i * 4}</div>
            <div style={{ fontSize: 9, color: wfStyles.muted }}>(土)</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>初心者歓迎・ゆる練</div>
            <div style={{ fontSize: 11, color: wfStyles.muted, marginTop: 2 }}>
              19:00–21:00 / 江東区スポーツ会館
            </div>
          </div>
          <div style={{ fontSize: 18 }}>›</div>
        </div>
      ))}
    </div>

    {/* FAQ */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="FAQ" title="よくある質問" />
      {['初心者でも参加できますか？', '女性ひとりでも大丈夫？', '参加費はいくら？'].map((q, i) => (
        <Box key={i} style={{ padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Q. {q}</span>
            <span>+</span>
          </div>
        </Box>
      ))}
    </div>

    {/* SNS */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="SNS" title="@highq_volley" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ImgPlaceholder key={i} label="ig" h={88} />
        ))}
      </div>
    </div>

    {/* FOOTER */}
    <div style={{ padding: 20, background: wfStyles.ink, color: wfStyles.paper }}>
      <div style={{ fontFamily: wfStyles.font, fontSize: 18, fontWeight: 700 }}>High Q</div>
      <div style={{ fontSize: 10, marginTop: 8, opacity: 0.7 }}>
        © High Q Volleyball Circle, 2026
      </div>
    </div>
  </Phone>
);

// ============================================================
// WIREFRAME 2 — 雑誌風（エディトリアル・落ち着いた大人）
// Big serif headline, mixed type sizes, asymmetric layout,
// "issue" feel. Photo with overlap. Quote pull.
// ============================================================

const WF2 = () => (
  <Phone bg="#f5f1ea">
    <Status />
    {/* magazine masthead */}
    <div style={{ padding: '14px 20px 8px', borderBottom: `1px solid ${wfStyles.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: 3 }}>
          ISSUE 2026 / VOL.04
        </span>
        <span style={{ fontSize: 16 }}>≡</span>
      </div>
      <div
        style={{
          fontFamily: wfStyles.font,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 4,
          marginTop: 4,
        }}
      >
        High Q.
      </div>
    </div>

    {/* HERO — magazine cover */}
    <div style={{ padding: '24px 20px 0', position: 'relative' }}>
      <div
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: 2,
          color: wfStyles.accent,
        }}
      >
        — FEATURE
      </div>
      <h1
        style={{
          fontFamily: wfStyles.font,
          fontSize: 38,
          lineHeight: 1.15,
          fontWeight: 400,
          margin: '8px 0 0',
          fontStyle: 'italic',
        }}
      >
        coffee と<br />
        バレーと、<br />
        <span style={{ fontWeight: 700, fontStyle: 'normal' }}>週末。</span>
      </h1>
      <div style={{ marginTop: 14 }}>
        <Scribble lines={3} short />
      </div>
    </div>

    <div style={{ padding: '20px 20px 0' }}>
      <ImgPlaceholder label="cover photo · members" h={260} />
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, color: wfStyles.muted, marginTop: 6 }}>
        Photo / Members at Toyosu, Apr 2026
      </div>
    </div>

    {/* PULL QUOTE */}
    <div style={{ padding: '36px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 36, fontFamily: 'serif', color: wfStyles.accent, lineHeight: 1 }}>"</div>
      <div style={{ fontFamily: wfStyles.font, fontSize: 18, lineHeight: 1.5, fontWeight: 400, fontStyle: 'italic' }}>
        ガチすぎず、<br />
        ちゃらすぎず、<br />
        ちょうどいい。
      </div>
      <div
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 9,
          letterSpacing: 2,
          color: wfStyles.muted,
          marginTop: 12,
        }}
      >
        — A.M, MEMBER SINCE 2024
      </div>
    </div>

    {/* TOC */}
    <div style={{ padding: '24px 20px', borderTop: `1px solid ${wfStyles.line}`, borderBottom: `1px solid ${wfStyles.line}` }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>
        — CONTENTS
      </div>
      {[
        ['01', 'About this circle', 'p.02'],
        ['02', 'What members say', 'p.05'],
        ['03', 'Schedule', 'p.08'],
        ['04', 'FAQ', 'p.11'],
      ].map(([n, t, p]) => (
        <div
          key={n}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            padding: '10px 0',
            borderBottom: '1px dotted rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: wfStyles.accent }}>{n}</span>
          <span style={{ fontSize: 14, flex: 1 }}>{t}</span>
          <span style={{ fontSize: 10, color: wfStyles.muted, fontFamily: 'ui-monospace, monospace' }}>{p}</span>
        </div>
      ))}
    </div>

    {/* ABOUT — 2 col asymmetric */}
    <div style={{ padding: '40px 20px' }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, color: wfStyles.accent }}>
        01 / ABOUT
      </div>
      <h2 style={{ fontFamily: wfStyles.font, fontSize: 24, lineHeight: 1.3, margin: '8px 0 16px' }}>
        私たちは、<br />
        <span style={{ fontStyle: 'italic' }}>ふつうの社会人。</span>
      </h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Scribble lines={6} />
        </div>
        <ImgPlaceholder label="snap" h={120} style={{ width: 100 }} />
      </div>
    </div>

    {/* VOICES — interview style */}
    <div style={{ padding: '0 20px 40px' }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, color: wfStyles.accent }}>
        02 / INTERVIEW
      </div>
      <h2 style={{ fontFamily: wfStyles.font, fontSize: 24, lineHeight: 1.3, margin: '8px 0 16px' }}>
        メンバーの<br />日常。
      </h2>
      {[1, 2].map((i) => (
        <div key={i} style={{ marginBottom: 24, borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
            <ImgPlaceholder label="portrait" h={70} style={{ width: 70 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>R. Tanaka</div>
              <div style={{ fontSize: 10, color: wfStyles.muted }}>Marketing / age 27</div>
              <div style={{ fontSize: 10, color: wfStyles.muted, marginTop: 2 }}>Member since 2025</div>
            </div>
          </div>
          <Scribble lines={4} short />
        </div>
      ))}
    </div>

    {/* SCHEDULE editorial */}
    <div style={{ padding: '40px 20px', background: wfStyles.ink, color: wfStyles.paper }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, color: wfStyles.accent }}>
        03 / SCHEDULE
      </div>
      <h2 style={{ fontFamily: wfStyles.font, fontSize: 24, lineHeight: 1.3, margin: '8px 0 20px' }}>
        Upcoming<br />/ MAY 2026
      </h2>
      {[
        ['SAT', '14', 'ゆる練 vol.21'],
        ['SUN', '22', '体験会＋カフェ'],
        ['SAT', '28', '練習試合'],
      ].map(([d, n, t], i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.15)' }}
        >
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9, opacity: 0.6, width: 30 }}>{d}</span>
          <span style={{ fontFamily: wfStyles.font, fontSize: 28, fontWeight: 700, width: 40 }}>{n}</span>
          <span style={{ fontSize: 13, flex: 1 }}>{t}</span>
          <span style={{ fontSize: 14 }}>→</span>
        </div>
      ))}
    </div>

    {/* FAQ */}
    <div style={{ padding: '40px 20px' }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, color: wfStyles.accent }}>
        04 / FAQ
      </div>
      {['Q. 初心者でも参加できる？', 'Q. 女性ひとりで来ても安心？', 'Q. どのくらいの頻度？'].map((q, i) => (
        <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{q}</div>
          <div style={{ marginTop: 6 }}>
            <Scribble lines={2} short />
          </div>
        </div>
      ))}
    </div>

    {/* SNS / END */}
    <div style={{ padding: '40px 20px' }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, color: wfStyles.accent }}>
        — FOLLOW
      </div>
      <h2 style={{ fontFamily: wfStyles.font, fontSize: 24, margin: '8px 0 16px' }}>@highq_volley</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <ImgPlaceholder key={i} label="ig" h={120} />
        ))}
      </div>
    </div>

    <div style={{ padding: 24, background: '#e8e2d6', textAlign: 'center' }}>
      <CTA>体験参加 → 申し込む</CTA>
    </div>
  </Phone>
);

// ============================================================
// WIREFRAME 3 — 写真主役グリッド（ビジュアルファースト）
// Full-bleed photos. Minimal type. Photos do the heavy lifting.
// ============================================================

const WF3 = () => (
  <Phone bg="#fff">
    <Status />
    {/* full-bleed hero with overlay */}
    <div style={{ position: 'relative', height: 460 }}>
      <ImgPlaceholder label="hero · full-bleed" h={460} style={{ borderRadius: 0, border: 'none', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.7) 100%)',
          display: 'flex',
          flexDirection: 'column',
          color: wfStyles.paper,
        }}
      >
        <TopNav dark />
        <div style={{ flex: 1 }} />
        <div style={{ padding: 24 }}>
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: 3,
              opacity: 0.85,
              marginBottom: 12,
            }}
          >
            KOTO — VOLLEYBALL CIRCLE
          </div>
          <h1
            style={{
              fontFamily: wfStyles.font,
              fontSize: 30,
              lineHeight: 1.2,
              fontWeight: 700,
              margin: 0,
            }}
          >
            today is<br />a good day<br />for volleyball.
          </h1>
          <div style={{ height: 18 }} />
          <CTA>はじめての方へ</CTA>
        </div>
      </div>
    </div>

    {/* meta strip */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid rgba(0,0,0,0.1)`,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        color: wfStyles.muted,
      }}
    >
      <span>EST. 2021</span>
      <span>32 MEMBERS</span>
      <span>2× / MONTH</span>
    </div>

    {/* FEATURES as photo collage with floating text */}
    <div style={{ padding: '40px 0' }}>
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <SectionH kicker="ABOUT" title="ちょうどよく、つづく場所。" />
      </div>

      {/* alternating big photo + caption */}
      {[
        { label: '練習風景', t: '初心者でも、安心。', d: 3 },
        { label: 'after volleyball', t: 'バレーのあとは、カフェも。', d: 3 },
        { label: 'members', t: '20〜30代が中心です。', d: 3 },
      ].map((f, i) => (
        <div key={i} style={{ marginBottom: 32 }}>
          <ImgPlaceholder label={f.label} h={220} style={{ borderRadius: 0, border: 'none', borderTop: `1px solid rgba(0,0,0,0.08)`, borderBottom: `1px solid rgba(0,0,0,0.08)` }} />
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: wfStyles.accent }}>
                0{i + 1}.
              </span>
              <h3 style={{ fontFamily: wfStyles.font, fontSize: 18, fontWeight: 700, margin: 0 }}>{f.t}</h3>
            </div>
            <div style={{ marginTop: 10 }}>
              <Scribble lines={f.d} short />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* GALLERY GRID */}
    <div style={{ padding: '20px 0 40px' }}>
      <div style={{ padding: '0 20px 12px' }}>
        <SectionH kicker="GALLERY" title="ある日のHigh Q" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ImgPlaceholder key={i} label={`day ${i + 1}`} h={i % 3 === 0 ? 180 : 140} style={{ borderRadius: 0, border: 'none' }} />
        ))}
      </div>
    </div>

    {/* TESTIMONIAL — single big quote with portrait */}
    <div style={{ padding: '40px 20px', background: '#f4f0e8' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <ImgPlaceholder label="portrait" h={80} style={{ width: 80, borderRadius: '50%' }} />
        <div style={{ flex: 1, alignSelf: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Yuka, 26</div>
          <div style={{ fontSize: 10, color: wfStyles.muted }}>会社員 · 加入1年</div>
        </div>
      </div>
      <div style={{ fontFamily: wfStyles.font, fontSize: 17, lineHeight: 1.6 }}>
        「最初は緊張したけど、<br />
        みんな普通の社会人で、<br />
        すぐ馴染めました。」
      </div>
    </div>

    {/* EVENTS — minimalist list */}
    <div style={{ padding: '40px 20px' }}>
      <SectionH kicker="NEXT" title="次のイベント" />
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <ImgPlaceholder label="evt" h={60} style={{ width: 60, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>5/{14 + i * 4} (土) ゆる練</div>
            <div style={{ fontSize: 10, color: wfStyles.muted, marginTop: 2 }}>江東区SC · 19–21時</div>
          </div>
          <span style={{ fontSize: 16, color: wfStyles.muted }}>›</span>
        </div>
      ))}
    </div>

    {/* FAQ minimal */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="FAQ" title="気になること" />
      {['初心者OK?', '女性ひとりで?', '参加費は?'].map((q, i) => (
        <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13 }}>{q}</span>
          <span style={{ color: wfStyles.muted }}>+</span>
        </div>
      ))}
    </div>

    {/* CTA full-bleed photo */}
    <div style={{ position: 'relative', height: 280 }}>
      <ImgPlaceholder label="closing photo" h={280} style={{ borderRadius: 0, border: 'none', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: wfStyles.paper,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontFamily: wfStyles.font, fontSize: 22, margin: 0, lineHeight: 1.3 }}>
          まずは見学から、<br />どうぞ。
        </h2>
        <div style={{ height: 16 }} />
        <CTA primary={false} w="auto">
          <span style={{ color: wfStyles.paper }}>体験申し込み →</span>
        </CTA>
      </div>
    </div>
  </Phone>
);

// ============================================================
// WIREFRAME 4 — Q&A起点（不安に寄り添う）
// Starts with the questions women ask before joining.
// Anti-anxiety frame. Conversational.
// ============================================================

const WF4 = () => (
  <Phone bg="#fbf8f3">
    <Status />
    <TopNav />

    {/* HERO — question-led */}
    <div style={{ padding: '40px 20px 24px' }}>
      <div
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: 2,
          color: wfStyles.accent,
          marginBottom: 14,
        }}
      >
        — A QUESTION
      </div>
      <h1 style={{ fontFamily: wfStyles.font, fontSize: 26, lineHeight: 1.45, fontWeight: 700, margin: 0 }}>
        「初心者だし、<br />
        女ひとりだし、<br />
        浮かないかな…？」
      </h1>
      <Underline w={140} />

      <div
        style={{
          marginTop: 28,
          padding: 16,
          background: wfStyles.paper,
          border: `1.5px solid ${wfStyles.line}`,
          borderRadius: '4px 16px 4px 16px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: 16,
            background: wfStyles.accent,
            color: wfStyles.paper,
            fontSize: 10,
            padding: '2px 10px',
            borderRadius: 10,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: 1,
          }}
        >
          HIGH Q
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 600 }}>
          だいじょうぶ。<br />
          ほとんどの人が、<br />
          そう言って来ます。
        </div>
      </div>
    </div>

    <ImgPlaceholder label="warm photo · members chatting" h={200} style={{ margin: '0 20px' }} />

    {/* STATS — comfort numbers */}
    <div style={{ padding: '32px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          ['68%', '女性メンバー'],
          ['83%', '初心者スタート'],
          ['avg.27', '年齢中央値'],
          ['月2', '無理ない頻度'],
        ].map(([n, l]) => (
          <div key={l} style={{ borderTop: `1.5px solid ${wfStyles.line}`, paddingTop: 10 }}>
            <div style={{ fontFamily: wfStyles.font, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 11, color: wfStyles.muted, marginTop: 6 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* ABOUT */}
    <div style={{ padding: '20px 20px 40px' }}>
      <SectionH kicker="ABOUT" title="High Q ってこんな場所" />
      <Scribble lines={5} />
    </div>

    {/* "WORRIES → ANSWERS" — anti-anxiety pairs */}
    <div style={{ padding: '24px 20px 40px', background: wfStyles.ink, color: wfStyles.paper }}>
      <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, color: wfStyles.accent, marginBottom: 6 }}>
        — WORRIES & ANSWERS
      </div>
      <h2 style={{ fontFamily: wfStyles.font, fontSize: 22, margin: '0 0 20px', fontWeight: 700 }}>
        「あの不安」、<br />全部こたえます。
      </h2>
      {[
        ['ガチ勢ばっかりじゃない？', 'いえ、初心者と経験者が半々です。'],
        ['知り合いゼロでも来ていい？', 'ほとんどの人がそうやって来ます。'],
        ['チャラい雰囲気はちょっと…', '飲み会強制なし。落ち着いた層です。'],
        ['毎週は厳しい…', '月2回ペース。来れる時だけでOK。'],
      ].map(([w, a], i) => (
        <div
          key={i}
          style={{
            padding: '14px 0',
            borderBottom: `1px solid rgba(255,255,255,0.15)`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
            <span style={{ color: wfStyles.accent, marginRight: 6 }}>?</span>
            {w}
          </div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.85, paddingLeft: 14 }}>
            <span style={{ color: wfStyles.accent, marginRight: 6 }}>→</span>
            {a}
          </div>
        </div>
      ))}
    </div>

    {/* VOICES */}
    <div style={{ padding: '40px 20px' }}>
      <SectionH kicker="VOICES" title="先輩メンバーから" />
      {[
        ['Y.K, 26', '加入半年'],
        ['M.S, 31', '加入2年'],
      ].map(([n, sub], i) => (
        <Box key={i} style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <ImgPlaceholder label="" h={44} style={{ width: 44, borderRadius: '50%' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 10, color: wfStyles.muted }}>{sub}</div>
            </div>
          </div>
          <Scribble lines={3} short />
        </Box>
      ))}
    </div>

    {/* EVENTS minimal */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="NEXT" title="次の体験できる日" />
      {[1, 2].map((i) => (
        <Box key={i} style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>5/{14 + i * 4} (土) 19:00</div>
              <div style={{ fontSize: 10, color: wfStyles.muted, marginTop: 4 }}>江東区スポーツ会館</div>
            </div>
            <div
              style={{
                fontSize: 9,
                background: wfStyles.accent,
                color: wfStyles.paper,
                padding: '2px 8px',
                borderRadius: 8,
                alignSelf: 'flex-start',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              体験OK
            </div>
          </div>
        </Box>
      ))}
    </div>

    {/* SNS */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="SNS" title="@highq_volley" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <ImgPlaceholder key={i} label="ig" h={92} />
        ))}
      </div>
    </div>

    {/* CTA */}
    <div style={{ padding: 24, textAlign: 'center', background: wfStyles.accent, color: wfStyles.paper }}>
      <div style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>まずは、見るだけでもOK。</div>
      <CTA primary={false} w="100%">
        <span style={{ color: wfStyles.paper }}>体験を申し込む →</span>
      </CTA>
    </div>
  </Phone>
);

// ============================================================
// WIREFRAME 5 — タイムライン構造（"一日の流れ"でストーリー化）
// Walks the user through what a day at High Q looks like —
// 18:30 集合 → 19:00 練習 → 21:00 解散 → カフェへ
// Differentiator-first: not a feature list, a felt experience.
// ============================================================

const WF5 = () => (
  <Phone bg="#f7f4ed">
    <Status />
    <TopNav />

    {/* HERO */}
    <div style={{ padding: '32px 20px 24px' }}>
      <div
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: 3,
          color: wfStyles.accent,
          marginBottom: 16,
        }}
      >
        A SATURDAY · WITH HIGH Q
      </div>
      <h1 style={{ fontFamily: wfStyles.font, fontSize: 30, lineHeight: 1.25, margin: 0, fontWeight: 700 }}>
        土曜の夜、<br />
        体育館でちょっと、<br />
        汗を流す。
      </h1>
      <Underline w={150} />
      <div style={{ marginTop: 16, fontSize: 13, color: wfStyles.muted, lineHeight: 1.7 }}>
        ガチでも、ちゃらくもない。<br />
        ちょうどいい温度のサークルです。
      </div>
    </div>

    <ImgPlaceholder label="hero · evening gym" h={220} style={{ margin: '0 20px' }} />

    {/* TIMELINE — the day */}
    <div style={{ padding: '48px 20px 40px' }}>
      <SectionH kicker="A DAY IN THE LIFE" title="ある土曜の流れ" />
      <div style={{ position: 'relative', paddingLeft: 4 }}>
        {/* vertical line */}
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 12,
            bottom: 12,
            width: 1.5,
            background: wfStyles.line,
          }}
        />
        {[
          { t: '18:30', h: '集合', d: '体育館前で軽く挨拶。みんな普段着。' },
          { t: '19:00', h: 'アップ → 練習', d: 'パスやレシーブから。ゆるめに2時間。' },
          { t: '20:30', h: 'ミニゲーム', d: 'チーム分けして。レベルは混ぜます。' },
          { t: '21:00', h: '解散', d: 'お疲れさまでした。' },
          { t: '21:30', h: 'カフェ（任意）', d: '行く人だけ、近くのカフェで一杯。' },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 22, position: 'relative' }}>
            <div
              style={{
                width: 56,
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
                fontWeight: 700,
                paddingTop: 4,
              }}
            >
              {s.t}
            </div>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: i === 2 ? wfStyles.accent : wfStyles.paper,
                border: `1.5px solid ${wfStyles.line}`,
                marginTop: 6,
                marginLeft: -22,
                flexShrink: 0,
                zIndex: 1,
              }}
            />
            <div style={{ flex: 1, paddingTop: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.h}</div>
              <div style={{ fontSize: 12, color: wfStyles.muted, marginTop: 4, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* WHO WE ARE */}
    <div style={{ padding: '40px 20px', background: wfStyles.paper }}>
      <SectionH kicker="ABOUT" title="どんな人がいる？" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['20–30代中心', '半分は女性', '初心者OK', '江東区周辺', '会社員多め', 'お酒つよくない人も'].map((t) => (
          <span
            key={t}
            style={{
              border: `1.5px solid ${wfStyles.line}`,
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 11,
              background: wfStyles.paper,
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <Scribble lines={4} short />
    </div>

    {/* MEMBER STORIES */}
    <div style={{ padding: '40px 20px' }}>
      <SectionH kicker="VOICES" title="メンバーの声" />
      {[
        ['初心者で来ました', 'Y.K, 26'],
        ['経験者ですが落ち着く', 'R.T, 30'],
      ].map(([t, n], i) => (
        <Box key={i} fill={wfStyles.paper} style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>「{t}」</div>
          <Scribble lines={2} short />
          <div style={{ fontSize: 10, color: wfStyles.muted, marginTop: 8, fontFamily: 'ui-monospace, monospace' }}>
            — {n}
          </div>
        </Box>
      ))}
    </div>

    {/* SCHEDULE — the next 3 days */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="NEXT DAYS" title="次に来れる日" />
      <div style={{ display: 'flex', gap: 8, overflow: 'auto' }}>
        {[
          ['5月 14', 'SAT', '体験OK'],
          ['5月 22', 'SUN', '体験OK'],
          ['5月 28', 'SAT', '満員間近'],
        ].map(([d, w, b], i) => (
          <Box key={i} style={{ padding: 12, minWidth: 110, background: wfStyles.paper }}>
            <div style={{ fontSize: 10, color: wfStyles.muted, fontFamily: 'ui-monospace, monospace' }}>{w}</div>
            <div style={{ fontFamily: wfStyles.font, fontSize: 18, fontWeight: 700, marginTop: 2 }}>{d}</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 9,
                fontFamily: 'ui-monospace, monospace',
                color: wfStyles.accent,
              }}
            >
              {b}
            </div>
          </Box>
        ))}
      </div>
    </div>

    {/* FAQ */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="FAQ" title="よくある質問" />
      {['持ち物は？', '途中参加・途中退出は？', '雨の日は？'].map((q, i) => (
        <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{q}</div>
        </div>
      ))}
    </div>

    {/* SNS */}
    <div style={{ padding: '0 20px 40px' }}>
      <SectionH kicker="SNS" title="@highq_volley" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ImgPlaceholder key={i} label="ig" h={88} />
        ))}
      </div>
    </div>

    {/* footer CTA */}
    <div style={{ padding: 24, background: wfStyles.ink, color: wfStyles.paper, textAlign: 'center' }}>
      <div style={{ fontFamily: wfStyles.font, fontSize: 16, marginBottom: 12 }}>
        まずは1回、見にきてください。
      </div>
      <CTA primary={false}>
        <span style={{ color: wfStyles.paper }}>体験参加を申し込む →</span>
      </CTA>
    </div>
  </Phone>
);

// ============================================================
// CANVAS WRAPPER + TWEAKS
// ============================================================

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "fontPair": "kaisei",
  "accentColor": "#c8553d",
  "paperTone": "cream"
}/*EDITMODE-END*/;

const FONT_PAIRS = {
  kaisei: '"Kaisei Decol", "Yomogi", serif',
  klee: '"Klee One", "Yomogi", cursive',
  yomogi: '"Yomogi", "Caveat", sans-serif',
  noto: '"Noto Serif JP", serif',
};

const PAPER_TONES = {
  cream: '#fafaf6',
  warm: '#fbf6ed',
  cool: '#f3f4f1',
  white: '#ffffff',
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // apply tweaks globally
  wfStyles.font = FONT_PAIRS[tweaks.fontPair] || FONT_PAIRS.kaisei;
  wfStyles.accent = tweaks.accentColor;
  wfStyles.paper = PAPER_TONES[tweaks.paperTone] || PAPER_TONES.cream;

  const wireframes = [
    {
      id: 'wf1',
      label: '01 · 王道シンプル縦積み',
      desc: '教科書的な構造。安心感。',
      Comp: WF1,
    },
    {
      id: 'wf2',
      label: '02 · 雑誌風エディトリアル',
      desc: 'Issue/Vol建て。落ち着いた大人感。',
      Comp: WF2,
    },
    {
      id: 'wf3',
      label: '03 · 写真主役グリッド',
      desc: 'フルブリード写真で雰囲気を伝える。',
      Comp: WF3,
    },
    {
      id: 'wf4',
      label: '04 · 不安に寄り添うQ&A起点',
      desc: '女性が来る前の不安を一個ずつ潰す。',
      Comp: WF4,
    },
    {
      id: 'wf5',
      label: '05 · タイムライン（一日の流れ）',
      desc: '"ある土曜の流れ"でストーリー化。',
      Comp: WF5,
    },
  ];

  return (
    <>
      <DesignCanvas projectName="High Q LP — Wireframes">
        <DCSection id="wireframes" title="LP リデザイン候補 — 5案">
          {wireframes.map((w) => (
            <DCArtboard key={w.id} id={w.id} label={w.label} width={320} height={640}>
              <w.Comp />
            </DCArtboard>
          ))}
        </DCSection>

        <DCSection id="notes" title="設計メモ">
          <DCArtboard id="notes-card" label="方向性メモ" width={520} height={640}>
            <div
              style={{
                width: '100%',
                height: '100%',
                padding: 32,
                background: '#fafaf6',
                fontFamily: '"Kaisei Decol", serif',
                color: '#1a1a1a',
                boxSizing: 'border-box',
                overflow: 'auto',
              }}
            >
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 2, color: '#c8553d', marginBottom: 8 }}>
                — DESIGN BRIEF
              </div>
              <h2 style={{ fontSize: 24, margin: '0 0 16px', lineHeight: 1.3 }}>
                落ち着いた大人っぽさ × 親しみやすさ
              </h2>

              <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 20 }}>
                女性が安心して訪れたくなるトーンを優先。<br />
                ガチでもチャラでもない、その中間の解像度を5案で探ります。
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>共通言語</div>
                <ul style={{ fontSize: 12, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                  <li>クリーム系の紙のような背景（青背景は卒業）</li>
                  <li>明朝×手書き風のフォントペア</li>
                  <li>1色のみのアクセント（テラコッタ系）</li>
                  <li>江東区/Tokyo の地名を入れて土地感</li>
                  <li>"ガチすぎず、チャラすぎず" を体現</li>
                </ul>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>各案の違い</div>
                <ul style={{ fontSize: 12, lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                  <li><b>01</b> 安全な王道。比較のベースライン。</li>
                  <li><b>02</b> 雑誌のIssue仕立て。最も大人っぽい。</li>
                  <li><b>03</b> 写真ありきで雰囲気で押し切る。</li>
                  <li><b>04</b> "浮かないかな" の不安に直接応える。</li>
                  <li><b>05</b> 一日の流れで体験を可視化（差別化◎）。</li>
                </ul>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.15)', paddingTop: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>次のステップ</div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  気に入った案・要素を選んでください。<br />
                  ハイブリッド（例: 02の雑誌風 + 05のタイムライン）も可能。<br />
                  方向性が決まったらハイファイ版に進みます。
                </div>
              </div>
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Typography">
          <TweakRadio
            label="Font pair"
            value={tweaks.fontPair}
            onChange={(v) => setTweak('fontPair', v)}
            options={[
              { value: 'kaisei', label: 'Kaisei' },
              { value: 'klee', label: 'Klee' },
              { value: 'yomogi', label: 'Yomogi' },
              { value: 'noto', label: 'Noto' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Color">
          <TweakColor
            label="Accent"
            value={tweaks.accentColor}
            onChange={(v) => setTweak('accentColor', v)}
          />
          <TweakRadio
            label="Paper tone"
            value={tweaks.paperTone}
            onChange={(v) => setTweak('paperTone', v)}
            options={[
              { value: 'cream', label: 'Cream' },
              { value: 'warm', label: 'Warm' },
              { value: 'cool', label: 'Cool' },
              { value: 'white', label: 'White' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
