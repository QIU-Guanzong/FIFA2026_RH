/* global React, Section, SectionHead */
// wcpredict — sections part 7: Fixtures (赛程) · data4mula-style schedule list
const { useState: useState7, useMemo: useMemo7, useEffect: useEffect7 } = React;

function flagOf(en) { return (window.WC_FLAGS && window.WC_FLAGS[en]) || '🏳️'; }
function decOdds(p) { return p > 0 ? (1 / p).toFixed(2) : '—'; }
function lamFromElo(eh, ea, he, ae) {
  const P = window.WC_PARAMS;          // 引擎 DC 参数（与 Python lambdas() 同式），缺席时回退 Elo 近似
  if (P && he && ae && P.teams[he] && P.teams[ae]) {
    const [ah, dh] = P.teams[he], [aa, da] = P.teams[ae];
    return { lh: Math.exp(P.intercept + ah + da), la: Math.exp(P.intercept + aa + dh) };
  }
  const d = (eh - ea) / 100;
  return { lh: Math.max(0.35, 1.38 * Math.exp(0.16 * d)), la: Math.max(0.35, 1.38 * Math.exp(-0.16 * d)) };
}
function fxLambdas(f) {
  if (f.lh != null) return { lh: f.lh, la: f.la };
  return lamFromElo(f.eh, f.ea, f.home && f.home.en, f.away && f.away.en);
}
function fxMarkets(f) {
  const { lh, la } = fxLambdas(f);
  const { m, N } = window.computeDC(lh, la);
  const mk = window.deriveMarkets(m, N);
  return { ...mk, nbtts: 1 - mk.btts, m, N, lh, la };
}

const FX_MARKETS = [
  { key: '1x2', label: '主客和', cols: [{ t: '主', k: 'home' }, { t: '和', k: 'draw' }, { t: '客', k: 'away' }] },
  { key: 'ou', label: '大小球 2.5', cols: [{ t: '大 2.5', k: 'over' }, { t: '小 2.5', k: 'under' }] },
  { key: 'btts', label: '双方进球', cols: [{ t: '入球', k: 'btts' }, { t: '无', k: 'nbtts' }] },
];

// one odds chip
function OddChip({ label, prob, fav }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 60,
      padding: '7px 10px', borderRadius: 'var(--r-6)',
      background: fav ? 'var(--accent-50)' : 'var(--bg-shade)',
      border: '1px solid ' + (fav ? 'var(--accent-soft)' : 'transparent'),
    }}>
      <span style={{ font: 'var(--label)', color: fav ? 'var(--accent-deep)' : 'var(--muted-2)' }}>{label}</span>
      <span style={{ font: '700 14px/1 var(--font-display)', color: fav ? 'var(--accent)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{decOdds(prob)}</span>
    </div>
  );
}

function TeamLine({ team, strong }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontSize: 19, lineHeight: 1, width: 24, textAlign: 'center' }}>{flagOf(team.en)}</span>
      <span style={{ font: strong ? '600 14.5px/1.3 var(--sans)' : '500 14.5px/1.3 var(--sans)', color: 'var(--ink)' }}>{team.zh}</span>
      <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{team.en}</span>
    </div>
  );
}

function FixtureCard({ f, market, card, onOpen }) {
  const mk = useMemo7(() => fxMarkets(f), [f.id]);
  const probs = market.cols.map((c) => mk[c.k]);
  const favIdx = probs.indexOf(Math.max(...probs));
  return (
    <div onClick={() => onOpen(f)} className="grp-card" style={{
      background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)',
      padding: '13px 15px', cursor: 'pointer', transition: 'border-color var(--dur-fast) var(--ease)',
    }}>
      {/* meta row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '700 13px/1 var(--font-display)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{f.time}</span>
          <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{f.id}</span>
        </span>
        <span className="rf-qualify" style={{ color: 'var(--pitch-deep)', background: 'var(--pitch-soft)' }}>组 {f.group} · 世界杯</span>
      </div>
      {/* teams + odds */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: card ? 'wrap' : 'nowrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <TeamLine team={f.home} strong={favIdx === 0 && market.key === '1x2'} />
          <TeamLine team={f.away} strong={favIdx === market.cols.length - 1 && market.key === '1x2'} />
        </div>
        <div style={{ display: 'flex', gap: 7, flex: '0 0 auto' }}>
          {market.cols.map((c, i) => <OddChip key={c.k} label={c.t} prob={mk[c.k]} fav={i === favIdx} />)}
        </div>
      </div>
    </div>
  );
}

