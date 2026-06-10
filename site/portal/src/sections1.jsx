/* global React, Sparkline, HBar */
// wcpredict — sections part 1: Nav, Hero, ChampionBoard, Pipeline

const { useState: useState1, useEffect: useEffect1 } = React;
const RF_SIMS_WAN = Math.round((((window.RF_ENGINE || {}).sims) || 40000) / 10000);  // 引擎模拟届数（万）

// ── Brand mark: RedFootball — red soccer ball with white classic panels
function BrandMark({ size = 30, spin = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={`rf-ball ${spin ? 'rf-spin' : ''}`} style={{ display: 'block' }}>
      <circle cx="16" cy="16" r="14.5" fill="var(--accent)" stroke="var(--accent-deep)" strokeWidth="1" />
      {/* spokes from center pentagon to edge */}
      <g stroke="#fff" strokeWidth="1.7" strokeLinecap="round" opacity="0.92">
        <line x1="16" y1="11.2" x2="16" y2="3.6" />
        <line x1="20.57" y1="14.52" x2="27.7" y2="12.2" />
        <line x1="18.82" y1="19.88" x2="23.2" y2="25.9" />
        <line x1="13.18" y1="19.88" x2="8.8" y2="25.9" />
        <line x1="11.43" y1="14.52" x2="4.3" y2="12.2" />
      </g>
      {/* edge panels */}
      <g fill="#fff" opacity="0.92">
        <path d="M16 2.5 l2.4 1.9 -0.9 2.9 -3 0 -0.9 -2.9 Z" />
        <path d="M28.6 11.4 l0.7 3 -2.4 1.9 -2.4 -1.8 0.9 -2.9 Z" />
        <path d="M23.9 26.7 l-2.9 0.9 -1.9 -2.4 1.5 -2.6 3 0.2 Z" />
        <path d="M8.1 26.7 l-1.7 -2.9 1.9 -2.4 2.9 0.9 0 3 Z" />
        <path d="M3.4 11.4 l3 -0.9 1.9 2.4 -1.5 2.6 -2.7 0 Z" />
      </g>
      {/* center pentagon */}
      <path d="M16 11.2 L20.57 14.52 L18.82 19.88 L13.18 19.88 L11.43 14.52 Z" fill="#fff" />
    </svg>
  );
}

