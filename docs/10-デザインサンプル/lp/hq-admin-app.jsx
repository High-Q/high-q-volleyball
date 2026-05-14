// High Q — Admin app: design canvas with all screens as artboards.
const TWEAK_DEFAULTS_HQA = /*EDITMODE-BEGIN*/{
  "density": "compact",
  "sidebarWidth": 240,
  "radius": 6,
  "accent": "#b85c3c"
}/*EDITMODE-END*/;

function HQAdminApp() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS_HQA);

  // mutate global HQA tokens before render
  HQA.accent = tweaks.accent;
  HQA.accentSoft = hexToSoft(tweaks.accent, 0.10);
  HQA.accentInk = darken(tweaks.accent, 0.18);
  HQA.radius = tweaks.radius;
  HQA.radiusLg = tweaks.radius + 4;
  if (tweaks.density === 'compact') {
    HQA.rowH = 38; HQA.cellY = 10;
  } else if (tweaks.density === 'cozy') {
    HQA.rowH = 46; HQA.cellY = 13;
  } else {
    HQA.rowH = 54; HQA.cellY = 16;
  }

  return (
    <>
      <DesignCanvas>
        <DCSection id="auth" title="00 · Auth" subtitle="ログイン入口">
          <DCArtboard id="login" label="A · ログイン" width={1280} height={880}>
            <ScreenLogin />
          </DCArtboard>
        </DCSection>

        <DCSection id="overview" title="01 · ダッシュボード" subtitle="運営者の朝の入口">
          <DCArtboard id="dashboard" label="A · 概況" width={1280} height={920}>
            <ScreenDashboard />
          </DCArtboard>
        </DCSection>

        <DCSection id="events" title="02 · イベント一覧" subtitle="filter / sort / 一括操作 + 4 状態">
          <DCArtboard id="events-success" label="A · Success（選択 + Toast）" width={1280} height={920}>
            <div style={{ position: 'relative', width: 1280, height: 920 }}>
              <ScreenEventsList state="success" />
            </div>
          </DCArtboard>
          <DCArtboard id="events-loading" label="B · Loading" width={1280} height={920}>
            <ScreenEventsList state="loading" />
          </DCArtboard>
          <DCArtboard id="events-empty" label="C · Empty" width={1280} height={920}>
            <ScreenEventsList state="empty" />
          </DCArtboard>
          <DCArtboard id="events-error" label="D · Error" width={1280} height={920}>
            <ScreenEventsList state="error" />
          </DCArtboard>
        </DCSection>

        <DCSection id="edit" title="03 · イベント作成 / 編集" subtitle="FormSection + 公開設定">
          <DCArtboard id="event-edit" label="A · 編集（vol.43）" width={1280} height={1180}>
            <ScreenEventEdit />
          </DCArtboard>
        </DCSection>

        <DCSection id="detail" title="04 · イベント詳細・参加者管理" subtitle="サマリ + Tabs + 参加者 table">
          <DCArtboard id="event-detail" label="A · 参加者一覧" width={1280} height={980}>
            <ScreenEventDetail />
          </DCArtboard>
        </DCSection>

        <DCSection id="members" title="05 · 参加者・メンバー管理" subtitle="累計訪問者と経験レベル">
          <DCArtboard id="members" label="A · 一覧" width={1280} height={920}>
            <ScreenMembers />
          </DCArtboard>
        </DCSection>

        <DCSection id="venues" title="06 · 会場マスタ" subtitle="イベント作成時の選択肢">
          <DCArtboard id="venues" label="A · CRUD" width={1280} height={780}>
            <ScreenVenues />
          </DCArtboard>
        </DCSection>

        <DCSection id="settings" title="07 · 設定" subtitle="サークル情報 / 通知 / ポリシー">
          <DCArtboard id="settings" label="A · サークル情報" width={1280} height={1080}>
            <ScreenSettings />
          </DCArtboard>
        </DCSection>

        <DCSection id="errors" title="08 · エラー画面" subtitle="404 / 403">
          <DCArtboard id="404" label="A · 404 Not found" width={1280} height={680}>
            <ScreenNotFound kind="404" />
          </DCArtboard>
          <DCArtboard id="403" label="B · 403 Forbidden" width={1280} height={680}>
            <ScreenNotFound kind="403" />
          </DCArtboard>
        </DCSection>

        <DCSection id="mobile" title="09 · Mobile (390px)" subtitle="運営者の出先用 — ダッシュボード / イベント / 予約 / チェックイン">
          <DCArtboard id="m-dashboard" label="A · ダッシュボード" width={430} height={840}>
            <IOSDevice width={430} height={840}><MobileDashboard /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="m-events" label="B · イベント一覧" width={430} height={840}>
            <IOSDevice width={430} height={840}><MobileEventsList /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="m-bookings" label="C · 予約一覧" width={430} height={840}>
            <IOSDevice width={430} height={840}><MobileBookings /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="m-checkin" label="D · チェックイン" width={430} height={840}>
            <IOSDevice width={430} height={840}><MobileCheckin /></IOSDevice>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Density">
          <TweakRadio
            label="テーブル密度"
            value={tweaks.density}
            onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'cozy',    label: 'Cozy' },
              { value: 'roomy',   label: 'Roomy' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Layout">
          <TweakSlider label="サイドバー幅" value={tweaks.sidebarWidth} min={200} max={280} step={4} unit="px"
            onChange={(v) => setTweak('sidebarWidth', v)} />
          <TweakSlider label="角丸" value={tweaks.radius} min={0} max={14} step={1} unit="px"
            onChange={(v) => setTweak('radius', v)} />
        </TweakSection>
        <TweakSection title="Color">
          <TweakColor label="アクセント" value={tweaks.accent} onChange={(v) => setTweak('accent', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// utilities
function hexToSoft(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function darken(hex, amt) {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amt)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amt)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amt)));
  return `#${[r,g,b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<HQAdminApp />);
