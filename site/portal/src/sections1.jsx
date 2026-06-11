/* global React, Sparkline, HBar */
// wcpredict — sections part 1: Nav, Hero, ChampionBoard, Pipeline

const { useState: useState1, useEffect: useEffect1 } = React;
const RF_SIMS_WAN = Math.round((((window.RF_ENGINE || {}).sims) || 40000) / 10000);  // 引擎模拟届数（万）
const RF_getSponsor = window.RF_getSponsor || (() => null);
const RF_trackSponsor = window.RF_trackSponsor || (() => false);

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

function sharePortal() {
  const payload = {
    title: 'RedFootball · 2026 世界盃預測',
    text: '模型路徑、市場分歧、單場概率與誠實邊界。',
    url: window.location.href,
  };
  if (navigator.share) {
    navigator.share(payload).catch(() => {});
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(payload.url).then(() => {
      console.info('[RedFootball] 分享連結已複製');
    }).catch(() => {});
  }
}

// ── Top navigation + tabs
const WC_TABS = [
  ['overview', '總覽'],
  ['schedule', '賽程'],
  ['match', '單場'],
  ['tree', '晉級樹'],
  ['bets', '分歧研究'],
  ['method', '方法'],
];

function Nav({ tab, setTab }) {
  const [dark, setDark] = useState1(false);
  const sponsor = RF_getSponsor('nav') || {};
  useEffect1(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <>
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
            <a href={sponsor.href || 'https://redhorsehk.ai/'} onClick={() => sponsor.id && RF_trackSponsor('click', sponsor.id, 'nav', { href: sponsor.href })} target="_blank" rel="noopener noreferrer" style={{
              font: '600 13px/1 var(--sans)', color: '#fff', background: 'var(--accent)',
              textDecoration: 'none', padding: '9px 15px', borderRadius: 7, whiteSpace: 'nowrap',
            }}>{sponsor.cta || '赤兔AI redhorsehk.ai →'}</a>
            <button onClick={sharePortal} title="分享或複製連結" style={{
              width: 34, height: 34, borderRadius: 8, border: '1px solid var(--hairline-strong)',
              background: 'var(--surface)', color: 'var(--ink-soft)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>↪</button>
          </div>
        </div>
      </nav>
      <div className="mobile-tabbar" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70,
        gridTemplateColumns: 'repeat(6, 1fr)', gap: 2,
        padding: '8px 10px max(8px, env(safe-area-inset-bottom))',
        background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        backdropFilter: 'saturate(180%) blur(14px)', WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        borderTop: '1px solid var(--hairline)',
      }}>
        {WC_TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            minHeight: 42,
            font: tab === key ? '600 11px/1.1 var(--sans)' : '500 11px/1.1 var(--sans)',
            color: tab === key ? 'var(--accent)' : 'var(--muted-2)',
            background: tab === key ? 'var(--accent-50)' : 'transparent',
            border: 'none', borderRadius: 7, cursor: 'pointer', padding: '6px 3px',
          }}>{label}</button>
        ))}
      </div>
    </>
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
            <span style={{ font: 'var(--label)', fontWeight: 600, color: 'var(--accent-deep)' }}>RedFootball · 2026 世界杯免费预测</span>
          </div>
          <h1 style={{ font: '600 52px/1.05 var(--sans)', letterSpacing: '-0.03em', textWrap: 'balance' }}>
            先算清<span style={{ color: 'var(--accent)' }}>每场比分</span>，<br/>再看清整届世界杯。
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-16)', lineHeight: 1.65, marginTop: 'var(--s-6)', maxWidth: 540 }}>
            覆盖 48 支球队、104 场比赛的 2026 世界杯预测。从每队的历史实力到每场的比分概率，
            统一给出胜平负、大小球、让球与波胆，再经 {RF_SIMS_WAN} 万届赛事模拟算出每队的出线率与夺冠率。
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 'var(--s-8)', flexWrap: 'wrap' }}>
            <button onClick={() => setTab('match')} style={{ font: '600 14px/1 var(--font-head)', color: '#fff', background: 'var(--pitch)', border: 'none', cursor: 'pointer', padding: '13px 22px', borderRadius: 8, boxShadow: '0 6px 18px color-mix(in srgb, var(--pitch) 32%, transparent)' }}>试用单场预测 →</button>
            <button onClick={() => setTab('method')} style={{ font: '500 14px/1 var(--sans)', color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--hairline-strong)', cursor: 'pointer', padding: '13px 22px', borderRadius: 8 }}>预测是怎么算出来的</button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--s-8)', marginTop: 'var(--s-10)', flexWrap: 'wrap' }}>
            {[['48', '官方参赛队'], ['12', '小组 A–L'], [RF_SIMS_WAN + '万', '届赛事模拟'], ['104', '场全覆盖']].map(([n, l]) => (
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
        <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>6-04 更新</span>
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
        <span>基于每队历史实力评分</span>
        <span style={{ fontFamily: 'var(--mono)' }}>40,000 届模拟</span>
      </div>
    </div>
  );
}

// ── RedHorse (红马) embedded sponsor mark — small accent letter tag, not the RedFootball ball
function RHMark({ size = 34 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: Math.round(size * 0.24), background: 'var(--accent)', color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      font: `700 ${Math.round(size * 0.5)}px/1 var(--sans)`,
    }}>赤</span>
  );
}

