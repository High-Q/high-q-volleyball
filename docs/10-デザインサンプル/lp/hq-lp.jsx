// High Q — Hi-fi LP v2 (mobile-first)
// Updates: lower hurdle for first-timers, faster schedule access for repeats,
// font fixed to Shippori Mincho + Zen Kaku Gothic.

const { useState: useStateLP } = React;

// ============================================================
// MODE TOGGLE — 新規 / リピーター
// ============================================================
const ModeToggle = ({ mode, setMode }) => (
  <div
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: HQ.paper,
      borderBottom: `1px solid ${HQ.hairline}`,
      padding: '10px 20px',
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <span style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 1.5, color: HQ.muted }}>
      MODE
    </span>
    <div
      style={{
        display: 'flex',
        background: 'rgba(31,29,26,0.05)',
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}
    >
      {[
        ['first', 'はじめての方'],
        ['repeat', '次の予定を見る'],
      ].map(([k, label]) => (
        <button
          key={k}
          onClick={() => setMode(k)}
          style={{
            border: 'none',
            background: mode === k ? HQ.ink : 'transparent',
            color: mode === k ? HQ.paper : HQ.inkSoft,
            padding: '8px 14px',
            borderRadius: 999,
            fontFamily: HQ.jp,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.5,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

// ============================================================
// HERO — first-time mode (warm, lower-hurdle)
// ============================================================
const HeroFirst = () => (
  <div style={{ position: 'relative', height: 600, overflow: 'hidden' }}>
    <Photo label="hero · 体育館" h="100%" w="100%" />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(180deg, rgba(31,29,26,0.7) 0%, rgba(31,29,26,0.2) 30%, rgba(31,29,26,0.2) 55%, rgba(31,29,26,0.85) 100%)',
        display: 'flex',
        flexDirection: 'column',
        color: HQ.paper,
      }}
    >
      <StatusBar dark />
      <Nav dark />
      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 28px 28px' }}>
        <Kicker color="rgba(247,243,234,0.85)" style={{ marginBottom: 16 }}>
          Tokyo · Koto-ku
        </Kicker>
        <h1
          style={{
            fontFamily: HQ.jpSerif,
            fontSize: 32,
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
        <div style={{ height: 16 }} />
        <div style={{ fontSize: 13.5, lineHeight: 1.85, opacity: 0.9, maxWidth: 300 }}>
          ガチでもなく、ノリすぎず。<br />
          土日祝の日中・夜に、月1〜2回。<br />
          ちょうどいい温度のバレーボールです。
        </div>
        <div style={{ height: 22 }} />
        <Button full primary>体験参加してみる</Button>
        <div style={{ height: 8 }} />
        <div style={{ textAlign: 'center', fontSize: 11.5, opacity: 0.75, lineHeight: 1.7 }}>
          所要 1分 / 月1〜2回開催 / 参加費 500円〜
        </div>
      </div>
    </div>
  </div>
);

// ============================================================
// NEXT SESSION STRIP — sits directly under HeroFirst
// Surfaces the next session for repeat visitors without splitting pages.
// ============================================================
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
          5/14 (土) · ゆる練 vol.21
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
          18:00–20:00 · 江東区スポーツ会館
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
        cursor: 'pointer',
      }}
    >
      予約 ›
    </div>
  </div>
);

// ============================================================
// HERO — repeat mode (schedule first, fast)
// ============================================================
const HeroRepeat = ({ onJump }) => (
  <div
    style={{
      background: HQ.ink,
      color: HQ.paper,
      padding: '24px 24px 28px',
    }}
  >
    <StatusBar dark />
    <Nav dark />
    <div style={{ height: 12 }} />
    <Kicker color="rgba(247,243,234,0.7)" style={{ marginBottom: 12 }}>
      Welcome back
    </Kicker>
    <h1
      style={{
        fontFamily: HQ.jpSerif,
        fontSize: 26,
        lineHeight: 1.5,
        fontWeight: 500,
        margin: '0 0 18px',
        letterSpacing: '0.02em',
      }}
    >
      次の予定、決まりました。
    </h1>
    {/* next session big card */}
    <div
      style={{
        background: HQ.paper,
        color: HQ.ink,
        borderRadius: 4,
        padding: 20,
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Kicker>Next · 直近</Kicker>
        <span
          style={{
            fontFamily: HQ.mono,
            fontSize: 9,
            letterSpacing: 1.5,
            color: HQ.accent,
            border: `1px solid ${HQ.accent}`,
            padding: '3px 7px',
            borderRadius: 2,
          }}
        >
          残 5/12
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: HQ.jpSerif, fontSize: 40, fontWeight: 500, lineHeight: 1, color: HQ.ink }}>
          5/14
        </span>
        <span style={{ fontFamily: HQ.mono, fontSize: 11, letterSpacing: 1.5, color: HQ.muted }}>SAT</span>
      </div>
      <div style={{ fontFamily: HQ.jpSerif, fontSize: 17, fontWeight: 500, marginBottom: 8 }}>
        ゆる練 vol.21
      </div>
      <div style={{ fontSize: 12.5, color: HQ.inkSoft, lineHeight: 1.8, marginBottom: 14 }}>
        18:00–20:00 · 江東区スポーツ会館
      </div>
      <Button full primary>この日に予約する</Button>
    </div>
    {/* shortcuts */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      <button
        onClick={onJump}
        style={{
          background: 'transparent',
          color: HQ.paper,
          border: '1px solid rgba(247,243,234,0.3)',
          padding: '14px 12px',
          borderRadius: 4,
          fontFamily: HQ.jp,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 9, fontFamily: HQ.mono, letterSpacing: 1.5, opacity: 0.6, marginBottom: 6 }}>
          ALL EVENTS
        </div>
        全予定を見る →
      </button>
      <button
        style={{
          background: 'transparent',
          color: HQ.paper,
          border: '1px solid rgba(247,243,234,0.3)',
          padding: '14px 12px',
          borderRadius: 4,
          fontFamily: HQ.jp,
          fontSize: 12.5,
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: 9, fontFamily: HQ.mono, letterSpacing: 1.5, opacity: 0.6, marginBottom: 6 }}>
          MY BOOKINGS
        </div>
        予約履歴 →
      </button>
    </div>
  </div>
);

// ============================================================
// REASSURANCE STRIP — first-time only, right after hero
// "What you need to know before you come"
// ============================================================
const ReassuranceStrip = () => (
  <section
    style={{
      background: HQ.paper,
      padding: '32px 24px',
      borderBottom: `1px solid ${HQ.hairline}`,
    }}
  >
    <div style={{ textAlign: 'center', marginBottom: 20 }}>
      <Kicker>— Easy to start</Kicker>
      <div style={{ fontFamily: HQ.jpSerif, fontSize: 18, fontWeight: 500, marginTop: 8, letterSpacing: '0.02em' }}>
        来る前に、これだけ。
      </div>
    </div>
    {/* 持ち物だけ主役カード(横長)、服装と参加費は下に小さく2列 */}
    <div
      style={{
        background: HQ.paperWarm,
        padding: '18px 18px',
        borderRadius: 4,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 18,
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>👜</div>
      <div>
        <div
          style={{
            fontFamily: HQ.mono,
            fontSize: 9,
            letterSpacing: 1.5,
            color: HQ.muted,
            marginBottom: 6,
          }}
        >
          持ち物
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px 14px',
            fontSize: 13,
            fontWeight: 500,
            color: HQ.ink,
          }}
        >
          {['飲み物', '運動着', '体育館シューズ'].map((line, j) => (
            <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: HQ.muted,
                  display: 'inline-block',
                }}
              />
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {[
        { ico: '👟', t: '服装', d: '動きやすい服' },
        { ico: '💴', t: '参加費', d: '500円 or 1,000円' },
      ].map((x, i) => (
        <div
          key={i}
          style={{
            background: HQ.paperWarm,
            padding: '14px 14px',
            borderRadius: 4,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 22, lineHeight: 1 }}>{x.ico}</div>
          <div>
            <div
              style={{
                fontFamily: HQ.mono,
                fontSize: 9,
                letterSpacing: 1.5,
                color: HQ.muted,
                marginBottom: 3,
              }}
            >
              {x.t}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: HQ.ink }}>{x.d}</div>
          </div>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 16, fontSize: 12, color: HQ.inkSoft, textAlign: 'center', lineHeight: 1.8 }}>
      参加費は会場により 500円 / 1,000円。<br />
      開催は土日祝の 18:00–20:00 が中心です。
    </div>
  </section>
);

// ============================================================
// META STRIP
// ============================================================
const MetaStrip = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      borderBottom: `1px solid ${HQ.hairline}`,
      background: HQ.paper,
    }}
  >
    {[
      ['エリア', '江東区'],
      ['開催', '土日祝'],
      ['頻度', '月1〜2回'],
    ].map(([k, v], i) => (
      <div
        key={k}
        style={{
          padding: '20px 12px',
          textAlign: 'center',
          borderRight: i < 2 ? `1px solid ${HQ.hairline}` : 'none',
        }}
      >
        <div style={{ fontFamily: HQ.jp, fontSize: 10, letterSpacing: 2, color: HQ.muted, fontWeight: 500 }}>{k}</div>
        <div style={{
          fontFamily: HQ.jpSerif, fontSize: 18, fontWeight: 500,
          marginTop: 8, color: HQ.ink, lineHeight: 1.2, letterSpacing: '0.02em',
        }}>
          {v}
        </div>
      </div>
    ))}
  </div>
);

// ============================================================
// FIRST-TIME FLOW — what happens, step by step
// ============================================================
const FirstTimeFlow = () => {
  const steps = [
    { n: '01', t: '予約する', d: '当日の朝までに、フォームから1分で。', when: '〜前日' },
    { n: '02', t: '会場に向かう', d: '普段着でOK。会場で幹事に「初めてです」と声をかけてください。', when: '当日 17:50' },
    { n: '03', t: '紹介と挨拶', d: '幹事がみんなに軽く紹介してくれます。', when: '18:00' },
    { n: '04', t: '基礎練（パス・スパイク）', d: 'パス・レシーブから、スパイクまで。初心者には経験者がしっかりレクチャーします。', when: '18:00–19:00' },
    { n: '05', t: 'ゲーム形式', d: 'チームを混ぜて。レベル差は気にしないでください。', when: '19:00–20:00' },
    { n: '06', t: '解散・任意で懇親会', d: '20:00 解散。行ける人は近くのお店で軽く一杯（任意）。', when: '20:00–' },
  ];
  return (
    <section style={{ background: HQ.paperWarm, padding: '72px 28px 64px' }}>
      <SectionTitle
        kicker="First time?"
        jp={<>当日、こんな流れで<br />進みます。</>}
        en="So you know what to expect."
      />
      <div style={{ height: 28 }} />
      <div style={{ position: 'relative', paddingLeft: 0 }}>
        {/* vertical line */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            top: 16,
            bottom: 16,
            width: 1,
            background: HQ.hairline,
          }}
        />
        {steps.map((s) => (
          <div key={s.n} style={{ display: 'flex', gap: 18, marginBottom: 24, position: 'relative' }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: HQ.paper,
                border: `1px solid ${HQ.hairline}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: HQ.mono,
                fontSize: 9,
                color: HQ.accent,
                flexShrink: 0,
                marginTop: 2,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {s.n}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontFamily: HQ.jpSerif, fontSize: 16, fontWeight: 500, color: HQ.ink }}>
                  {s.t}
                </span>
                <span style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 1, color: HQ.muted }}>
                  {s.when}
                </span>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.85, color: HQ.inkSoft }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>
      {/* small reassurance */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          background: HQ.paper,
          borderLeft: `2px solid ${HQ.accent}`,
          fontSize: 12.5,
          lineHeight: 1.85,
          color: HQ.inkSoft,
        }}
      >
        幹事が常に近くにいるので、<br />
        わからないことは何でも声をかけてください。
      </div>
    </section>
  );
};

// ============================================================
// ABOUT
// ============================================================
const About = () => (
  <section style={{ padding: '72px 28px 56px', background: HQ.paper }}>
    <SectionTitle kicker="About" jp={<>はじめての人にこそ、<br />来てほしい場所。</>} en="A circle to begin." />
    <div style={{ height: 28 }} />
    <div style={{ fontSize: 14, lineHeight: 2.0, color: HQ.inkSoft }}>
      <p style={{ margin: '0 0 16px' }}>
        High Q は、東京・江東区を中心に活動する<br />社会人バレーボールサークルです。
      </p>
      <p style={{ margin: 0 }}>
        ガチでもなく、気負わない。<br />
        やりたい時に、来たい人が来る。<br />
        ちょうどいい温度感の場所です。
      </p>
    </div>
    <div style={{ height: 32 }} />
    <Photo label="活動の様子" h={260} />
  </section>
);

// ============================================================
// FEATURES — Why High Q (案A: 画像なし、番号+編集記事風)
// ============================================================
const Features = () => {
  const items = [
    { n: '01', kicker: 'BEGINNER FRIENDLY', jp: '初心者でも、本当に大丈夫。', body: '参加者の 2〜3割 は初心者です。基礎練習（パス・スパイク）では、経験者がしっかりレクチャーします。' },
    { n: '02', kicker: 'CALM VIBE', jp: '落ち着いた、大人の集まり。', body: '20〜30代の社会人が中心。ノリで圧倒することはありません。お酒が苦手な人も歓迎です。' },
    { n: '03', kicker: 'NO PRESSURE', jp: '無理しない、月1〜2回。', body: '土日祝の日中または夜間に、月1〜2回。来れる時だけ参加でOK。年に1回だけ来る人もいます。' },
  ];
  return (
    <section style={{ background: HQ.paperWarm, padding: '72px 28px 64px' }}>
      <SectionTitle kicker="Why High Q" jp={<>3つの<br />ちょうどよさ。</>} en="What makes us, us." />
      <div style={{ height: 36 }} />
      <div>
        {items.map((f, i) => (
          <div
            key={f.n}
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr',
              gap: 16,
              padding: '28px 0',
              borderTop: i === 0 ? `1px solid ${HQ.hairline}` : 'none',
              borderBottom: `1px solid ${HQ.hairline}`,
            }}
          >
            <div
              style={{
                fontFamily: HQ.mono,
                fontSize: 11,
                letterSpacing: '0.2em',
                color: HQ.muted,
                paddingTop: 8,
              }}
            >
              {f.n}
            </div>
            <div>
              <div
                style={{
                  fontFamily: HQ.mono,
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  color: HQ.muted,
                  marginBottom: 10,
                  textTransform: 'uppercase',
                }}
              >
                {f.kicker}
              </div>
              <h3
                style={{
                  fontFamily: HQ.jpSerif,
                  fontSize: 24,
                  lineHeight: 1.5,
                  fontWeight: 500,
                  margin: '0 0 10px',
                  letterSpacing: '0.01em',
                  color: HQ.ink,
                }}
              >
                {f.jp}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.95, color: HQ.inkSoft, margin: 0 }}>
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ============================================================
// WORRIES
// ============================================================
const Worries = () => {
  const items = [
    ['ガチ勢ばっかりじゃない？', '初心者と経験者が、半々くらいです。'],
    ['ひとりで来ても浮かない？', 'ほとんどの人がひとりで来ます。幹事が紹介する時間もあります。'],
    ['ガツガツした雰囲気はちょっと…', '懇親会も任意。落ち着いた雰囲気で、お酒が苦手でも大丈夫です。'],
    ['毎週は通えないかも…', '月1〜2回ペース。来れる時だけでOK。年1回の人も。'],
  ];
  return (
    <section style={{ background: HQ.ink, color: HQ.paper, padding: '80px 28px' }}>
      <SectionTitle
        kicker="Before you join"
        jp={<>来る前の不安を、<br />ぜんぶ。</>}
        en="Worries, answered."
        color={HQ.paper}
        accentColor={HQ.accent}
      />
      <div style={{ height: 32 }} />
      <div>
        {items.map(([q, a], i) => (
          <div
            key={i}
            style={{
              padding: '22px 0',
              borderTop: i === 0 ? '1px solid rgba(247,243,234,0.18)' : 'none',
              borderBottom: '1px solid rgba(247,243,234,0.18)',
            }}
          >
            <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
              <span style={{ fontFamily: HQ.jpSerif, fontSize: 18, fontWeight: 600, color: HQ.accent, lineHeight: 1, flexShrink: 0, letterSpacing: 1 }}>Q.</span>
              <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.6 }}>{q}</div>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <span style={{ fontFamily: HQ.jpSerif, fontSize: 18, fontWeight: 600, color: HQ.paper, lineHeight: 1, flexShrink: 0, opacity: 0.75, letterSpacing: 1 }}>A.</span>
              <div style={{ fontSize: 13.5, lineHeight: 1.85, opacity: 0.85 }}>{a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ============================================================
// EVENTS — now richer for repeats: filter + cards
// ============================================================
const Events = ({ repeatMode = false }) => {
  const all = [
    { m: 'MAY', d: '14', dow: 'SAT', t: 'ゆる練 vol.21', loc: '江東区スポーツ会館', time: '18:00–20:00', tag: '残あり', remain: '5/12' },
    { m: 'MAY', d: '22', dow: 'SUN', t: 'ゆる練 vol.22', loc: '豊洲文化センター', time: '13:00–15:00', tag: '残あり', remain: '8/14' },
    { m: 'MAY', d: '28', dow: 'SAT', t: 'ゆる練 vol.23', loc: '深川北スポーツセンター', time: '18:00–20:00', tag: '満員間近', remain: '2/10' },
    { m: 'JUN', d: '04', dow: 'SAT', t: 'ゆる練 vol.24', loc: '江東区スポーツ会館', time: '18:00–20:00', tag: '残あり', remain: '12/12' },
    { m: 'JUN', d: '11', dow: 'SAT', t: 'BBQ + バレー', loc: '辰巳の森海浜公園', time: '13:00–18:00', tag: '残あり', remain: '20/30' },
  ];
  return (
    <section style={{ padding: '72px 28px 56px', background: HQ.paper }}>
      <SectionTitle
        kicker="Schedule"
        jp={repeatMode ? <>すべての予定。</> : <>次に、来れる日。</>}
        en="May–June 2026"
      />
      <div style={{ height: 24 }} />
      {/* event cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {all.map((e, i) => (
          <div
            key={i}
            style={{
              background: HQ.paperWarm,
              border: `1px solid ${HQ.hairline}`,
              borderRadius: 4,
              padding: 18,
              display: 'flex',
              gap: 16,
              alignItems: 'stretch',
            }}
          >
            <div style={{ minWidth: 56, textAlign: 'center', borderRight: `1px solid ${HQ.hairline}`, paddingRight: 16 }}>
              <div style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 2, color: HQ.muted }}>{e.m}</div>
              <div style={{ fontFamily: HQ.jpSerif, fontSize: 28, fontWeight: 500, lineHeight: 1, color: HQ.ink, marginTop: 2 }}>
                {e.d}
              </div>
              <div style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 2, color: HQ.muted, marginTop: 4 }}>{e.dow}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: HQ.ink, marginBottom: 6 }}>
                {e.t}
              </div>
              <div style={{ fontSize: 11.5, color: HQ.muted, lineHeight: 1.7 }}>{e.time}</div>
              <div style={{ fontSize: 11.5, color: HQ.muted, lineHeight: 1.7 }}>{e.loc}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    fontFamily: HQ.mono, fontSize: 9, letterSpacing: 1.5,
                    color: e.tag === '満員間近' ? '#a04545' : HQ.muted,
                    padding: '3px 7px',
                    border: `1px solid ${e.tag === '満員間近' ? '#a04545' : HQ.hairline}`,
                    borderRadius: 2,
                  }}
                >
                  {e.tag}
                </span>
                <span style={{ fontFamily: HQ.mono, fontSize: 10, color: HQ.muted }}>残 {e.remain}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 24 }} />
      <div style={{ textAlign: 'center' }}>
        <Button primary={false}>カレンダーで見る</Button>
      </div>
    </section>
  );
};

// ============================================================
// GALLERY + SNS — merged
// ============================================================
const GallerySNS = () => (
  <section style={{ padding: '72px 0 48px', background: HQ.paperWarm }}>
    <div style={{ padding: '0 28px 28px' }}>
      <SectionTitle kicker="Gallery & Social" jp={<>ある日の、High Q。</>} en="Follow along." />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '0 6px' }}>
      <Photo label="snap 01" h={180} />
      <Photo label="snap 02" h={140} />
      <Photo label="snap 03" h={140} />
      <Photo label="snap 04" h={180} />
    </div>
    <div style={{ padding: '24px 28px 0', display: 'grid', gap: 10 }}>
      <Button primary={false} full arrow>X @highq_volley</Button>
      {/* Instagram は準備中 — 開設後に有効化 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 22px',
          border: `1px dashed ${HQ.hairline}`,
          borderRadius: 999,
          color: HQ.muted,
          fontFamily: HQ.jp,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: 1,
          background: 'transparent',
        }}
        aria-disabled="true"
      >
        <span>Instagram</span>
        <span
          style={{
            fontFamily: HQ.mono,
            fontSize: 9,
            letterSpacing: 1.8,
            color: HQ.muted,
            border: `1px solid ${HQ.hairline}`,
            padding: '3px 7px',
            borderRadius: 2,
            textTransform: 'uppercase',
          }}
        >
          Coming soon
        </span>
      </div>
    </div>
  </section>
);

// ============================================================
// FAQ
// ============================================================
const FAQ = () => {
  const [open, setOpen] = useStateLP(0);
  const items = [
    ['持ち物は何が必要？', '飲み物・運動着・体育館シューズの3点です。'],
    ['参加費はいくら？', '会場により 500円 または 1,000円。会場費・ボール代に使われます。'],
    ['ひとりで来ても大丈夫？', 'ぜんぜん大丈夫です。ほとんどの方が初回はひとりで来ています。'],
    ['途中参加・途中退出はできる？', 'もちろんOK。仕事の都合で途中から、なども問題ありません。'],
    ['加入の手続きは必要？', '特別な加入手続きはありません。来たい時に予約して来てもらうスタイルです。'],
    ['雨の日はどうなる？', '会場は屋内なので、雨でも実施します。台風など特別な場合のみ中止連絡をします。'],
  ];
  return (
    <section style={{ padding: '72px 28px 56px', background: HQ.paperWarm }}>
      <SectionTitle kicker="FAQ" jp={<>よくある質問。</>} en="Just in case." />
      <div style={{ height: 24 }} />
      <div>
        {items.map(([q, a], i) => (
          <div
            key={i}
            style={{ borderTop: i === 0 ? `1px solid ${HQ.hairline}` : 'none', borderBottom: `1px solid ${HQ.hairline}` }}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span style={{ fontFamily: HQ.jpSerif, fontSize: 15, fontWeight: 600, color: HQ.accent }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: HQ.ink }}>{q}</span>
              </div>
              <span style={{ fontFamily: HQ.jp, fontSize: 22, fontWeight: 300, color: HQ.muted, transform: open === i ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                +
              </span>
            </div>
            {open === i && (
              <div style={{ paddingLeft: 32, paddingBottom: 20, fontSize: 13, lineHeight: 1.9, color: HQ.inkSoft }}>{a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// ============================================================
// NOT FOR YOU — 誠実なフィルタ
// ============================================================
const NotForYou = () => {
  const items = [
    ['勝つことが第一目的の人', 'High Q は勝敗より、楽しむことを大事にしています。'],
    ['毎週ガッツリ練習したい人', '月1〜2回ペース。物足りなく感じるかもしれません。'],
    ['お酒や交流を強要したい人', '懇親会は完全任意。バレーだけ参加もまったく問題ありません。'],
  ];
  return (
    <section style={{ background: HQ.paper, padding: '72px 28px 64px', borderTop: `1px solid ${HQ.hairline}` }}>
      <SectionTitle
        kicker="Honest note"
        jp={<>こんな方には、<br />合わないかもしれません。</>}
        en="Honestly speaking."
      />
      <div style={{ height: 28 }} />
      <div style={{ fontSize: 13, lineHeight: 1.95, color: HQ.inkSoft, marginBottom: 24 }}>
        合わない場所に来てもらっても、<br />
        お互いに気を使うだけになってしまうので、<br />
        正直にお伝えします。
      </div>
      {items.map(([t, d], i) => (
        <div
          key={i}
          style={{
            padding: '18px 0',
            borderTop: i === 0 ? `1px solid ${HQ.hairline}` : 'none',
            borderBottom: `1px solid ${HQ.hairline}`,
            display: 'flex',
            gap: 14,
          }}
        >
          <span style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
            border: `1px solid ${HQ.muted}`, color: HQ.muted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, marginTop: 2,
          }}>×</span>
          <div>
            <div style={{ fontFamily: HQ.jpSerif, fontSize: 15, fontWeight: 500, color: HQ.ink, marginBottom: 6, letterSpacing: '0.01em' }}>
              {t}
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.85, color: HQ.inkSoft }}>{d}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 22, fontSize: 12.5, lineHeight: 1.95, color: HQ.inkSoft, textAlign: 'center' }}>
        逆に、上のどれも当てはまらないなら、<br />
        ぜひ一度遊びに来てください。
      </div>
    </section>
  );
};

// ============================================================
// FINAL CTA
// ============================================================
const FinalCTA = () => (
  <section style={{ position: 'relative', minHeight: 460, overflow: 'hidden' }}>
    <Photo label="closing photo" h="100%" w="100%" style={{ position: 'absolute', inset: 0 }} />
    <div
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(31,29,26,0.4) 0%, rgba(31,29,26,0.85) 100%)',
        minHeight: 460,
        padding: '72px 28px 56px',
        color: HQ.paper,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}
    >
      <Kicker color="rgba(247,243,234,0.85)">— Join us</Kicker>
      <h2 style={{ fontFamily: HQ.jpSerif, fontSize: 28, lineHeight: 1.55, fontWeight: 500, margin: '16px 0 18px', letterSpacing: '0.02em' }}>
        まずは1回、<br />見学だけでも。
      </h2>
      <p style={{ fontSize: 13.5, lineHeight: 2, margin: '0 0 28px', opacity: 0.85 }}>
        予約サイトは現在準備中です。<br />
        まずは LINE オープンチャットから<br />
        お気軽にご連絡ください。
      </p>
      <Button full primary dark>LINE オープンチャットで連絡</Button>
      <div style={{ height: 10 }} />
      <Button full primary={false} dark arrow>X @highq_volley でDM</Button>
      <div style={{ height: 12 }} />
      <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.7 }}>所要 1分・キャンセル無料</div>
    </div>
  </section>
);

// ============================================================
// FOOTER
// ============================================================
const Footer = () => (
  <footer style={{ background: HQ.ink, color: HQ.paper, padding: '40px 28px 24px' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
      <span style={{ fontFamily: HQ.jpSerif, fontSize: 24, fontWeight: 600, letterSpacing: 1 }}>High Q</span>
      <span style={{ fontFamily: HQ.jp, fontSize: 10, letterSpacing: 2, opacity: 0.6 }}>江東区</span>
    </div>
    <div style={{ fontSize: 12, lineHeight: 1.9, opacity: 0.75, marginBottom: 24 }}>
      東京・江東区を中心に活動する<br />社会人バレーボールサークルです。
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', fontSize: 12, marginBottom: 24 }}>
      {['About', 'Events', 'FAQ', 'LINE OpenChat', 'X (Twitter)', 'Contact'].map((l) => (
        <div key={l} style={{ opacity: 0.85 }}>{l} ↗</div>
      ))}
    </div>
    <div style={{ height: 1, background: 'rgba(247,243,234,0.15)', marginBottom: 16 }} />
    <div style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 1, opacity: 0.5 }}>
      © 2026 HIGH Q VOLLEYBALL CIRCLE
    </div>
  </footer>
);

// ============================================================
// PAGE — switches order based on mode
// ============================================================
const HighQLP = () => {
  return (
    <div
      data-screen-label="High Q LP"
      style={{
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
        background: HQ.paper,
        fontFamily: HQ.jp,
        color: HQ.ink,
        overflow: 'hidden',
      }}
    >
      <HeroFirst />
      <NextSessionStrip />
      <ReassuranceStrip />
      <MetaStrip />
      <About />
      <Features />
      <FirstTimeFlow />
      <Worries />
      <Events />
      <FAQ />
      <NotForYou />
      <GallerySNS />
      <FinalCTA />
      <Footer />
    </div>
  );
};

window.HighQLP = HighQLP;
