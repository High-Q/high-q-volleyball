// High Q — root app: mounts the LP with Tweaks
const TWEAK_DEFAULTS_HQ = /*EDITMODE-BEGIN*/{
  "headlineFont": "klee",
  "bodyFont": "zen-kaku",
  "accent": "#b85c3c",
  "paperTone": "cream",
  "cookieVariant": "bottom",
  "cookieShow": true
}/*EDITMODE-END*/;

const HEADLINE_FONTS = {
  shippori: '"Shippori Mincho", "Noto Serif JP", serif',
  noto: '"Noto Serif JP", serif',
  zen: '"Zen Old Mincho", "Noto Serif JP", serif',
  klee: '"Klee One", serif',
};
const BODY_FONTS = {
  'noto-sans': '"Noto Sans JP", system-ui, sans-serif',
  'zen-kaku': '"Zen Kaku Gothic New", "Noto Sans JP", sans-serif',
  'm-plus': '"M PLUS 1p", "Noto Sans JP", sans-serif',
};
const PAPER_TONES_HQ = {
  cream: { paper: '#f7f3ea', warm: '#f1ece0' },
  warm:  { paper: '#f9f0e3', warm: '#f3e7d3' },
  cool:  { paper: '#f1f1ec', warm: '#e9eae3' },
  white: { paper: '#fafaf6', warm: '#f4f3ee' },
};

function HQApp() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS_HQ);

  // mutate the global HQ system tokens before render
  HQ.jpSerif = HEADLINE_FONTS[tweaks.headlineFont] || HEADLINE_FONTS.shippori;
  HQ.jp = BODY_FONTS[tweaks.bodyFont] || BODY_FONTS['noto-sans'];
  HQ.accent = tweaks.accent;
  const tones = PAPER_TONES_HQ[tweaks.paperTone] || PAPER_TONES_HQ.cream;
  HQ.paper = tones.paper;
  HQ.paperWarm = tones.warm;

  return (
    <>
      <div style={{ background: HQ.paper, minHeight: '100vh' }}>
        <HighQLP />
        <CookieHost variant={tweaks.cookieVariant} forceShow={tweaks.cookieShow} />
      </div>
      <TweaksPanel title="Tweaks">
        <TweakSection title="Typography">
          <TweakSelect
            label="見出し書体"
            value={tweaks.headlineFont}
            onChange={(v) => setTweak('headlineFont', v)}
            options={[
              { value: 'shippori', label: 'Shippori 明朝' },
              { value: 'noto', label: 'Noto Serif' },
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
        <TweakSection title="Cookie consent">
          <TweakRadio
            label="表示スタイル"
            value={tweaks.cookieVariant}
            onChange={(v) => setTweak('cookieVariant', v)}
            options={[
              { value: 'bottom', label: 'Banner' },
              { value: 'center', label: 'Modal' },
              { value: 'corner', label: 'Corner' },
            ]}
          />
          <TweakToggle
            label="表示する"
            value={tweaks.cookieShow}
            onChange={(v) => setTweak('cookieShow', v)}
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

ReactDOM.createRoot(document.getElementById('root')).render(<HQApp />);
