// High Q — Admin screens. Each exported as a fixed-size desktop frame
// suitable for a DCArtboard. Width = 1280, sidebar 240, content 1040.

const W = 1280;
const SIDEBAR = 240;
const CONTENT_BG = HQA.paper;

// shared frame: sidebar + main column
const Frame = ({ active, children, height = 880 }) => (
  <div style={{
    width: W, height, display: 'flex',
    background: HQA.paper, color: HQA.ink,
    fontFamily: HQA.jp, overflow: 'hidden',
    border: `1px solid ${HQA.hairline}`,
  }}>
    <SidebarNav active={active} width={SIDEBAR} />
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      {children}
    </main>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 0. Login
// ─────────────────────────────────────────────────────────────
const ScreenLogin = () => (
  <div style={{
    width: W, height: 880, display: 'flex',
    background: HQA.paper, fontFamily: HQA.jp,
    border: `1px solid ${HQA.hairline}`, overflow: 'hidden',
  }}>
    {/* left: brand */}
    <div style={{
      width: 540, background: HQA.paperWarm,
      borderRight: `1px solid ${HQA.hairline}`,
      padding: '56px 56px', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: '"Shippori Mincho", serif', fontSize: 30, fontWeight: 600, color: HQA.ink, letterSpacing: 1.5 }}>High Q</span>
        <span style={{ fontFamily: HQA.mono, fontSize: 10, letterSpacing: 2.4, color: HQA.muted }}>EST.21 · ADMIN</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        <AKicker color={HQA.accent}>— Internal console</AKicker>
        <h2 style={{ margin: 0, fontFamily: HQA.jp, fontSize: 26, fontWeight: 600, lineHeight: 1.5, color: HQA.ink }}>
          サークル運営の<br />ちいさな道具箱。
        </h2>
        <p style={{ margin: 0, fontFamily: HQA.jp, fontSize: 13, lineHeight: 1.8, color: HQA.inkSoft, maxWidth: 360 }}>
          イベントの公開、参加者の管理、当日のチェックイン。<br />
          High Q を運営するための画面です。<br />
          オーナーのみがアクセスできます。
        </p>
      </div>
      <div style={{ display: 'flex', gap: 14, fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 1.5 }}>
        <span>v 0.4.2</span>
        <span>·</span>
        <span>build 2026.04</span>
      </div>
    </div>
    {/* right: form */}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 380 }}>
        <AKicker style={{ marginBottom: 12 }}>— Sign in</AKicker>
        <h3 style={{ margin: 0, fontFamily: HQA.jp, fontSize: 20, fontWeight: 600, color: HQA.ink }}>ログイン</h3>
        <p style={{ margin: '8px 0 28px', fontFamily: HQA.jp, fontSize: 12.5, color: HQA.muted }}>
          登録済みのオーナーアカウントでサインインしてください。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <ALabel>メールアドレス</ALabel>
            <AInput value="owner@high-q.club" icon={<Icon name="mail" size={14} />} />
          </div>
          <div>
            <ALabel hint="忘れた場合は再発行">パスワード</ALabel>
            <AInput value="••••••••••" type="password" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
            <Checkbox label="ログイン状態を保持" checked />
            <a href="#" style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.accentInk, textDecoration: 'none' }}>パスワードを忘れた</a>
          </div>
          <div style={{ marginTop: 8 }}><ABtn variant="primary" full>サインイン</ABtn></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
            <span style={{ flex: 1, height: 1, background: HQA.hairline }} />
            <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 2 }}>OR</span>
            <span style={{ flex: 1, height: 1, background: HQA.hairline }} />
          </div>
          <ABtn variant="secondary" full icon={<Icon name="mailcheck" size={14} />}>マジックリンクで送る</ABtn>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// 1. Dashboard
