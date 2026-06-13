;(function () {
/* global React, Sparkline, HBar */
// wcpredict — sections part 1: Nav, Hero, ChampionBoard, Pipeline

const {
  useState: useState1,
  useEffect: useEffect1
} = React;
const RF_SIMS_WAN = Math.round(((window.RF_ENGINE || {}).sims || 40000) / 10000); // 引擎模拟届数（万）
const RF_getSponsor = window.RF_getSponsor || (() => null);
const RF_trackSponsor = window.RF_trackSponsor || (() => false);

// ── Brand mark: RedFootball — red soccer ball with white classic panels
function BrandMark({
  size = 30,
  spin = false
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    "aria-hidden": "true",
    className: `rf-ball ${spin ? 'rf-spin' : ''}`,
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "14.5",
    fill: "var(--accent)",
    stroke: "var(--accent-deep)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "#fff",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    opacity: "0.92"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "11.2",
    x2: "16",
    y2: "3.6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "20.57",
    y1: "14.52",
    x2: "27.7",
    y2: "12.2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18.82",
    y1: "19.88",
    x2: "23.2",
    y2: "25.9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "13.18",
    y1: "19.88",
    x2: "8.8",
    y2: "25.9"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "11.43",
    y1: "14.52",
    x2: "4.3",
    y2: "12.2"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "#fff",
    opacity: "0.92"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 2.5 l2.4 1.9 -0.9 2.9 -3 0 -0.9 -2.9 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M28.6 11.4 l0.7 3 -2.4 1.9 -2.4 -1.8 0.9 -2.9 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M23.9 26.7 l-2.9 0.9 -1.9 -2.4 1.5 -2.6 3 0.2 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.1 26.7 l-1.7 -2.9 1.9 -2.4 2.9 0.9 0 3 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.4 11.4 l3 -0.9 1.9 2.4 -1.5 2.6 -2.7 0 Z"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M16 11.2 L20.57 14.52 L18.82 19.88 L13.18 19.88 L11.43 14.52 Z",
    fill: "#fff"
  }));
}
function Eyebrow({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--muted-2)'
    }
  }, children);
}

// Section wrapper with consistent rhythm + scroll-reveal
function Section({
  id,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    id: id,
    className: "reveal",
    "data-reveal": true,
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '0 28px',
      ...style
    }
  }, children);
}

