/* global React, Section, SectionHead */
// wcpredict — sections part 6: Bracket (knockout tree) + model vs Polymarket odds
const { useState: useState6, useMemo: useMemo6, useEffect: useEffect6 } = React;

function confColor(c) {
  return ({ UEFA: 'var(--info)', CONMEBOL: 'var(--down)', CAF: 'var(--warn)', AFC: 'var(--accent)', CONCACAF: 'var(--muted-2)' })[c] || 'var(--muted)';
}

// a single team row inside a match card
function TeamRow({ t, win, top, pmFor }) {
  const pm = pmFor ? pmFor(t.en, t.pm) : t.pm;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '8px 1fr auto auto', alignItems: 'center', gap: 9,
      padding: '8px 11px',
      borderBottom: top ? '1px solid var(--divider)' : 'none',
      background: win ? 'var(--accent-50)' : 'transparent',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: confColor(t.conf) }} title={t.conf} />
      <span style={{ font: win ? '600 13px/1.2 var(--sans)' : '500 13px/1.2 var(--sans)', color: win ? 'var(--accent-deep)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.zh}</span>
      <span title="模型夺冠概率" style={{ font: '600 12px/1 var(--mono)', color: win ? 'var(--accent)' : 'var(--ink-soft)', minWidth: 34, textAlign: 'right' }}>{t.m.toFixed(t.m % 1 ? 1 : 0)}%</span>
      <span title="Polymarket 夺冠隐含概率" style={{ font: '500 11px/1 var(--mono)', color: 'var(--muted)', minWidth: 30, textAlign: 'right' }}>{pm}¢</span>
    </div>
  );
}

function MatchCard({ pair, label, onPick, pmFor }) {
  // winner = higher model prob
  const wi = pair[0].m >= pair[1].m ? 0 : 1;
  return (
    <div className="bkt-match bkt-clickable" onClick={() => onPick && onPick(pair)} style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-8)', overflow: 'hidden', boxShadow: 'var(--shadow-1)', cursor: 'pointer' }}>
      {label && <div style={{ font: 'var(--label)', color: 'var(--muted)', padding: '5px 11px 0' }}>{label}</div>}
      <TeamRow t={pair[0]} win={wi === 0} top pmFor={pmFor} />
      <TeamRow t={pair[1]} win={wi === 1} pmFor={pmFor} />
    </div>
  );
}

