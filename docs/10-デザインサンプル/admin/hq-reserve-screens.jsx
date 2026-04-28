// High Q — Reservation site (user-facing). Mobile-first, 390px.
// Reuses LP tokens (HQ) — quiet, paper-toned, terracotta accent.
// Two variations on the event detail screen.

const RW = 390;
const RH = 844;

// ─────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────
const RTopBar = ({ back, action, title }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px',
    marginTop: 54,
    borderBottom: `1px solid ${HQ.hairline}`,
    background: HQ.paper,
  }}>
    {back ? (
      <span style={{ color: HQ.muted, transform: 'rotate(180deg)', display: 'flex' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </span>
    ) : (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: HQ.jpSerif, fontSize: 20, fontWeight: 600, color: HQ.ink, letterSpacing: 1 }}>High Q</span>
        <span style={{ fontFamily: HQ.mono, fontSize: 9, letterSpacing: 2, color: HQ.muted }}>EST.21</span>
      </div>
    )}
    {title && <span style={{ fontFamily: HQ.jp, fontSize: 14, fontWeight: 600, color: HQ.ink }}>{title}</span>}
    {action || <div style={{ width: 18 }} />}
  </div>
);

const RPhoto = ({ label, h = 220 }) => (
  <div style={{
    width: '100%', height: h,
    background: `repeating-linear-gradient(135deg, rgba(31,29,26,0.06) 0 1px, transparent 1px 9px), linear-gradient(180deg, #d9cfbe 0%, #c8bba6 100%)`,
    position: 'relative', flexShrink: 0,
  }}>
    <span style={{
      position: 'absolute', bottom: 10, right: 12,
      color: 'rgba(31,29,26,0.45)', fontFamily: HQ.mono, fontSize: 9, letterSpacing: 1.4,
    }}>[ {label} ]</span>
  </div>
);

const RKicker = ({ children, color }) => (
  <div style={{
    fontFamily: HQ.mono, fontSize: 10, letterSpacing: 2.2,
    textTransform: 'uppercase', color: color || HQ.accent, fontWeight: 500,
  }}>{children}</div>
);

const RBadge = ({ tone = 'neutral', children, dot }) => {
  const palette = {
    neutral: { bg: 'rgba(31,29,26,0.06)', fg: HQ.inkSoft, dot: HQ.muted },
    accent:  { bg: HQ.accentSoft, fg: '#8a4129', dot: HQ.accent },
    success: { bg: 'rgba(90,122,74,0.10)', fg: '#5a7a4a', dot: '#5a7a4a' },
    warn:    { bg: 'rgba(161,117,54,0.12)', fg: '#a17536', dot: '#a17536' },
    danger:  { bg: 'rgba(161,67,54,0.10)', fg: '#a14336', dot: '#a14336' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: palette.bg, color: palette.fg,
      fontFamily: HQ.jp, fontSize: 11, fontWeight: 500,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: palette.dot }} />}
      {children}
    </span>
  );
};

