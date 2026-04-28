// High Q — Admin (utility) primitives. Shares HQ tokens with LP, but
// reformats them for a dense, table-first internal tool.
// Visual lineage: shadcn/ui defaults, repainted with HQ paper + ink + terracotta.

const HQA = {
  // type — Shippori Mincho is intentionally absent here.
  jp: '"Zen Kaku Gothic New", "Noto Sans JP", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',

  // surfaces (shared with LP)
  paper: '#f7f3ea',
  paperWarm: '#f1ece0',
  surface: '#fbf8f1',     // table row / card surface — slightly lighter than paper
  surfaceAlt: '#f3eee2',  // zebra / hovered
  ink: '#1f1d1a',
  inkSoft: '#3a3833',
  muted: '#8a857a',
  faint: '#b6afa0',
  hairline: 'rgba(31,29,26,0.12)',
  hairlineSoft: 'rgba(31,29,26,0.06)',
  accent: '#b85c3c',
  accentSoft: 'rgba(184,92,60,0.10)',
  accentInk: '#8a4129',

  // semantic
  success: '#5a7a4a',
  successSoft: 'rgba(90,122,74,0.10)',
  warn: '#a17536',
  warnSoft: 'rgba(161,117,54,0.12)',
  danger: '#a14336',
  dangerSoft: 'rgba(161,67,54,0.10)',

  // shape
  radius: 6,
  radiusLg: 10,

  // density (compact default)
  rowH: 38,
  cellY: 10,
  cellX: 14,
};

// ─────────────────────────────────────────────────────────────
// Kicker — reused from LP, smaller in admin
// ─────────────────────────────────────────────────────────────
const AKicker = ({ children, color = HQA.muted, style = {} }) => (
  <div style={{
    fontFamily: HQA.mono, fontSize: 10, letterSpacing: 1.8,
    textTransform: 'uppercase', color, fontWeight: 500,
    ...style,
  }}>{children}</div>
);

// ─────────────────────────────────────────────────────────────
// Button — pill kept (LP-compat) but tighter padding for admin
// variants: primary | secondary | ghost | danger
// sizes: sm | md
// ─────────────────────────────────────────────────────────────
const ABtn = ({ children, variant = 'secondary', size = 'md', icon = null, iconRight = null, full = false, disabled = false, onClick }) => {
  const palette = {
    primary:   { bg: HQA.ink,         fg: HQA.paper,       bd: HQA.ink },
    secondary: { bg: HQA.surface,     fg: HQA.ink,         bd: HQA.hairline },
    ghost:     { bg: 'transparent',   fg: HQA.inkSoft,     bd: 'transparent' },
    danger:    { bg: 'transparent',   fg: HQA.danger,      bd: HQA.dangerSoft },
    accent:    { bg: HQA.accent,      fg: '#fff',          bd: HQA.accent },
  }[variant];
  const pad = size === 'sm' ? '6px 12px' : '9px 16px';
  const fz = size === 'sm' ? 12 : 13;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      width: full ? '100%' : 'auto', padding: pad,
      background: palette.bg, color: palette.fg,
      border: `1px solid ${palette.bd}`, borderRadius: 999,
      fontFamily: HQA.jp, fontSize: fz, fontWeight: 500, letterSpacing: 0.6,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      whiteSpace: 'nowrap',
    }}>
      {icon}
      <span>{children}</span>
      {iconRight}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// Input / Select / Textarea — shadcn-ish, HQ token painted
