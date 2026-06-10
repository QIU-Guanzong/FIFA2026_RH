/* global React, Section, SectionHead, Sparkline */
// wcpredict — sections part 3: Backtest, XG, Modules, Boundaries, Footer

// ── Backtest honesty
function Backtest() {
  const rows = window.WC_BACKTEST;
  const confed = window.WC_CONFED;
  const cMax = Math.max(...confed), cMin = Math.min(...confed);
  return (
    <Section id="backtest" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead
        kicker="无泄漏 walk-forward 回测 · #2"
        title="略逊于锐盘，才是健康信号"
        sub="预测第 i 场只用日期严格早于该场的比赛拟合（同日也排除）。若简单模型样本外击败 Pinnacle，几乎一定是泄漏。"
      />
      <div className="bt-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--s-6)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-5)' }}>
            <h3 style={{ font: 'var(--h3)' }}>英超三季 · 950 场持出</h3>
            <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>vs Pinnacle 赛前去水位</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ font: 'var(--label)', color: 'var(--muted-2)', textAlign: 'right' }}>
                <th style={{ textAlign: 'left', fontWeight: 500, paddingBottom: 10 }}>predictor</th>
                <th style={{ fontWeight: 500, paddingBottom: 10 }}>log loss</th>
                <th style={{ fontWeight: 500, paddingBottom: 10 }}>Brier</th>
                <th style={{ fontWeight: 500, paddingBottom: 10 }}>vs 市场</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} style={{ borderTop: '1px solid var(--divider)' }}>
                  <td style={{ padding: '13px 0', font: '500 14px/1.2 var(--sans)' }}>
                    {r.kind === 'market' && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 999, background: 'var(--ink)', marginRight: 8, verticalAlign: 'middle' }} />}
                    {r.name}
                  </td>
                  <td style={{ textAlign: 'right', font: '600 14px/1 var(--mono)', color: r.kind === 'market' ? 'var(--ink)' : 'var(--ink-soft)' }}>{r.logloss.toFixed(4)}</td>
                  <td style={{ textAlign: 'right', font: '500 13px/1 var(--mono)', color: 'var(--muted-2)' }}>{r.brier.toFixed(4)}</td>
                  <td style={{ textAlign: 'right', font: '500 13px/1 var(--mono)', color: r.kind === 'market' ? 'var(--muted)' : 'var(--down)' }}>{r.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 'var(--s-5)', paddingTop: 'var(--s-5)', borderTop: '1px solid var(--divider)' }}>
            原始 MLE DC 样本外反而不如带收缩性质的 Elo 先验——已排除优化器未收敛，这是真实的泛化差距：小样本下逐队 att/def 的 MLE 方差偏大。
          </p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' }}>洲际通胀修正 · #6</div>
          <h3 style={{ font: 'var(--h3)', marginTop: 8 }}>多趟暖启动</h3>
          <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 8 }}>国际赛 17,039 场持出 · log loss 随 passes 单调下降</p>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', margin: '18px 0' }}>
            <div style={{ width: '100%' }}>
              <Sparkline data={confed.map(v => -v)} color="var(--down)" height={70} fill />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 'var(--s-4)', borderTop: '1px solid var(--divider)' }}>
            <div>
              <div style={{ font: 'var(--label)', color: 'var(--muted)' }}>pass 1</div>
              <div style={{ font: '600 18px/1 var(--mono)' }}>{cMax.toFixed(4)}</div>
            </div>
            <span style={{ color: 'var(--down)', fontSize: 18 }}>↓</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: 'var(--label)', color: 'var(--muted)' }}>pass 5</div>
              <div style={{ font: '600 18px/1 var(--mono)', color: 'var(--down)' }}>{cMin.toFixed(4)}</div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Self-built xG