// Count-up number — animates 0→target when timeline runs; defaults to final value if frozen
function CountUp({
  end,
  decimals = 0,
  suffix = '',
  dur = 900
}) {
  const [v, setV] = useState1(end);
  useEffect1(() => {
    let raf;
    let t0 = null;
    const tick = t => {
      if (t0 === null) t0 = t;
      const k = Math.max(0, Math.min(1, (t - t0) / dur));
      setV(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end]);
  return /*#__PURE__*/React.createElement("span", null, v.toFixed(decimals), suffix);
}
function SectionHead({
  kicker,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 'var(--s-8)',
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, kicker), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--h1)',
      letterSpacing: '-0.02em',
      marginTop: 10
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--muted-2)',
      marginTop: 12,
      fontSize: 'var(--fs-15)',
      lineHeight: 1.6
    }
  }, sub));
}
function sharePortal() {
  const payload = {
    title: 'RedFootball · 2026 世界盃預測',
    text: '模型路徑、市場分歧、單場概率與誠實邊界。',
    url: window.location.href
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
const WC_TABS = [['overview', '總覽'], ['report', '戰報'], ['schedule', '賽程'], ['match', '單場'], ['tree', '晉級樹'], ['bets', '分歧研究'], ['method', '方法']];
function Nav({
  tab,
  setTab
}) {
  const [dark, setDark] = useState1(false);
  const sponsor = RF_getSponsor('nav') || {};
  useEffect1(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'color-mix(in srgb, var(--bg) 85%, transparent)',
      backdropFilter: 'saturate(180%) blur(12px)',
      WebkitBackdropFilter: 'saturate(180%) blur(12px)',
      borderBottom: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: '0 28px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('overview'),
    className: "rf-brand",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--ink)',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(BrandMark, {
    size: 26
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 17px/1 var(--sans)',
      letterSpacing: '-0.02em'
    }
  }, "Red", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "Football"))), /*#__PURE__*/React.createElement("div", {
    className: "nav-links",
    role: "tablist",
    "aria-label": "主导航",
    style: {
      display: 'flex',
      gap: 2,
      marginLeft: 'var(--s-4)'
    }
  }, WC_TABS.map(([key, label]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    role: "tab",
    id: "nav-tab-" + key,
    "aria-selected": tab === key,
    "aria-controls": "wc-tabpanel",
    onClick: () => setTab(key),
    style: {
      font: tab === key ? '600 13.5px/1 var(--sans)' : '500 13.5px/1 var(--sans)',
      color: tab === key ? 'var(--ink)' : 'var(--muted-2)',
      background: tab === key ? 'var(--bg-shade)' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '8px 13px',
      borderRadius: 7,
      transition: 'all var(--dur-fast) var(--ease)'
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDark(d => !d),
    title: "\u5207\u6362\u4E3B\u9898",
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      border: '1px solid var(--hairline-strong)',
      background: 'var(--surface)',
      color: 'var(--ink-soft)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14
    }
  }, dark ? '☼' : '☾'), /*#__PURE__*/React.createElement("a", {
    href: sponsor.href || 'https://redhorsehk.ai/',
    onClick: () => sponsor.id && RF_trackSponsor('click', sponsor.id, 'nav', {
      href: sponsor.href
    }),
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      font: '600 13px/1 var(--sans)',
      color: '#fff',
      background: 'var(--accent)',
      textDecoration: 'none',
      padding: '9px 15px',
      borderRadius: 7,
      whiteSpace: 'nowrap'
    }
  }, sponsor.cta || '赤兔AI redhorsehk.ai →'), /*#__PURE__*/React.createElement("button", {
    onClick: sharePortal,
    title: "\u5206\u4EAB\u6216\u8907\u88FD\u9023\u7D50",
    style: {
      width: 34,
      height: 34,
      borderRadius: 8,
      border: '1px solid var(--hairline-strong)',
      background: 'var(--surface)',
      color: 'var(--ink-soft)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14
    }
  }, "\u21AA")))), /*#__PURE__*/React.createElement("div", {
    className: "mobile-tabbar",
    role: "tablist",
    "aria-label": "\u4E3B\u5BFC\u822A",
    style: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 70,
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 2,
      padding: '8px 10px max(8px, env(safe-area-inset-bottom))',
      background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
      backdropFilter: 'saturate(180%) blur(14px)',
      WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      borderTop: '1px solid var(--hairline)'
    }
  }, WC_TABS.map(([key, label]) => /*#__PURE__*/React.createElement("button", {
    key: key,
    role: "tab",
    id: "m-tab-" + key,
    "aria-selected": tab === key,
    "aria-controls": "wc-tabpanel",
    onClick: () => setTab(key),
    style: {
      minHeight: 44,
      font: tab === key ? '600 11px/1.1 var(--sans)' : '500 11px/1.1 var(--sans)',
      color: tab === key ? 'var(--accent)' : 'var(--muted-2)',
      background: tab === key ? 'var(--accent-50)' : 'transparent',
      border: 'none',
      borderRadius: 7,
      cursor: 'pointer',
      padding: '6px 3px'
    }
  }, label))));
}

