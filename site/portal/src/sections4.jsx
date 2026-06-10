/* global React, Section, SectionHead, computeDC, deriveMarkets */
// wcpredict — sections part 4: MatchPredictor — pick any two of 48 teams, full odds board

const { useState: useState4, useMemo: useMemo4 } = React;

function mpFlag(en) { return (window.WC_FLAGS && window.WC_FLAGS[en]) || '🏳️'; }
function mpDec(p) { return p > 0 ? (1 / p).toFixed(2) : '—'; }
function mpLam(eh, ea, he, ae) {
  const P = window.WC_PARAMS;          // 引擎 DC 参数：λh = exp(intercept + att_h + def_a)，与 Python 完全同式
  if (P && he && ae && P.teams[he] && P.teams[ae]) {
    const [ah, dh] = P.teams[he], [aa, da] = P.teams[ae];
    return { lh: Math.exp(P.intercept + ah + da), la: Math.exp(P.intercept + aa + dh) };
  }
  const d = (eh - ea) / 100;           // 兜底：Elo 近似（engine.js 缺席时）
  return { lh: Math.max(0.35, 1.42 * Math.exp(0.16 * d)), la: Math.max(0.35, 1.42 * Math.exp(-0.16 * d)) };
}
// over/under for an arbitrary goal line from the score matrix
function ouLine(m, N, line) {
  const need = Math.ceil(line); let over = 0, under = 0;
  for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) { (x + y >= need ? (over += m[x][y]) : (under += m[x][y])); }
  return { over, under };
}

const MP_PICKS = [
  ['Spain', 'France'], ['Argentina', 'Brazil'], ['England', 'Germany'], ['Netherlands', 'Portugal'],
];

