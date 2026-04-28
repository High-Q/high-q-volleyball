// High Q — Admin Phase 2 screens: members, venues, settings, 404, mobile.

// ─────────────────────────────────────────────────────────────
// 5. Members
// ─────────────────────────────────────────────────────────────
const MEMBERS = [
  { id: 'm1',  name: '田中 美咲',     email: 'misaki.t@example.com',     first: '2026/04/28', total: 1,  last: '2026/04/28', exp: '初回',   note: '左利き / 体験申込' },
  { id: 'm2',  name: '佐藤 健太',     email: 'k.sato@example.com',       first: '2024/03/11', total: 18, last: '2026/04/28', exp: '経験者', note: '元実業団' },
  { id: 'm3',  name: '中村 あかり',   email: 'akari.n@example.com',      first: '2025/07/22', total: 8,  last: '2026/04/27', exp: '中級',   note: '' },
  { id: 'm4',  name: '高橋 直樹',     email: 'naoki.t@example.com',      first: '2026/04/26', total: 1,  last: '2026/04/26', exp: '初回',   note: '同伴あり' },
  { id: 'm5',  name: '山口 千夏',     email: 'chinatsu.y@example.com',   first: '2024/11/04', total: 14, last: '2026/04/26', exp: '中級',   note: '土曜希望' },
  { id: 'm6',  name: '伊藤 大輔',     email: 'd.ito@example.com',        first: '2025/02/17', total: 11, last: '2026/04/26', exp: '経験者', note: '' },
  { id: 'm7',  name: '森田 千鶴',     email: 'chizuru.m@example.com',    first: '2025/05/12', total: 9,  last: '2026/04/25', exp: '中級',   note: '' },
  { id: 'm8',  name: '岡本 龍之介',   email: 'r.okamoto@example.com',    first: '2024/06/03', total: 22, last: '2026/04/24', exp: '経験者', note: '送迎可' },
  { id: 'm9',  name: '木下 ゆうな',   email: 'yuna.k@example.com',       first: '2025/09/30', total: 5,  last: '2026/04/14', exp: '中級',   note: 'メール届かず要確認' },
  { id: 'm10', name: '長谷川 涼介',   email: 'r.hasegawa@example.com',   first: '2024/01/20', total: 27, last: '2026/04/14', exp: '経験者', note: '' },
];

