;(function () {
/* global React, Section, SectionHead, Sparkline */
// wcpredict — sections part 3: 可信度, Boundaries, Footer (fan-facing)

const {
  useEffect: useEffect3
} = React;
const RF_getSponsor = window.RF_getSponsor || (() => null);
const RF_trackSponsor = window.RF_trackSponsor || (() => false);

// ── Why it's trustworthy (plain-language credibility)
function Backtest() {
  const confed = window.WC_CONFED;
  const cMax = Math.max(...confed),
    cMin = Math.min(...confed);
  const points = [{
    t: '概率会校准',
    d: '说一件事有 30% 的把握，长期来看就该真的发生约 30% 的时候——不夸大、不缩水。'
  }, {
    t: '不偷看未来',
    d: '预测每一场，只用比赛开始前已经知道的信息，绝不拿赛后结果倒推。'
  }, {
    t: '彼此自洽',
    d: '胜平负、大小球、让球、波胆都由同一张比分概率表换算，永远不会自相矛盾。'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "backtest",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u53EF\u4FE1\u5EA6",
    title: "\u4E3A\u4EC0\u4E48\u8FD9\u5957\u9884\u6D4B\u503C\u5F97\u4E00\u770B",
    sub: "\u6211\u4EEC\u7528\u8FC7\u53BB\u51E0\u4E2A\u8D5B\u5B63\u7684\u771F\u5B9E\u6BD4\u8D5B\u9010\u573A\u68C0\u9A8C\u8FC7\uFF0C\u5E76\u548C\u535A\u5F69\u5E02\u573A\u7684\u8D54\u7387\u957F\u671F\u5BF9\u6BD4\u3002\u76EE\u6807\u4E0D\u662F\u201C\u6BD4\u5E84\u5BB6\u66F4\u51C6\u201D\uFF0C\u800C\u662F\u6982\u7387\u8BDA\u5B9E\u3001\u957F\u671F\u7A33\u5B9A\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bt-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1.3fr 1fr',
      gap: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-7)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)',
      marginBottom: 'var(--s-5)'
    }
  }, "\u4E09\u6761\u5E95\u7EBF"), points.map((p, i) => /*#__PURE__*/React.createElement("div", {
    key: p.t,
    style: {
      display: 'flex',
      gap: 14,
      padding: '16px 0',
      borderTop: i === 0 ? 'none' : '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1.4 var(--mono)',
      color: 'var(--accent)',
      flexShrink: 0,
      width: 22
    }
  }, String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 15px/1.3 var(--sans)'
    }
  }, p.t), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.6,
      marginTop: 6
    }
  }, p.d))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-7)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)'
    }
  }, "\u8D8A\u7EC3\u8D8A\u51C6"), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)',
      marginTop: 8
    }
  }, "\u8BEF\u5DEE\u7A33\u6B65\u4E0B\u964D"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.6,
      marginTop: 8
    }
  }, "\u5582\u5165\u8D8A\u591A\u5386\u53F2\u6BD4\u8D5B\uFF0C\u9884\u6D4B\u548C\u771F\u5B9E\u7ED3\u679C\u7684\u5DEE\u8DDD\u5C31\u8D8A\u5C0F\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      margin: '18px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement(Sparkline, {
    data: confed.map(v => -v),
    color: "var(--down)",
    height: 70,
    fill: true
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingTop: 'var(--s-4)',
      borderTop: '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, "\u8D77\u6B65"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 18px/1 var(--mono)'
    }
  }, cMax.toFixed(3))), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--down)',
      fontSize: 18
    }
  }, "\u2193"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, "\u6253\u78E8\u540E"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 18px/1 var(--mono)',
      color: 'var(--down)'
    }
  }, cMin.toFixed(3)))))));
}