function SponsorImpression({ slot, sponsor }) {
  useEffect1(() => {
    if (sponsor && sponsor.id) RF_trackSponsor('impression', sponsor.id, slot, { href: sponsor.href });
  }, [slot, sponsor && sponsor.id, sponsor && sponsor.href]);
  return null;
}

// ── Full-width embedded sponsor banner → jumps to configured sponsor (no popup)
function RedHorseBanner() {
  const sponsor = RF_getSponsor('overview_banner');
  if (!sponsor) return null;
  return (
    <Section className="reveal" data-reveal style={{ paddingTop: 'var(--s-5)', paddingBottom: 'var(--s-5)' }}>
      <a href={sponsor.href} target="_blank" rel="noopener noreferrer" className="rh-ad rh-banner" style={{
        display: 'flex', alignItems: 'center', gap: 'var(--s-6)', textDecoration: 'none',
        background: 'var(--accent-50)', border: '1px solid var(--accent-soft)', borderRadius: 'var(--r-14)',
        padding: '18px 22px', transition: 'border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease)',
      }}>
        <SponsorImpression slot="overview_banner" sponsor={sponsor} />
        <RHMark size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted-2)' }}>{sponsor.kicker}</div>
          <div style={{ font: '600 17px/1.35 var(--sans)', color: 'var(--ink)', marginTop: 5 }}>{sponsor.description}</div>
        </div>
        <span className="rh-cta" style={{ flexShrink: 0, font: '600 14px/1 var(--sans)', color: '#fff', background: 'var(--accent)', padding: '12px 20px', borderRadius: 8, whiteSpace: 'nowrap' }}>{sponsor.cta}</span>
      </a>
    </Section>
  );
}

// ── Compact embedded sponsor card (sidebar / footer)
function RedHorseCard() {
  const sponsor = RF_getSponsor('footer_card');
  if (!sponsor) return null;
  return (
    <a href={sponsor.href} target="_blank" rel="noopener noreferrer" className="rh-ad" style={{
      display: 'block', textDecoration: 'none', background: 'var(--accent-50)', border: '1px solid var(--accent-soft)',
      borderRadius: 'var(--r-10)', padding: 'var(--s-6)', transition: 'border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease)',
    }}>
      <SponsorImpression slot="footer_card" sponsor={sponsor} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <RHMark size={22} />
        <span style={{ font: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' }}>{sponsor.kicker}</span>
      </div>
      <div style={{ font: '600 15px/1.4 var(--sans)', color: 'var(--ink)' }}>{sponsor.description}</div>
      <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.6, margin: '8px 0 14px' }}>{sponsor.description}</p>
      <span className="rh-cta" style={{ display: 'inline-block', font: '600 13px/1 var(--sans)', color: '#fff', background: 'var(--accent)', padding: '10px 16px', borderRadius: 7 }}>{sponsor.cta}</span>
    </a>
  );
}

Object.assign(window, { BrandMark, Eyebrow, Section, SectionHead, CountUp, Nav, Hero, RHMark, RedHorseBanner, RedHorseCard });