// ── detail popover: DC score matrix + all markets
function FixturePopover({ f, onClose }) {
  const d = useMemo7(() => fxMarkets(f), [f.id]);
  useEffect7(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const cap = Math.min(d.N, 5);
  let mx = 0; for (let i = 0; i <= cap; i++) for (let j = 0; j <= cap; j++) mx = Math.max(mx, d.m[i][j]);
  const rows = [
    ['1X2', [[f.home.zh + ' 胜', d.home, 'var(--up)'], ['平局', d.draw, 'var(--muted-2)'], [f.away.zh + ' 胜', d.away, 'var(--down)']]],
    ['大小球 2.5', [['大球', d.over, 'var(--ink)'], ['小球', d.under, 'var(--muted-2)']]],
    ['双方进球', [['入球', d.btts, 'var(--pitch)'], ['无入球', d.nbtts, 'var(--muted-2)']]],
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(23,23,23,0.32)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 96vw)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--r-14)', boxShadow: 'var(--shadow-pop)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--s-6) var(--s-6) var(--s-4)' }}>
          <div>
            <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' }}>组 {f.group} · {f.date} {f.time}</div>
            <div style={{ font: 'var(--h3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{flagOf(f.home.en)} {f.home.zh}</span>
              <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 14 }}>vs</span>
              <span>{flagOf(f.away.en)} {f.away.zh}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--hairline-strong)', background: 'var(--surface)', color: 'var(--muted-2)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
        {/* markets */}
        <div style={{ padding: '0 var(--s-6)', display: 'grid', gap: 'var(--s-5)' }}>
          {rows.map(([title, items]) => (
            <div key={title}>
              <div style={{ font: 'var(--label)', color: 'var(--muted-2)', marginBottom: 7 }}>{title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 8 }}>
                {items.map(([l, v, c]) => (
                  <div key={l} style={{ background: 'var(--bg-shade)', borderRadius: 'var(--r-6)', padding: '9px 10px', textAlign: 'center' }}>
                    <div style={{ font: '700 16px/1 var(--font-display)', color: c, fontVariantNumeric: 'tabular-nums' }}>{decOdds(v)}</div>
                    <div style={{ font: 'var(--label)', color: 'var(--muted-2)', marginTop: 4 }}>{l} · {(v * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* score matrix */}
          <div>
            <div style={{ font: 'var(--label)', color: 'var(--muted-2)', marginBottom: 7 }}>比分矩阵 · λ {d.lh.toFixed(2)} / {d.la.toFixed(2)}（行={f.home.zh} 纵=进球）</div>
            <div style={{ display: 'grid', gridTemplateColumns: `18px repeat(${cap + 1}, 1fr)`, gap: 2 }}>
              <span />
              {Array.from({ length: cap + 1 }, (_, j) => <span key={j} style={{ textAlign: 'center', font: '600 9px/1 var(--mono)', color: 'var(--muted)' }}>{j}</span>)}
              {Array.from({ length: cap + 1 }, (_, x) => [
                <span key={'r' + x} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 9px/1 var(--mono)', color: 'var(--muted)' }}>{x}</span>,
                ...Array.from({ length: cap + 1 }, (_, y) => {
                  const p = d.m[x][y]; const al = Math.pow(p / mx, 0.7);
                  const bg = x === y ? `rgba(115,115,115,${0.06 + al * 0.5})` : x > y ? `rgba(184,71,45,${0.05 + al * 0.62})` : `rgba(46,139,87,${0.05 + al * 0.55})`;
                  return <span key={x + '-' + y} style={{ aspectRatio: '1.5', borderRadius: 3, background: bg, color: al > 0.5 ? '#fff' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 9px/1 var(--mono)' }}>{(p * 100).toFixed(0)}</span>;
                }),
              ])}
            </div>
          </div>
        </div>
        <div style={{ padding: 'var(--s-5) var(--s-6)', marginTop: 'var(--s-4)', borderTop: '1px solid var(--divider)', background: 'var(--panel-tint)', font: 'var(--label)', color: 'var(--muted-2)' }}>
          赔率为模型公平赔率（1 / 概率，未含水位）· 由同一比分矩阵派生，市场间自洽
        </div>
      </div>
    </div>
  );
}

const DOW = ['日', '一', '二', '三', '四', '五', '六'];
function dowOf(iso) { return DOW[new Date(iso + 'T00:00:00Z').getUTCDay()]; }

// ── knockout schedule (round-grouped, from official tree)
function KnockoutView() {
  const t = window.WC_OFFICIAL_TREE, sch = window.WC_KO_SCHEDULE;
  const rounds = [
    { name: '32 强', items: t.r32.map((m) => ({ no: m.no, a: m.a, b: m.b })) },
    { name: '16 强', items: t.r16.map((p) => ({ no: p[0], wa: p[1], wb: p[2] })) },
    { name: '1/4 决赛', items: t.qf.map((p) => ({ no: p[0], wa: p[1], wb: p[2] })) },
    { name: '半决赛', items: t.sf.map((p) => ({ no: p[0], wa: p[1], wb: p[2] })) },
    { name: '决赛', items: [{ no: t.final[0], wa: t.final[1], wb: t.final[2] }] },
  ];
  const slot = (s) => s.third
    ? <span style={{ color: 'var(--muted-2)' }}>{s.lbl} <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{s.third}</span></span>
    : <span><span style={{ fontSize: 15 }}>{flagOf(s.en)}</span> {s.zh} <span style={{ font: 'var(--label)', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{s.pct}%</span></span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-8)' }}>
      {rounds.map((r) => (
        <div key={r.name}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--s-4)' }}>
            <span style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--pitch-deep)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.name}</span>
            <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{(sch[r.name].dates[0])} – {(sch[r.name].dates[1]).slice(5)}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
            <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{r.items.length} 场</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--s-4)' }}>
            {r.items.map((m) => (
              <div key={m.no} style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: '12px 15px' }}>
                <div style={{ font: '700 11px/1 var(--mono)', color: 'var(--accent)', marginBottom: 8 }}>M{m.no}</div>
                <div style={{ font: '500 13px/1.5 var(--sans)' }}>{m.a ? slot(m.a) : <span style={{ color: 'var(--muted-2)' }}>胜 {m.wa}</span>}</div>
                <div style={{ font: '500 13px/1.5 var(--sans)', color: 'var(--muted-2)', marginTop: 2 }}>{m.b ? slot(m.b) : <span>胜 {m.wb}</span>}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Fixtures() {
  const fx = window.WC_FIXTURES;
  const [stage, setStage] = useState7('group');
  const [mkt, setMkt] = useState7(FX_MARKETS[0]);
  const [card, setCard] = useState7(false);
  const [grp, setGrp] = useState7('all');
  const [open, setOpen] = useState7(null);

  const byDate = useMemo7(() => {
    const map = new Map();
    fx.filter((f) => grp === 'all' || f.group === grp).forEach((f) => {
      if (!map.has(f.date)) map.set(f.date, { date: f.date, dow: dowOf(f.date), list: [] });
      map.get(f.date).list.push(f);
    });
    return Array.from(map.values());
  }, [fx, grp]);

  const toggleBtn = (active) => ({
    font: '500 13px/1 var(--font-head)', padding: '7px 12px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (active ? 'var(--ink)' : 'var(--hairline-strong)'),
    background: active ? 'var(--ink)' : 'var(--surface)', color: active ? 'var(--ink-inverted)' : 'var(--ink-soft)',
  });
  const selStyle = {
    font: '500 13px/1 var(--font-head)', color: 'var(--ink)', background: 'var(--surface)',
    border: '1px solid var(--hairline-strong)', borderRadius: 7, padding: '8px 12px', cursor: 'pointer',
  };

  return (
    <Section style={{ paddingTop: 'var(--s-12)', paddingBottom: 'var(--s-12)' }}>
      {open && <FixturePopover f={open} onClose={() => setOpen(null)} />}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 'var(--s-7)' }}>
        <div>
          <div style={{ font: 'var(--eyebrow)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>Upcoming · 世界杯 104 场</div>
          <h2 style={{ font: 'var(--h1)', letterSpacing: '-0.02em', marginTop: 10 }}>足球赛事</h2>
        </div>
        {/* stage tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setStage('group')} style={toggleBtn(stage === 'group')}>小组赛 · 72</button>
          <button onClick={() => setStage('ko')} style={toggleBtn(stage === 'ko')}>淘汰赛 · 32</button>
        </div>
      </div>

      {stage === 'group' ? (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 'var(--s-7)' }}>
            <select value={grp} onChange={(e) => setGrp(e.target.value)} style={selStyle}>
              <option value="all">全部小组</option>
              {'ABCDEFGHIJKL'.split('').map((g) => <option key={g} value={g}>组 {g}</option>)}
            </select>
            <select value={mkt.key} onChange={(e) => setMkt(FX_MARKETS.find((m) => m.key === e.target.value))} style={selStyle}>
              {FX_MARKETS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button onClick={() => setCard(false)} style={toggleBtn(!card)}>☰ 列表</button>
              <button onClick={() => setCard(true)} style={toggleBtn(card)}>▦ 卡片</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-8)' }}>
            {byDate.map((g) => (
              <div key={g.date}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--s-4)' }}>
                  <span style={{ font: '700 14px/1 var(--font-display)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{g.date}</span>
                  <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>周{g.dow}</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
                  <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{g.list.length} 场</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: card ? 'repeat(auto-fill, minmax(300px, 1fr))' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: 'var(--s-4)' }}>
                  {g.list.map((f) => <FixtureCard key={f.id} f={f} market={mkt} card={card} onOpen={setOpen} />)}
                </div>
              </div>
            ))}
          </div>
          <p style={{ font: 'var(--small)', color: 'var(--muted)', marginTop: 'var(--s-8)' }}>
            小数赔率 = 模型公平赔率（1 / 概率，未含水位），由 Elo 评分派生 λ → 同一比分矩阵计算。点击任一对阵看比分矩阵与全盘口。
          </p>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <KnockoutView />
          <p style={{ font: 'var(--small)', color: 'var(--muted)', marginTop: 'var(--s-8)' }}>
            淘汰赛对阵取自官方树（M73 → M104）。R32 入口为 4 万届模拟最可能占位球队；16 强起保持「胜 N」结构。完整树状图见「晋级树」页。
          </p>
        </React.Fragment>
      )}
    </Section>
  );
}

Object.assign(window, { Fixtures });