function BracketColumn({ title, matches, champion, onPick, pmFor }) {
  const champPm = champion ? (pmFor ? pmFor(champion.en, champion.pm) : champion.pm) : null;
  return (
    <div className="bkt-col">
      <div className="bkt-col-head" style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', textAlign: 'center', marginBottom: 'var(--s-4)' }}>{title}</div>
      <div className="bkt-col-body">
        {champion ? (
          <div className="bkt-match" style={{ background: 'var(--ink)', borderRadius: 'var(--r-10)', padding: '18px 16px', textAlign: 'center', boxShadow: 'var(--shadow-3)' }}>
            <div style={{ font: 'var(--label)', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>🏆 模型预测冠军</div>
            <div style={{ font: '600 22px/1 var(--sans)', color: '#fff' }}>{champion.zh}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 12 }}>
              <span style={{ font: '600 14px/1 var(--mono)', color: 'var(--accent)' }}>{champion.m}%<span style={{ font: 'var(--label)', color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>模型</span></span>
              <span style={{ font: '600 14px/1 var(--mono)', color: 'rgba(255,255,255,0.85)' }}>{champPm}¢<span style={{ font: 'var(--label)', color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>PM</span></span>
            </div>
          </div>
        ) : matches.map((p, i) => <MatchCard key={i} pair={p} onPick={onPick} pmFor={pmFor} />)}
      </div>
    </div>
  );
}

// derive knockout λ from each team's model strength, compute DC advance probabilities
function tieProbs(pair) {
  const a = pair[0], b = pair[1];
  const ra = a.m, rb = b.m;
  let la, lb;
  const P = window.WC_PARAMS;
  if (P && a.en && b.en && P.teams[a.en] && P.teams[b.en]) {
    const [aa, da] = P.teams[a.en], [ab, db] = P.teams[b.en];
    la = Math.exp(P.intercept + aa + db);   // 引擎精确 λ（中立场）
    lb = Math.exp(P.intercept + ab + da);
  } else {
    la = 0.85 + 1.25 * ra / (ra + rb);
    lb = 0.85 + 1.25 * rb / (ra + rb);
  }
  const { m, N } = window.computeDC(la, lb);
  const mk = window.deriveMarkets(m, N);
  // knockout: split draws ~evenly (extra time / penalties), nudged by strength
  const share = ra / (ra + rb);
  const advA = mk.home + mk.draw * (0.4 + 0.2 * share);
  return { m, N, la, lb, advA, advB: 1 - advA, mk };
}

// compact score-matrix heatmap for the popover
function MiniMatrix({ m, max, N, a, b }) {
  const cap = Math.min(N, 5);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `18px repeat(${cap + 1}, 1fr)`, gap: 2 }}>
      <span />
      {Array.from({ length: cap + 1 }, (_, j) => <span key={j} style={{ textAlign: 'center', font: '600 9px/1 var(--mono)', color: 'var(--muted)' }}>{j}</span>)}
      {Array.from({ length: cap + 1 }, (_, x) => [
        <span key={'r'+x} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 9px/1 var(--mono)', color: 'var(--muted)' }}>{x}</span>,
        ...Array.from({ length: cap + 1 }, (_, y) => {
          const p = m[x][y]; const al = Math.pow(p / max, 0.7);
          const bg = x === y ? `rgba(115,115,115,${0.06 + al * 0.5})` : x > y ? `rgba(184,71,45,${0.05 + al * 0.62})` : `rgba(46,139,87,${0.05 + al * 0.55})`;
          return <span key={x+'-'+y} style={{ aspectRatio: '1.5', borderRadius: 3, background: bg, color: al > 0.5 ? '#fff' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 9px/1 var(--mono)' }}>{(p*100).toFixed(0)}</span>;
        }),
      ])}
    </div>
  );
}

function TiePopover({ pair, onClose, pmFor }) {
  const d = useMemo6(() => tieProbs(pair), [pair]);
  useEffect6(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  let mx = 0; for (let i = 0; i <= d.N; i++) for (let j = 0; j <= d.N; j++) mx = Math.max(mx, d.m[i][j]);
  const a = pair[0], b = pair[1];
  const favA = d.advA >= d.advB;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(23,23,23,0.32)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 96vw)', background: 'var(--surface)', borderRadius: 'var(--r-14)', boxShadow: 'var(--shadow-pop)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--s-6) var(--s-6) var(--s-4)' }}>
          <div>
            <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' }}>淘汰赛对阵 · 模型推演</div>
            <div style={{ font: 'var(--h3)', marginTop: 6 }}>{a.zh} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>vs</span> {b.zh}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--hairline-strong)', background: 'var(--surface)', color: 'var(--muted-2)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>
        {/* advance split */}
        <div style={{ padding: '0 var(--s-6)' }}>
          <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
            <span style={{ width: `${d.advA*100}%`, background: 'var(--accent)' }} />
            <span style={{ width: `${d.advB*100}%`, background: 'var(--ink)', opacity: 0.82 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ font: '600 13px/1.3 var(--sans)' }}>{a.zh} 晋级 <span style={{ font: '600 14px/1 var(--mono)', color: favA ? 'var(--accent)' : 'var(--ink)' }}>{(d.advA*100).toFixed(1)}%</span></span>
            <span style={{ font: '600 13px/1.3 var(--sans)', textAlign: 'right' }}><span style={{ font: '600 14px/1 var(--mono)', color: !favA ? 'var(--accent)' : 'var(--ink)' }}>{(d.advB*100).toFixed(1)}%</span> {b.zh} 晋级</span>
          </div>
        </div>
        {/* 90min 1X2 + matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-5)', padding: 'var(--s-6)' }}>
          <div>
            <div style={{ font: 'var(--label)', color: 'var(--muted-2)', marginBottom: 8 }}>90 分钟 1X2</div>
            {[[a.zh + ' 胜', d.mk.home, 'var(--up)'], ['平 / 加时', d.mk.draw, 'var(--muted-2)'], [b.zh + ' 胜', d.mk.away, 'var(--down)']].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: '500 12px/1 var(--sans)' }}><span style={{ width: 7, height: 7, borderRadius: 999, background: c }} />{l}</span>
                <span style={{ font: '600 12px/1 var(--mono)' }}>{(v*100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ font: 'var(--label)', color: 'var(--muted-2)', marginBottom: 8 }}>比分矩阵 · λ {d.la.toFixed(2)}/{d.lb.toFixed(2)}</div>
            <MiniMatrix m={d.m} max={mx} N={d.N} a={a} b={b} />
          </div>
        </div>
        {/* footer: champ odds */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--s-5) var(--s-6)', borderTop: '1px solid var(--divider)', background: 'var(--panel-tint)', font: 'var(--label)', color: 'var(--muted-2)' }}>
          <span>夺冠概率 · 模型 / Polymarket</span>
          <span style={{ fontFamily: 'var(--mono)' }}>{a.zh} {a.m}% / {pmFor ? pmFor(a.en, a.pm) : a.pm}¢ · {b.zh} {b.m}% / {pmFor ? pmFor(b.en, b.pm) : b.pm}¢</span>
        </div>
      </div>
    </div>
  );
}

