// High Q — Cookie consent UI
// 3 variants exposed via Tweaks: bottom-banner / center-modal / corner-card

const { useState: useStateCK, useEffect: useEffectCK } = React;

// ============================================================
// Shared bits
// ============================================================
const CookieCopy = {
  title: 'Cookie の利用について',
  body: '当サイトでは、サイトの動作と利用状況の分析のために Cookie を使用します。「すべて許可」を押すか、用途を選択してください。',
  links: [
    ['プライバシーポリシー', '#'],
    ['Cookie ポリシー', '#'],
  ],
  acceptAll: 'すべて許可',
  acceptNeeded: '必要なもののみ',
  customize: '設定する',
  save: 'この設定で保存',
};

const CookieCategories = [
  { key: 'required', label: '必須', desc: 'サイトの基本動作に必要です。常に有効。', locked: true },
  { key: 'analytics', label: '分析', desc: 'アクセス解析でサイト改善に使用します。', locked: false },
  { key: 'marketing', label: 'マーケティング', desc: '広告配信の最適化に使用します。', locked: false },
];

// little category toggle
const CatToggle = ({ on, locked, onChange }) => (
  <button
    type="button"
    onClick={() => !locked && onChange(!on)}
    aria-pressed={on}
    style={{
      width: 36,
      height: 20,
      borderRadius: 999,
      border: 'none',
      background: locked ? HQ.muted : on ? HQ.accent : 'rgba(31,29,26,0.18)',
      position: 'relative',
      cursor: locked ? 'not-allowed' : 'pointer',
      opacity: locked ? 0.55 : 1,
      transition: 'background 0.18s',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 2,
        left: on ? 18 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: HQ.paper,
        transition: 'left 0.18s',
        boxShadow: '0 1px 2px rgba(31,29,26,0.2)',
      }}
    />
  </button>
);