// ─────────────────────────────────────────────────────────────
const baseField = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px',
  background: HQA.surface,
  border: `1px solid ${HQA.hairline}`,
  borderRadius: HQA.radius,
  fontFamily: HQA.jp, fontSize: 13, color: HQA.ink,
  outline: 'none',
};
const AInput = ({ value, placeholder, type = 'text', icon, suffix, style = {} }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {icon && <span style={{ position: 'absolute', left: 10, color: HQA.faint, display: 'flex' }}>{icon}</span>}
    <input type={type} defaultValue={value} placeholder={placeholder} style={{
      ...baseField, paddingLeft: icon ? 32 : 12, paddingRight: suffix ? 56 : 12, ...style,
    }} />
    {suffix && <span style={{ position: 'absolute', right: 10, color: HQA.muted, fontFamily: HQA.mono, fontSize: 11 }}>{suffix}</span>}
  </div>
);
const ASelect = ({ value, options = [], placeholder, style = {} }) => (
  <div style={{ position: 'relative', ...style }}>
    <select defaultValue={value || ''} style={{
      ...baseField, appearance: 'none', paddingRight: 32, cursor: 'pointer',
    }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o, i) => <option key={i} value={o.value || o}>{o.label || o}</option>)}
    </select>
    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: HQA.muted }}>
      <Icon name="chevron-down" size={14} />
    </span>
  </div>
);
const ATextarea = ({ value, placeholder, rows = 4 }) => (
  <textarea defaultValue={value} placeholder={placeholder} rows={rows}
    style={{ ...baseField, fontFamily: HQA.jp, lineHeight: 1.55, resize: 'vertical' }} />
);
const ALabel = ({ children, required, hint }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
    <span style={{ fontFamily: HQA.jp, fontSize: 12.5, fontWeight: 500, color: HQA.inkSoft }}>{children}</span>
    {required && <span style={{ color: HQA.accent, fontSize: 11 }}>*</span>}
    {hint && <span style={{ marginLeft: 'auto', fontFamily: HQA.mono, fontSize: 10, color: HQA.muted }}>{hint}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Badge — status pills
// ─────────────────────────────────────────────────────────────
const ABadge = ({ children, tone = 'neutral', dot = false }) => {
  const palette = {
    neutral: { bg: HQA.hairlineSoft, fg: HQA.inkSoft, dot: HQA.muted },
    accent:  { bg: HQA.accentSoft,   fg: HQA.accentInk, dot: HQA.accent },
    success: { bg: HQA.successSoft,  fg: HQA.success, dot: HQA.success },
    warn:    { bg: HQA.warnSoft,     fg: HQA.warn,    dot: HQA.warn },
    danger:  { bg: HQA.dangerSoft,   fg: HQA.danger,  dot: HQA.danger },
    draft:   { bg: 'transparent',    fg: HQA.muted,   dot: HQA.faint, bd: HQA.hairline },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 999,
      background: palette.bg, color: palette.fg,
      border: palette.bd ? `1px solid ${palette.bd}` : 'none',
      fontFamily: HQA.jp, fontSize: 11, fontWeight: 500, letterSpacing: 0.4,
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: palette.dot }} />}
      {children}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// Icon — minimal lucide-like inline SVGs, only what we use
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = 'currentColor', strokeWidth = 1.5 }) => {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':       return <svg {...p}><path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2z" /></svg>;
    case 'calendar':   return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>;
    case 'users':      return <svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.6" /></svg>;
    case 'pin':        return <svg {...p}><path d="M12 21s7-7.5 7-12a7 7 0 10-14 0c0 4.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case 'settings':   return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    case 'plus':       return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case 'search':     return <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>;
    case 'filter':     return <svg {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z" /></svg>;
    case 'download':   return <svg {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>;
    case 'mail':       return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
    case 'chevron-down': return <svg {...p}><path d="M6 9l6 6 6-6" /></svg>;
    case 'chevron-right':return <svg {...p}><path d="M9 6l6 6-6 6" /></svg>;
    case 'chevron-up-down': return <svg {...p}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></svg>;
    case 'arrow-up':   return <svg {...p}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
    case 'arrow-down': return <svg {...p}><path d="M12 5v14M5 12l7 7 7-7" /></svg>;
    case 'arrow-right':return <svg {...p}><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
    case 'more':       return <svg {...p}><circle cx="12" cy="6" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="18" r="1" /></svg>;
    case 'edit':       return <svg {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4z" /></svg>;
    case 'trash':      return <svg {...p}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>;
    case 'copy':       return <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
    case 'check':      return <svg {...p}><path d="M5 12l5 5L20 7" /></svg>;
    case 'x':          return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case 'bell':       return <svg {...p}><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 004 0" /></svg>;
    case 'alert':      return <svg {...p}><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>;
    case 'logout':     return <svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>;
    case 'eye':        return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'mailcheck':  return <svg {...p}><path d="M22 12V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h10" /><path d="M2 7l10 6 10-6" /><path d="M16 19l2 2 4-4" /></svg>;
    case 'sparkle':    return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></svg>;
    case 'refresh':    return <svg {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" /></svg>;
    case 'inbox':      return <svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z" /></svg>;
    default: return null;
  }
};

// ─────────────────────────────────────────────────────────────
// SidebarNav — left fixed
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'ダッシュボード', icon: 'home',     href: '/' },
  { id: 'events',    label: 'イベント',       icon: 'calendar', href: '/events', badge: 3 },
  { id: 'members',   label: '参加者',         icon: 'users',    href: '/members' },
  { id: 'venues',    label: '会場',           icon: 'pin',      href: '/venues' },
  { id: 'settings',  label: '設定',           icon: 'settings', href: '/settings' },
];
const SidebarNav = ({ active = 'dashboard', width = 240 }) => (
  <aside style={{
    width, flexShrink: 0,
    background: HQA.paperWarm,
    borderRight: `1px solid ${HQA.hairline}`,
    padding: '20px 14px',
    display: 'flex', flexDirection: 'column', gap: 4,
    minHeight: '100%', boxSizing: 'border-box',
  }}>
    {/* brand */}
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 10px 22px' }}>
      <span style={{ fontFamily: '"Shippori Mincho", serif', fontSize: 22, fontWeight: 600, color: HQA.ink, letterSpacing: 1 }}>High Q</span>
      <span style={{ fontFamily: HQA.mono, fontSize: 9, letterSpacing: 2, color: HQA.muted }}>ADMIN</span>
    </div>
    <AKicker style={{ padding: '0 10px 8px' }}>— Workspace</AKicker>
    {NAV_ITEMS.map(item => {
      const isActive = item.id === active;
      return (
        <a key={item.id} href="#" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 10px', borderRadius: HQA.radius,
          background: isActive ? HQA.surface : 'transparent',
          border: `1px solid ${isActive ? HQA.hairline : 'transparent'}`,
          color: isActive ? HQA.ink : HQA.inkSoft,
          fontFamily: HQA.jp, fontSize: 13, fontWeight: isActive ? 500 : 400,
          textDecoration: 'none',
        }}>
          <Icon name={item.icon} size={16} color={isActive ? HQA.accent : HQA.muted} strokeWidth={isActive ? 2 : 1.5} />
          <span>{item.label}</span>
          {item.badge != null && (
            <span style={{
              marginLeft: 'auto', background: HQA.accentSoft, color: HQA.accentInk,
              padding: '1px 7px', borderRadius: 999,
              fontFamily: HQA.mono, fontSize: 10, fontWeight: 500,
            }}>{item.badge}</span>
          )}
        </a>
      );
    })}
    <div style={{ flex: 1 }} />
    {/* user */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 10px', borderTop: `1px solid ${HQA.hairline}`, marginTop: 8,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: HQA.accent, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HQA.jp, fontSize: 12, fontWeight: 600,
      }}>翔</div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontFamily: HQA.jp, fontSize: 12.5, fontWeight: 500, color: HQA.ink }}>翔太郎</span>
        <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, overflow: 'hidden', textOverflow: 'ellipsis' }}>owner@high-q.club</span>
      </div>
      <Icon name="logout" size={14} color={HQA.muted} />
    </div>
  </aside>
);