function XG() {
  const rows = window.WC_XG;
  const coef = window.WC_XG_COEF;
  const maxLL = Math.max(...rows.map(r => r.logloss));
  return (
    <Section id="xg" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead
        kicker="自建 shot-level xG · #5 Part A"
        title="4 个可解释特征，关闭 62% 的差距"
        sub="StatsBomb 开放事件数据 → 几何特征 → 可解释逻辑回归（scipy，非黑箱）。真值是进球，不是 statsbomb_xg——后者只作二级核对，模型绝不向它对齐。"
      />
      <div className="xg-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 'var(--s-6)' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-5)' }}>
            <h3 style={{ font: 'var(--h3)' }}>WC2022 留出校准</h3>
            <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>16 场 / 382 射门 · 对真实进球</span>
          </div>
          {rows.map((r) => (
            <div key={r.name} style={{ padding: '14px 0', borderTop: '1px solid var(--divider)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                <span style={{ font: r.highlight ? '600 14px/1 var(--sans)' : '500 14px/1 var(--sans)', color: r.highlight ? 'var(--accent)' : 'var(--ink)' }}>{r.name}</span>
                <span style={{ display: 'flex', gap: 16, font: '500 13px/1 var(--mono)', color: 'var(--muted-2)' }}>
                  <span>Brier {r.brier.toFixed(4)}</span>
                  <span>ECE {r.ece}</span>
                  <span style={{ font: '600 14px/1 var(--mono)', color: r.highlight ? 'var(--accent)' : 'var(--ink)', minWidth: 52, textAlign: 'right' }}>{r.logloss.toFixed(4)}</span>
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-shade)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(r.logloss/maxLL)*100}%`, height: '100%', background: r.highlight ? 'var(--accent)' : 'var(--ink)', opacity: r.highlight ? 1 : 0.45, borderRadius: 3 }} />
              </div>
            </div>
          ))}
          <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.6, marginTop: 'var(--s-5)', paddingTop: 'var(--s-5)', borderTop: '1px solid var(--divider)' }}>
            log loss 越低越好。本模型用 4 个特征关闭了"基线→statsbomb"差距的 62%；statsbomb（约 20 特征+ML）仍更优，符合预期，本模型不向其对齐。
          </p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          <h3 style={{ font: 'var(--h3)', marginBottom: 6 }}>系数符号皆合常识</h3>
          <p style={{ font: 'var(--small)', color: 'var(--muted-2)', marginBottom: 'var(--s-5)' }}>门口张角经逐样本手算核验</p>
          {coef.map((c) => {
            const pos = c.sign.startsWith('+');
            return (
              <div key={c.feat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--divider)' }}>
                <div>
                  <div style={{ font: '500 14px/1.1 var(--sans)' }}>{c.feat}</div>
                  <div style={{ font: 'var(--label)', color: 'var(--muted)', marginTop: 3 }}>{c.note}</div>
                </div>
                <span style={{ font: '600 14px/1 var(--mono)', color: pos ? 'var(--up)' : 'var(--down)', padding: '4px 9px', borderRadius: 6, background: pos ? 'var(--up-bg)' : 'var(--down-bg)' }}>{c.sign}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ── Module map
function Modules() {
  const mods = window.WC_MODULES;
  return (
    <Section id="modules" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead kicker="模块地图" title="每个模块各司其职" sub="模型层与数据来源解耦：规范 schema 统一比赛/赔率列，采集器换插点即可。" />
      <div className="mod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-3)' }}>
        {mods.map((m) => (
          <div key={m.id} style={{
            background: m.heart ? 'var(--accent-50)' : 'var(--surface)', border: `1px solid ${m.heart ? 'var(--accent-soft)' : 'var(--hairline)'}`,
            borderRadius: 'var(--r-8)', padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'flex-start',
            transition: 'border-color var(--dur-fast) var(--ease)',
          }} onMouseEnter={e => { if(!m.heart) e.currentTarget.style.borderColor = 'var(--hairline-strong)'; }}
             onMouseLeave={e => { if(!m.heart) e.currentTarget.style.borderColor = 'var(--hairline)'; }}>
            <code style={{ font: '500 11.5px/1.4 var(--mono)', color: m.heart ? 'var(--accent-deep)' : 'var(--muted-2)', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 2, minWidth: 150 }}>{m.id}</code>
            <div>
              <div style={{ font: '600 14px/1.2 var(--sans)', color: m.heart ? 'var(--accent-deep)' : 'var(--ink)' }}>{m.role}{m.heart && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>♥</span>}</div>
              <div style={{ font: 'var(--small)', color: 'var(--muted-2)', marginTop: 5, lineHeight: 1.5 }}>{m.note}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Honesty / boundaries
function Boundaries() {
  const h = window.WC_HONESTY;
  const cols = [
    { key: 'real', title: '真实且已测试', dot: 'var(--down)', items: h.real },
    { key: 'approx', title: '刻意的近似 · 偏差已标注', dot: 'var(--warn)', items: h.approx },
    { key: 'deferred', title: '后置 · 下一轮', dot: 'var(--muted)', items: h.deferred },
  ];
  return (
    <Section style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)' }}>
      <SectionHead kicker="诚实清单" title="哪些是真的 / 近似的 / 后置的" sub="对世界杯这种任务，最值钱的不是花哨，而是概率校准、信息截止纪律、与市场相比的长期边际优势。" />
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

// ── Footer / quick start
function Footer() {
  const cmds = window.WC_CMDS;
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
              世界杯比分概率预测主干（MVP）。rating 先验 + Dixon-Coles + 去水位校准 + 全赛会 Monte Carlo。当前数据层用合成数据驱动——验证"机器算得对"，真实校准结论须接真实数据 + 严格 cutoff 回测后才下。
            </p>
            <a href="https://github.com/QIU-Guanzong/FIFA2026_RH" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 'var(--s-6)', font: '500 13px/1 var(--sans)', color: 'var(--ink-inverted)', background: 'var(--ink)', textDecoration: 'none', padding: '11px 18px', borderRadius: 7 }}>GitHub · QIU-Guanzong/FIFA2026_RH →</a>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'var(--s-5)' }}>
              {[
                ['FIFA 官网 · 2026', 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026'],
                ['Polymarket · 世界杯', 'https://polymarket.com/predictions/2026-fifa-world-cup'],
                ['Polymarket · 冠军盘', 'https://polymarket.com/event/world-cup-winner'],
              ].map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" style={{
                  font: '500 12px/1 var(--sans)', color: 'var(--ink-soft)', textDecoration: 'none',
                  border: '1px solid var(--hairline-strong)', background: 'var(--surface)',
                  padding: '8px 12px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap',
                }}>{label} ↗</a>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--ink)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)', overflow: 'hidden' }}>
            <div style={{ font: 'var(--label)', color: 'rgba(255,255,255,0.5)', marginBottom: 'var(--s-4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>快速开始 · CLI</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {cmds.map((c) => (
                <div key={c.cmd} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <code style={{ font: '500 13px/1.4 var(--mono)', color: '#fff', whiteSpace: 'nowrap' }}><span style={{ color: 'rgba(255,255,255,0.35)' }}>$ </span>{c.cmd}</code>
                  <span style={{ font: 'var(--label)', color: 'rgba(255,255,255,0.45)', textAlign: 'right', marginLeft: 'auto' }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--s-10)', paddingTop: 'var(--s-6)', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>RedFootball · 2026 · 数据来源 StatsBomb Open Data / football-data.co.uk / martj42</span>
          <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>V1.20260516.104</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Backtest, XG, Modules, Boundaries, Footer });
