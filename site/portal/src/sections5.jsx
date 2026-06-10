/* global React, Section, SectionHead, computeDC, deriveMarkets */
// wcpredict — sections part 5: ValueBets (model vs market edge + 下注建议)

const { useMemo: useMemo5 } = React;

function buildOpportunities() {
  const out = [];
  window.WC_MATCHES.forEach((mt) => {
    const { m, N } = window.computeDC(mt.lh, mt.la);
    const mk = window.deriveMarkets(m, N);
    const legs = [
      { label: `${mt.home} 胜`, type: '1X2', model: mk.home, market: mt.market.home },
      { label: '平局', type: '1X2', model: mk.draw, market: mt.market.draw },
      { label: `${mt.away} 胜`, type: '1X2', model: mk.away, market: mt.market.away },
      { label: '大 2.5', type: 'O/U', model: mk.over, market: mt.market.over },
      { label: 'BTTS 是', type: 'BTTS', model: mk.btts, market: mt.market.btts },
    ];
    legs.forEach((l) => {
      const edge = l.model - l.market;          // model disagreement vs market (pp)
      const fairOdds = 1 / l.model;             // model fair price
      const mktOdds = 1 / l.market;             // market price (devigged proxy)
      const kelly = (l.model - l.market) / (1 - l.market); // full-Kelly fraction
      out.push({ match: `${mt.home} vs ${mt.away}`, stage: mt.stage, ...l, edge, fairOdds, mktOdds, kelly });
    });
  });
  return out.sort((a, b) => b.edge - a.edge);
}

function ValueBets() {
  const all = useMemo5(buildOpportunities, []);
  const value = all.filter((o) => o.edge >= 0.02);

  return (
    <Section style={{ paddingTop: 'var(--s-12)', paddingBottom: 'var(--s-12)' }}>
      <SectionHead
        kicker="下注建议 · 模型 vs 市场价值分析"
        title="只在模型与市场分歧时出手"
        sub="赔率去水位后，用模型概率减去市场隐含概率得到 edge。正 edge 才有价值；建议仓位按 1/4 Kelly 给出。长期边际优势来自纪律，而非单场命中。"
      />

      {/* disclaimer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 'var(--r-8)', background: 'var(--warn-bg)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)', marginBottom: 'var(--s-8)' }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--warn)', flexShrink: 0 }} />
        <span style={{ font: 'var(--small)', color: 'var(--ink-soft)' }}>仅供研究 · 模型与市场价格对比，非投注建议。数据为合成/验证链路，理性对待风险。</span>
      </div>

      {/* top value picks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s-5)', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ font: 'var(--h3)' }}>价值机会 · 按 edge 排序</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{value.length} 个 · edge ≥ +2.0pp</span>
          <a href="https://polymarket.com/sports/world-cup/games" target="_blank" rel="noreferrer" style={{ font: '500 12px/1 var(--sans)', color: 'var(--ink-inverted)', background: 'var(--ink)', textDecoration: 'none', padding: '9px 14px', borderRadius: 7, whiteSpace: 'nowrap' }}>在 Polymarket 下注 ↗</a>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', overflow: 'hidden', marginBottom: 'var(--s-8)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.9fr 1.1fr', padding: '13px 20px', font: 'var(--label)', color: 'var(--muted-2)', background: 'var(--panel-tint)', borderBottom: '1px solid var(--hairline)' }}>
          <span>对阵 / 选项</span><span>市场</span><span style={{ textAlign: 'right' }}>模型</span><span style={{ textAlign: 'right' }}>市场</span><span style={{ textAlign: 'right' }}>edge</span><span style={{ textAlign: 'right' }}>建议仓位 ¼K</span>
        </div>
        {value.map((o, i) => {
          const stake = Math.max(0, o.kelly * 0.25);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.9fr 1.1fr', padding: '15px 20px', alignItems: 'center', borderBottom: i < value.length - 1 ? '1px solid var(--divider)' : 'none' }}>
              <span>
                <div style={{ font: '600 14px/1.2 var(--sans)' }}>{o.label}</div>
                <div style={{ font: 'var(--label)', color: 'var(--muted)', marginTop: 3 }}>{o.match} · {o.stage}</div>
              </span>
              <span style={{ font: '500 12px/1 var(--mono)', color: 'var(--muted-2)' }}>
                <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, background: 'var(--bg-shade)' }}>{o.type}</span>
              </span>
              <span style={{ textAlign: 'right', font: '600 14px/1 var(--mono)' }}>{(o.model * 100).toFixed(1)}%</span>
              <span style={{ textAlign: 'right', font: '500 13px/1 var(--mono)', color: 'var(--muted-2)' }}>{(o.market * 100).toFixed(1)}%</span>
              <span style={{ textAlign: 'right', font: '600 14px/1 var(--mono)', color: 'var(--up)' }}>+{(o.edge * 100).toFixed(1)}</span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ font: '600 13px/1 var(--mono)', color: 'var(--accent)' }}>{(stake * 100).toFixed(1)}%</span>
                <span style={{ display: 'inline-block', marginLeft: 8, font: 'var(--label)', color: 'var(--muted)' }}>@{o.mktOdds.toFixed(2)}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* full scan — edge dot strip per match */}
      <div className="vb-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-5)' }}>
        {window.WC_MATCHES.map((mt) => {
          const legs = all.filter((o) => o.match === `${mt.home} vs ${mt.away}`);
          return (
            <div key={mt.id} style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-5)' }}>
                <span style={{ font: '600 15px/1 var(--sans)' }}>{mt.home} <span style={{ color: 'var(--muted)' }}>vs</span> {mt.away}</span>
                <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{mt.stage}</span>
              </div>
              {legs.map((o) => {
                const pos = o.edge >= 0;
                const w = Math.min(100, Math.abs(o.edge) * 100 * 6);
                return (
                  <div key={o.label} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 52px', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                    <span style={{ font: '500 13px/1.2 var(--sans)', color: 'var(--ink-soft)' }}>{o.label}</span>
                    <span style={{ position: 'relative', height: 6, background: 'var(--bg-shade)', borderRadius: 3 }}>
                      <span style={{ position: 'absolute', left: '50%', top: -2, width: 1, height: 10, background: 'var(--hairline-strong)' }} />
                      <span style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 3,
                        left: pos ? '50%' : `calc(50% - ${w / 2}%)`, width: `${w / 2}%`,
                        background: pos ? 'var(--up)' : 'var(--down)' }} />
                    </span>
                    <span style={{ textAlign: 'right', font: '600 12px/1 var(--mono)', color: pos ? 'var(--up)' : 'var(--down)' }}>{pos ? '+' : ''}{(o.edge * 100).toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

Object.assign(window, { ValueBets });