// ─────────────────────────────────────────────────────────────
const RECENT_BOOKINGS = [
  { who: '田中 美咲', evt: 'ゆる練 vol.42', when: '2 分前',  exp: '初回',   tone: 'accent' },
  { who: '佐藤 健太', evt: 'ゆる練 vol.42', when: '17 分前', exp: '経験者' },
  { who: '中村 あかり', evt: 'ゆる練 vol.43', when: '1 時間前', exp: '中級' },
  { who: '高橋 直樹', evt: 'ゆる練 vol.42', when: '3 時間前', exp: '初回',  tone: 'accent' },
  { who: '木下 ゆうな', evt: 'ゆる練 vol.41', when: '昨日',    exp: '中級', cancel: true },
];

const ScreenDashboard = () => (
  <Frame active="dashboard" height={920}>
    <TopBar
      title="ダッシュボード"
      subtitle="2026 年 4 月 — 直近のサークル運営状況"
      actions={<>
        <ABtn variant="secondary" size="sm" icon={<Icon name="refresh" size={13} />}>更新</ABtn>
        <ABtn variant="primary" size="sm" icon={<Icon name="plus" size={14} />}>新しいイベント</ABtn>
      </>}
    />
    <div style={{ flex: 1, overflow: 'auto', background: HQA.paper }}>
      {/* stat row */}
      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard kicker="01" label="今後のイベント" value="6" unit="件" delta="+2" deltaTone="up" sub="2 件は満員" accent />
        <StatCard kicker="02" label="累計参加者" value="184" unit="名" delta="+12" deltaTone="up" sub="今月" />
        <StatCard kicker="03" label="今月の参加費合計" value="¥84,500" delta="+18%" deltaTone="up" sub="vs 先月" />
        <StatCard kicker="04" label="平均充足率" value="87" unit="%" delta="-3%" deltaTone="down" sub="3 ヶ月" />
      </div>

      {/* upcoming + notifications */}
      <div style={{ padding: '0 32px 24px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>
        {/* upcoming */}
        <div style={{ background: HQA.surface, border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radiusLg, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div>
              <AKicker style={{ marginBottom: 4 }}>— Next up</AKicker>
              <h3 style={{ margin: 0, fontFamily: HQA.jp, fontSize: 16, fontWeight: 600 }}>直近のイベント</h3>
            </div>
            <a href="#" className="hqa-link" style={{ fontFamily: HQA.jp, fontSize: 12 }}>全件を見る ›</a>
          </div>
          {[
            { date: '04 / 28', day: '月', title: 'ゆる練 vol.42', venue: '亀戸スポーツセンター', time: '19:30 – 21:30', booked: 16, cap: 18, wait: 0, tone: 'warn' },
            { date: '05 / 05', day: '月', title: 'GW 特別練習', venue: '東陽町コミュニティ', time: '10:00 – 13:00', booked: 24, cap: 24, wait: 3, tone: 'danger' },
            { date: '05 / 12', day: '月', title: 'ゆる練 vol.43', venue: '亀戸スポーツセンター', time: '19:30 – 21:30', booked: 11, cap: 18, wait: 0, tone: 'success' },
          ].map((e, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '64px 1fr 220px',
              alignItems: 'center', gap: 18,
              padding: '14px 4px',
              borderTop: i === 0 ? 'none' : `1px solid ${HQA.hairlineSoft}`,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: HQA.mono, fontSize: 13, color: HQA.ink, letterSpacing: 1 }}>{e.date}</div>
                <div style={{ fontFamily: HQA.mono, fontSize: 9, color: HQA.muted, letterSpacing: 2, marginTop: 2 }}>{e.day}</div>
              </div>
              <div>
                <div style={{ fontFamily: HQA.jp, fontSize: 14, fontWeight: 500, color: HQA.ink }}>{e.title}</div>
                <div style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.muted, marginTop: 3 }}>
                  {e.venue} · {e.time}
                </div>
              </div>
              <RemainBar booked={e.booked} capacity={e.cap} waitlist={e.wait} />
            </div>
          ))}
        </div>

        {/* notifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: HQA.surface, border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radiusLg, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Icon name="bell" size={14} color={HQA.accent} />
              <AKicker>— Notifications</AKicker>
              <span style={{ marginLeft: 'auto', fontFamily: HQA.mono, fontSize: 10, color: HQA.muted }}>3 件</span>
            </div>
            {[
              { tone: 'danger',  ttl: 'メール送信失敗', body: '木下 ゆうな 様（vol.41）',     when: '12:34' },
              { tone: 'warn',    ttl: '満員直前',     body: 'ゆる練 vol.42 残 2 席',         when: '11:08' },
              { tone: 'neutral', ttl: 'キャンセル',   body: '木下 ゆうな 様（vol.41）',       when: '昨日' },
            ].map((n, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '12px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${HQA.hairlineSoft}`,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', marginTop: 7,
                  background: n.tone === 'danger' ? HQA.danger : n.tone === 'warn' ? HQA.warn : HQA.muted,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: HQA.jp, fontSize: 12.5, color: HQA.ink, fontWeight: 500 }}>{n.ttl}</div>
                  <div style={{ fontFamily: HQA.jp, fontSize: 11.5, color: HQA.muted, marginTop: 2 }}>{n.body}</div>
                </div>
                <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.faint, letterSpacing: 1 }}>{n.when}</span>
              </div>
            ))}
          </div>

          {/* recent bookings */}
          <div style={{ background: HQA.surface, border: `1px solid ${HQA.hairline}`, borderRadius: HQA.radiusLg, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Icon name="users" size={14} color={HQA.accent} />
              <AKicker>— Recent bookings</AKicker>
            </div>
            {RECENT_BOOKINGS.slice(0, 4).map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${HQA.hairlineSoft}`,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: HQA.paperWarm, border: `1px solid ${HQA.hairline}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: HQA.jp, fontSize: 10.5, color: HQA.inkSoft, fontWeight: 500,
                }}>{b.who.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: HQA.jp, fontSize: 12.5, color: HQA.ink }}>
                    {b.who} {b.tone && <ABadge tone="accent">初回</ABadge>}
                    {b.cancel && <ABadge tone="danger">キャンセル</ABadge>}
                  </div>
                  <div style={{ fontFamily: HQA.jp, fontSize: 11, color: HQA.muted, marginTop: 1 }}>{b.evt}</div>
                </div>
                <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.faint }}>{b.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Frame>
);

