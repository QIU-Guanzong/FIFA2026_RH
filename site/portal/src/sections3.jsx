/* global React, Section, SectionHead, Sparkline */
// wcpredict — sections part 3: 可信度, Boundaries, Footer (fan-facing)

// ── Why it's trustworthy (plain-language credibility)
function Backtest() {
  const confed = window.WC_CONFED;
  const cMax = Math.max(...confed), cMin = Math.min(...confed);
  const points = [
    { t: '概率会校准', d: '说一件事有 30% 的把握，长期来看就该真的发生约 30% 的时候——不夸大、不缩水。' },
    { t: '不偷看未来', d: '预测每一场，只用比赛开始前已经知道的信息，绝不拿赛后结果倒推。' },
    { t: '彼此自洽', d: '胜平负、大小球、让球、波胆都由同一张比分概率表换算，永远不会自相矛盾。' },
  ];
  return (
    <Section id="backtest" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead
        kicker="可信度"
        title="为什么这套预测值得一看"
        sub="我们用过去几个赛季的真实比赛逐场检验过，并和博彩市场的赔率长期对比。目标不是“比庄家更准”，而是概率诚实、长期稳定。"
      />
      <div className="bt-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--s-6)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          <h3 style={{ font: 'var(--h3)', marginBottom: 'var(--s-5)' }}>三条底线</h3>
          {points.map((p, i) => (
            <div key={p.t} style={{ display: 'flex', gap: 14, padding: '16px 0', borderTop: i === 0 ? 'none' : '1px solid var(--divider)' }}>
              <span style={{ font: '600 14px/1.4 var(--mono)', color: 'var(--accent)', flexShrink: 0, width: 22 }}>{String(i+1).padStart(2,'0')}</span>
              <div>
                <div style={{ font: '600 15px/1.3 var(--sans)' }}>{p.t}</div>
                <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 6 }}>{p.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' }}>越练越准</div>
          <h3 style={{ font: 'var(--h3)', marginTop: 8 }}>误差稳步下降</h3>
          <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 8 }}>喂入越多历史比赛，预测和真实结果的差距就越小。</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', margin: '18px 0' }}>
            <div style={{ width: '100%' }}>
              <Sparkline data={confed.map(v => -v)} color="var(--down)" height={70} fill />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 'var(--s-4)', borderTop: '1px solid var(--divider)' }}>
            <div>
              <div style={{ font: 'var(--label)', color: 'var(--muted)' }}>起步</div>
              <div style={{ font: '600 18px/1 var(--mono)' }}>{cMax.toFixed(3)}</div>
            </div>
            <span style={{ color: 'var(--down)', fontSize: 18 }}>↓</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: 'var(--label)', color: 'var(--muted)' }}>打磨后</div>
              <div style={{ font: '600 18px/1 var(--mono)', color: 'var(--down)' }}>{cMin.toFixed(3)}</div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Self-built xG (kept defined for compatibility; not rendered in the fan-facing tab)