// ── Hero
function Hero({
  setTab
}) {
  return /*#__PURE__*/React.createElement(Section, {
    id: "top",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rf-floodlight"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rf-pitch"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rf-pitch-circle",
    style: {
      width: 540,
      height: 540,
      right: -150,
      top: -170
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "rf-pitch-circle",
    style: {
      width: 180,
      height: 180,
      right: 130,
      top: 150
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1.15fr 0.85fr',
      gap: 'var(--s-12)',
      alignItems: 'center',
      position: 'relative',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 12px 5px 6px',
      borderRadius: 999,
      border: '1px solid var(--accent-soft)',
      background: 'var(--accent-50)',
      marginBottom: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement(BrandMark, {
    size: 18,
    spin: true
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      fontWeight: 600,
      color: 'var(--accent-deep)'
    }
  }, "RedFootball \xB7 2026 \u4E16\u754C\u676F\u514D\u8D39\u9884\u6D4B")), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '600 52px/1.05 var(--sans)',
      letterSpacing: '-0.03em',
      textWrap: 'balance'
    }
  }, "\u5148\u7B97\u6E05", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "\u6BCF\u573A\u6BD4\u5206"), "\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u518D\u770B\u6E05\u6574\u5C4A\u4E16\u754C\u676F\u3002"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ink-soft)',
      fontSize: 'var(--fs-16)',
      lineHeight: 1.65,
      marginTop: 'var(--s-6)',
      maxWidth: 540
    }
  }, "\u8986\u76D6 48 \u652F\u7403\u961F\u3001104 \u573A\u6BD4\u8D5B\u7684 2026 \u4E16\u754C\u676F\u9884\u6D4B\u3002\u4ECE\u6BCF\u961F\u7684\u5386\u53F2\u5B9E\u529B\u5230\u6BCF\u573A\u7684\u6BD4\u5206\u6982\u7387\uFF0C \u7EDF\u4E00\u7ED9\u51FA\u80DC\u5E73\u8D1F\u3001\u5927\u5C0F\u7403\u3001\u8BA9\u7403\u4E0E\u6CE2\u80C6\uFF0C\u518D\u7ECF ", RF_SIMS_WAN, " \u4E07\u5C4A\u8D5B\u4E8B\u6A21\u62DF\u7B97\u51FA\u6BCF\u961F\u7684\u51FA\u7EBF\u7387\u4E0E\u593A\u51A0\u7387\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 'var(--s-8)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('match'),
    style: {
      font: '600 14px/1 var(--font-head)',
      color: '#fff',
      background: 'var(--pitch)',
      border: 'none',
      cursor: 'pointer',
      padding: '13px 22px',
      borderRadius: 8,
      boxShadow: '0 6px 18px color-mix(in srgb, var(--pitch) 32%, transparent)'
    }
  }, "\u8BD5\u7528\u5355\u573A\u9884\u6D4B \u2192"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('method'),
    style: {
      font: '500 14px/1 var(--sans)',
      color: 'var(--ink)',
      background: 'var(--surface)',
      border: '1px solid var(--hairline-strong)',
      cursor: 'pointer',
      padding: '13px 22px',
      borderRadius: 8
    }
  }, "\u9884\u6D4B\u662F\u600E\u4E48\u7B97\u51FA\u6765\u7684")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-8)',
      marginTop: 'var(--s-10)',
      flexWrap: 'wrap'
    }
  }, [['48', '官方参赛队'], ['12', '小组 A–L'], [RF_SIMS_WAN + '万', '届赛事模拟'], ['104', '场全覆盖']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--num-sport)',
      fontSize: 34,
      letterSpacing: '-0.01em',
      fontVariantNumeric: 'tabular-nums'
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)',
      marginTop: 5
    }
  }, l))))), /*#__PURE__*/React.createElement(HeroCard, null)));
}