// ─────────────────────────────────────────────────────────────
// 2. Events list
// ─────────────────────────────────────────────────────────────
const EVENTS = [
  { id: 'e42', date: '04 / 28', dow: '月', title: 'ゆる練 vol.42',          venue: '亀戸スポーツセンター',     time: '19:30 – 21:30', cap: 18, booked: 16, status: 'published' },
  { id: 'e43', date: '05 / 05', dow: '月', title: 'GW 特別練習',           venue: '東陽町コミュニティセンター', time: '10:00 – 13:00', cap: 24, booked: 24, status: 'published', wait: 3 },
  { id: 'e44', date: '05 / 12', dow: '月', title: 'ゆる練 vol.43',          venue: '亀戸スポーツセンター',     time: '19:30 – 21:30', cap: 18, booked: 11, status: 'published' },
  { id: 'e45', date: '05 / 19', dow: '月', title: 'ゆる練 vol.44',          venue: '亀戸スポーツセンター',     time: '19:30 – 21:30', cap: 18, booked: 4,  status: 'published' },
  { id: 'e46', date: '05 / 26', dow: '月', title: 'ゆる練 vol.45',          venue: '深川北スポーツセンター',   time: '20:00 – 22:00', cap: 16, booked: 0,  status: 'draft' },
  { id: 'e47', date: '06 / 02', dow: '月', title: 'ビギナー DAY',           venue: '亀戸スポーツセンター',     time: '19:00 – 21:00', cap: 14, booked: 0,  status: 'draft' },
  { id: 'e41', date: '04 / 21', dow: '月', title: 'ゆる練 vol.41',          venue: '亀戸スポーツセンター',     time: '19:30 – 21:30', cap: 18, booked: 18, status: 'closed' },
  { id: 'e40', date: '04 / 14', dow: '月', title: 'ゆる練 vol.40 記念会',   venue: '東陽町コミュニティセンター', time: '19:00 – 22:00', cap: 30, booked: 28, status: 'closed' },
];