function XG() {
  const rows = window.WC_XG;
  const coef = window.WC_XG_COEF;
  const maxLL = Math.max(...rows.map(r => r.logloss));
  return (
    <Section id="xg" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead kicker="进球质量模型" title="不止看进了几个，更看机会有多好" sub="评估每次射门的得分概率，把“运气”和“真实实力”区分开。" />
      <div className="xg-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--s-6)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          {rows.map((r) => (
            <div key={r.name} style={{ padding: '14px 0', borderTop: '1px solid var(--divider)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <span style={{ font: r.highlight ? '600 14px/1 var(--sans)' : '500 14px/1 var(--sans)', color: r.highlight ? 'var(--accent)' : 'var(--ink)' }}>{r.name}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-shade)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(r.logloss/maxLL)*100}%`, height: '100%', background: r.highlight ? 'var(--accent)' : 'var(--ink)', opacity: r.highlight ? 1 : 0.45, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          {coef.map((c) => (
            <div key={c.feat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--divider)' }}>
              <div style={{ font: '500 14px/1.1 var(--sans)' }}>{c.feat}</div>
              <div style={{ font: 'var(--label)', color: 'var(--muted)' }}>{c.note}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Module map (kept defined for compatibility; not rendered in the fan-facing tab)
function Modules() {
  const mods = window.WC_MODULES || [];
  return (
    <Section id="modules" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead kicker="模块地图" title="每个模块各司其职" />
      <div className="mod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-3)' }}>
        {mods.map((m) => (
          <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-8)', padding: '16px 18px' }}>
            <div style={{ font: '600 14px/1.2 var(--sans)' }}>{m.role}</div>
            <div style={{ font: 'var(--small)', color: 'var(--muted-2)', marginTop: 5, lineHeight: 1.5 }}>{m.note}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Honesty / what's estimated (fan-facing)
function Boundaries() {
  const h = window.WC_HONESTY;
  const cols = [
    { key: 'real', title: '为什么靠谱', dot: 'var(--down)', items: h.real },
    { key: 'approx', title: '我们如实标注的估算', dot: 'var(--warn)', items: h.approx },
    { key: 'deferred', title: '还在打磨', dot: 'var(--muted)', items: h.deferred },
  ];
  return (
    <Section style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)' }}>
      <SectionHead kicker="我们对你诚实" title="哪些是算准的，哪些是估的" sub="一个好的预测，不是把每件事都说死，而是把握得住的就讲清楚，拿不准的就如实标出来。" />
      <div className="bound-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-5)' }}>
        {cols.map((c) => (
          <div key={c.key} style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 'var(--s-5)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: c.dot }} />
              <span style={{ font: '600 14px/1 var(--sans)' }}>{c.title}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
              {c.items.map((it, i) => (
                <li key={i} style={{ font: 'var(--small)', color: 'var(--ink-soft)', lineHeight: 1.55, paddingLeft: 16, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, top: 7, width: 5, height: 5, borderRadius: 999, background: c.dot, opacity: 0.5 }} />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Footer + embedded sponsor CTA
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--hairline)', marginTop: 'var(--s-12)', background: 'var(--panel-tint)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'var(--s-16) 28px var(--s-10)' }}>
        <div className="foot-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 'var(--s-12)', alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 'var(--s-5)' }}>
              <window.BrandMark size={26} />
              <span style={{ font: '700 19px/1 var(--sans)', letterSpacing: '-0.02em' }}>Red<span style={{ color: 'var(--accent)' }}>Football</span></span>
            </div>
            <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.65, maxWidth: 340 }}>
              覆盖 48 支球队、104 场比赛的 2026 世界杯免费预测。胜平负、大小球、让球、波胆，出线与夺冠概率，一站看齐。
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'var(--s-6)' }}>
              {[
                ['FIFA 官网 · 2026', 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026'],
                ['Polymarket · 世界杯', 'https://polymarket.com/predictions/2026-fifa-world-cup'],
              ].map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" style={{
                  font: '500 12px/1 var(--sans)', color: 'var(--ink-soft)', textDecoration: 'none',
                  border: '1px solid var(--hairline-strong)', background: 'var(--surface)',
                  padding: '8px 12px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap',
                }}>{label} ↗</a>
              ))}
            </div>
          </div>
          <a href="https://redhorsehk.ai/" target="_blank" rel="noopener noreferrer" className="rh-ad" style={{
            display: 'block', textDecoration: 'none', background: 'var(--accent)', borderRadius: 'var(--r-14)', padding: 'var(--s-8)',
            transition: 'box-shadow var(--dur-fast) var(--ease)', boxShadow: '0 10px 30px color-mix(in srgb, var(--accent) 30%, transparent)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '700 15px/1 var(--sans)' }}>赤</span>
              <span style={{ font: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)' }}>赞助 · 赤兔AI · RedHorse</span>
            </div>
            <div style={{ font: '600 22px/1.3 var(--sans)', color: '#fff', letterSpacing: '-0.01em' }}>想要香港赛马的 AI 预测？</div>
            <p style={{ font: 'var(--small)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, margin: '10px 0 18px', maxWidth: 380 }}>
              赤兔AI（RedHorse）：14 年历史数据 + EV 量化 + Kelly 资金管理，香港 HKJC 沙田・跑马地实时赔率与 AI 预测。
            </p>
            <span className="rh-cta" style={{ display: 'inline-block', font: '600 14px/1 var(--sans)', color: 'var(--accent)', background: '#fff', padding: '12px 22px', borderRadius: 8 }}>前往 redhorsehk.ai →</span>
          </a>
        </div>
        <div style={{ marginTop: 'var(--s-10)', paddingTop: 'var(--s-6)', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>RedFootball · 2026 · 预测仅供参考，不构成任何投注建议</span>
          <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>数据更新于 2026-06-04</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Backtest, XG, Modules, Boundaries, Footer });