// ============================================================
// VARIANT A — Bottom banner (calm, recommended default)
// ============================================================
const CookieBannerBottom = ({ onAcceptAll, onAcceptNeeded, onCustomize }) => (
  <div
    role="dialog"
    aria-label="Cookie の利用について"
    style={{
      position: 'fixed',
      left: 12,
      right: 12,
      bottom: 12,
      maxWidth: 396,
      margin: '0 auto',
      background: HQ.paper,
      color: HQ.ink,
      border: `1px solid ${HQ.hairline}`,
      borderRadius: 6,
      boxShadow: '0 10px 28px rgba(31,29,26,0.18), 0 2px 6px rgba(31,29,26,0.08)',
      zIndex: 9999,
      overflow: 'hidden',
      fontFamily: HQ.jp,
    }}
  >
    <div style={{ padding: '20px 22px 18px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: HQ.mono,
              fontSize: 9,
              letterSpacing: 2,
              color: HQ.accent,
              border: `1px solid ${HQ.accent}`,
              padding: '3px 7px',
              borderRadius: 2,
              textTransform: 'uppercase',
            }}
          >
            Notice
          </span>
          <span
            style={{
              fontFamily: HQ.jpSerif,
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            {CookieCopy.title}
          </span>
        </div>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12.5,
          lineHeight: 1.85,
          color: HQ.inkSoft,
        }}
      >
        {CookieCopy.body}
      </p>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          gap: 14,
          fontFamily: HQ.mono,
          fontSize: 10,
          letterSpacing: 1.2,
          color: HQ.muted,
        }}
      >
        {CookieCopy.links.map(([t]) => (
          <span key={t} style={{ borderBottom: `1px solid ${HQ.hairline}`, paddingBottom: 1, cursor: 'pointer' }}>
            {t} ↗
          </span>
        ))}
      </div>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        borderTop: `1px solid ${HQ.hairline}`,
      }}
    >
      <button
        onClick={onAcceptNeeded}
        style={{
          padding: '14px 12px',
          background: 'transparent',
          color: HQ.ink,
          border: 'none',
          borderRight: `1px solid ${HQ.hairline}`,
          fontFamily: HQ.jp,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {CookieCopy.acceptNeeded}
      </button>
      <button
        onClick={onAcceptAll}
        style={{
          padding: '14px 12px',
          background: HQ.ink,
          color: HQ.paper,
          border: 'none',
          fontFamily: HQ.jp,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 1,
          cursor: 'pointer',
        }}
      >
        {CookieCopy.acceptAll}
      </button>
    </div>
    <div
      style={{
        textAlign: 'center',
        padding: '10px 0 12px',
        background: HQ.paperWarm,
        borderTop: `1px solid ${HQ.hairline}`,
      }}
    >
      <button
        onClick={onCustomize}
        style={{
          background: 'transparent',
          border: 'none',
          fontFamily: HQ.mono,
          fontSize: 10,
          letterSpacing: 1.8,
          color: HQ.muted,
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        {CookieCopy.customize} →
      </button>
    </div>
  </div>
);

// ============================================================
// VARIANT B — Center modal (with backdrop, formal)
// ============================================================
const CookieModalCenter = ({ onAcceptAll, onAcceptNeeded, onCustomize }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Cookie の利用について"
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(31,29,26,0.5)',
      backdropFilter: 'blur(2px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: 16,
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: 396,
        background: HQ.paper,
        color: HQ.ink,
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: HQ.jp,
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ padding: '26px 24px 18px' }}>
        <div
          style={{
            fontFamily: HQ.mono,
            fontSize: 10,
            letterSpacing: 2.2,
            color: HQ.accent,
            marginBottom: 12,
            textTransform: 'uppercase',
          }}
        >
          — Cookie Notice
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: HQ.jpSerif,
            fontSize: 20,
            lineHeight: 1.5,
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          ご利用にあたって、
          <br />
          Cookie の確認です。
        </h3>
        <p
          style={{
            margin: '14px 0 0',
            fontSize: 13,
            lineHeight: 1.95,
            color: HQ.inkSoft,
          }}
        >
          当サイトでは、ページの動作と利用状況の分析に Cookie を使用します。
          詳しい用途は <span style={{ borderBottom: `1px solid ${HQ.muted}`, cursor: 'pointer' }}>Cookie ポリシー</span> をご覧ください。
        </p>
      </div>
      <div style={{ padding: '0 24px 20px', display: 'grid', gap: 8 }}>
        <button
          onClick={onAcceptAll}
          style={{
            padding: '14px 16px',
            background: HQ.ink,
            color: HQ.paper,
            border: 'none',
            borderRadius: 4,
            fontFamily: HQ.jp,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.2,
            cursor: 'pointer',
          }}
        >
          {CookieCopy.acceptAll}
        </button>
        <button
          onClick={onAcceptNeeded}
          style={{
            padding: '14px 16px',
            background: 'transparent',
            color: HQ.ink,
            border: `1px solid ${HQ.ink}`,
            borderRadius: 4,
            fontFamily: HQ.jp,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {CookieCopy.acceptNeeded}
        </button>
        <button
          onClick={onCustomize}
          style={{
            padding: '10px',
            background: 'transparent',
            color: HQ.muted,
            border: 'none',
            fontFamily: HQ.mono,
            fontSize: 10,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {CookieCopy.customize} →
        </button>
      </div>
    </div>
  </div>
);

// ============================================================
// VARIANT C — Corner card (compact, unobtrusive)
// ============================================================
const CookieCornerCard = ({ onAcceptAll, onAcceptNeeded, onCustomize }) => (
  <div
    role="dialog"
    aria-label="Cookie の利用について"
    style={{
      position: 'fixed',
      left: 12,
      bottom: 12,
      maxWidth: 312,
      background: HQ.ink,
      color: HQ.paper,
      borderRadius: 4,
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      zIndex: 9999,
      overflow: 'hidden',
      fontFamily: HQ.jp,
    }}
  >
    <div style={{ padding: '16px 18px 14px' }}>
      <div
        style={{
          fontFamily: HQ.mono,
          fontSize: 9,
          letterSpacing: 2,
          color: HQ.accent,
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        — Cookie
      </div>
      <div
        style={{
          fontFamily: HQ.jpSerif,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.02em',
          lineHeight: 1.5,
          marginBottom: 6,
        }}
      >
        Cookie を使用しています。
      </div>
      <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.8, opacity: 0.78 }}>
        サイト動作と利用分析のため。詳細は
        <span style={{ borderBottom: '1px solid rgba(247,243,234,0.4)', marginLeft: 4, cursor: 'pointer' }}>ポリシー</span>
        へ。
      </p>
    </div>
    <div
      style={{
        display: 'flex',
        gap: 1,
        background: 'rgba(247,243,234,0.18)',
      }}
    >
      <button
        onClick={onAcceptNeeded}
        style={{
          flex: 1,
          padding: '11px 6px',
          background: HQ.ink,
          color: HQ.paper,
          border: 'none',
          fontFamily: HQ.jp,
          fontSize: 11.5,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        必要のみ
      </button>
      <button
        onClick={onCustomize}
        style={{
          flex: 1,
          padding: '11px 6px',
          background: HQ.ink,
          color: HQ.paper,
          border: 'none',
          fontFamily: HQ.jp,
          fontSize: 11.5,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        設定
      </button>
      <button
        onClick={onAcceptAll}
        style={{
          flex: 1.4,
          padding: '11px 6px',
          background: HQ.accent,
          color: HQ.paper,
          border: 'none',
          fontFamily: HQ.jp,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: 0.8,
          cursor: 'pointer',
        }}
      >
        すべて許可
      </button>
    </div>
  </div>
);

// ============================================================
// Customize sheet — shared, bottom sheet style
// ============================================================
const CookieCustomizeSheet = ({ initial, onCancel, onSave }) => {
  const [state, setState] = useStateCK(initial);
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(31,29,26,0.55)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: HQ.paper,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          fontFamily: HQ.jp,
          color: HQ.ink,
          maxHeight: '85vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            padding: '10px 0',
            display: 'flex',
            justifyContent: 'center',
            borderBottom: `1px solid ${HQ.hairline}`,
          }}
        >
          <span style={{ width: 40, height: 4, borderRadius: 999, background: 'rgba(31,29,26,0.18)' }} />
        </div>
        <div style={{ padding: '22px 24px 14px' }}>
          <div
            style={{
              fontFamily: HQ.mono,
              fontSize: 10,
              letterSpacing: 2.2,
              color: HQ.accent,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            — Cookie Settings
          </div>
          <h3
            style={{
              margin: 0,
              fontFamily: HQ.jpSerif,
              fontSize: 22,
              lineHeight: 1.5,
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            用途ごとに、選べます。
          </h3>
          <p style={{ margin: '12px 0 0', fontSize: 12.5, lineHeight: 1.9, color: HQ.inkSoft }}>
            いつでも設定し直せます。詳細は Cookie ポリシーをご覧ください。
          </p>
        </div>
        <div style={{ padding: '0 24px' }}>
          {CookieCategories.map((c, i) => (
            <div
              key={c.key}
              style={{
                padding: '18px 0',
                borderTop: i === 0 ? `1px solid ${HQ.hairline}` : 'none',
                borderBottom: `1px solid ${HQ.hairline}`,
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: HQ.jpSerif,
                      fontSize: 15,
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {c.label}
                  </span>
                  {c.locked && (
                    <span
                      style={{
                        fontFamily: HQ.mono,
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: HQ.muted,
                        padding: '2px 6px',
                        border: `1px solid ${HQ.hairline}`,
                        borderRadius: 2,
                      }}
                    >
                      ALWAYS ON
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: HQ.inkSoft, lineHeight: 1.8 }}>{c.desc}</div>
              </div>
              <CatToggle
                on={c.locked ? true : state[c.key]}
                locked={c.locked}
                onChange={(v) => setState({ ...state, [c.key]: v })}
              />
            </div>
          ))}
        </div>
        <div style={{ padding: '20px 24px 28px', display: 'grid', gap: 10 }}>
          <button
            onClick={() => onSave(state)}
            style={{
              padding: '14px 16px',
              background: HQ.ink,
              color: HQ.paper,
              border: 'none',
              borderRadius: 4,
              fontFamily: HQ.jp,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 1.2,
              cursor: 'pointer',
            }}
          >
            {CookieCopy.save}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px',
              background: 'transparent',
              color: HQ.muted,
              border: 'none',
              fontFamily: HQ.mono,
              fontSize: 10,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Host — wires the variant + state
// ============================================================
const CookieHost = ({ variant = 'bottom', forceShow = true }) => {
  const [open, setOpen] = useStateCK(forceShow);
  const [sheet, setSheet] = useStateCK(false);

  useEffectCK(() => {
    setOpen(forceShow);
  }, [forceShow]);

  if (!open && !sheet) return null;

  const handle = {
    onAcceptAll: () => setOpen(false),
    onAcceptNeeded: () => setOpen(false),
    onCustomize: () => setSheet(true),
  };

  return (
    <>
      {open && variant === 'bottom' && <CookieBannerBottom {...handle} />}
      {open && variant === 'center' && <CookieModalCenter {...handle} />}
      {open && variant === 'corner' && <CookieCornerCard {...handle} />}
      {sheet && (
        <CookieCustomizeSheet
          initial={{ analytics: false, marketing: false }}
          onCancel={() => setSheet(false)}
          onSave={() => {
            setSheet(false);
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

window.CookieHost = CookieHost;