const statusBadge = (s) => {
  if (s === 'published') return <ABadge tone="success" dot>公開中</ABadge>;
  if (s === 'draft')     return <ABadge tone="draft" dot>下書き</ABadge>;
  if (s === 'closed')    return <ABadge tone="neutral">終了</ABadge>;
};

const eventsColumns = [
  { key: 'date', label: '日付', width: '110px', mono: true, render: r => <span><span style={{ color: HQA.ink, fontWeight: 500 }}>{r.date}</span> <span style={{ color: HQA.muted, marginLeft: 4 }}>{r.dow}</span></span>, sort: true },
  { key: 'title', label: 'タイトル', width: '1.4fr', bold: true, render: r => <span style={{ color: HQA.ink, fontWeight: 500 }}>{r.title}</span> },
  { key: 'venue', label: '会場', width: '1.4fr', muted: true },
  { key: 'time', label: '時間', width: '120px', mono: true, muted: true },
  { key: 'cap', label: '定員', width: '70px', align: 'right', mono: true, muted: true },
  { key: 'booked', label: '予約 / 残席', width: '160px', render: r => <RemainBar booked={r.booked} capacity={r.cap} waitlist={r.wait || 0} showLegend height={6} /> },
  { key: 'status', label: 'ステータス', width: '110px', render: r => statusBadge(r.status), sort: true },
  { key: 'actions', label: '', width: '60px', align: 'right', render: () => (
    <div style={{ display: 'flex', gap: 4, color: HQA.muted }}>
      <Icon name="edit" size={14} />
      <Icon name="more" size={14} />
    </div>
  ) },
];