function Eyebrow({ children }) {
  return <div style={{ font: 'var(--eyebrow)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>{children}</div>;
}

// Section wrapper with consistent rhythm + scroll-reveal
function Section({ id, children, style }) {
  return <section id={id} className="reveal" data-reveal style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', ...style }}>{children}</section>;
}

// Count-up number — animates 0→target when timeline runs; defaults to final value if frozen
function CountUp({ end, decimals = 0, suffix = '', dur = 900 }) {
  const [v, setV] = useState1(end);
  useEffect1(() => {
    let raf; let t0 = null;
    const tick = (t) => {
      if (t0 === null) t0 = t;
      const k = Math.max(0, Math.min(1, (t - t0) / dur));
      setV(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end]);
  return <span>{v.toFixed(decimals)}{suffix}</span>;
}

function SectionHead({ kicker, title, sub }) {
  return (
    <div style={{ marginBottom: 'var(--s-8)', maxWidth: 720 }}>
      <Eyebrow>{kicker}</Eyebrow>
      <h2 style={{ font: 'var(--h1)', letterSpacing: '-0.02em', marginTop: 10 }}>{title}</h2>
      {sub && <p style={{ color: 'var(--muted-2)', marginTop: 12, fontSize: 'var(--fs-15)', lineHeight: 1.6 }}>{sub}</p>}
    </div>
  );
}

// ── Top navigation + tabs
const WC_TABS = [
  ['overview', '总览'],
  ['schedule', '赛程'],
  ['match', '单场预测'],
  ['tree', '晋级树'],
  ['bets', '下注建议'],
  ['method', '方法 & 回测'],
];

function Nav({ tab, setTab }) {
  const [dark, setDark] = useState1(false);
  useEffect1(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
      backdropFilter: 'saturate(180%) blur(12px)', WebkitBackdropFilter: 'saturate(180%) blur(12px)',
      borderBottom: '1px solid var(--hairline)',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', gap: 'var(--s-6)' }}>
        <button onClick={() => setTab('overview')} className="rf-brand" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0 }}>
          <BrandMark size={26} />
          <span style={{ font: '700 17px/1 var(--sans)', letterSpacing: '-0.02em' }}>Red<span style={{ color: 'var(--accent)' }}>Football</span></span>
        </button>
        <div className="nav-links" style={{ display: 'flex', gap: 2, marginLeft: 'var(--s-4)' }}>
          {WC_TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              font: tab === key ? '600 13.5px/1 var(--sans)' : '500 13.5px/1 var(--sans)',
              color: tab === key ? 'var(--ink)' : 'var(--muted-2)',
              background: tab === key ? 'var(--bg-shade)' : 'transparent',
              border: 'none', cursor: 'pointer', padding: '8px 13px', borderRadius: 7,
              transition: 'all var(--dur-fast) var(--ease)',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setDark(d => !d)} title="切换主题" style={{
            width: 34, height: 34, borderRadius: 8, border: '1px solid var(--hairline-strong)',
            background: 'var(--surface)', color: 'var(--ink-soft)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>{dark ? '☼' : '☾'}</button>
          <a href="https://github.com/QIU-Guanzong/FIFA2026_RH" target="_blank" rel="noreferrer" style={{
            font: '500 13px/1 var(--sans)', color: 'var(--ink-inverted)', background: 'var(--ink)',
            textDecoration: 'none', padding: '9px 15px', borderRadius: 7, whiteSpace: 'nowrap',
          }}>查看源码 →</a>
        </div>
      </div>
    </nav>
  );
}

// ── Hero
function Hero({ setTab }) {
  return (
    <Section id="top" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', position: 'relative', overflow: 'hidden' }}>
      <div className="rf-floodlight" />
      <div className="rf-pitch" />
      <div className="rf-pitch-circle" style={{ width: 540, height: 540, right: -150, top: -170 }} />
      <div className="rf-pitch-circle" style={{ width: 180, height: 180, right: 130, top: 150 }} />
      <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 'var(--s-12)', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 6px', borderRadius: 999, border: '1px solid var(--accent-soft)', background: 'var(--accent-50)', marginBottom: 'var(--s-6)' }}>
            <BrandMark size={18} spin />
            <span style={{ font: 'var(--label)', fontWeight: 600, color: 'var(--accent-deep)' }}>RedFootball · 2026 世界杯预测引擎</span>
          </div>
          <h1 style={{ font: '600 52px/1.05 var(--sans)', letterSpacing: '-0.03em', textWrap: 'balance' }}>
            先算清<span style={{ color: 'var(--accent)' }}>比分分布</span>，<br/>再派生一切概率。
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-16)', lineHeight: 1.65, marginTop: 'var(--s-6)', maxWidth: 540 }}>
            可解释、可回测、可本地部署的 2026 世界杯预测系统。从国际赛 Elo 先验到 Dixon-Coles 比分矩阵，
            由同一矩阵统一派生 1X2 / 大小球 / 让球 / 波胆，再经 {RF_SIMS_WAN} 万届 Monte Carlo 得出晋级率与夺冠率。
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 'var(--s-8)', flexWrap: 'wrap' }}>
            <button onClick={() => setTab('match')} style={{ font: '600 14px/1 var(--font-head)', color: '#fff', background: 'var(--pitch)', border: 'none', cursor: 'pointer', padding: '13px 22px', borderRadius: 8, boxShadow: '0 6px 18px color-mix(in srgb, var(--pitch) 32%, transparent)' }}>试用单场预测 →</button>
            <button onClick={() => setTab('method')} style={{ font: '500 14px/1 var(--sans)', color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--hairline-strong)', cursor: 'pointer', padding: '13px 22px', borderRadius: 8 }}>了解方法主干</button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s-8)', marginTop: 'var(--s-10)', flexWrap: 'wrap' }}>
            {[['85', '正确性测试 · 无泄漏'], ['48', '官方参赛队 · 分组 A–L'], [RF_SIMS_WAN + '万', '届 Monte Carlo'], ['0.897', '国际赛 OOS log loss']].map(([n, l]) => (
              <div key={l}>
                <div style={{ font: 'var(--num-sport)', fontSize: 34, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{n}</div>
                <div style={{ font: 'var(--label)', color: 'var(--muted-2)', marginTop: 5 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <HeroCard />
      </div>
    </Section>
  );
}

// ── Hero feature card: champion probability mini-board
function HeroCard() {
  const top = window.WC_CHAMPIONS;
  const max = top[0].p;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-14)', padding: 'var(--s-7)', boxShadow: 'var(--shadow-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-5)' }}>
        <div>
          <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' }}>夺冠概率 · Top 8</div>
          <div style={{ font: 'var(--h3)', marginTop: 6 }}>2026 世界杯</div>
        </div>
        <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>wc2026</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        {top.map((t, i) => (
          <div key={t.en}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ font: '600 14px/1 var(--mono)', color: 'var(--muted)', width: 14 }}>{i+1}</span>
                <span style={{ font: '600 15px/1 var(--sans)' }}>{t.team}</span>
                <span style={{ font: 'var(--label)', color: 'var(--muted)' }}>{t.en}</span>
              </span>
              <span style={{ font: '600 16px/1 var(--mono)', color: 'var(--accent)' }}><CountUp end={t.p} decimals={1} suffix="%" /></span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-shade)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(t.p / max) * 100}%`, height: '100%', background: i === 0 ? 'var(--accent)' : 'var(--ink)', borderRadius: 3, opacity: i === 0 ? 1 : 0.78 - i * 0.12 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--s-6)', paddingTop: 'var(--s-5)', borderTop: '1px solid var(--divider)', display: 'flex', justifyContent: 'space-between', font: 'var(--label)', color: 'var(--muted-2)' }}>
        <span>实力源 · 我们的 Elo 先验（非市场赔率）</span>
        <span style={{ fontFamily: 'var(--mono)' }}>无东道主加成</span>
      </div>
    </div>
  );
}

Object.assign(window, { BrandMark, Eyebrow, Section, SectionHead, CountUp, Nav, Hero });