const RBar = ({ booked, cap, height = 6 }) => {
  const pct = Math.min(100, (booked / cap) * 100);
  const tone = pct >= 100 ? '#a14336' : pct >= 80 ? '#a17536' : '#5a7a4a';
  return (
    <div style={{ height, background: 'rgba(31,29,26,0.06)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: tone }} />
    </div>
  );
};

const RButton = ({ children, primary = true, full = true, disabled }) => (
  <button disabled={disabled} style={{
    width: full ? '100%' : 'auto',
    padding: '15px 22px',
    background: primary ? HQ.ink : 'transparent',
    color: primary ? HQ.paper : HQ.ink,
    border: `1px solid ${primary ? HQ.ink : HQ.hairline}`,
    borderRadius: 999,
    fontFamily: HQ.jp, fontSize: 14, fontWeight: 500, letterSpacing: 1,
    cursor: 'pointer', opacity: disabled ? 0.45 : 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  }}>{children}
    {primary && (
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    )}
  </button>
);

const RField = ({ label, hint, required, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
      <span style={{ fontFamily: HQ.jp, fontSize: 12.5, fontWeight: 500, color: HQ.inkSoft }}>{label}</span>
      {required && <span style={{ color: HQ.accent, fontSize: 11 }}>*</span>}
      {hint && <span style={{ marginLeft: 'auto', fontFamily: HQ.mono, fontSize: 9.5, color: HQ.muted, letterSpacing: 1 }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const RInput = ({ value, placeholder, type = 'text' }) => (
  <input type={type} defaultValue={value} placeholder={placeholder} style={{
    width: '100%', boxSizing: 'border-box',
    padding: '13px 14px',
    background: '#fbf8f1',
    border: `1px solid ${HQ.hairline}`,
    borderRadius: 8,
    fontFamily: HQ.jp, fontSize: 14, color: HQ.ink, outline: 'none',
  }} />
);

const RTextarea = ({ value, placeholder, rows = 3 }) => (
  <textarea defaultValue={value} placeholder={placeholder} rows={rows} style={{
    width: '100%', boxSizing: 'border-box',
    padding: '13px 14px',
    background: '#fbf8f1',
    border: `1px solid ${HQ.hairline}`,
    borderRadius: 8,
    fontFamily: HQ.jp, fontSize: 14, lineHeight: 1.6, color: HQ.ink, outline: 'none', resize: 'none',
  }} />
);

// ─────────────────────────────────────────────────────────────
// 1. Events list (entry from LP)
// ─────────────────────────────────────────────────────────────
const R_EVENTS = [
  { d: '04 / 28', dow: '月', t: 'ゆる練 vol.42',  v: '亀戸スポーツセンター', tm: '19:30 – 21:30', b: 16, c: 18, fee: 1000 },
  { d: '05 / 05', dow: '月', t: 'GW 特別練習',   v: '東陽町コミュニティセンター', tm: '10:00 – 13:00', b: 24, c: 24, w: 3, fee: 1500, full: true },
  { d: '05 / 12', dow: '月', t: 'ゆる練 vol.43',  v: '亀戸スポーツセンター', tm: '19:30 – 21:30', b: 11, c: 18, fee: 1000 },
  { d: '05 / 19', dow: '月', t: 'ゆる練 vol.44',  v: '亀戸スポーツセンター', tm: '19:30 – 21:30', b: 4,  c: 18, fee: 1000 },
  { d: '06 / 02', dow: '月', t: 'ビギナー DAY',  v: '亀戸スポーツセンター', tm: '19:00 – 21:00', b: 0,  c: 14, fee: 500, beginner: true },
];

const ScreenRList = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar action={
      <a href="#" aria-label="プロフィール" style={{
        width: 32, height: 32, borderRadius: '50%',
        background: HQ.accentSoft, color: HQ.accent,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HQ.jpSerif, fontSize: 14, fontWeight: 500,
        textDecoration: 'none',
        border: `1px solid ${HQ.hairline}`,
      }}>美</a>
    } />
    {/* hero */}
    <div style={{ padding: '24px 20px 18px' }}>
      <RKicker>— Upcoming · 5</RKicker>
      <h1 style={{ margin: '10px 0 0', fontFamily: HQ.jpSerif, fontSize: 26, fontWeight: 500, color: HQ.ink, letterSpacing: '0.02em', lineHeight: 1.45 }}>
        次の練習を、<br />選んでください。
      </h1>
      <p style={{ margin: '10px 0 0', fontFamily: HQ.jp, fontSize: 12.5, color: HQ.muted, lineHeight: 1.7 }}>
        ご予約は前日 12:00 まで。当日は会場で参加費をお支払いください。
      </p>
    </div>
    {/* list */}
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {R_EVENTS.map((e, i) => (
        <a key={i} href="#" style={{
          display: 'block', textDecoration: 'none', color: 'inherit',
          padding: '18px 18px',
          background: '#fbf8f1',
          border: `1px solid ${HQ.hairline}`,
          borderRadius: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: HQ.mono, fontSize: 12, color: HQ.ink, letterSpacing: 1, fontWeight: 500 }}>{e.d}</span>
            <span style={{ fontFamily: HQ.mono, fontSize: 9, color: HQ.muted, letterSpacing: 1.5 }}>{e.dow}</span>
            <span style={{ marginLeft: 'auto' }}>
              {e.full ? <RBadge tone="danger" dot>満員 · 待ち {e.w}</RBadge>
                : e.beginner ? <RBadge tone="accent" dot>初心者向け</RBadge>
                : <RBadge tone="success" dot>受付中</RBadge>}
            </span>
          </div>
          <div style={{ fontFamily: HQ.jpSerif, fontSize: 17, fontWeight: 500, color: HQ.ink, letterSpacing: '0.01em' }}>{e.t}</div>
          <div style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, marginTop: 4 }}>{e.v} · {e.tm}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}><RBar booked={e.b} cap={e.c} /></div>
            <span style={{ fontFamily: HQ.mono, fontSize: 11, color: HQ.inkSoft, letterSpacing: 0.6 }}>
              {e.b} / {e.c}
            </span>
            <span style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted }}>¥{e.fee.toLocaleString()}</span>
          </div>
        </a>
      ))}
    </div>
    {/* footer */}
    <div style={{ padding: '14px 20px 22px', borderTop: `1px solid ${HQ.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <a href="#" style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.muted, textDecoration: 'none' }}>予約履歴を見る</a>
      <a href="#" style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.muted, textDecoration: 'none' }}>プロフィール ›</a>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 2A. Event detail — Variation A (photo-led)
// ─────────────────────────────────────────────────────────────
const ScreenRDetailA = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar back action={
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={HQ.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
      </svg>
    } />
    <div style={{ flex: 1, overflow: 'auto' }}>
      <RPhoto label="EVENT THUMBNAIL · 16:9" h={210} />
      <div style={{ padding: '22px 20px 28px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <RBadge tone="success" dot>受付中</RBadge>
          <RBadge tone="neutral">残 7 席</RBadge>
        </div>
        <RKicker>— 05 / 12 月 · vol.43</RKicker>
        <h1 style={{ margin: '10px 0 0', fontFamily: HQ.jpSerif, fontSize: 28, fontWeight: 500, color: HQ.ink, letterSpacing: '0.02em', lineHeight: 1.4 }}>
          ゆる練 vol.43
        </h1>
        {/* facts grid */}
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: `1px solid ${HQ.hairline}`, borderRadius: 10, overflow: 'hidden', background: '#fbf8f1' }}>
          {[
            { k: '日時',   v: '19:30 – 21:30' },
            { k: '会場',   v: '亀戸スポーツセンター' },
            { k: '参加費', v: '¥1,000' },
            { k: '定員',   v: '18 名' },
          ].map((f, i, a) => (
            <div key={i} style={{
              padding: '14px 16px',
              borderRight: i % 2 === 0 ? `1px solid ${HQ.hairline}` : 'none',
              borderTop: i >= 2 ? `1px solid ${HQ.hairline}` : 'none',
            }}>
              <div style={{ fontFamily: HQ.mono, fontSize: 9.5, color: HQ.muted, letterSpacing: 1.4 }}>{f.k.toUpperCase()}</div>
              <div style={{ fontFamily: HQ.jp, fontSize: 13.5, color: HQ.ink, marginTop: 4 }}>{f.v}</div>
            </div>
          ))}
        </div>
        {/* remain */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.muted }}>残席</span>
            <span style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.inkSoft }}><b style={{ color: HQ.ink, fontWeight: 600 }}>11</b> / 18 名</span>
          </div>
          <RBar booked={11} cap={18} height={8} />
        </div>
        {/* description */}
        <div style={{ marginTop: 26 }}>
          <RKicker color={HQ.muted}>— ABOUT</RKicker>
          <p style={{ margin: '10px 0 0', fontFamily: HQ.jp, fontSize: 13.5, color: HQ.inkSoft, lineHeight: 1.85 }}>
            今月もゆる〜く集まって練習しましょう。サーブ・レシーブ・スパイクの基礎を中心に、後半は試合形式で軽くゲーム。初参加の方は 19:00 から個別オリエンを行います。
          </p>
          <p style={{ margin: '12px 0 0', fontFamily: HQ.jp, fontSize: 13.5, color: HQ.inkSoft, lineHeight: 1.85 }}>
            ボールはこちらで用意します。動きやすい服装でお越しください。
          </p>
        </div>
        {/* notes */}
        <div style={{ marginTop: 26, padding: 16, background: HQ.accentSoft, borderRadius: 10 }}>
          <RKicker>— NOTE</RKicker>
          <p style={{ margin: '8px 0 0', fontFamily: HQ.jp, fontSize: 12.5, color: HQ.inkSoft, lineHeight: 1.7 }}>
            キャンセルは前日 12:00 までにお願いします。それ以降は参加費が発生する場合があります。
          </p>
        </div>
      </div>
    </div>
    {/* sticky footer */}
    <div style={{
      padding: '14px 20px',
      borderTop: `1px solid ${HQ.hairline}`,
      background: HQ.paper,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: HQ.jp, fontSize: 11, color: HQ.muted }}>参加費</div>
        <div style={{ fontFamily: HQ.jpSerif, fontSize: 19, color: HQ.ink, fontWeight: 600 }}>¥1,000</div>
      </div>
      <RButton full={false}>予約に進む</RButton>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 2B. Event detail — Variation B (text-led, no photo, magazine vibe)
// ─────────────────────────────────────────────────────────────
const ScreenRDetailB = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paperWarm, fontFamily: HQ.jp }}>
    <RTopBar back action={
      <span style={{ fontFamily: HQ.mono, fontSize: 10, color: HQ.muted, letterSpacing: 1.5 }}>VOL.43</span>
    } />
    <div style={{ flex: 1, overflow: 'auto' }}>
      {/* big editorial title block */}
      <div style={{ padding: '36px 20px 30px' }}>
        <RKicker>— 05 / 12 (mon) · 19:30</RKicker>
        <h1 style={{
          margin: '14px 0 0', fontFamily: HQ.jpSerif, fontSize: 36, fontWeight: 500,
          color: HQ.ink, letterSpacing: '0.02em', lineHeight: 1.3,
        }}>
          ゆる練<br />
          <span style={{ color: HQ.accent }}>vol.43</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <RBadge tone="success" dot>受付中</RBadge>
          <span style={{ fontFamily: HQ.mono, fontSize: 11, color: HQ.muted, letterSpacing: 1.2 }}>11 / 18 BOOKED</span>
        </div>
      </div>

      {/* facts list — single column with hairlines */}
      <div style={{ padding: '0 20px' }}>
        {[
          { k: 'Date',    v: '2026 / 05 / 12  月' },
          { k: 'Time',    v: '19:30 – 21:30  (2h)' },
          { k: 'Venue',   v: '亀戸スポーツセンター' },
          { k: 'Address', v: '江東区亀戸 2-1-1' },
          { k: 'Fee',     v: '¥1,000  /  当日現金' },
          { k: 'Cancel',  v: '前日 12:00 まで無料' },
        ].map((f, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '78px 1fr', gap: 14,
            padding: '14px 0',
            borderTop: `1px solid ${HQ.hairline}`,
          }}>
            <div style={{ fontFamily: HQ.mono, fontSize: 9.5, color: HQ.muted, letterSpacing: 1.4, textTransform: 'uppercase', paddingTop: 2 }}>{f.k}</div>
            <div style={{ fontFamily: HQ.jp, fontSize: 13.5, color: HQ.ink, lineHeight: 1.6 }}>{f.v}</div>
          </div>
        ))}
      </div>

      {/* remain bar */}
      <div style={{ padding: '20px 20px 0' }}>
        <RBar booked={11} cap={18} height={4} />
      </div>

      {/* about */}
      <div style={{ padding: '24px 20px 28px' }}>
        <p style={{
          margin: 0, fontFamily: HQ.jpSerif, fontSize: 16, lineHeight: 1.95,
          color: HQ.inkSoft, letterSpacing: '0.02em',
        }}>
          今月もゆる〜く集まって練習しましょう。サーブ・レシーブ・スパイクの基礎を中心に、後半は試合形式で軽くゲーム。初参加の方は 19:00 から個別オリエンを行います。
        </p>
        <div style={{ height: 1, background: HQ.hairline, margin: '24px 0' }} />
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            'ボールはこちらで用意します',
            '動きやすい服装でお越しください',
            '体育館シューズ必須',
          ].map((l, i) => (
            <li key={i} style={{ fontFamily: HQ.jp, fontSize: 13, color: HQ.inkSoft, paddingLeft: 16, position: 'relative', lineHeight: 1.6 }}>
              <span style={{ position: 'absolute', left: 0, top: '0.7em', width: 6, height: 1, background: HQ.accent }} />
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div style={{
      padding: '14px 20px',
      borderTop: `1px solid ${HQ.hairline}`,
      background: HQ.paperWarm,
    }}>
      <RButton>予約する · ¥1,000</RButton>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 3. Reservation form
// ─────────────────────────────────────────────────────────────
const ScreenRForm = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar back title="予約フォーム" />
    {/* progress */}
    <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${HQ.hairline}` }}>
      {['情報入力', '確認', '完了'].map((s, i) => {
        const a = i === 0;
        const done = false;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: a ? HQ.ink : 'transparent',
                color: a ? HQ.paper : HQ.muted,
                border: `1px solid ${a ? HQ.ink : HQ.hairline}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: HQ.mono, fontSize: 10, fontWeight: 500,
              }}>{i + 1}</span>
              <span style={{ fontFamily: HQ.jp, fontSize: 11.5, color: a ? HQ.ink : HQ.muted, fontWeight: a ? 600 : 400 }}>{s}</span>
            </div>
            {i < 2 && <span style={{ flex: 1, height: 1, background: HQ.hairline }} />}
          </React.Fragment>
        );
      })}
    </div>

    <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 28px' }}>
      {/* event summary */}
      <div style={{
        padding: '14px 16px', background: '#fbf8f1',
        border: `1px solid ${HQ.hairline}`, borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22,
      }}>
        <div style={{
          width: 50, textAlign: 'center', flexShrink: 0,
          padding: '6px 0',
          borderRight: `1px solid ${HQ.hairline}`,
        }}>
          <div style={{ fontFamily: HQ.mono, fontSize: 11.5, color: HQ.ink, letterSpacing: 0.5, fontWeight: 500 }}>05/12</div>
          <div style={{ fontFamily: HQ.mono, fontSize: 9, color: HQ.muted, letterSpacing: 1.5, marginTop: 2 }}>MON</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: HQ.jp, fontSize: 13, fontWeight: 500, color: HQ.ink }}>ゆる練 vol.43</div>
          <div style={{ fontFamily: HQ.jp, fontSize: 11, color: HQ.muted, marginTop: 2 }}>亀戸スポーツセンター · 19:30 – 21:30</div>
        </div>
        <span style={{ fontFamily: HQ.jpSerif, fontSize: 14, color: HQ.ink, fontWeight: 600 }}>¥1,000</span>
      </div>

      {/* fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <RField label="お名前" required>
          <RInput placeholder="例: 田中 美咲" />
        </RField>
        <RField label="メールアドレス" required hint="予約確認を送ります">
          <RInput type="email" placeholder="example@mail.com" />
        </RField>
        <RField label="電話番号" required hint="当日連絡用">
          <RInput type="tel" placeholder="090-1234-5678" />
        </RField>
        <RField label="同伴者人数" hint="自分は除く">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px',
            background: '#fbf8f1',
            border: `1px solid ${HQ.hairline}`,
            borderRadius: 8,
          }}>
            <button style={stepBtn}>−</button>
            <span style={{ fontFamily: HQ.jp, fontSize: 17, color: HQ.ink, fontWeight: 500 }}>0 名</span>
            <button style={stepBtn}>+</button>
          </div>
        </RField>
        <RField label="連絡事項" hint="任意 · アレルギー / 質問など">
          <RTextarea rows={3} placeholder="ご不明な点があればこちらに" />
        </RField>

        {/* level — read-only from profile */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px',
          background: '#fbf8f1', border: `1px solid ${HQ.hairline}`, borderRadius: 8,
        }}>
          <span style={{ fontFamily: HQ.mono, fontSize: 9.5, color: HQ.muted, letterSpacing: 1.4 }}>LEVEL</span>
          <span style={{ fontFamily: HQ.jp, fontSize: 13, color: HQ.ink, fontWeight: 500 }}>初めて</span>
          <a href="#" style={{ marginLeft: 'auto', fontFamily: HQ.jp, fontSize: 11.5, color: HQ.accent, textDecoration: 'none' }}>プロフィールで変更 ›</a>
        </div>

        {/* terms */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0' }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4, marginTop: 1,
            border: `1px solid ${HQ.accent}`, background: HQ.accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          </span>
          <span style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.inkSoft, lineHeight: 1.6 }}>
            <a href="#" style={{ color: HQ.accent, textDecoration: 'underline' }}>キャンセルポリシー</a> と
            <a href="#" style={{ color: HQ.accent, textDecoration: 'underline' }}>利用規約</a> に同意します。
          </span>
        </label>
      </div>
    </div>
    <div style={{ padding: '12px 20px', borderTop: `1px solid ${HQ.hairline}`, background: HQ.paper }}>
      <RButton>確認画面へ</RButton>
    </div>
  </div>
);
const stepBtn = {
  width: 40, height: 40, borderRadius: 8,
  background: HQ.paper, border: `1px solid ${HQ.hairline}`,
  fontFamily: HQ.jp, fontSize: 18, color: HQ.ink, cursor: 'pointer',
};

// ─────────────────────────────────────────────────────────────
// 4. Confirmation (review before submit)
// ─────────────────────────────────────────────────────────────
const ScreenRConfirm = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar back title="内容確認" />
    <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${HQ.hairline}` }}>
      {['情報入力', '確認', '完了'].map((s, i) => {
        const a = i === 1;
        const done = i < 1;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: a ? HQ.ink : done ? HQ.accentSoft : 'transparent',
                color: a ? HQ.paper : done ? HQ.accent : HQ.muted,
                border: `1px solid ${a ? HQ.ink : done ? HQ.accent : HQ.hairline}`,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: HQ.mono, fontSize: 10, fontWeight: 500,
              }}>{done ? '✓' : i + 1}</span>
              <span style={{ fontFamily: HQ.jp, fontSize: 11.5, color: a ? HQ.ink : HQ.muted, fontWeight: a ? 600 : 400 }}>{s}</span>
            </div>
            {i < 2 && <span style={{ flex: 1, height: 1, background: HQ.hairline }} />}
          </React.Fragment>
        );
      })}
    </div>
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px 28px' }}>
      <RKicker>— Review</RKicker>
      <h2 style={{ margin: '8px 0 22px', fontFamily: HQ.jpSerif, fontSize: 22, color: HQ.ink, fontWeight: 500, lineHeight: 1.4 }}>
        内容に間違いがないか<br />ご確認ください。
      </h2>

      {/* event */}
      <div style={{ background: '#fbf8f1', border: `1px solid ${HQ.hairline}`, borderRadius: 10, padding: 18, marginBottom: 18 }}>
        <RKicker color={HQ.muted}>— EVENT</RKicker>
        <div style={{ marginTop: 10, fontFamily: HQ.jpSerif, fontSize: 18, color: HQ.ink, fontWeight: 500 }}>ゆる練 vol.43</div>
        <div style={{ marginTop: 6, fontFamily: HQ.jp, fontSize: 12.5, color: HQ.muted }}>2026 / 05 / 12 月 · 19:30 – 21:30</div>
        <div style={{ marginTop: 4, fontFamily: HQ.jp, fontSize: 12.5, color: HQ.muted }}>亀戸スポーツセンター</div>
      </div>

      {/* form */}
      <div style={{ background: '#fbf8f1', border: `1px solid ${HQ.hairline}`, borderRadius: 10, overflow: 'hidden' }}>
        {[
          { k: 'お名前',     v: '田中 美咲' },
          { k: 'メール',     v: 'misaki.t@example.com' },
          { k: '電話番号',   v: '090-1234-5678' },
          { k: '同伴者',     v: '0 名' },
          { k: '連絡事項',   v: 'バレー自体が初めてです。よろしくお願いします。', wrap: true },
        ].map((f, i, a) => (
          <div key={i} style={{
            padding: '12px 16px',
            display: 'grid', gridTemplateColumns: '92px 1fr', gap: 12,
            borderTop: i === 0 ? 'none' : `1px solid ${HQ.hairline}`,
            alignItems: 'baseline',
          }}>
            <div style={{ fontFamily: HQ.mono, fontSize: 9.5, color: HQ.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>{f.k}</div>
            <div style={{ fontFamily: HQ.jp, fontSize: 13, color: HQ.ink, lineHeight: f.wrap ? 1.7 : 1.5 }}>{f.v}</div>
          </div>
        ))}
      </div>

      {/* total */}
      <div style={{
        marginTop: 20, padding: '16px 18px',
        background: HQ.ink, color: HQ.paper, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: HQ.mono, fontSize: 9.5, letterSpacing: 1.4, opacity: 0.6 }}>FEE · 当日現金</div>
          <div style={{ fontFamily: HQ.jp, fontSize: 12, opacity: 0.85, marginTop: 2 }}>1 名 × ¥1,000</div>
        </div>
        <span style={{ fontFamily: HQ.jpSerif, fontSize: 22, fontWeight: 600 }}>¥1,000</span>
      </div>

      <p style={{ margin: '16px 0 0', fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, lineHeight: 1.7 }}>
        予約完了後、ご登録のメールに確認メールが届きます。届かない場合は迷惑メールフォルダをご確認ください。
      </p>
    </div>
    <div style={{ padding: '12px 20px', borderTop: `1px solid ${HQ.hairline}`, background: HQ.paper, display: 'flex', gap: 8 }}>
      <button style={{
        flex: '0 0 110px', padding: '15px 0',
        background: 'transparent', color: HQ.ink,
        border: `1px solid ${HQ.hairline}`, borderRadius: 999,
        fontFamily: HQ.jp, fontSize: 13, cursor: 'pointer',
      }}>修正する</button>
      <RButton>予約を確定する</RButton>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 5. Done
// ─────────────────────────────────────────────────────────────
const ScreenRDone = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar action={
      <span style={{ fontFamily: HQ.mono, fontSize: 10, color: HQ.muted, letterSpacing: 1.5 }}>DONE</span>
    } />
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
      <div style={{ textAlign: 'center', padding: '12px 0 6px' }}>
        <div style={{
          width: 56, height: 56, margin: '0 auto 18px',
          borderRadius: '50%', background: HQ.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={HQ.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
        </div>
        <RKicker>— Confirmed</RKicker>
        <h1 style={{ margin: '12px 0 0', fontFamily: HQ.jpSerif, fontSize: 24, fontWeight: 500, color: HQ.ink, lineHeight: 1.5 }}>
          予約が完了しました。
        </h1>
        <p style={{ margin: '12px 0 0', fontFamily: HQ.jp, fontSize: 12.5, color: HQ.muted, lineHeight: 1.7 }}>
          確認メールを <span style={{ color: HQ.inkSoft }}>misaki.t@example.com</span> 宛に送信しました。
        </p>
      </div>

      {/* summary card */}
      <div style={{
        marginTop: 28, padding: 20,
        background: '#fbf8f1', border: `1px solid ${HQ.hairline}`,
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <RKicker color={HQ.muted}>— RESERVATION</RKicker>
          <span style={{ fontFamily: HQ.mono, fontSize: 10, color: HQ.muted, letterSpacing: 1.4 }}>#HQ-2604-A8F2</span>
        </div>
        <div style={{ marginTop: 14, fontFamily: HQ.jpSerif, fontSize: 19, color: HQ.ink, fontWeight: 500 }}>ゆる練 vol.43</div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '70px 1fr', rowGap: 10, columnGap: 14 }}>
          {[
            ['DATE',  '2026 / 05 / 12 月'],
            ['TIME',  '19:30 – 21:30'],
            ['VENUE', '亀戸スポーツセンター'],
            ['FEE',   '¥1,000 · 当日現金'],
          ].map(([k, v], i) => (
            <React.Fragment key={i}>
              <div style={{ fontFamily: HQ.mono, fontSize: 9.5, color: HQ.muted, letterSpacing: 1.4 }}>{k}</div>
              <div style={{ fontFamily: HQ.jp, fontSize: 13, color: HQ.ink }}>{v}</div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* next steps */}
      <div style={{ marginTop: 26 }}>
        <RKicker color={HQ.muted}>— NEXT</RKicker>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { ttl: 'カレンダーに追加', sub: '.ics ファイルをダウンロード' },
            { ttl: '会場マップを開く', sub: '亀戸スポーツセンター — Google Maps' },
            { ttl: '予約をキャンセル', sub: '前日 12:00 まで無料' },
          ].map((n, i) => (
            <a key={i} href="#" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              background: '#fbf8f1', border: `1px solid ${HQ.hairline}`,
              borderRadius: 10, textDecoration: 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: HQ.jp, fontSize: 13.5, color: HQ.ink, fontWeight: 500 }}>{n.ttl}</div>
                <div style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, marginTop: 2 }}>{n.sub}</div>
              </div>
              <span style={{ color: HQ.muted }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
    <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${HQ.hairline}`, background: HQ.paper, display: 'flex', gap: 8 }}>
      <button style={{
        flex: 1, padding: '14px 0',
        background: 'transparent', color: HQ.ink,
        border: `1px solid ${HQ.hairline}`, borderRadius: 999,
        fontFamily: HQ.jp, fontSize: 13, cursor: 'pointer',
      }}>イベント一覧へ</button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 6. Profile (account settings) — level lives here
// ─────────────────────────────────────────────────────────────
const ScreenRProfile = () => {
  const Section = ({ kicker, children }) => (
    <div style={{ marginBottom: 26 }}>
      <RKicker color={HQ.muted}>— {kicker}</RKicker>
      <div style={{ marginTop: 12, background: '#fbf8f1', border: `1px solid ${HQ.hairline}`, borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
  const Row = ({ k, v, last, action }) => (
    <div style={{
      display: 'grid', gridTemplateColumns: '92px 1fr auto', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      borderTop: last === 'first' ? 'none' : `1px solid ${HQ.hairline}`,
    }}>
      <div style={{ fontFamily: HQ.mono, fontSize: 9.5, color: HQ.muted, letterSpacing: 1.4 }}>{k}</div>
      <div style={{ fontFamily: HQ.jp, fontSize: 13, color: HQ.ink }}>{v}</div>
      {action && <span style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.accent }}>{action}</span>}
    </div>
  );

  return (
    <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
      <RTopBar back title="プロフィール" />
      <div style={{ flex: 1, overflow: 'auto', padding: '22px 20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: HQ.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HQ.jpSerif, fontSize: 22, color: HQ.accent, fontWeight: 500,
          }}>美</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: HQ.jpSerif, fontSize: 18, color: HQ.ink, fontWeight: 500 }}>田中 美咲</div>
            <div style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, marginTop: 2 }}>misaki.t@example.com</div>
          </div>
          <span style={{ fontFamily: HQ.mono, fontSize: 10, color: HQ.muted, letterSpacing: 1.4 }}>ID · A8F2</span>
        </div>

        <Section kicker="LEVEL · 経験レベル">
          <div style={{ padding: '18px 16px 16px' }}>
            <p style={{ margin: '0 0 14px', fontFamily: HQ.jp, fontSize: 12, color: HQ.muted, lineHeight: 1.6 }}>
              当日のチーム分けと、初心者向けイベントのご案内に使います。いつでも変更できます。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: '初めて',    sub: 'バレー自体が初めて、または久しぶり', sel: true },
                { l: '中級',      sub: '基礎ができる・経験 1〜3 年程度' },
                { l: '経験者',    sub: '部活・社会人歴あり' },
              ].map((o, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px',
                  background: o.sel ? HQ.accentSoft : HQ.paper,
                  border: `1px solid ${o.sel ? HQ.accent : HQ.hairline}`,
                  borderRadius: 8, cursor: 'pointer',
                }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', marginTop: 3, flexShrink: 0,
                    border: `1.5px solid ${o.sel ? HQ.accent : HQ.muted}`,
                    background: HQ.paper,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {o.sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: HQ.accent }} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: HQ.jp, fontSize: 13.5, color: o.sel ? '#8a4129' : HQ.ink, fontWeight: o.sel ? 600 : 500 }}>{o.l}</div>
                    <div style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, marginTop: 2 }}>{o.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section kicker="ACCOUNT · アカウント情報">
          <Row k="お名前"     v="田中 美咲"           action="編集" last="first" />
          <Row k="メール"     v="misaki.t@example.com" action="編集" />
          <Row k="電話番号"   v="090-1234-5678"        action="編集" />
        </Section>

        <Section kicker="STATS · これまでの参加">
          <Row k="累計参加"   v="3 回"     last="first" />
          <Row k="最終参加"   v="2026 / 04 / 14" />
          <Row k="次回予定"   v="2026 / 05 / 12 ゆる練 vol.43" />
        </Section>

        <Section kicker="NOTIFY · お知らせ">
          {[
            { k: '予約確認',     v: 'メール · ON' },
            { k: 'リマインダー', v: '前日 12:00 に送信' },
            { k: '新着イベント', v: 'OFF' },
          ].map((r, i) => (
            <Row key={i} k={r.k} v={r.v} action="変更" last={i === 0 ? 'first' : ''} />
          ))}
        </Section>

        <button style={{
          width: '100%', padding: '14px 0', marginTop: 4,
          background: 'transparent', color: HQ.muted,
          border: `1px solid ${HQ.hairline}`, borderRadius: 999,
          fontFamily: HQ.jp, fontSize: 12.5, cursor: 'pointer',
        }}>ログアウト</button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 7. Login (magic link) — email entry
// ─────────────────────────────────────────────────────────────
const ScreenRLogin = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar action={
      <span style={{ fontFamily: HQ.mono, fontSize: 10, color: HQ.muted, letterSpacing: 1.5 }}>LOGIN</span>
    } />
    <div style={{ flex: 1, overflow: 'auto', padding: '36px 24px 24px' }}>
      <RKicker>— Welcome back</RKicker>
      <h1 style={{
        margin: '14px 0 0', fontFamily: HQ.jpSerif, fontSize: 32, fontWeight: 500,
        color: HQ.ink, letterSpacing: '0.02em', lineHeight: 1.35,
      }}>
        ログイン<br/>
        <span style={{ color: HQ.muted, fontSize: 18 }}>メールでログインリンクをお送りします。</span>
      </h1>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <RField label="メールアドレス" required hint="登録済みのメール">
          <RInput type="email" placeholder="example@mail.com" />
        </RField>

        <p style={{ margin: '4px 0 0', fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, lineHeight: 1.7 }}>
          パスワードは不要です。ご登録のメールに届くリンクから 1 タップでログインできます。リンクの有効期限は 15 分。
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <RButton>ログインリンクを送る</RButton>
      </div>

      <div style={{
        marginTop: 28, padding: '18px 18px',
        background: '#fbf8f1', border: `1px solid ${HQ.hairline}`, borderRadius: 10,
      }}>
        <RKicker color={HQ.muted}>— FIRST TIME</RKicker>
        <p style={{ margin: '8px 0 12px', fontFamily: HQ.jp, fontSize: 12.5, color: HQ.inkSoft, lineHeight: 1.7 }}>
          初めてご利用の方は、まず会員登録をお願いします。1 分で完了します。
        </p>
        <a href="#" style={{
          fontFamily: HQ.jp, fontSize: 13, color: HQ.accent, fontWeight: 500,
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>会員登録へ進む
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </a>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a href="#" style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, textDecoration: 'none' }}>
          ゲストとしてイベントを見る ›
        </a>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 8. Magic link sent — confirmation
// ─────────────────────────────────────────────────────────────
const ScreenRLinkSent = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar back action={
      <span style={{ fontFamily: HQ.mono, fontSize: 10, color: HQ.muted, letterSpacing: 1.5 }}>SENT</span>
    } />
    <div style={{ flex: 1, overflow: 'auto', padding: '40px 28px', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, margin: '12px auto 22px',
        borderRadius: '50%', background: HQ.accentSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={HQ.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <path d="M3 7l9 6 9-6"/>
        </svg>
      </div>
      <RKicker>— Check your inbox</RKicker>
      <h1 style={{ margin: '12px 0 0', fontFamily: HQ.jpSerif, fontSize: 24, fontWeight: 500, color: HQ.ink, lineHeight: 1.5 }}>
        メールを送信しました。
      </h1>
      <p style={{ margin: '14px 0 0', fontFamily: HQ.jp, fontSize: 13, color: HQ.inkSoft, lineHeight: 1.8 }}>
        <span style={{ color: HQ.ink, fontWeight: 500 }}>misaki.t@example.com</span> 宛に<br/>
        ログインリンクを送信しました。<br/>
        メール内のリンクから続行してください。
      </p>

      <div style={{
        marginTop: 28, padding: '16px 18px',
        background: '#fbf8f1', border: `1px solid ${HQ.hairline}`, borderRadius: 10,
        textAlign: 'left',
      }}>
        <RKicker color={HQ.muted}>— NOTE</RKicker>
        <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'リンクの有効期限は 15 分',
            'メールが届かない場合は迷惑メールをご確認ください',
            '別のメールでやり直すこともできます',
          ].map((l, i) => (
            <li key={i} style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.inkSoft, paddingLeft: 14, position: 'relative', lineHeight: 1.6 }}>
              <span style={{ position: 'absolute', left: 0, top: '0.7em', width: 6, height: 1, background: HQ.accent }} />
              {l}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a href="#" style={{ fontFamily: HQ.jp, fontSize: 13, color: HQ.accent, textDecoration: 'none', fontWeight: 500 }}>
          メールを再送する
        </a>
        <a href="#" style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.muted, textDecoration: 'none' }}>
          別のアドレスを使う
        </a>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 9. Signup (first time)
// ─────────────────────────────────────────────────────────────
const ScreenRSignup = () => (
  <div style={{ width: RW, height: RH, display: 'flex', flexDirection: 'column', background: HQ.paper, fontFamily: HQ.jp }}>
    <RTopBar back title="会員登録" />
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px 28px' }}>
      <RKicker>— Welcome to High Q</RKicker>
      <h1 style={{ margin: '10px 0 0', fontFamily: HQ.jpSerif, fontSize: 24, fontWeight: 500, color: HQ.ink, lineHeight: 1.45 }}>
        はじめまして。<br/>あなたのことを<br/>少しだけ教えてください。
      </h1>
      <p style={{ margin: '14px 0 0', fontFamily: HQ.jp, fontSize: 12.5, color: HQ.muted, lineHeight: 1.7 }}>
        ご登録は無料です。月会費・年会費はかかりません。各イベントの参加費のみお支払いください。
      </p>

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <RField label="お名前" required>
          <RInput placeholder="例: 田中 美咲" />
        </RField>
        <RField label="メールアドレス" required hint="ログインに使います">
          <RInput type="email" placeholder="example@mail.com" />
        </RField>
        <RField label="電話番号" hint="任意 · 当日連絡用">
          <RInput type="tel" placeholder="090-1234-5678" />
        </RField>

        <RField label="経験レベル" required hint="あとから変更できます">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: '初めて',    sub: 'バレー自体が初めて、または久しぶり', sel: true },
              { l: '中級',      sub: '基礎ができる・経験 1〜3 年程度' },
              { l: '経験者',    sub: '部活・社会人歴あり' },
            ].map((o, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px',
                background: o.sel ? HQ.accentSoft : '#fbf8f1',
                border: `1px solid ${o.sel ? HQ.accent : HQ.hairline}`,
                borderRadius: 8, cursor: 'pointer',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', marginTop: 3, flexShrink: 0,
                  border: `1.5px solid ${o.sel ? HQ.accent : HQ.muted}`,
                  background: HQ.paper,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {o.sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: HQ.accent }} />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: HQ.jp, fontSize: 13.5, color: o.sel ? '#8a4129' : HQ.ink, fontWeight: o.sel ? 600 : 500 }}>{o.l}</div>
                  <div style={{ fontFamily: HQ.jp, fontSize: 11.5, color: HQ.muted, marginTop: 2 }}>{o.sub}</div>
                </div>
              </label>
            ))}
          </div>
        </RField>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0' }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4, marginTop: 1,
            border: `1px solid ${HQ.accent}`, background: HQ.accent,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          </span>
          <span style={{ fontFamily: HQ.jp, fontSize: 12, color: HQ.inkSoft, lineHeight: 1.6 }}>
            <a href="#" style={{ color: HQ.accent, textDecoration: 'underline' }}>利用規約</a> と
            <a href="#" style={{ color: HQ.accent, textDecoration: 'underline' }}>プライバシーポリシー</a> に同意します。
          </span>
        </label>
      </div>
    </div>
    <div style={{ padding: '12px 20px', borderTop: `1px solid ${HQ.hairline}`, background: HQ.paper }}>
      <RButton>登録してリンクを送る</RButton>
    </div>
  </div>
);

Object.assign(window, {
  ScreenRList, ScreenRDetailA, ScreenRDetailB, ScreenRForm, ScreenRConfirm, ScreenRDone, ScreenRProfile,
  ScreenRLogin, ScreenRLinkSent, ScreenRSignup, ScreenRHomeV2,
});