const ScreenEventsList = ({ state = 'success' }) => (
  <Frame active="events" height={920}>
    <TopBar
      title="イベント"
      breadcrumb={['Workspace', 'イベント']}
      actions={<>
        <ABtn variant="secondary" size="sm" icon={<Icon name="copy" size={13} />}>過去から複製</ABtn>
        <ABtn variant="primary" size="sm" icon={<Icon name="plus" size={14} />}>新規作成</ABtn>
      </>}
    />
    <Toolbar
      right={<>
        <ABtn variant="ghost" size="sm" icon={<Icon name="download" size={13} />}>CSV</ABtn>
      </>}
    >
      <div style={{ width: 240 }}>
        <AInput placeholder="タイトル・会場で検索…" icon={<Icon name="search" size={14} />} />
      </div>
      <ASelect placeholder="期間: すべて" options={['今後', '今月', '先月', '過去すべて']} style={{ width: 130 }} />
      <ASelect placeholder="会場: すべて" options={['亀戸スポーツセンター', '東陽町コミュニティ', '深川北スポーツセンター']} style={{ width: 200 }} />
      <ASelect placeholder="ステータス" options={['公開中', '下書き', '終了']} style={{ width: 130 }} />
      <span style={{ marginLeft: 'auto', fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 1 }}>
        FILTERS · {state === 'empty' ? '0' : '8'} EVENTS
      </span>
    </Toolbar>

    {/* selection bar (when 2+ selected) */}
    {state === 'success' && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 32px',
        background: HQA.accentSoft, color: HQA.accentInk,
        borderBottom: `1px solid ${HQA.hairlineSoft}`,
        fontFamily: HQA.jp, fontSize: 12.5,
      }}>
        <Icon name="check" size={13} color={HQA.accent} strokeWidth={2.5} />
        <span><b>2 件</b>選択中</span>
        <span style={{ flex: 1 }} />
        <ABtn variant="ghost" size="sm">一括公開</ABtn>
        <ABtn variant="ghost" size="sm">一括終了</ABtn>
        <ABtn variant="ghost" size="sm" icon={<Icon name="x" size={13} />}>解除</ABtn>
      </div>
    )}

    <div style={{ flex: 1, overflow: 'auto', background: HQA.paper, paddingTop: 16 }}>
      {state === 'success' && (
        <DataTable columns={eventsColumns} rows={EVENTS} selectedIds={['e42', 'e43']} hoverRow={3} sortBy="date" sortDir="asc" />
      )}
      {state === 'loading' && (
        <DataTable columns={eventsColumns} rows={Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`,
          date: <SkelBar w={50} h={11} />,
          title: <SkelBar w={['70%', '60%', '80%', '50%'][i % 4]} h={11} />,
          venue: <SkelBar w="65%" h={11} />,
          time: <SkelBar w={60} h={11} />,
          cap: <SkelBar w={28} h={11} />,
          booked: <SkelBar w="80%" h={6} />,
          status: <SkelBar w={56} h={14} style={{ borderRadius: 999 }} />,
          actions: <SkelBar w={30} h={11} />,
        }))} selectable={false} />
      )}
      {state === 'empty' && (
        <div style={{
          margin: '60px 32px', padding: '64px 24px',
          textAlign: 'center', background: HQA.surface,
          border: `1px dashed ${HQA.hairline}`, borderRadius: HQA.radiusLg,
        }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 18px',
            borderRadius: '50%', background: HQA.paperWarm,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: HQA.muted,
          }}><Icon name="calendar" size={22} /></div>
          <AKicker style={{ marginBottom: 8 }}>— Empty</AKicker>
          <h3 style={{ margin: 0, fontFamily: HQA.jp, fontSize: 17, fontWeight: 600, color: HQA.ink }}>イベントがまだありません</h3>
          <p style={{ margin: '8px 0 22px', fontFamily: HQA.jp, fontSize: 13, color: HQA.muted }}>
            最初のイベントを作るか、テンプレートから複製してください。
          </p>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <ABtn variant="secondary" size="sm" icon={<Icon name="copy" size={13} />}>テンプレートから</ABtn>
            <ABtn variant="primary" size="sm" icon={<Icon name="plus" size={14} />}>新規作成</ABtn>
          </div>
        </div>
      )}
      {state === 'error' && (
        <div style={{
          margin: '60px 32px', padding: '48px 24px',
          textAlign: 'center', background: HQA.surface,
          border: `1px solid ${HQA.dangerSoft}`, borderLeft: `3px solid ${HQA.danger}`,
          borderRadius: HQA.radiusLg,
        }}>
          <Icon name="alert" size={26} color={HQA.danger} />
          <h3 style={{ margin: '12px 0 0', fontFamily: HQA.jp, fontSize: 16, fontWeight: 600, color: HQA.ink }}>
            イベントを読み込めませんでした
          </h3>
          <p style={{ margin: '6px 0 18px', fontFamily: HQA.jp, fontSize: 13, color: HQA.muted }}>
            ネットワークが不安定なようです。少し待ってから再試行してください。
          </p>
          <div style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.faint, marginBottom: 18, letterSpacing: 1 }}>
            ERR · supabase / events.list · 503
          </div>
          <ABtn variant="primary" size="sm" icon={<Icon name="refresh" size={13} />}>再試行</ABtn>
        </div>
      )}
    </div>

    {state === 'success' && <Pagination page={1} total={3} per={25} count={62} />}

    {/* success toast */}
    {state === 'success' && (
      <div style={{ position: 'absolute', right: 24, bottom: 24 }}>
        <Toast tone="success" title="ゆる練 vol.43 を公開しました" body="LP に反映されるまで最大 30 秒かかります" />
      </div>
    )}
  </Frame>
);

// ─────────────────────────────────────────────────────────────
// 3. Event edit
// ─────────────────────────────────────────────────────────────
const ScreenEventEdit = () => (
  <Frame active="events" height={1180}>
    <TopBar
      title="ゆる練 vol.43 を編集"
      breadcrumb={['イベント', '05 / 12 月', 'ゆる練 vol.43']}
      actions={<>
        <ABtn variant="ghost" size="sm">プレビュー</ABtn>
        <ABtn variant="danger" size="sm" icon={<Icon name="trash" size={13} />}>削除</ABtn>
        <ABtn variant="secondary" size="sm">下書き保存</ABtn>
        <ABtn variant="primary" size="sm" icon={<Icon name="check" size={13} />}>公開</ABtn>
      </>}
    />
    <div style={{ flex: 1, overflow: 'auto', background: HQA.paper }}>
      <div style={{ padding: '8px 32px 60px' }}>
        <FormSection
          kicker="01"
          title="基本情報"
          hint="LP・予約サイトに表示される項目。「ゆる練 vol.XX」のテンプレ補完を使うと連番を自動入力できます。"
        >
          <div>
            <ALabel required hint="自動: vol.43">タイトル</ALabel>
            <AInput value="ゆる練 vol.43" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <ALabel required>開催日</ALabel>
              <AInput value="2026 / 05 / 12 (月)" icon={<Icon name="calendar" size={14} />} />
            </div>
            <div>
              <ALabel required>開始</ALabel>
              <AInput value="19:30" />
            </div>
            <div>
              <ALabel required>終了</ALabel>
              <AInput value="21:30" />
            </div>
          </div>
          <div>
            <ALabel required>会場</ALabel>
            <ASelect value="kameido" options={[
              { value: 'kameido', label: '亀戸スポーツセンター — 江東区亀戸 2-1-1' },
              { value: 'toyo', label: '東陽町コミュニティセンター — 江東区東陽 4-11-3' },
              { value: 'fukagawa', label: '深川北スポーツセンター — 江東区平野 1-2-3' },
              { value: 'new', label: '＋ 新しい会場を追加' },
            ]} />
          </div>
        </FormSection>

        <FormSection kicker="02" title="募集要項" hint="定員と参加費。500 / 1,000 円の通常価格を選ぶか自由入力。">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <ALabel required>定員</ALabel>
              <AInput value="18" suffix="名" />
            </div>
            <div>
              <ALabel required>参加費</ALabel>
              <AInput value="1000" suffix="円" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ABadge tone="neutral">¥500</ABadge>
            <ABadge tone="accent" dot>¥1,000</ABadge>
            <ABadge tone="neutral">自由入力</ABadge>
          </div>
          <div>
            <ALabel hint="任意">キャンセル期限</ALabel>
            <AInput value="2026 / 05 / 11 (日) 12:00" icon={<Icon name="calendar" size={14} />} />
          </div>
        </FormSection>

        <FormSection kicker="03" title="紹介文" hint="markdown 対応。LP のイベント詳細・予約完了メールに表示されます。">
          <ATextarea rows={8} value={`今月もゆる〜く集まって練習しましょう。\n\n— サーブ・レシーブ・スパイクの基礎を中心に、後半は試合形式で軽くゲーム。\n— 初参加の方は 19:00 から個別オリエンを行います。\n— ボールはこちらで用意します。動きやすい服装でお越しください。`} />
        </FormSection>

        <FormSection kicker="04" title="サムネイル" hint="LP の一覧と予約完了メールで使われます（推奨 1600×900）。">
          <div style={{
            width: 360, height: 200, borderRadius: HQA.radius,
            background: `repeating-linear-gradient(135deg, rgba(31,29,26,0.06) 0 1px, transparent 1px 9px), linear-gradient(180deg, #d9cfbe 0%, #c8bba6 100%)`,
            border: `1px dashed ${HQA.hairline}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <ABtn variant="secondary" size="sm" icon={<Icon name="plus" size={13} />}>画像をアップロード</ABtn>
            <span style={{ position: 'absolute', bottom: 8, right: 10, fontFamily: HQA.mono, fontSize: 9, color: 'rgba(31,29,26,0.45)', letterSpacing: 1.4 }}>
              [ THUMBNAIL · 16:9 ]
            </span>
          </div>
        </FormSection>

        <FormSection kicker="05" title="公開設定">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: '公開する', sub: 'LP・予約サイトに表示。すぐ予約を受付ける', sel: true, tone: 'success' },
              { label: '下書き', sub: 'チームのみ閲覧可。LP には出ない', sel: false },
              { label: '予約者を非公開（限定）', sub: '直リンクの人だけ予約できる', sel: false },
            ].map((o, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: 14,
                background: o.sel ? HQA.accentSoft : HQA.surface,
                border: `1px solid ${o.sel ? HQA.accent : HQA.hairline}`,
                borderRadius: HQA.radius,
                cursor: 'pointer',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${o.sel ? HQA.accent : HQA.hairline}`,
                  background: HQA.surface, position: 'relative', marginTop: 2,
                }}>
                  {o.sel && <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: HQA.accent }} />}
                </span>
                <div>
                  <div style={{ fontFamily: HQA.jp, fontSize: 13, fontWeight: 500, color: HQA.ink }}>{o.label}</div>
                  <div style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.muted, marginTop: 2 }}>{o.sub}</div>
                </div>
              </label>
            ))}
          </div>
        </FormSection>
      </div>
    </div>
  </Frame>
);