function Bracket() {
  const b = window.WC_BRACKET;
  const cmp = window.WC_ODDS_CMP;
  const [tie, setTie] = useState6(null);
  const [poly, setPoly] = useState6({ status: 'loading' });

  const loadPoly = React.useCallback(async () => {
    setPoly((p) => ({ ...p, status: p.odds ? 'refreshing' : 'loading' }));
    try {
      const d = await window.RF_fetchPolymarket();
      setPoly((p) => ({ status: 'live', asof: d.asof, odds: d.odds, prev: p.odds || null, count: d.count, volume: d.volume, url: d.url }));
    } catch (e) {
      setPoly((p) => (p.odds ? { ...p, status: 'live' } : { status: 'offline', error: e.message }));
    }
  }, []);

  useEffect6(() => {
    loadPoly();
    const id = setInterval(loadPoly, 90000);
    return () => clearInterval(id);
  }, [loadPoly]);

  // live cents for a team (by en name), falling back to the static snapshot value
  const pmFor = (en, fallback) => {
    if (poly.odds) { const v = poly.odds[(en || '').toLowerCase()]; if (v != null) return v; }
    return fallback;
  };
  const live = poly.status === 'live' && poly.odds;
  // odds-movement vs previous fetch (data4mula-style drift arrow), in cents
  const moveFor = (en) => {
    if (!poly.prev || !poly.odds) return 0;
    const k = (en || '').toLowerCase();
    if (poly.prev[k] == null || poly.odds[k] == null) return 0;
    return poly.odds[k] - poly.prev[k];
  };
  const cmpRows = cmp.map((d) => ({ ...d, pm: live ? pmFor(d.en, d.pm) : d.pm }));
  const maxCmp = Math.max(...cmpRows.flatMap(d => [d.m, d.pm]));
  return (
    <Section style={{ paddingTop: 'var(--s-12)', paddingBottom: 'var(--s-12)' }}>
      {tie && <TiePopover pair={tie} onClose={() => setTie(null)} pmFor={pmFor} />}
      <Groups />
      <div style={{ borderTop: '1px solid var(--hairline)', margin: '0 0 var(--s-12)' }} />
      <OfficialTree />
      <div style={{ borderTop: '1px solid var(--hairline)', margin: '0 0 var(--s-12)' }} />
      <SectionHead
        kicker="晋级树 · 模型路径 + 市场对比"
        title="从 16 强到冠军的模型路径"
        sub="每支球队标注模型夺冠概率与 Polymarket 实时隐含赔率（¢ = 美分隐含概率）。高模型概率者晋级，红色路径即模型预测的夺冠路线。点击任一对阵查看比分矩阵与晋级概率。"
      />

      {/* legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginBottom: 'var(--s-6)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--label)', color: 'var(--muted-2)' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-50)', border: '1px solid var(--accent-soft)' }} />模型晋级</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--label)', color: 'var(--muted-2)' }}><span style={{ font: '600 11px/1 var(--mono)', color: 'var(--accent)' }}>15%</span>模型夺冠概率</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--label)', color: 'var(--muted-2)' }}><span style={{ font: '600 11px/1 var(--mono)' }}>16¢</span>Polymarket 隐含</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, font: 'var(--label)', color: 'var(--muted)' }}>
          {['UEFA','CONMEBOL','AFC','CAF','CONCACAF'].map(c => (
            <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: confColor(c) }} />{c}</span>
          ))}
        </span>
      </div>

      {/* bracket scroller */}
      <div className="bkt-scroll" style={{ overflowX: 'auto', paddingBottom: 8, border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', background: 'var(--panel-tint)' }}>
        <div className="bkt-grid" style={{ display: 'flex', gap: 'var(--s-5)', padding: 'var(--s-6)', minWidth: 920 }}>
          <BracketColumn title="1/8 决赛 · 16 强" matches={b.r16} onPick={setTie} pmFor={pmFor} />
          <BracketColumn title="1/4 决赛" matches={b.qf} onPick={setTie} pmFor={pmFor} />
          <BracketColumn title="半决赛" matches={b.sf} onPick={setTie} pmFor={pmFor} />
          <BracketColumn title="决赛" matches={b.final} onPick={setTie} pmFor={pmFor} />
          <BracketColumn title="冠军" champion={b.champion} pmFor={pmFor} />
        </div>
      </div>

      {/* model vs polymarket comparison — LIVE */}
      <div style={{ marginTop: 'var(--s-10)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-5)', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ font: 'var(--h3)' }}>模型 vs Polymarket · 夺冠概率</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {live ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--label)', color: 'var(--pitch-deep)' }}>
                <span className="as-pulse-ring" style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--pitch)' }} />
                实时 · {poly.asof.toLocaleTimeString('zh-CN', { hour12: false })}
                {poly.volume ? <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>· 成交 ${(poly.volume / 1e6).toFixed(0)}M</span> : null}
              </span>
            ) : poly.status === 'offline' ? (
              <span style={{ font: 'var(--label)', color: 'var(--muted-2)' }}>离线快照 · {b.asof}</span>
            ) : (
              <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>拉取实时赔率…</span>
            )}
            <button onClick={loadPoly} disabled={poly.status === 'loading' || poly.status === 'refreshing'} title="刷新 Polymarket 赔率" style={{
              font: '500 12px/1 var(--font-head)', color: 'var(--ink-soft)', background: 'var(--surface)',
              border: '1px solid var(--hairline-strong)', borderRadius: 7, padding: '6px 11px', cursor: 'pointer',
              opacity: (poly.status === 'loading' || poly.status === 'refreshing') ? 0.5 : 1,
            }}>{poly.status === 'refreshing' ? '刷新中…' : '↻ 刷新'}</button>
            <a href={(poly.url) || 'https://polymarket.com/event/world-cup-winner'} target="_blank" rel="noreferrer" style={{ font: 'var(--label)', color: 'var(--accent)', fontFamily: 'var(--mono)', textDecoration: 'none' }}>Polymarket ↗</a>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          {cmpRows.map((d, i) => {
            const edge = d.m - d.pm;
            return (
              <div key={d.en} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 78px 56px', alignItems: 'center', gap: 16, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--divider)' }}>
                <span style={{ font: '500 14px/1.2 var(--sans)' }}>{d.zh} <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{d.en}</span></span>
                <div style={{ position: 'relative', height: 22 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: 9, width: `${(d.m / maxCmp) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, height: 9, width: `${(d.pm / maxCmp) * 100}%`, background: 'var(--ink)', borderRadius: 3, opacity: 0.85, transition: 'width var(--dur-slow) var(--ease-out)' }} />
                </div>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ font: '600 12px/1 var(--mono)', color: 'var(--accent)' }}>{d.m}%</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {live && Math.abs(moveFor(d.en)) >= 0.1 && (
                      <span style={{ font: '700 9px/1 var(--mono)', color: moveFor(d.en) > 0 ? 'var(--up)' : 'var(--down)' }}>{moveFor(d.en) > 0 ? '▲' : '▼'}{Math.abs(moveFor(d.en)).toFixed(1)}</span>
                    )}
                    <span style={{ font: '600 12px/1 var(--mono)', color: 'var(--ink-soft)' }}>{d.pm}¢</span>
                  </span>
                </span>
                <span title="模型 − 市场" style={{ font: '600 12px/1 var(--mono)', textAlign: 'right', color: Math.abs(edge) < 1 ? 'var(--muted)' : edge > 0 ? 'var(--up)' : 'var(--down)' }}>{edge > 0 ? '+' : ''}{edge.toFixed(1)}</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 18, marginTop: 'var(--s-5)', paddingTop: 'var(--s-4)', borderTop: '1px solid var(--divider)', font: 'var(--label)', color: 'var(--muted-2)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 9, borderRadius: 2, background: 'var(--accent)' }} />模型</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 9, borderRadius: 2, background: 'var(--ink)' }} />Polymarket{live ? ' · 实时' : ' · 快照'}</span>
            <span style={{ marginLeft: 'auto' }}>差值 = 模型% − 市场¢；正=模型更高，负=市场更高（市场含东道主/伤停信息）</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

Object.assign(window, { Bracket });

// ── Official 2026 knockout tree (R32 → Final · M73–M104)
function OffRound({ title, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--pitch-deep)', fontWeight: 700, marginBottom: 10, textAlign: 'left' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(16, 120px)', gap: 8 }}>{children}</div>
    </div>
  );
}

function OffConnector() {
  return <span style={{ position: 'absolute', right: -16, top: '50%', width: 16, borderTop: '1px solid var(--hairline-strong)' }} />;
}

function OffSlot({ s, top }) {
  const pad = top ? '8px 11px 6px' : '6px 11px 8px';
  if (s.third) {
    return (
      <div style={{ padding: pad, borderBottom: top ? '1px solid var(--divider)' : 'none' }}>
        <div style={{ font: '500 11px/1.3 var(--sans)', color: 'var(--muted-2)' }}>{s.lbl}</div>
        <div style={{ font: '500 11px/1.2 var(--mono)', color: 'var(--muted)', marginTop: 3 }}>候选 {s.third}</div>
      </div>
    );
  }
  return (
    <div style={{ padding: pad, borderBottom: top ? '1px solid var(--divider)' : 'none' }}>
      <div style={{ font: '500 11px/1.3 var(--sans)', color: 'var(--muted-2)' }}>{s.lbl}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
        <span style={{ font: '600 13px/1.2 var(--sans)', color: 'var(--ink)' }}>{s.zh}</span>
        <span style={{ font: '600 11px/1 var(--mono)', color: 'var(--accent)' }}>{s.pct}%</span>
      </div>
    </div>
  );
}

function OffR32Card({ m, row }) {
  return (
    <article style={{ gridRow: `${row} / span 1`, alignSelf: 'center', position: 'relative', minHeight: 56, background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-8)', boxShadow: 'var(--shadow-1)' }}>
      <div style={{ font: '700 10.5px/1 var(--mono)', color: 'var(--accent)', padding: '6px 11px 0' }}>M{m.no}</div>
      <OffSlot s={m.a} top />
      <OffSlot s={m.b} />
      <OffConnector />
    </article>
  );
}

function OffWinCard({ pair, row, span, final }) {
  const [no, x, y] = pair;
  return (
    <article style={{
      gridRow: `${row} / span ${span}`, alignSelf: 'center', position: 'relative', minHeight: 52,
      background: final ? 'linear-gradient(180deg, var(--accent-50), var(--surface))' : 'var(--surface)',
      border: '1px solid ' + (final ? 'var(--accent-soft)' : 'var(--hairline)'), borderRadius: 'var(--r-8)', boxShadow: final ? 'var(--shadow-2)' : 'var(--shadow-1)',
    }}>
      <div style={{ font: '700 10.5px/1 var(--mono)', color: 'var(--accent)', padding: '7px 11px 4px' }}>{final ? '🏆 M' : 'M'}{no}</div>
      <div style={{ font: '500 12px/1.4 var(--sans)', color: 'var(--muted-2)', padding: '0 11px' }}>胜 {x}</div>
      <div style={{ font: '500 12px/1.4 var(--sans)', color: 'var(--muted-2)', padding: '0 11px 8px' }}>胜 {y}</div>
      {!final && <OffConnector />}
    </article>
  );
}

function OfficialTree() {
  const t = window.WC_OFFICIAL_TREE;
  return (
    <div style={{ marginBottom: 'var(--s-12)' }}>
      <SectionHead
        kicker="官方淘汰赛树 · M73 → M104"
        title="从 32 强到决赛的官方路径图"
        sub="左侧是官方 R32 入口槽位，向右逐轮汇入 M104 决赛。入口处的球队与概率为 4 万届模拟中最可能占用该槽位者（最可能、非锁定落位）；16 强及之后保持「胜 N」结构——越往后某条具体路径真实发生的概率越低，填死会假装确定。"
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', marginBottom: 'var(--s-6)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--label)', color: 'var(--muted-2)' }}><span style={{ font: '600 11px/1 var(--mono)', color: 'var(--accent)' }}>39%</span>该槽位最可能占用球队</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--label)', color: 'var(--muted-2)' }}>「最佳第三 候选」按官方约束从 8 个最好第三名合法匹配，不单列球队</span>
        <span style={{ marginLeft: 'auto', font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{t.sims}届 · {t.asof}</span>
      </div>
      <div className="bkt-scroll" style={{ overflowX: 'auto', paddingBottom: 8, border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', background: 'var(--panel-tint)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(178px, 1fr))', gap: 16, minWidth: 1040, padding: 'var(--s-7) var(--s-7) var(--s-6)', backgroundImage: 'repeating-linear-gradient(90deg, color-mix(in srgb, var(--pitch) 3.5%, transparent) 0, color-mix(in srgb, var(--pitch) 3.5%, transparent) 113px, transparent 113px, transparent 226px)' }}>
          <OffRound title="32 强">
            {t.r32.map((m, i) => <OffR32Card key={m.no} m={m} row={i + 1} />)}
          </OffRound>
          <OffRound title="16 强">
            {t.r16.map((p, i) => <OffWinCard key={p[0]} pair={p} row={2 * i + 1} span={2} />)}
          </OffRound>
          <OffRound title="1/4 决赛">
            {t.qf.map((p, i) => <OffWinCard key={p[0]} pair={p} row={4 * i + 1} span={4} />)}
          </OffRound>
          <OffRound title="半决赛">
            {t.sf.map((p, i) => <OffWinCard key={p[0]} pair={p} row={8 * i + 1} span={8} />)}
          </OffRound>
          <OffRound title="决赛">
            <OffWinCard pair={t.final} row={1} span={16} final />
          </OffRound>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OfficialTree });

// ── Group-stage qualifying favorites (组 A–L)
function GroupTeamLine({ t, lead }) {
  return (
    <div style={{ padding: '9px 0', borderTop: lead ? 'none' : '1px solid var(--divider)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ flex: '0 0 auto', width: 16, height: 16, borderRadius: 4, background: lead ? 'var(--accent)' : 'var(--bg-shade)', color: lead ? '#fff' : 'var(--muted-2)', font: '700 10px/16px var(--mono)', textAlign: 'center' }}>{lead ? 1 : 2}</span>
          <span style={{ font: lead ? '600 14px/1.2 var(--sans)' : '500 14px/1.2 var(--sans)', color: lead ? 'var(--ink)' : 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{t.zh}</span>
          <span style={{ font: 'var(--label)', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.en}</span>
        </span>
        {lead
          ? <span style={{ flex: '0 0 auto', font: '600 12px/1 var(--mono)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>头名 {t.top}%</span>
          : <span style={{ flex: '0 0 auto', font: '500 11px/1 var(--mono)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>次名候选</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
        <span style={{ flex: 1, height: 5, background: 'var(--pitch-50)', borderRadius: 3, overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: `${t.adv}%`, background: 'var(--pitch)', opacity: lead ? 1 : 0.62, borderRadius: 3 }} />
        </span>
        <span style={{ flex: '0 0 auto', font: '600 11px/1 var(--mono)', color: 'var(--pitch-deep)', minWidth: 56, textAlign: 'right' }}>出线 {t.adv}%</span>
      </div>
    </div>
  );
}

function GroupCard({ d }) {
  return (
    <div className="grp-card" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-5) var(--s-6) var(--s-5)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--s-3)' }}>
        <span style={{ font: '700 13px/1 var(--mono)', color: 'var(--accent)', letterSpacing: '0.04em' }}>组 {d.g}</span>
        <span style={{ font: 'var(--label)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>出线热门</span>
      </div>
      <GroupTeamLine t={d.lead} lead />
      <GroupTeamLine t={d.run} />
    </div>
  );
}

function Groups() {
  const gs = window.WC_GROUPS;
  return (
    <div style={{ marginBottom: 'var(--s-12)' }}>
      <SectionHead
        kicker="小组赛 · 官方分组 A–L"
        title="各小组出线热门"
        sub="每组头名概率最高者（实心）与出线概率次高者。东道主墨西哥 / 加拿大默认中立场，未额外加东道主主场——该假设无法严谨 OOS 回测，默认关闭。"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(282px, 1fr))', gap: 'var(--s-5)' }}>
        {gs.map((d) => <GroupCard key={d.g} d={d} />)}
      </div>
    </div>
  );
}

Object.assign(window, { Groups });
