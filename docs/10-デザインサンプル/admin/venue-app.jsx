const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3f6b5e",
  "density": "compact",
  "showMap": true
}/*EDITMODE-END*/;

const yen = (n) => '¥' + Number(n).toLocaleString('ja-JP');

function VenueApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [venues, setVenues] = useState(() => window.INITIAL_VENUES.map(v => ({ ...v })));
  const [selId, setSelId] = useState(venues[0].id);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(() => ({ ...venues[0] }));
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  // apply tweaks to CSS vars
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--row-gap', t.density === 'compact' ? '8px' : '14px');
  }, [t.accent, t.density]);

  const selected = venues.find(v => v.id === selId) || null;
  const dirty = selected && JSON.stringify(selected) !== JSON.stringify(draft);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return venues;
    return venues.filter(v =>
      v.name.includes(q) || (v.address || '').includes(q) || (v.zip || '').includes(q)
    );
  }, [venues, query]);

  function flash(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

  function select(id) {
    if (dirty && !confirm('編集中の変更があります。破棄して移動しますか？')) return;
    setSelId(id);
    const v = venues.find(x => x.id === id);
    setDraft({ ...v });
  }

  function setField(k, val) {
    setDraft(d => ({ ...d, [k]: val }));
  }

  function save() {
    setVenues(vs => vs.map(v => {
      if (v.id === draft.id) return { ...draft, updated: '2026-06-17' };
      // enforce single main
      if (draft.main && v.id !== draft.id) return { ...v, main: false };
      return v;
    }));
    setDraft(d => ({ ...d, updated: '2026-06-17' }));
    flash('「' + (draft.name || '無題の会場') + '」を保存しました');
  }

  function cancel() {
    if (selected) setDraft({ ...selected });
  }

  function remove() {
    if (!selected) return;
    if (!confirm('「' + selected.name + '」を削除しますか？この操作は取り消せません。')) return;
    const rest = venues.filter(v => v.id !== selected.id);
    setVenues(rest);
    if (rest.length) { setSelId(rest[0].id); setDraft({ ...rest[0] }); }
    flash('会場を削除しました');
  }

  function addVenue() {
    const nv = {
      id: 'v-' + Date.now(), name: '', main: false, zip: '', address: '',
      feeType: 'fixed', fee: 1000, access: '', geo: '', updated: '2026-06-17',
    };
    setVenues(vs => [...vs, nv]);
    setSelId(nv.id);
    setDraft({ ...nv });
    flash('新しい会場を追加しました。内容を入力してください');
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="crumb">— Workspace / 会場</div>
          <h1 className="serif">会場マスタ</h1>
        </div>
        <div className="nav">
          <button className="navpill">イベント</button>
          <button className="navpill">会員</button>
          <button className="navpill">本人確認書類</button>
          <button className="btn-solid" onClick={addVenue}>＋ 新しい会場</button>
          <button className="logout">ログアウト</button>
        </div>
      </header>

      <div className="workspace">
        {/* ---- list pane ---- */}
        <aside className="list">
          <div className="list-top">
            <input
              className="search"
              placeholder="会場名・住所で検索…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="list-meta">
            <span>会場一覧</span>
            <span>{filtered.length} / {venues.length}</span>
          </div>
          <div className="list-scroll">
            {filtered.map(v => (
              <button
                key={v.id}
                className={'v-item' + (v.id === selId ? ' sel' : '')}
                onClick={() => select(v.id)}
              >
                <span className="vn">{v.name || '（無題の会場）'}</span>
                {v.main
                  ? <span className="badge-mini">メイン</span>
                  : <span className="fee-mini">{v.feeType === 'variable' ? '都度' : yen(v.fee)}</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '28px 18px', color: 'var(--ink-faint)', fontSize: 14 }}>
                該当する会場がありません
              </div>
            )}
          </div>
          <button className="list-add" onClick={addVenue}>＋ 新しい会場を追加</button>
        </aside>

        {/* ---- detail pane ---- */}
        <section className="detail">
          {!selected ? (
            <div className="detail-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)' }}>
              会場が登録されていません
            </div>
          ) : (
            <>
              <div className="detail-scroll">
                <div className="d-head">
                  <h2 className="serif">{draft.name || <span className="empty-hint">（無題の会場）</span>}</h2>
                  {draft.main && (
                    <span className="badge-main"><span className="dot"></span>メイン会場</span>
                  )}
                </div>
                <div className="d-sub">最終更新 {draft.updated}・ID {draft.id}</div>

                <div className="form">
                  <div className="field">
                    <label className="flbl">会場名</label>
                    <input className="inp" value={draft.name} placeholder="例）有明会場"
                      onChange={e => setField('name', e.target.value)} />
                  </div>

                  <div className="field">
                    <label className="flbl">郵便番号</label>
                    <input className="inp" value={draft.zip} placeholder="135-0063"
                      onChange={e => setField('zip', e.target.value)} />
                  </div>

                  <div className="field full">
                    <label className="flbl">住所</label>
                    <input className="inp" value={draft.address} placeholder="東京都江東区…"
                      onChange={e => setField('address', e.target.value)} />
                  </div>

                  <div className="field">
                    <label className="flbl">料金タイプ</label>
                    <div className="seg">
                      <button className={draft.feeType === 'fixed' ? 'on' : ''}
                        onClick={() => setField('feeType', 'fixed')}>固定額</button>
                      <button className={draft.feeType === 'variable' ? 'on' : ''}
                        onClick={() => setField('feeType', 'variable')}>都度設定</button>
                    </div>
                  </div>

                  <div className="field">
                    <label className="flbl">標準参加費</label>
                    <div className={'fee-amt' + (draft.feeType === 'variable' ? ' dim' : '')}>
                      <span className="yen">¥</span>
                      <input className="inp" type="number" value={draft.fee ?? ''} placeholder="1000"
                        onChange={e => setField('fee', e.target.value === '' ? null : Number(e.target.value))} />
                    </div>
                  </div>

                  <div className="field full">
                    <label className="flbl">アクセスメモ</label>
                    <textarea className="inp" value={draft.access} rows={3}
                      placeholder="最寄り駅・徒歩分数・注意事項など"
                      onChange={e => setField('access', e.target.value)} />
                  </div>

                  {t.showMap && (
                    <div className="field full">
                      <label className="flbl">地図 / 位置情報（緯度経度 または 埋め込みURL）</label>
                      <input className="inp" value={draft.geo} placeholder="35.6357, 139.7902"
                        style={{ marginBottom: 10 }}
                        onChange={e => setField('geo', e.target.value)} />
                      <div className="map-ph">
                        {draft.geo ? 'MAP PREVIEW — ' + draft.geo : '位置情報が未設定です'}
                      </div>
                    </div>
                  )}

                  <div className="field full">
                    <div className="toggle-row">
                      <button className={'switch' + (draft.main ? ' on' : '')}
                        onClick={() => setField('main', !draft.main)} aria-label="メイン会場に設定"></button>
                      <div>
                        <div className="tl">この会場をメイン会場に設定</div>
                        <div className="ts">メインは 1 会場のみ。設定すると既存のメインは自動で解除されます。</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="d-foot">
                <button className="btn-save" onClick={save}>保存</button>
                <button className="btn-cancel" onClick={cancel} disabled={!dirty}
                  style={{ opacity: dirty ? 1 : .45 }}>キャンセル</button>
                {dirty && <span className="dirty-note">未保存の変更があります</span>}
                <button className="btn-del" onClick={remove}>この会場を削除</button>
              </footer>
            </>
          )}
        </section>
      </div>

      <div className={'toast' + (toast ? ' show' : '')}>{toast}</div>

      <TweaksPanel>
        <TweakSection label="外観" />
        <TweakColor label="アクセント" value={t.accent}
          options={['#b15535', '#7d6a3a', '#3f6b5e', '#5a5470']}
          onChange={v => setTweak('accent', v)} />
        <TweakRadio label="行の高さ" value={t.density}
          options={['compact', 'regular']}
          onChange={v => setTweak('density', v)} />
        <TweakSection label="フィールド" />
        <TweakToggle label="地図プレビューを表示" value={t.showMap}
          onChange={v => setTweak('showMap', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<VenueApp />);