// ── Self-built xG (kept defined for compatibility; not rendered in the fan-facing tab)
function XG() {
  const rows = window.WC_XG;
  const coef = window.WC_XG_COEF;
  const maxLL = Math.max(...rows.map(r => r.logloss));
  return /*#__PURE__*/React.createElement(Section, {
    id: "xg",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u8FDB\u7403\u8D28\u91CF\u6A21\u578B",
    title: "\u4E0D\u6B62\u770B\u8FDB\u4E86\u51E0\u4E2A\uFF0C\u66F4\u770B\u673A\u4F1A\u6709\u591A\u597D",
    sub: "\u8BC4\u4F30\u6BCF\u6B21\u5C04\u95E8\u7684\u5F97\u5206\u6982\u7387\uFF0C\u628A\u201C\u8FD0\u6C14\u201D\u548C\u201C\u771F\u5B9E\u5B9E\u529B\u201D\u533A\u5206\u5F00\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    className: "xg-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1.3fr 1fr',
      gap: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-7)'
    }
  }, rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.name,
    style: {
      padding: '14px 0',
      borderTop: '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: r.highlight ? '600 14px/1 var(--sans)' : '500 14px/1 var(--sans)',
      color: r.highlight ? 'var(--accent)' : 'var(--ink)'
    }
  }, r.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--bg-shade)',
      borderRadius: 3,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${r.logloss / maxLL * 100}%`,
      height: '100%',
      background: r.highlight ? 'var(--accent)' : 'var(--ink)',
      opacity: r.highlight ? 1 : 0.45,
      borderRadius: 3
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-7)'
    }
  }, coef.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.feat,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderTop: '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 14px/1.1 var(--sans)'
    }
  }, c.feat), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, c.note))))));
}

// ── Module map (kept defined for compatibility; not rendered in the fan-facing tab)
function Modules() {
  const mods = window.WC_MODULES || [];
  return /*#__PURE__*/React.createElement(Section, {
    id: "modules",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u6A21\u5757\u5730\u56FE",
    title: "\u6BCF\u4E2A\u6A21\u5757\u5404\u53F8\u5176\u804C"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mod-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--s-3)'
    }
  }, mods.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-8)',
      padding: '16px 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 14px/1.2 var(--sans)'
    }
  }, m.role), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      marginTop: 5,
      lineHeight: 1.5
    }
  }, m.note)))));
}

// ── Honesty / what's estimated (fan-facing)
function Boundaries() {
  const h = window.WC_HONESTY;
  const cols = [{
    key: 'real',
    title: '为什么靠谱',
    dot: 'var(--down)',
    items: h.real
  }, {
    key: 'approx',
    title: '我们如实标注的估算',
    dot: 'var(--warn)',
    items: h.approx
  }, {
    key: 'deferred',
    title: '还在打磨',
    dot: 'var(--muted)',
    items: h.deferred
  }];
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u6211\u4EEC\u5BF9\u4F60\u8BDA\u5B9E",
    title: "\u54EA\u4E9B\u662F\u7B97\u51C6\u7684\uFF0C\u54EA\u4E9B\u662F\u4F30\u7684",
    sub: "\u4E00\u4E2A\u597D\u7684\u9884\u6D4B\uFF0C\u4E0D\u662F\u628A\u6BCF\u4EF6\u4E8B\u90FD\u8BF4\u6B7B\uFF0C\u800C\u662F\u628A\u63E1\u5F97\u4F4F\u7684\u5C31\u8BB2\u6E05\u695A\uFF0C\u62FF\u4E0D\u51C6\u7684\u5C31\u5982\u5B9E\u6807\u51FA\u6765\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bound-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 'var(--s-5)'
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.key,
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      marginBottom: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: c.dot
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--sans)'
    }
  }, c.title)), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-4)'
    }
  }, c.items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      font: 'var(--small)',
      color: 'var(--ink-soft)',
      lineHeight: 1.55,
      paddingLeft: 16,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 7,
      width: 5,
      height: 5,
      borderRadius: 999,
      background: c.dot,
      opacity: 0.5
    }
  }), it)))))));
}

// ── Footer + embedded sponsor CTA
function Footer() {
  const sponsor = RF_getSponsor('footer_banner') || {
    href: 'https://redhorsehk.ai/',
    kicker: '贊助 · RedHorse',
    description: '香港賽馬 AI 預測 · HKJC 實時賠率 · EV 量化',
    cta: '前往 redhorsehk.ai →',
    id: 'redhorse'
  };
  useEffect3(() => {
    if (sponsor && sponsor.id) RF_trackSponsor('impression', sponsor.id, 'footer_banner', {
      href: sponsor.href
    });
  }, [sponsor.id, sponsor.href]);
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: '1px solid var(--hairline)',
      marginTop: 'var(--s-12)',
      background: 'var(--panel-tint)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: '0 auto',
      padding: 'var(--s-16) 28px var(--s-10)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "foot-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1.2fr',
      gap: 'var(--s-12)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      marginBottom: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement(window.BrandMark, {
    size: 26
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 19px/1 var(--sans)',
      letterSpacing: '-0.02em'
    }
  }, "Red", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "Football"))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.65,
      maxWidth: 340
    }
  }, "\u8986\u76D6 48 \u652F\u7403\u961F\u3001104 \u573A\u6BD4\u8D5B\u7684 2026 \u4E16\u754C\u676F\u514D\u8D39\u9884\u6D4B\u3002\u80DC\u5E73\u8D1F\u3001\u5927\u5C0F\u7403\u3001\u8BA9\u7403\u3001\u6CE2\u80C6\uFF0C\u51FA\u7EBF\u4E0E\u593A\u51A0\u6982\u7387\uFF0C\u4E00\u7AD9\u770B\u9F50\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 'var(--s-6)'
    }
  }, [['FIFA 官网 · 2026', 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026'], ['Polymarket · 世界杯', 'https://polymarket.com/predictions/2026-fifa-world-cup']].map(([label, href]) => /*#__PURE__*/React.createElement("a", {
    key: href,
    href: href,
    target: "_blank",
    rel: "noreferrer",
    style: {
      font: '500 12px/1 var(--sans)',
      color: 'var(--ink-soft)',
      textDecoration: 'none',
      border: '1px solid var(--hairline-strong)',
      background: 'var(--surface)',
      padding: '8px 12px',
      borderRadius: 'var(--r-full)',
      whiteSpace: 'nowrap'
    }
  }, label, " \u2197")))), /*#__PURE__*/React.createElement("a", {
    href: sponsor.href,
    target: "_blank",
    rel: "noopener noreferrer",
    className: "rh-ad",
    style: {
      display: 'block',
      textDecoration: 'none',
      background: 'var(--accent)',
      borderRadius: 'var(--r-14)',
      padding: 'var(--s-8)',
      transition: 'box-shadow var(--dur-fast) var(--ease)',
      boxShadow: '0 10px 30px color-mix(in srgb, var(--accent) 30%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 8,
      background: 'color-mix(in srgb, var(--on-brand) 18%, transparent)',
      color: 'var(--on-brand)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '700 15px/1 var(--sans)'
    }
  }, "\u8D64"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'color-mix(in srgb, var(--on-brand) 70%, transparent)'
    }
  }, sponsor.kicker)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 22px/1.3 var(--sans)',
      color: 'var(--on-brand)',
      letterSpacing: '-0.01em'
    }
  }, sponsor.description), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'color-mix(in srgb, var(--on-brand) 82%, transparent)',
      lineHeight: 1.6,
      margin: '10px 0 18px',
      maxWidth: 380
    }
  }, "\u67E5\u770B\u5206\u6B67\u3001\u8D54\u7387\u53C2\u8003\u4E0E EV \u89E3\u91CA\u3002"), /*#__PURE__*/React.createElement("span", {
    className: "rh-cta",
    style: {
      display: 'inline-block',
      font: '600 14px/1 var(--sans)',
      color: 'var(--accent)',
      background: 'var(--on-brand)',
      padding: '12px 22px',
      borderRadius: 8
    }
  }, sponsor.cta))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-10)',
      paddingTop: 'var(--s-6)',
      borderTop: '1px solid var(--hairline)',
      display: 'flex',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, "RedFootball \xB7 2026 \xB7 \u9884\u6D4B\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4E0D\u6784\u6210\u4EFB\u4F55\u6295\u6CE8\u5EFA\u8BAE"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, "\u6570\u636E\u66F4\u65B0\u4E8E 2026-06-04"))));
}
Object.assign(window, {
  Backtest,
  XG,
  Modules,
  Boundaries,
  Footer
});
})();