// ── Hero feature card: champion probability mini-board
function HeroCard() {
  const top = window.WC_CHAMPIONS;
  const max = top[0].p;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-14)',
      padding: 'var(--s-7)',
      boxShadow: 'var(--shadow-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)'
    }
  }, "\u593A\u51A0\u6982\u7387 \xB7 Top 8"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--h3)',
      marginTop: 6
    }
  }, "2026 \u4E16\u754C\u676F")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, "6-04 \u66F4\u65B0")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-5)'
    }
  }, top.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.en
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: 'var(--muted)',
      width: 14
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 15px/1 var(--sans)'
    }
  }, t.team), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, t.en)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 16px/1 var(--mono)',
      color: 'var(--accent)'
    }
  }, /*#__PURE__*/React.createElement(CountUp, {
    end: t.p,
    decimals: 1,
    suffix: "%"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--bg-shade)',
      borderRadius: 3,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${t.p / max * 100}%`,
      height: '100%',
      background: i === 0 ? 'var(--accent)' : 'var(--ink)',
      borderRadius: 3,
      opacity: i === 0 ? 1 : 0.78 - i * 0.12
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-6)',
      paddingTop: 'var(--s-5)',
      borderTop: '1px solid var(--divider)',
      display: 'flex',
      justifyContent: 'space-between',
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u57FA\u4E8E\u6BCF\u961F\u5386\u53F2\u5B9E\u529B\u8BC4\u5206"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--mono)'
    }
  }, "40,000 \u5C4A\u6A21\u62DF")));
}

// ── RedHorse (红马) embedded sponsor mark — small accent letter tag, not the RedFootball ball
function RHMark({
  size = 34
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.24),
      background: 'var(--accent)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      font: `700 ${Math.round(size * 0.5)}px/1 var(--sans)`
    }
  }, "\u8D64");
}
function SponsorImpression({
  slot,
  sponsor
}) {
  useEffect1(() => {
    if (sponsor && sponsor.id) RF_trackSponsor('impression', sponsor.id, slot, {
      href: sponsor.href
    });
  }, [slot, sponsor && sponsor.id, sponsor && sponsor.href]);
  return null;
}

// ── Full-width embedded sponsor banner → jumps to configured sponsor (no popup)
function RedHorseBanner() {
  const sponsor = RF_getSponsor('overview_banner');
  if (!sponsor) return null;
  return /*#__PURE__*/React.createElement(Section, {
    className: "reveal",
    "data-reveal": true,
    style: {
      paddingTop: 'var(--s-5)',
      paddingBottom: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: sponsor.href,
    target: "_blank",
    rel: "noopener noreferrer",
    className: "rh-ad rh-banner",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--s-6)',
      textDecoration: 'none',
      background: 'var(--accent-50)',
      border: '1px solid var(--accent-soft)',
      borderRadius: 'var(--r-14)',
      padding: '18px 22px',
      transition: 'border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease)'
    }
  }, /*#__PURE__*/React.createElement(SponsorImpression, {
    slot: "overview_banner",
    sponsor: sponsor
  }), /*#__PURE__*/React.createElement(RHMark, {
    size: 36
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--muted-2)'
    }
  }, sponsor.kicker), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 17px/1.35 var(--sans)',
      color: 'var(--ink)',
      marginTop: 5
    }
  }, sponsor.description)), /*#__PURE__*/React.createElement("span", {
    className: "rh-cta",
    style: {
      flexShrink: 0,
      font: '600 14px/1 var(--sans)',
      color: '#fff',
      background: 'var(--accent)',
      padding: '12px 20px',
      borderRadius: 8,
      whiteSpace: 'nowrap'
    }
  }, sponsor.cta)));
}

// ── Compact embedded sponsor card (sidebar / footer)
function RedHorseCard() {
  const sponsor = RF_getSponsor('footer_card');
  if (!sponsor) return null;
  return /*#__PURE__*/React.createElement("a", {
    href: sponsor.href,
    target: "_blank",
    rel: "noopener noreferrer",
    className: "rh-ad",
    style: {
      display: 'block',
      textDecoration: 'none',
      background: 'var(--accent-50)',
      border: '1px solid var(--accent-soft)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)',
      transition: 'border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease)'
    }
  }, /*#__PURE__*/React.createElement(SponsorImpression, {
    slot: "footer_card",
    sponsor: sponsor
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(RHMark, {
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)'
    }
  }, sponsor.kicker)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 15px/1.4 var(--sans)',
      color: 'var(--ink)'
    }
  }, sponsor.description), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.6,
      margin: '8px 0 14px'
    }
  }, sponsor.description), /*#__PURE__*/React.createElement("span", {
    className: "rh-cta",
    style: {
      display: 'inline-block',
      font: '600 13px/1 var(--sans)',
      color: '#fff',
      background: 'var(--accent)',
      padding: '10px 16px',
      borderRadius: 7
    }
  }, sponsor.cta));
}
Object.assign(window, {
  BrandMark,
  Eyebrow,
  Section,
  SectionHead,
  CountUp,
  Nav,
  Hero,
  RHMark,
  RedHorseBanner,
  RedHorseCard
});
})();
