// High Q — Reservation site app: design canvas with mobile screens.
const TWEAK_DEFAULTS_HQR = /*EDITMODE-BEGIN*/{
  "headlineFont": "shippori",
  "bodyFont": "zen-kaku",
  "accent": "#b85c3c",
  "paperTone": "cream"
}/*EDITMODE-END*/;

const HEADLINE_FONTS_R = {
  shippori: '"Shippori Mincho", "Noto Serif JP", serif',
  zen: '"Zen Old Mincho", "Noto Serif JP", serif',
  klee: '"Klee One", serif',
};
const BODY_FONTS_R = {
  'noto-sans': '"Noto Sans JP", system-ui, sans-serif',
  'zen-kaku': '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif',
  'm-plus': '"M PLUS 1p", "Noto Sans JP", sans-serif',
};
const PAPER_TONES_R = {
  cream: { paper: '#f7f3ea', warm: '#f1ece0' },
  warm:  { paper: '#f9f0e3', warm: '#f3e7d3' },
  cool:  { paper: '#f1f1ec', warm: '#e9eae3' },
  white: { paper: '#fafaf6', warm: '#f4f3ee' },
};

function HQReserveApp() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS_HQR);

  HQ.jpSerif = HEADLINE_FONTS_R[tweaks.headlineFont] || HEADLINE_FONTS_R.shippori;
  HQ.jp = BODY_FONTS_R[tweaks.bodyFont] || BODY_FONTS_R['zen-kaku'];
  HQ.accent = tweaks.accent;
  HQ.accentSoft = `rgba(${parseInt(tweaks.accent.slice(1,3),16)},${parseInt(tweaks.accent.slice(3,5),16)},${parseInt(tweaks.accent.slice(5,7),16)},0.10)`;
  const tones = PAPER_TONES_R[tweaks.paperTone] || PAPER_TONES_R.cream;
  HQ.paper = tones.paper;
  HQ.paperWarm = tones.warm;

  return (
    <>
      <DesignCanvas>
        <DCSection id="auth" title="00 · 認証 / トップ" subtitle="ログイン画面がトップ。メール → マジックリンク → 既存はログイン / 新規は会員登録へ">
          <DCArtboard id="login" label="A · トップ（メール入力）" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRLogin /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="link-sent" label="B · リンク送信完了" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRLinkSent /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="signup" label="C · 会員登録（新規のみ）" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRSignup /></IOSDevice>
          </DCArtboard>
        </DCSection>

        <DCSection id="id-verify" title="00b · 本人確認書類アップロード" subtitle="Step 3 of 3 · 書類選択 → 撮影 → 送信。マイナンバー時は三重防壁。">
          <DCArtboard id="id-empty" label="A · Empty（未選択）" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRIDEmpty /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="id-selected" label="B · 書類選択済み" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRIDDefault /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="id-mynumber" label="C · マイナンバー（三重防壁）" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRIDMynumber /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="id-loading" label="D · Loading" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRIDLoading /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="id-error" label="E · Error（形式不正）" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRIDError /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="id-success" label="F · Success" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRIDSuccess /></IOSDevice>
          </DCArtboard>
        </DCSection>

        <DCSection id="home" title="01 · ホーム" subtitle="next-up hero + bottom tab nav · 「次の予約」を中心に">
          <DCArtboard id="home" label="A · Home" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRHomeV2 /></IOSDevice>
          </DCArtboard>
        </DCSection>

        <DCSection id="detail" title="02 · イベント詳細" subtitle="テキスト先行 (magazine スタイル)">
          <DCArtboard id="detail-b" label="A · Detail" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRDetailB /></IOSDevice>
          </DCArtboard>
        </DCSection>

        <DCSection id="flow" title="03 · 予約フロー" subtitle="フォーム → 確認 → 完了">
          <DCArtboard id="form" label="A · 入力" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRForm /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="confirm" label="B · 確認" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRConfirm /></IOSDevice>
          </DCArtboard>
          <DCArtboard id="done" label="C · 完了" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRDone /></IOSDevice>
          </DCArtboard>
        </DCSection>

        <DCSection id="history" title="04 · 履歴" subtitle="過去 + 予約中の一覧">
          <DCArtboard id="history" label="A · History" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRHistory /></IOSDevice>
          </DCArtboard>
        </DCSection>

        <DCSection id="reservation" title="05 · 予約詳細" subtitle="履歴から開く · キャンセル動線あり">
          <DCArtboard id="reservation" label="A · Reservation" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRReservation /></IOSDevice>
          </DCArtboard>
        </DCSection>

        <DCSection id="profile" title="06 · プロフィール" subtitle="経験レベル・アカウント情報・通知設定">
          <DCArtboard id="profile" label="A · My Page" width={430} height={880}>
            <IOSDevice width={430} height={880}><ScreenRProfile /></IOSDevice>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Typography">
          <TweakSelect
            label="見出し書体"
            value={tweaks.headlineFont}
            onChange={(v) => setTweak('headlineFont', v)}
            options={[
              { value: 'shippori', label: 'Shippori 明朝' },
              { value: 'zen', label: 'Zen Old 明朝' },
              { value: 'klee', label: 'Klee One' },
            ]}
          />
          <TweakSelect
            label="本文書体"
            value={tweaks.bodyFont}
            onChange={(v) => setTweak('bodyFont', v)}
            options={[
              { value: 'noto-sans', label: 'Noto Sans JP' },
              { value: 'zen-kaku', label: 'Zen Kaku Gothic' },
              { value: 'm-plus', label: 'M PLUS 1p' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Color">
          <TweakColor label="アクセント" value={tweaks.accent} onChange={(v) => setTweak('accent', v)} />
          <TweakRadio
            label="紙トーン"
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

ReactDOM.createRoot(document.getElementById('root')).render(<HQReserveApp />);