// ─────────────────────────────────────────────────────────────
// TopBar (per-page header inside the main panel)
// ─────────────────────────────────────────────────────────────
const TopBar = ({ title, subtitle, breadcrumb = [], actions = null }) => (
  <header style={{
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: '24px 32px 18px',
    borderBottom: `1px solid ${HQA.hairline}`,
    background: HQA.paper,
  }}>
    <div>
      {breadcrumb.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: HQA.muted, fontFamily: HQA.mono, fontSize: 10, letterSpacing: 1.5 }}>
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon name="chevron-right" size={11} />}
              <span style={{ color: i === breadcrumb.length - 1 ? HQA.inkSoft : HQA.muted }}>{b}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <h1 style={{
        margin: 0, fontFamily: HQA.jp, fontSize: 22, fontWeight: 600,
        color: HQA.ink, letterSpacing: '0.01em',
      }}>{title}</h1>
      {subtitle && <div style={{ marginTop: 4, fontFamily: HQA.jp, fontSize: 13, color: HQA.muted }}>{subtitle}</div>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
  </header>
);

// ─────────────────────────────────────────────────────────────
// Toolbar — filter/search row above tables
// ─────────────────────────────────────────────────────────────
const Toolbar = ({ children, right }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 32px', background: HQA.paper,
    borderBottom: `1px solid ${HQA.hairlineSoft}`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>{children}</div>
    {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// DataTable
// ─────────────────────────────────────────────────────────────
const DataTable = ({ columns, rows, selectable = true, selectedIds = [], hoverRow = null, sortBy = null, sortDir = 'asc' }) => {
  const totalCols = columns.length + (selectable ? 1 : 0);
  return (
    <div style={{
      margin: '0 32px', background: HQA.surface,
      border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radiusLg,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: columns.map(c => c.width || '1fr').join(' ') ? (selectable ? '36px ' : '') + columns.map(c => c.width || '1fr').join(' ') : 'auto' }}>
        {/* header */}
        {selectable && (
          <div style={cellHeader}><Checkbox checked={selectedIds.length > 0 && selectedIds.length === rows.length} indeterminate={selectedIds.length > 0 && selectedIds.length < rows.length} /></div>
        )}
        {columns.map((c, i) => (
          <div key={i} style={{ ...cellHeader, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: c.sort ? 'pointer' : 'default' }}>
              {c.label}
              {c.sort && (
                sortBy === c.key
                  ? <Icon name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={11} color={HQA.accent} />
                  : <Icon name="chevron-up-down" size={11} color={HQA.faint} />
              )}
            </span>
          </div>
        ))}
        {/* rows */}
        {rows.map((row, ri) => {
          const sel = selectedIds.includes(row.id);
          const isHover = hoverRow === ri;
          return (
            <React.Fragment key={row.id || ri}>
              {selectable && (
                <div style={{ ...cellBody, background: sel ? HQA.accentSoft : (isHover ? HQA.surfaceAlt : 'transparent'), borderTop: ri === 0 ? `1px solid ${HQA.hairline}` : `1px solid ${HQA.hairlineSoft}` }}>
                  <Checkbox checked={sel} />
                </div>
              )}
              {columns.map((c, ci) => (
                <div key={ci} style={{
                  ...cellBody,
                  background: sel ? HQA.accentSoft : (isHover ? HQA.surfaceAlt : 'transparent'),
                  borderTop: ri === 0 ? `1px solid ${HQA.hairline}` : `1px solid ${HQA.hairlineSoft}`,
                  justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                  fontFamily: c.mono ? HQA.mono : HQA.jp,
                  fontSize: c.mono ? 12 : 13,
                  color: c.muted ? HQA.muted : HQA.inkSoft,
                  fontWeight: c.bold ? 500 : 400,
                }}>
                  {c.render ? c.render(row) : row[c.key]}
                </div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
const cellHeader = {
  display: 'flex', alignItems: 'center',
  padding: `10px ${HQA.cellX}px`,
  background: HQA.paperWarm,
  fontFamily: HQA.mono, fontSize: 10, fontWeight: 500, letterSpacing: 1.4,
  textTransform: 'uppercase', color: HQA.muted,
  borderBottom: `1px solid ${HQA.hairline}`,
};
const cellBody = {
  display: 'flex', alignItems: 'center',
  padding: `${HQA.cellY}px ${HQA.cellX}px`,
  fontFamily: HQA.jp, fontSize: 13, color: HQA.inkSoft,
  minHeight: HQA.rowH, boxSizing: 'border-box',
};

// ─────────────────────────────────────────────────────────────
// Checkbox
// ─────────────────────────────────────────────────────────────
const Checkbox = ({ checked = false, indeterminate = false, label = null, onChange }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
    <span style={{
      width: 15, height: 15, borderRadius: 3,
      border: `1px solid ${checked || indeterminate ? HQA.accent : HQA.hairline}`,
      background: checked || indeterminate ? HQA.accent : HQA.surface,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {checked && !indeterminate && <Icon name="check" size={11} color="#fff" strokeWidth={2.5} />}
      {indeterminate && <span style={{ width: 7, height: 1.5, background: '#fff' }} />}
    </span>
    {label && <span style={{ fontFamily: HQA.jp, fontSize: 13, color: HQA.inkSoft }}>{label}</span>}
  </label>
);

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────
const Pagination = ({ page = 1, total = 1, per = 25, count = 0 }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 32px',
  }}>
    <div style={{ fontFamily: HQA.mono, fontSize: 11, color: HQA.muted, letterSpacing: 1 }}>
      {count} 件中 {(page - 1) * per + 1}–{Math.min(page * per, count)} 件
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button style={pageBtn(false, true)}>‹</button>
      {[1, 2, 3].slice(0, total).map(n => (
        <button key={n} style={pageBtn(n === page)}>{n}</button>
      ))}
      {total > 3 && <span style={{ color: HQA.muted, padding: '0 4px' }}>…</span>}
      <button style={pageBtn(false)}>›</button>
    </div>
  </div>
);
const pageBtn = (active, disabled) => ({
  minWidth: 28, height: 28, padding: '0 8px',
  background: active ? HQA.ink : HQA.surface,
  color: active ? HQA.paper : HQA.inkSoft,
  border: `1px solid ${active ? HQA.ink : HQA.hairline}`,
  borderRadius: HQA.radius,
  fontFamily: HQA.mono, fontSize: 12,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.4 : 1,
});

// ─────────────────────────────────────────────────────────────
// StatCard — dashboard tile
// ─────────────────────────────────────────────────────────────
const StatCard = ({ kicker, label, value, unit, delta, deltaTone = 'neutral', sub, accent = false }) => (
  <div style={{
    background: accent ? HQA.ink : HQA.surface,
    color: accent ? HQA.paper : HQA.ink,
    border: `1px solid ${accent ? HQA.ink : HQA.hairline}`,
    borderRadius: HQA.radiusLg,
    padding: '18px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
    minHeight: 130, boxSizing: 'border-box',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <AKicker color={accent ? 'rgba(247,243,234,0.6)' : HQA.muted}>— {kicker}</AKicker>
      {delta != null && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontFamily: HQA.mono, fontSize: 11,
          color: deltaTone === 'up' ? HQA.success : deltaTone === 'down' ? HQA.danger : (accent ? HQA.paper : HQA.muted),
        }}>
          {deltaTone === 'up' && <Icon name="arrow-up" size={11} />}
          {deltaTone === 'down' && <Icon name="arrow-down" size={11} />}
          {delta}
        </span>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{
        fontFamily: HQA.jp, fontSize: 32, fontWeight: 600, letterSpacing: '0.01em',
        color: accent ? HQA.paper : HQA.ink, lineHeight: 1,
      }}>{value}</span>
      {unit && <span style={{ fontFamily: HQA.jp, fontSize: 13, color: accent ? 'rgba(247,243,234,0.6)' : HQA.muted }}>{unit}</span>}
    </div>
    <div style={{ fontFamily: HQA.jp, fontSize: 12, color: accent ? 'rgba(247,243,234,0.6)' : HQA.muted, marginTop: 'auto' }}>
      {label}{sub && <> <span style={{ opacity: 0.7 }}>· {sub}</span></>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// RemainBar — capacity / reservation viz
// ─────────────────────────────────────────────────────────────
const RemainBar = ({ booked, capacity, waitlist = 0, height = 8, showLegend = true }) => {
  const pct = Math.min(100, (booked / capacity) * 100);
  const tone = pct >= 100 ? HQA.danger : pct >= 80 ? HQA.warn : HQA.success;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {showLegend && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.inkSoft }}>
            <span style={{ fontWeight: 600, color: HQA.ink }}>{booked}</span>
            <span style={{ color: HQA.muted }}> / {capacity} 名</span>
          </div>
          {waitlist > 0 && (
            <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 1 }}>
              +{waitlist} 待ち
            </span>
          )}
        </div>
      )}
      <div style={{
        height, background: HQA.hairlineSoft, borderRadius: 999, overflow: 'hidden',
        border: `1px solid ${HQA.hairlineSoft}`,
      }}>
        <div style={{ height: '100%', width: `${pct}%`, background: tone }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FormSection — divides edit screens
// ─────────────────────────────────────────────────────────────
const FormSection = ({ kicker, title, hint, children }) => (
  <section style={{
    display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32,
    padding: '28px 0',
    borderTop: `1px solid ${HQA.hairlineSoft}`,
  }}>
    <div>
      <AKicker style={{ marginBottom: 8 }}>— {kicker}</AKicker>
      <h3 style={{ margin: 0, fontFamily: HQA.jp, fontSize: 15, fontWeight: 600, color: HQA.ink }}>{title}</h3>
      {hint && <p style={{ margin: '6px 0 0', fontFamily: HQA.jp, fontSize: 12, color: HQA.muted, lineHeight: 1.6 }}>{hint}</p>}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>{children}</div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────
const Tabs = ({ items, active }) => (
  <div style={{
    display: 'flex', gap: 0, borderBottom: `1px solid ${HQA.hairline}`,
    padding: '0 32px', background: HQA.paper,
  }}>
    {items.map(it => {
      const isActive = it.id === active;
      return (
        <div key={it.id} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 18px',
          borderBottom: `2px solid ${isActive ? HQA.accent : 'transparent'}`,
          color: isActive ? HQA.ink : HQA.muted,
          fontFamily: HQA.jp, fontSize: 13, fontWeight: isActive ? 600 : 400,
          cursor: 'pointer',
          marginBottom: -1,
        }}>
          {it.label}
          {it.count != null && (
            <span style={{
              fontFamily: HQA.mono, fontSize: 10, padding: '1px 7px', borderRadius: 999,
              background: isActive ? HQA.accentSoft : HQA.hairlineSoft,
              color: isActive ? HQA.accentInk : HQA.muted,
            }}>{it.count}</span>
          )}
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────
const Toast = ({ tone = 'success', title, body, onClose }) => {
  const palette = {
    success: { dot: HQA.success, bg: HQA.surface },
    warn:    { dot: HQA.warn, bg: HQA.surface },
    danger:  { dot: HQA.danger, bg: HQA.surface },
    info:    { dot: HQA.accent, bg: HQA.surface },
  }[tone];
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: palette.bg,
      border: `1px solid ${HQA.hairline}`,
      borderLeft: `3px solid ${palette.dot}`,
      borderRadius: HQA.radius,
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(31,29,26,0.10)',
      minWidth: 320, maxWidth: 420,
    }}>
      <Icon name={tone === 'success' ? 'check' : tone === 'danger' ? 'alert' : 'bell'} size={16} color={palette.dot} strokeWidth={2} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: HQA.jp, fontSize: 13, fontWeight: 600, color: HQA.ink }}>{title}</div>
        {body && <div style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.muted, marginTop: 2 }}>{body}</div>}
      </div>
      <Icon name="x" size={14} color={HQA.muted} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ConfirmDialog (modal)
// ─────────────────────────────────────────────────────────────
const ConfirmDialog = ({ tone = 'danger', title, body, confirmLabel = '削除する', cancelLabel = 'キャンセル' }) => (
  <div style={{
    position: 'absolute', inset: 0,
    background: 'rgba(31,29,26,0.32)',
    backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50,
  }}>
    <div style={{
      width: 400, background: HQA.paper,
      border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radiusLg,
      padding: 24, boxShadow: '0 24px 80px rgba(31,29,26,0.25)',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: tone === 'danger' ? HQA.dangerSoft : HQA.warnSoft,
          color: tone === 'danger' ? HQA.danger : HQA.warn,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="alert" size={18} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontFamily: HQA.jp, fontSize: 15, fontWeight: 600, color: HQA.ink }}>{title}</h4>
          <p style={{ margin: '8px 0 0', fontFamily: HQA.jp, fontSize: 13, color: HQA.inkSoft, lineHeight: 1.6 }}>{body}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
        <ABtn variant="ghost" size="sm">{cancelLabel}</ABtn>
        <ABtn variant={tone === 'danger' ? 'primary' : 'accent'} size="sm" icon={<Icon name="trash" size={14} />}>{confirmLabel}</ABtn>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Skeleton — loading rows
// ─────────────────────────────────────────────────────────────
const SkelBar = ({ w = '60%', h = 12, style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: 4,
    background: `linear-gradient(90deg, ${HQA.hairlineSoft} 0%, ${HQA.hairline} 50%, ${HQA.hairlineSoft} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'hqShimmer 1.6s ease-in-out infinite',
    ...style,
  }} />
);

// inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('hq-admin-css')) {
  const s = document.createElement('style');
  s.id = 'hq-admin-css';
  s.textContent = `
    @keyframes hqShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .hqa-row:hover { background: ${HQA.surfaceAlt} !important; }
    .hqa-link { color: ${HQA.accentInk}; text-decoration: none; }
    .hqa-link:hover { text-decoration: underline; }
  `;
  document.head.appendChild(s);
}

Object.assign(window, {
  HQA, AKicker, ABtn, AInput, ASelect, ATextarea, ALabel, ABadge, Icon,
  SidebarNav, TopBar, Toolbar, DataTable, Checkbox, Pagination,
  StatCard, RemainBar, FormSection, Tabs, Toast, ConfirmDialog, SkelBar,
});
