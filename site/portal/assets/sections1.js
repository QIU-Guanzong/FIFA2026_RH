;(function () {
/* global React, Sparkline, HBar */
// wcpredict — sections part 1: Nav, Hero, ChampionBoard, Pipeline

const {
  useState: useState1,
  useEffect: useEffect1
} = React;
const RF_SIMS_WAN = Math.round(((window.RF_ENGINE || {}).sims || 40000) / 10000); // 引擎模拟届数（万）

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

// ── Top navigation + tabs
const WC_TABS = [['overview', '总览'], ['schedule', '赛程'], ['match', '单场预测'], ['tree', '晋级树'], ['bets', '下注建议'], ['method', '方法 & 回测']];
function Nav({
  tab,
  setTab
}) {
  const [dark, setDark] = useState1(false);
  useEffect1(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return /*#__PURE__*/React.createElement("nav", {
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
    style: {
      display: 'flex',
      gap: 2,
      marginLeft: 'var(--s-4)'
    }
  }, WC_TABS.map(([key, label]) => /*#__PURE__*/React.createElement("button", {
    key: key,
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
    href: "https://github.com/QIU-Guanzong/FIFA2026_RH",
    target: "_blank",
    rel: "noreferrer",
    style: {
      font: '500 13px/1 var(--sans)',
      color: 'var(--ink-inverted)',
      background: 'var(--ink)',
      textDecoration: 'none',
      padding: '9px 15px',
      borderRadius: 7,
      whiteSpace: 'nowrap'
    }
  }, "\u67E5\u770B\u6E90\u7801 \u2192"))));
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
  }, "RedFootball \xB7 2026 \u4E16\u754C\u676F\u9884\u6D4B\u5F15\u64CE")), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: '600 52px/1.05 var(--sans)',
      letterSpacing: '-0.03em',
      textWrap: 'balance'
    }
  }, "\u5148\u7B97\u6E05", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "\u6BD4\u5206\u5206\u5E03"), "\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u518D\u6D3E\u751F\u4E00\u5207\u6982\u7387\u3002"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ink-soft)',
      fontSize: 'var(--fs-16)',
      lineHeight: 1.65,
      marginTop: 'var(--s-6)',
      maxWidth: 540
    }
  }, "\u53EF\u89E3\u91CA\u3001\u53EF\u56DE\u6D4B\u3001\u53EF\u672C\u5730\u90E8\u7F72\u7684 2026 \u4E16\u754C\u676F\u9884\u6D4B\u7CFB\u7EDF\u3002\u4ECE\u56FD\u9645\u8D5B Elo \u5148\u9A8C\u5230 Dixon-Coles \u6BD4\u5206\u77E9\u9635\uFF0C \u7531\u540C\u4E00\u77E9\u9635\u7EDF\u4E00\u6D3E\u751F 1X2 / \u5927\u5C0F\u7403 / \u8BA9\u7403 / \u6CE2\u80C6\uFF0C\u518D\u7ECF ", RF_SIMS_WAN, " \u4E07\u5C4A Monte Carlo \u5F97\u51FA\u664B\u7EA7\u7387\u4E0E\u593A\u51A0\u7387\u3002"), /*#__PURE__*/React.createElement("div", {
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
  }, "\u4E86\u89E3\u65B9\u6CD5\u4E3B\u5E72")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--s-8)',
      marginTop: 'var(--s-10)',
      flexWrap: 'wrap'
    }
  }, [['85', '正确性测试 · 无泄漏'], ['48', '官方参赛队 · 分组 A–L'], [RF_SIMS_WAN + '万', '届 Monte Carlo'], ['0.897', '国际赛 OOS log loss']].map(([n, l]) => /*#__PURE__*/React.createElement("div", {
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
  }, "wc2026")), /*#__PURE__*/React.createElement("div", {
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
  }, /*#__PURE__*/React.createElement("span", null, "\u5B9E\u529B\u6E90 \xB7 \u6211\u4EEC\u7684 Elo \u5148\u9A8C\uFF08\u975E\u5E02\u573A\u8D54\u7387\uFF09"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--mono)'
    }
  }, "\u65E0\u4E1C\u9053\u4E3B\u52A0\u6210")));
}
Object.assign(window, {
  BrandMark,
  Eyebrow,
  Section,
  SectionHead,
  CountUp,
  Nav,
  Hero
});
})();