const memberColumns = [
  { key: 'name', label: '名前', width: '180px', render: r => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        background: HQA.paperWarm, border: `1px solid ${HQA.hairline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HQA.jp, fontSize: 10, color: HQA.inkSoft,
      }}>{r.name.charAt(0)}</span>
      <span style={{ color: HQA.ink, fontWeight: 500 }}>{r.name}</span>
    </span>
  ) },
  { key: 'email', label: 'メール', width: '1.2fr', mono: true, muted: true },
  { key: 'exp', label: '経験', width: '90px', render: r => <ABadge tone={r.exp === '経験者' ? 'success' : r.exp === '中級' ? 'accent' : 'neutral'}>{r.exp}</ABadge> },
  { key: 'first', label: '初回参加', width: '110px', mono: true, muted: true, sort: true },
  { key: 'total', label: '累計', width: '80px', align: 'right', mono: true, render: r => (
    <span style={{ color: r.total >= 10 ? HQA.accentInk : HQA.inkSoft, fontWeight: r.total >= 10 ? 500 : 400 }}>
      {r.total} 回
    </span>
  ), sort: true },
  { key: 'last', label: '最終参加', width: '110px', mono: true, muted: true, sort: true },
  { key: 'note', label: 'メモ', width: '1fr', muted: true, render: r => r.note
    ? <span style={{ fontSize: 12, color: HQA.muted }}>{r.note}</span>
    : <span style={{ color: HQA.faint }}>—</span> },
];

const ScreenMembers = () => (
  <Frame active="members" height={920}>
    <TopBar
      title="参加者・メンバー"
      breadcrumb={['Workspace', '参加者']}
      subtitle="累計 184 名 · 今月初参加 12 名"
      actions={<>
        <ABtn variant="ghost" size="sm" icon={<Icon name="download" size={13} />}>CSV</ABtn>
        <ABtn variant="secondary" size="sm" icon={<Icon name="mail" size={13} />}>一斉メール</ABtn>
      </>}
    />
    <Toolbar
      right={<span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 1 }}>184 MEMBERS</span>}
    >
      <div style={{ width: 240 }}>
        <AInput placeholder="名前・メール・メモで検索…" icon={<Icon name="search" size={14} />} />
      </div>
      <ASelect placeholder="経験: すべて" options={['初回', '中級', '経験者']} style={{ width: 130 }} />
      <ASelect placeholder="累計: すべて" options={['初回のみ', '2-5 回', '6-10 回', '11 回以上']} style={{ width: 140 }} />
      <ASelect placeholder="最終参加: すべて" options={['今月', '3 ヶ月以内', '半年以上前']} style={{ width: 150 }} />
    </Toolbar>
    <div style={{ flex: 1, overflow: 'auto', background: HQA.paper, paddingTop: 16 }}>
      <DataTable columns={memberColumns} rows={MEMBERS} selectedIds={[]} hoverRow={1} sortBy="last" sortDir="desc" />
    </div>
    <Pagination page={1} total={8} per={25} count={184} />
  </Frame>
);

// ─────────────────────────────────────────────────────────────
// 6. Venues
// ─────────────────────────────────────────────────────────────
const VENUES = [
  { id: 'v1', name: '亀戸スポーツセンター',         addr: '江東区亀戸 2-1-1',     fee: 1000, note: '亀戸駅 徒歩 7 分 / コート 2 面 / 21:30 完全撤収', map: 'https://maps.google.com/...亀戸', primary: true },
  { id: 'v2', name: '東陽町コミュニティセンター',   addr: '江東区東陽 4-11-3',    fee: 1000, note: '東陽町駅 徒歩 5 分 / 体育館 1 面 / 駐車場 5 台', map: 'https://maps.google.com/...東陽町' },
  { id: 'v3', name: '深川北スポーツセンター',       addr: '江東区平野 1-2-3',     fee: 500,  note: '清澄白河 徒歩 12 分 / コート 1.5 面 / 平日のみ', map: 'https://maps.google.com/...深川北' },
  { id: 'v4', name: '有明スポーツセンター',         addr: '江東区有明 2-3-5',     fee: 1500, note: '国際展示場 徒歩 8 分 / 大規模イベント用', map: 'https://maps.google.com/...有明' },
];

const venueColumns = [
  { key: 'name', label: '会場', width: '220px', render: r => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name="pin" size={14} color={r.primary ? HQA.accent : HQA.muted} />
      <span style={{ color: HQA.ink, fontWeight: 500 }}>{r.name}</span>
      {r.primary && <ABadge tone="accent">メイン</ABadge>}
    </span>
  ) },
  { key: 'addr', label: '住所', width: '1fr', muted: true },
  { key: 'fee', label: '標準参加費', width: '120px', align: 'right', mono: true, render: r => `¥${r.fee.toLocaleString()}` },
  { key: 'note', label: 'アクセスメモ', width: '1.5fr', muted: true },
  { key: 'map', label: 'マップ', width: '90px', render: () => (
    <a href="#" className="hqa-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: HQA.jp, fontSize: 12 }}>
      開く <Icon name="arrow-right" size={11} />
    </a>
  ) },
  { key: 'actions', label: '', width: '60px', align: 'right', render: () => (
    <div style={{ color: HQA.muted, display: 'flex', gap: 6 }}>
      <Icon name="edit" size={14} />
      <Icon name="more" size={14} />
    </div>
  ) },
];

const ScreenVenues = () => (
  <Frame active="venues" height={780}>
    <TopBar
      title="会場マスタ"
      breadcrumb={['Workspace', '会場']}
      subtitle="イベント作成時に選択できる会場"
      actions={<ABtn variant="primary" size="sm" icon={<Icon name="plus" size={14} />}>新しい会場</ABtn>}
    />
    <Toolbar
      right={<span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 1 }}>4 VENUES</span>}
    >
      <div style={{ width: 240 }}>
        <AInput placeholder="会場名・住所で検索…" icon={<Icon name="search" size={14} />} />
      </div>
    </Toolbar>
    <div style={{ flex: 1, overflow: 'auto', background: HQA.paper, paddingTop: 16 }}>
      <DataTable columns={venueColumns} rows={VENUES} selectable={false} hoverRow={1} />
    </div>
  </Frame>
);

// ─────────────────────────────────────────────────────────────
// 7. Settings
// ─────────────────────────────────────────────────────────────
const SETTINGS_NAV = [
  { id: 'circle',   label: 'サークル情報', active: true },
  { id: 'notify',   label: '通知' },
  { id: 'cancel',   label: 'キャンセルポリシー' },
  { id: 'terms',    label: '規約・プライバシー' },
  { id: 'billing',  label: '支払い設定' },
  { id: 'danger',   label: '危険な操作' },
];

const ScreenSettings = () => (
  <Frame active="settings" height={1080}>
    <TopBar
      title="設定"
      breadcrumb={['Workspace', '設定']}
      subtitle="サークル全体の設定。LP / 予約サイトに反映されます"
      actions={<>
        <ABtn variant="ghost" size="sm">破棄</ABtn>
        <ABtn variant="primary" size="sm" icon={<Icon name="check" size={13} />}>保存</ABtn>
      </>}
    />
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: HQA.paper }}>
      {/* sub-nav */}
      <div style={{
        width: 220, padding: '24px 16px',
        borderRight: `1px solid ${HQA.hairlineSoft}`,
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <AKicker style={{ padding: '0 10px 8px' }}>— Sections</AKicker>
        {SETTINGS_NAV.map(it => (
          <a key={it.id} href="#" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', borderRadius: HQA.radius,
            background: it.active ? HQA.surface : 'transparent',
            border: `1px solid ${it.active ? HQA.hairline : 'transparent'}`,
            color: it.active ? HQA.ink : HQA.inkSoft,
            fontFamily: HQA.jp, fontSize: 13, fontWeight: it.active ? 500 : 400,
            textDecoration: 'none',
          }}>
            <span>{it.label}</span>
            {it.active && <Icon name="chevron-right" size={12} color={HQA.accent} />}
          </a>
        ))}
      </div>
      {/* form */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 32px 60px' }}>
        <FormSection kicker="01" title="サークル情報" hint="LP のヘッダ / フッタに表示。SEO の og:title にも使用。">
          <div>
            <ALabel required>サークル名</ALabel>
            <AInput value="High Q" />
          </div>
          <div>
            <ALabel>キャッチコピー</ALabel>
            <AInput value="江東区の社会人バレーボールサークル" />
          </div>
          <div>
            <ALabel>連絡先メール</ALabel>
            <AInput value="hello@high-q.club" icon={<Icon name="mail" size={14} />} />
          </div>
          <div>
            <ALabel hint="markdown">about 文</ALabel>
            <ATextarea rows={5} value="2021 年に始まった、江東区を中心に活動するゆるめのバレーボールサークル。月 2-3 回、亀戸 / 東陽町を中心に、初心者から経験者まで楽しめる雰囲気を大切にしています。" />
          </div>
        </FormSection>

        <FormSection kicker="02" title="通知" hint="予約発生・キャンセル時のメール通知設定。">
          {[
            { ttl: '新規予約', sub: '予約が入った時に通知',           on: true },
            { ttl: 'キャンセル', sub: 'キャンセル発生時に通知',       on: true },
            { ttl: '満員直前', sub: '残 2 席を切ったタイミングで通知', on: true },
            { ttl: 'メール送信失敗', sub: '配信エラー時に通知',       on: true },
            { ttl: '日次サマリ', sub: '毎朝 7:00 に当日のイベントサマリを通知', on: false },
          ].map((n, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              background: HQA.surface,
              border: `1px solid ${HQA.hairline}`,
              borderRadius: HQA.radius,
            }}>
              <div>
                <div style={{ fontFamily: HQA.jp, fontSize: 13, color: HQA.ink, fontWeight: 500 }}>{n.ttl}</div>
                <div style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.muted, marginTop: 2 }}>{n.sub}</div>
              </div>
              {/* toggle */}
              <span style={{
                width: 36, height: 20, borderRadius: 999,
                background: n.on ? HQA.accent : HQA.hairline,
                position: 'relative', flexShrink: 0,
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: n.on ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  transition: 'left .15s',
                }} />
              </span>
            </div>
          ))}
        </FormSection>

        <FormSection kicker="03" title="キャンセルポリシー" hint="予約完了画面と予約完了メールに表示されます。">
          <ATextarea rows={5} value="開催 24 時間前までキャンセル可能です。それ以降のキャンセルは原則として参加費が発生します（個別にご相談ください）。やむを得ない事情の場合はメールにてご連絡ください。" />
        </FormSection>
      </div>
    </div>
  </Frame>
);

// ─────────────────────────────────────────────────────────────
// 8. 404 / Forbidden
// ─────────────────────────────────────────────────────────────
const ScreenNotFound = ({ kind = '404' }) => (
  <Frame active="dashboard" height={680}>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: HQA.paper, padding: 32 }}>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div style={{
          fontFamily: HQA.mono, fontSize: 11, letterSpacing: 3, color: HQA.muted, marginBottom: 18,
        }}>— ERROR · {kind === '404' ? 'NOT_FOUND' : 'FORBIDDEN'}</div>
        <div style={{
          fontFamily: '"Shippori Mincho", serif', fontSize: 64, fontWeight: 500,
          letterSpacing: '0.04em', color: HQA.ink, lineHeight: 1,
        }}>{kind === '404' ? '404' : '403'}</div>
        <h2 style={{ margin: '20px 0 10px', fontFamily: HQA.jp, fontSize: 18, fontWeight: 600, color: HQA.ink }}>
          {kind === '404' ? 'ページが見つかりません' : 'アクセス権限がありません'}
        </h2>
        <p style={{ margin: 0, fontFamily: HQA.jp, fontSize: 13, color: HQA.muted, lineHeight: 1.7 }}>
          {kind === '404'
            ? 'URL が変わったか、削除された可能性があります。サイドバーから別のページへどうぞ。'
            : 'このページはオーナーのみ閲覧できます。サインアウトして別のアカウントで試してください。'}
        </p>
        <div style={{ marginTop: 26, display: 'flex', gap: 8, justifyContent: 'center' }}>
          <ABtn variant="secondary" size="sm">前のページに戻る</ABtn>
          <ABtn variant="primary" size="sm" icon={<Icon name="home" size={13} />}>ダッシュボードへ</ABtn>
        </div>
      </div>
    </div>
  </Frame>
);

// ─────────────────────────────────────────────────────────────
// Mobile screens (420 frame inside iOSFrame)
// ─────────────────────────────────────────────────────────────
const MOBILE_W = 390;

const MobileTopBar = ({ title, back, action }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${HQA.hairlineSoft}`,
    background: HQA.paper,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {back && <span style={{ color: HQA.muted, transform: 'rotate(180deg)', display: 'flex' }}><Icon name="arrow-right" size={16} /></span>}
      <span style={{ fontFamily: HQA.jp, fontSize: 15, fontWeight: 600, color: HQA.ink }}>{title}</span>
    </div>
    {action}
  </div>
);

const MobileTabBar = ({ active }) => {
  const tabs = [
    { id: 'home',     label: 'ホーム', icon: 'home' },
    { id: 'events',   label: 'イベント', icon: 'calendar' },
    { id: 'members',  label: '参加者', icon: 'users' },
    { id: 'settings', label: '設定', icon: 'settings' },
  ];
  return (
    <div style={{
      display: 'flex', borderTop: `1px solid ${HQA.hairline}`,
      background: HQA.paperWarm, paddingBottom: 8,
    }}>
      {tabs.map(t => {
        const isA = t.id === active;
        return (
          <div key={t.id} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '10px 0',
            color: isA ? HQA.accent : HQA.muted,
          }}>
            <Icon name={t.icon} size={18} strokeWidth={isA ? 2 : 1.5} />
            <span style={{ fontFamily: HQA.jp, fontSize: 9.5, fontWeight: isA ? 600 : 400, letterSpacing: 0.4 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const MobileDashboard = () => (
  <div style={{ width: MOBILE_W, height: 760, display: 'flex', flexDirection: 'column', background: HQA.paper, fontFamily: HQA.jp }}>
    <MobileTopBar title="ダッシュボード" action={<Icon name="bell" size={18} color={HQA.muted} />} />
    <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* hero card — next event */}
      <div style={{
        background: HQA.ink, color: HQA.paper,
        borderRadius: HQA.radiusLg, padding: 18,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <AKicker color="rgba(247,243,234,0.6)">— Next event</AKicker>
        <div>
          <div style={{ fontFamily: HQA.mono, fontSize: 11, letterSpacing: 1.4, opacity: 0.7 }}>04 / 28 月 · 19:30</div>
          <div style={{ fontFamily: HQA.jp, fontSize: 18, fontWeight: 600, marginTop: 4 }}>ゆる練 vol.42</div>
          <div style={{ fontFamily: HQA.jp, fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>亀戸スポーツセンター</div>
        </div>
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: HQA.jp, fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
            <span>16 / 18 名</span>
            <span style={{ color: HQA.warn }}>残 2 席</span>
          </div>
          <div style={{ height: 6, background: 'rgba(247,243,234,0.15)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: '89%', height: '100%', background: HQA.warn }} />
          </div>
        </div>
      </div>

      {/* stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: HQA.surface, border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radius, padding: 14 }}>
          <AKicker style={{ marginBottom: 6 }}>— 今月</AKicker>
          <div style={{ fontFamily: HQA.jp, fontSize: 22, fontWeight: 600, color: HQA.ink }}>+12 名</div>
          <div style={{ fontFamily: HQA.jp, fontSize: 11, color: HQA.muted, marginTop: 2 }}>新規参加者</div>
        </div>
        <div style={{ background: HQA.surface, border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radius, padding: 14 }}>
          <AKicker style={{ marginBottom: 6 }}>— 売上</AKicker>
          <div style={{ fontFamily: HQA.jp, fontSize: 22, fontWeight: 600, color: HQA.ink }}>¥84,500</div>
          <div style={{ fontFamily: HQA.jp, fontSize: 11, color: HQA.muted, marginTop: 2 }}>4 月合計</div>
        </div>
      </div>

      {/* notifications */}
      <div style={{ background: HQA.surface, border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radiusLg, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Icon name="bell" size={13} color={HQA.accent} />
          <AKicker>— 通知 3</AKicker>
        </div>
        {[
          { t: 'メール送信失敗', s: '木下 ゆうな 様',   tone: 'danger', w: '12:34' },
          { t: '満員直前',      s: 'ゆる練 vol.42',     tone: 'warn',   w: '11:08' },
        ].map((n, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${HQA.hairlineSoft}` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, background: n.tone === 'danger' ? HQA.danger : HQA.warn }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: HQA.jp, fontSize: 12.5, color: HQA.ink, fontWeight: 500 }}>{n.t}</div>
              <div style={{ fontFamily: HQA.jp, fontSize: 11, color: HQA.muted, marginTop: 1 }}>{n.s}</div>
            </div>
            <span style={{ fontFamily: HQA.mono, fontSize: 9.5, color: HQA.faint }}>{n.w}</span>
          </div>
        ))}
      </div>

      <button style={{
        background: HQA.accent, color: '#fff',
        border: 'none', borderRadius: 999, padding: '14px',
        fontFamily: HQA.jp, fontSize: 14, fontWeight: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Icon name="plus" size={15} /> 新しいイベントを作る
      </button>
    </div>
    <MobileTabBar active="home" />
  </div>
);

const MobileEventsList = () => (
  <div style={{ width: MOBILE_W, height: 760, display: 'flex', flexDirection: 'column', background: HQA.paper, fontFamily: HQA.jp }}>
    <MobileTopBar title="イベント" action={<Icon name="plus" size={20} color={HQA.accent} />} />
    {/* segment */}
    <div style={{ display: 'flex', gap: 0, padding: '10px 16px 8px', borderBottom: `1px solid ${HQA.hairlineSoft}` }}>
      {[
        { l: '今後', n: 6, a: true },
        { l: '下書き', n: 2 },
        { l: '終了', n: 38 },
      ].map((s, i) => (
        <div key={i} style={{
          flex: 1, padding: '7px 0', textAlign: 'center',
          fontFamily: HQA.jp, fontSize: 12, fontWeight: s.a ? 600 : 400,
          color: s.a ? HQA.ink : HQA.muted,
          borderBottom: `2px solid ${s.a ? HQA.accent : 'transparent'}`,
          marginBottom: -1,
        }}>
          {s.l} <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, marginLeft: 4 }}>{s.n}</span>
        </div>
      ))}
    </div>
    <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { d: '04 / 28', dow: '月', t: 'ゆる練 vol.42',  v: '亀戸スポーツセンター', tm: '19:30 – 21:30', b: 16, c: 18, st: 'warn' },
        { d: '05 / 05', dow: '月', t: 'GW 特別練習',   v: '東陽町コミュニティ',   tm: '10:00 – 13:00', b: 24, c: 24, w: 3, st: 'danger' },
        { d: '05 / 12', dow: '月', t: 'ゆる練 vol.43',  v: '亀戸スポーツセンター', tm: '19:30 – 21:30', b: 11, c: 18, st: 'success' },
        { d: '05 / 19', dow: '月', t: 'ゆる練 vol.44',  v: '亀戸スポーツセンター', tm: '19:30 – 21:30', b: 4,  c: 18, st: 'success' },
        { d: '05 / 26', dow: '月', t: 'ゆる練 vol.45',  v: '深川北スポーツセンター',tm: '20:00 – 22:00', b: 0,  c: 16, draft: true },
      ].map((e, i) => (
        <div key={i} style={{
          background: HQA.surface, border: `1px solid ${HQA.hairline}`,
          borderRadius: HQA.radius, padding: 14,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: HQA.mono, fontSize: 11.5, color: HQA.ink, letterSpacing: 1, fontWeight: 500 }}>{e.d}</span>
            <span style={{ fontFamily: HQA.mono, fontSize: 9, color: HQA.muted, letterSpacing: 1.5 }}>{e.dow}</span>
            <span style={{ marginLeft: 'auto' }}>
              {e.draft ? <ABadge tone="draft" dot>下書き</ABadge> : <ABadge tone="success" dot>公開中</ABadge>}
            </span>
          </div>
          <div style={{ fontFamily: HQA.jp, fontSize: 14.5, fontWeight: 500, color: HQA.ink }}>{e.t}</div>
          <div style={{ fontFamily: HQA.jp, fontSize: 11.5, color: HQA.muted }}>{e.v} · {e.tm}</div>
          {!e.draft && <RemainBar booked={e.b} capacity={e.c} waitlist={e.w || 0} height={6} />}
        </div>
      ))}
    </div>
    <MobileTabBar active="events" />
  </div>
);

const MobileBookings = () => (
  <div style={{ width: MOBILE_W, height: 760, display: 'flex', flexDirection: 'column', background: HQA.paper, fontFamily: HQA.jp }}>
    <MobileTopBar title="ゆる練 vol.42" back action={<Icon name="more" size={20} color={HQA.muted} />} />
    {/* event header */}
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${HQA.hairlineSoft}`, background: HQA.paperWarm }}>
      <div style={{ fontFamily: HQA.mono, fontSize: 10.5, color: HQA.muted, letterSpacing: 1.4 }}>04 / 28 月 · 19:30 – 21:30</div>
      <div style={{ fontFamily: HQA.jp, fontSize: 13, color: HQA.inkSoft, marginTop: 4 }}>亀戸スポーツセンター</div>
      <div style={{ marginTop: 12 }}>
        <RemainBar booked={16} capacity={18} waitlist={0} height={8} />
      </div>
    </div>
    {/* tabs */}
    <div style={{ display: 'flex', padding: '10px 16px 0', borderBottom: `1px solid ${HQA.hairlineSoft}`, gap: 0 }}>
      {[
        { l: '参加者', n: 16, a: true },
        { l: 'キャンセル待ち', n: 0 },
        { l: 'チェックイン' },
      ].map((s, i) => (
        <div key={i} style={{
          padding: '8px 12px',
          fontFamily: HQA.jp, fontSize: 12, fontWeight: s.a ? 600 : 400,
          color: s.a ? HQA.ink : HQA.muted,
          borderBottom: `2px solid ${s.a ? HQA.accent : 'transparent'}`,
          marginBottom: -1,
        }}>
          {s.l}{s.n != null && <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, marginLeft: 4 }}>{s.n}</span>}
        </div>
      ))}
    </div>
    {/* list */}
    <div style={{ flex: 1, overflow: 'auto' }}>
      {PARTICIPANTS.slice(0, 6).map((p, i) => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          borderBottom: `1px solid ${HQA.hairlineSoft}`,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%',
            background: HQA.paperWarm, border: `1px solid ${HQA.hairline}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: HQA.jp, fontSize: 12, color: HQA.inkSoft, fontWeight: 500,
          }}>{p.name.charAt(0)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: HQA.jp, fontSize: 13.5, fontWeight: 500, color: HQA.ink }}>{p.name}</span>
              {p.first && <ABadge tone="accent">初回</ABadge>}
            </div>
            <div style={{ fontFamily: HQA.jp, fontSize: 11, color: HQA.muted, marginTop: 2 }}>
              {p.exp}{p.guests > 0 && ` · 同伴 +${p.guests}`} · {p.when}
            </div>
          </div>
          {p.ck
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: HQA.success, fontFamily: HQA.jp, fontSize: 11 }}>
                <Icon name="check" size={12} strokeWidth={2.5} /> 済
              </span>
            : <Icon name="chevron-right" size={16} color={HQA.muted} />}
        </div>
      ))}
    </div>
    <MobileTabBar active="events" />
  </div>
);

const MobileCheckin = () => (
  <div style={{ width: MOBILE_W, height: 760, display: 'flex', flexDirection: 'column', background: HQA.paper, fontFamily: HQA.jp }}>
    <MobileTopBar title="チェックイン" back action={<Icon name="search" size={18} color={HQA.muted} />} />
    {/* progress */}
    <div style={{ padding: '14px 16px', background: HQA.paperWarm, borderBottom: `1px solid ${HQA.hairlineSoft}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 1.4 }}>04 / 28 月 · ゆる練 vol.42</div>
          <div style={{ fontFamily: HQA.jp, fontSize: 17, fontWeight: 600, color: HQA.ink, marginTop: 2 }}>
            <span style={{ color: HQA.accent }}>4</span> <span style={{ color: HQA.muted, fontSize: 14 }}>/ 16 名</span>
          </div>
        </div>
        <ABtn variant="ghost" size="sm">全選択</ABtn>
      </div>
      <div style={{ marginTop: 10, height: 8, background: HQA.hairlineSoft, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: '25%', height: '100%', background: HQA.accent }} />
      </div>
    </div>
    {/* list with big tap targets */}
    <div style={{ flex: 1, overflow: 'auto' }}>
      {PARTICIPANTS.slice(0, 7).map((p, i) => {
        const ck = i < 4;
        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '18px 16px',
            borderBottom: `1px solid ${HQA.hairlineSoft}`,
            background: ck ? HQA.successSoft : 'transparent',
          }}>
            {/* big checkbox 28px tap */}
            <span style={{
              width: 28, height: 28, borderRadius: 6,
              border: `1.5px solid ${ck ? HQA.success : HQA.hairline}`,
              background: ck ? HQA.success : HQA.surface,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {ck && <Icon name="check" size={18} color="#fff" strokeWidth={2.5} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: HQA.jp, fontSize: 15, fontWeight: 500, color: HQA.ink }}>{p.name}</span>
                {p.first && <ABadge tone="accent">初回</ABadge>}
              </div>
              <div style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.muted, marginTop: 3 }}>
                {p.exp}{p.guests > 0 && ` · 同伴 +${p.guests}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

Object.assign(window, {
  ScreenMembers, ScreenVenues, ScreenSettings, ScreenNotFound,
  MobileDashboard, MobileEventsList, MobileBookings, MobileCheckin,
});