// ─────────────────────────────────────────────────────────────
// 4. Event detail (participants)
// ─────────────────────────────────────────────────────────────
const PARTICIPANTS = [
  { id: 'p1', name: '田中 美咲',     exp: '初回',   guests: 0, when: '04/27 14:32', email: 'misaki.t@example.com',  ck: false, first: true },
  { id: 'p2', name: '佐藤 健太',     exp: '経験者', guests: 1, when: '04/27 14:15', email: 'k.sato@example.com',    ck: true },
  { id: 'p3', name: '中村 あかり',   exp: '中級',   guests: 0, when: '04/26 22:08', email: 'akari.n@example.com',   ck: true },
  { id: 'p4', name: '高橋 直樹',     exp: '初回',   guests: 0, when: '04/26 19:44', email: 'naoki.t@example.com',   ck: false, first: true },
  { id: 'p5', name: '山口 千夏',     exp: '中級',   guests: 0, when: '04/26 12:01', email: 'chinatsu.y@example.com',ck: true },
  { id: 'p6', name: '伊藤 大輔',     exp: '経験者', guests: 0, when: '04/25 21:55', email: 'd.ito@example.com',     ck: false },
  { id: 'p7', name: '森田 千鶴',     exp: '中級',   guests: 1, when: '04/25 18:30', email: 'chizuru.m@example.com', ck: true },
  { id: 'p8', name: '岡本 龍之介',   exp: '経験者', guests: 0, when: '04/24 09:12', email: 'r.okamoto@example.com', ck: false },
];