function MatchPredictor() {
  const teams = window.WC_TEAMS;
  const byEn = useMemo4(() => Object.fromEntries(teams.map((t) => [t.en, t])), [teams]);
  const [homeEn, setHomeEn] = useState4('Spain');
  const [awayEn, setAwayEn] = useState4('France');
  const home = byEn[homeEn], away = byEn[awayEn];
  const same = homeEn === awayEn;

  const { lh, la } = mpLam(home.elo, away.elo, homeEn, awayEn);
  const { m, max, N } = useMemo4(() => window.computeDC(lh, la), [lh, la]);
  const mk = useMemo4(() => window.deriveMarkets(m, N), [m, N]);
  const lines = [1.5, 2.5, 3.5].map((L) => ({ L, ...ouLine(m, N, L) }));

  const teamOpts = teams.map((t) => <option key={t.en} value={t.en}>{mpFlag(t.en)} {t.zh} · 组{t.group}</option>);
  const selStyle = {
    font: '500 14px/1 var(--font-head)', color: 'var(--ink)', background: 'var(--surface)',
    border: '1px solid var(--hairline-strong)', borderRadius: 'var(--r-6)', padding: '10px 12px', cursor: 'pointer', minWidth: 0, flex: 1,
  };

  return (
    <Section style={{ paddingTop: 'var(--s-12)', paddingBottom: 'var(--s-12)' }}>
      <SectionHead
        kicker="单场预测 · Dixon-Coles 比分矩阵"
        title="任选两队，派生整张盘口"
        sub="选定任意两队，由 Elo 评分推出进球强度 λ 与 τ 低比分修正，算出每个比分的联合概率；1X2 / 大小球 / BTTS / 波胆全部从同一矩阵导出——内部恒等、互相自洽。"
      />

      {/* quick picks */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--s-5)', flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--label)', color: 'var(--muted)', alignSelf: 'center' }}>焦点：</span>
        {MP_PICKS.map(([h, a]) => (
          <button key={h + a} onClick={() => { setHomeEn(h); setAwayEn(a); }} style={{
            font: '500 12.5px/1 var(--font-head)', padding: '7px 11px', borderRadius: 'var(--r-full)', cursor: 'pointer',
            border: '1px solid ' + (homeEn === h && awayEn === a ? 'var(--ink)' : 'var(--hairline-strong)'),
            background: homeEn === h && awayEn === a ? 'var(--ink)' : 'var(--surface)',
            color: homeEn === h && awayEn === a ? 'var(--ink-inverted)' : 'var(--ink-soft)', whiteSpace: 'nowrap',
          }}>{mpFlag(h)} {byEn[h].zh} vs {byEn[a].zh} {mpFlag(a)}</button>
        ))}
      </div>

      {/* team selectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--s-7)', flexWrap: 'wrap' }}>
        <select value={homeEn} onChange={(e) => setHomeEn(e.target.value)} style={selStyle}>{teamOpts}</select>
        <span style={{ font: '700 14px/1 var(--font-display)', color: 'var(--muted-2)', flex: '0 0 auto' }}>VS</span>
        <select value={awayEn} onChange={(e) => setAwayEn(e.target.value)} style={selStyle}>{teamOpts}</select>
      </div>
      {same && <p style={{ font: 'var(--small)', color: 'var(--warn)', marginBottom: 'var(--s-5)' }}>请选择两支不同球队。</p>}

      <div className="match-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: 'var(--s-6)' }}>
        {/* score matrix heatmap */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-5)', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ font: 'var(--h3)' }}>{mpFlag(homeEn)} {home.zh} vs {away.zh} {mpFlag(awayEn)}</h3>
            <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>λ {lh.toFixed(2)} · {la.toFixed(2)} · ρ {((window.WC_PARAMS && window.WC_PARAMS.rho) || -0.06).toFixed(2)}</span>
          </div>
          <ScoreMatrix m={m} max={max} N={N} home={home.zh} away={away.zh} />
        </div>

        {/* derived markets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
            <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 'var(--s-5)' }}>胜平负 · 1X2 · 模型赔率</div>
            <Outcome3 home={mk.home} draw={mk.draw} away={mk.away} hn={home.zh} an={away.zh} />
          </div>
          {/* over/under multi-line */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
            <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 'var(--s-4)' }}>大小球 · 多盘口</div>
            <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr 1fr', gap: '6px 10px', alignItems: 'center' }}>
              <span />
              <span style={{ font: 'var(--label)', color: 'var(--muted-2)', textAlign: 'right' }}>大球</span>
              <span style={{ font: 'var(--label)', color: 'var(--muted-2)', textAlign: 'right' }}>小球</span>
              {lines.map((r) => [
                <span key={'l' + r.L} style={{ font: '600 13px/1 var(--mono)', color: 'var(--ink)' }}>{r.L.toFixed(1)}</span>,
                <span key={'o' + r.L} style={{ textAlign: 'right' }}><b style={{ font: '600 13px/1 var(--mono)' }}>{mpDec(r.over)}</b> <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{(r.over * 100).toFixed(0)}%</span></span>,
                <span key={'u' + r.L} style={{ textAlign: 'right' }}><b style={{ font: '600 13px/1 var(--mono)' }}>{mpDec(r.under)}</b> <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{(r.under * 100).toFixed(0)}%</span></span>,
              ])}
            </div>
          </div>
          <div className="mkt-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-5)' }}>
            <MiniMarket title="双方进球 BTTS" a={['是', mk.btts]} b={['否', 1 - mk.btts]} />
            <MiniMarket title="净胜 / 平局" a={['有净胜', 1 - mk.draw]} b={['平局', mk.draw]} />
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
            <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 'var(--s-4)' }}>最可能比分 · 波胆 Top 6</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {mk.top.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 'var(--r-6)', background: i === 0 ? 'var(--accent-50)' : 'var(--bg-shade)' }}>
                  <span style={{ font: '600 14px/1 var(--mono)', color: i === 0 ? 'var(--accent)' : 'var(--ink)' }}>{s.x}-{s.y}</span>
                  <span style={{ font: '500 12px/1 var(--mono)', color: 'var(--muted-2)' }}>{(s.p * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// heatmap grid: rows = home goals, cols = away goals
function ScoreMatrix({ m, max, N, home, away }) {
  const cap = Math.min(N, 5);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 26 }} />
        <span style={{ flex: 1, textAlign: 'center', font: 'var(--label)', color: 'var(--muted-2)' }}>{away} 进球 →</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: 18 }}>
          <span style={{ font: 'var(--label)', color: 'var(--muted-2)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{home} 进球 →</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `20px repeat(${cap + 1}, 1fr)`, gap: 3, marginBottom: 3 }}>
            <span />
            {Array.from({ length: cap + 1 }, (_, j) => (
              <span key={j} style={{ textAlign: 'center', font: '600 11px/1 var(--mono)', color: 'var(--muted)' }}>{j}</span>
            ))}
          </div>
          {Array.from({ length: cap + 1 }, (_, x) => (
            <div key={x} style={{ display: 'grid', gridTemplateColumns: `20px repeat(${cap + 1}, 1fr)`, gap: 3, marginBottom: 3 }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 11px/1 var(--mono)', color: 'var(--muted)' }}>{x}</span>
              {Array.from({ length: cap + 1 }, (_, y) => {
                const p = m[x][y];
                const a = Math.pow(p / max, 0.7);
                const diag = x === y;
                const win = x > y;
                const bg = diag
                  ? `rgba(115,115,115,${0.08 + a * 0.5})`
                  : win
                    ? `rgba(184,71,45,${0.06 + a * 0.62})`
                    : `rgba(46,139,87,${0.06 + a * 0.55})`;
                const fg = a > 0.5 ? '#fff' : 'var(--ink-soft)';
                return (
                  <div key={y} style={{
                    aspectRatio: '1.45', borderRadius: 5, background: bg, color: fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    font: '600 11px/1 var(--mono)',
                  }}>{(p * 100).toFixed(p >= 0.01 ? 0 : 1)}</div>
                );
              })}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 16, marginTop: 'var(--s-5)', font: 'var(--label)', color: 'var(--muted-2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(184,71,45,0.6)' }} />主胜</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(115,115,115,0.45)' }} />平局</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(46,139,87,0.55)' }} />客胜</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)' }}>单元 = 概率 %</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Outcome3({ home, draw, away, hn, an }) {
  const rows = [
    { label: `${hn} 胜`, v: home, c: 'var(--up)' },
    { label: '平局', v: draw, c: 'var(--muted-2)' },
    { label: `${an} 胜`, v: away, c: 'var(--down)' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
        <span style={{ width: `${home * 100}%`, background: 'var(--up)' }} />
        <span style={{ width: `${draw * 100}%`, background: 'var(--muted)' }} />
        <span style={{ width: `${away * 100}%`, background: 'var(--down)' }} />
      </div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, font: '500 14px/1 var(--sans)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: r.c }} />{r.label}
          </span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ font: '700 16px/1 var(--font-display)', color: 'var(--ink)' }}>{mpDec(r.v)}</span>
            <span style={{ font: '500 12px/1 var(--mono)', color: 'var(--muted-2)', minWidth: 44, textAlign: 'right' }}>{(r.v * 100).toFixed(1)}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniMarket({ title, a, b }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
      <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: 'var(--s-4)' }}>{title}</div>
      {[a, b].map(([label, v], i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: i ? 10 : 0 }}>
          <span style={{ font: '500 13px/1 var(--sans)', color: 'var(--ink-soft)' }}>{label}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ font: '600 14px/1 var(--mono)', color: i === 0 ? 'var(--ink)' : 'var(--muted-2)' }}>{mpDec(v)}</span>
            <span style={{ font: '500 11px/1 var(--mono)', color: 'var(--muted)' }}>{(v * 100).toFixed(0)}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { MatchPredictor });