const partColumns = [
  { key: 'name', label: '名前', width: '1fr', render: r => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        background: HQA.paperWarm, border: `1px solid ${HQA.hairline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: HQA.jp, fontSize: 10, color: HQA.inkSoft,
      }}>{r.name.charAt(0)}</span>
      <span style={{ color: HQA.ink, fontWeight: 500 }}>{r.name}</span>
      {r.first && <ABadge tone="accent">初回</ABadge>}
    </span>
  ) },
  { key: 'exp', label: '経験', width: '90px', render: r => <ABadge tone={r.exp === '経験者' ? 'success' : r.exp === '中級' ? 'accent' : 'neutral'}>{r.exp}</ABadge> },
  { key: 'guests', label: '同伴', width: '70px', mono: true, align: 'right', render: r => r.guests > 0 ? `+${r.guests}` : '–' },
  { key: 'when', label: '予約日時', width: '130px', mono: true, muted: true },
  { key: 'email', label: 'メール', width: '1.2fr', mono: true, muted: true },
  { key: 'ck', label: 'チェックイン', width: '120px', render: r => r.ck
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: HQA.success, fontFamily: HQA.jp, fontSize: 12 }}>
        <Icon name="check" size={13} strokeWidth={2.5} /> 済
      </span>
    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: HQA.muted, fontFamily: HQA.jp, fontSize: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, border: `1px solid ${HQA.hairline}` }} /> 未
      </span> },
  { key: 'actions', label: '', width: '60px', align: 'right', render: () => (
    <div style={{ color: HQA.muted, display: 'flex', gap: 6 }}>
      <Icon name="edit" size={14} />
      <Icon name="more" size={14} />
    </div>
  ) },
];

const ScreenEventDetail = () => (
  <Frame active="events" height={980}>
    <TopBar
      title="ゆる練 vol.42"
      breadcrumb={['イベント', '04 / 28 月']}
      subtitle="2026 / 04 / 28 月 · 19:30 – 21:30 · 亀戸スポーツセンター"
      actions={<>
        <ABtn variant="ghost" size="sm" icon={<Icon name="download" size={13} />}>CSV</ABtn>
        <ABtn variant="secondary" size="sm" icon={<Icon name="mail" size={13} />}>一括メール</ABtn>
        <ABtn variant="primary" size="sm" icon={<Icon name="edit" size={13} />}>編集</ABtn>
      </>}
    />

    {/* event summary card */}
    <div style={{ padding: '20px 32px 0', background: HQA.paper }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        background: HQA.surface, border: `1px solid ${HQA.hairline}`,
        borderRadius: HQA.radiusLg, overflow: 'hidden',
      }}>
        {[
          { k: '01', l: '残席', v: '2', u: '/ 18' },
          { k: '02', l: 'チェックイン', v: '4', u: '/ 16' },
          { k: '03', l: '初回参加', v: '2', u: '名' },
          { k: '04', l: 'キャンセル待ち', v: '0', u: '名' },
        ].map((s, i, a) => (
          <div key={i} style={{
            padding: '18px 22px',
            borderRight: i < a.length - 1 ? `1px solid ${HQA.hairlineSoft}` : 'none',
          }}>
            <AKicker style={{ marginBottom: 6 }}>— {s.k}</AKicker>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: HQA.jp, fontSize: 24, fontWeight: 600, color: HQA.ink }}>{s.v}</span>
              <span style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.muted }}>{s.u}</span>
            </div>
            <div style={{ fontFamily: HQA.jp, fontSize: 12, color: HQA.muted, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <RemainBar booked={16} capacity={18} waitlist={0} height={10} />
      </div>
    </div>

    <div style={{ marginTop: 18 }}>
      <Tabs active="participants" items={[
        { id: 'participants', label: '参加者一覧', count: 16 },
        { id: 'wait',         label: 'キャンセル待ち', count: 0 },
        { id: 'checkin',      label: '当日チェックイン' },
      ]} />
    </div>

    <Toolbar
      right={<>
        <span style={{ fontFamily: HQA.mono, fontSize: 10, color: HQA.muted, letterSpacing: 1 }}>
          {16} 名 · {4} 名チェックイン済
        </span>
      </>}
    >
      <div style={{ width: 240 }}>
        <AInput placeholder="名前・メールで検索…" icon={<Icon name="search" size={14} />} />
      </div>
      <ASelect placeholder="経験: すべて" options={['初回', '中級', '経験者']} style={{ width: 130 }} />
      <ASelect placeholder="状態: すべて" options={['未チェックイン', 'チェックイン済']} style={{ width: 150 }} />
    </Toolbar>

    <div style={{ flex: 1, overflow: 'auto', background: HQA.paper, paddingTop: 16 }}>
      <DataTable columns={partColumns} rows={PARTICIPANTS} selectedIds={['p2']} hoverRow={2} sortBy="when" sortDir="desc" />
    </div>
    <Pagination page={1} total={1} per={25} count={16} />
  </Frame>
);

Object.assign(window, {
  ScreenLogin, ScreenDashboard, ScreenEventsList, ScreenEventEdit, ScreenEventDetail,
});
