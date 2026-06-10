;(function () {
/* global React, Section, SectionHead, Sparkline */
// wcpredict — sections part 3: Backtest, XG, Modules, Boundaries, Footer

// ── Backtest honesty
function Backtest() {
  const rows = window.WC_BACKTEST;
  const confed = window.WC_CONFED;
  const cMax = Math.max(...confed),
    cMin = Math.min(...confed);
  return /*#__PURE__*/React.createElement(Section, {
    id: "backtest",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u65E0\u6CC4\u6F0F walk-forward \u56DE\u6D4B \xB7 #2",
    title: "\u7565\u900A\u4E8E\u9510\u76D8\uFF0C\u624D\u662F\u5065\u5EB7\u4FE1\u53F7",
    sub: "\u9884\u6D4B\u7B2C i \u573A\u53EA\u7528\u65E5\u671F\u4E25\u683C\u65E9\u4E8E\u8BE5\u573A\u7684\u6BD4\u8D5B\u62DF\u5408\uFF08\u540C\u65E5\u4E5F\u6392\u9664\uFF09\u3002\u82E5\u7B80\u5355\u6A21\u578B\u6837\u672C\u5916\u51FB\u8D25 Pinnacle\uFF0C\u51E0\u4E4E\u4E00\u5B9A\u662F\u6CC4\u6F0F\u3002"
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
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)'
    }
  }, "\u82F1\u8D85\u4E09\u5B63 \xB7 950 \u573A\u6301\u51FA"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, "vs Pinnacle \u8D5B\u524D\u53BB\u6C34\u4F4D")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'left',
      fontWeight: 500,
      paddingBottom: 10
    }
  }, "predictor"), /*#__PURE__*/React.createElement("th", {
    style: {
      fontWeight: 500,
      paddingBottom: 10
    }
  }, "log loss"), /*#__PURE__*/React.createElement("th", {
    style: {
      fontWeight: 500,
      paddingBottom: 10
    }
  }, "Brier"), /*#__PURE__*/React.createElement("th", {
    style: {
      fontWeight: 500,
      paddingBottom: 10
    }
  }, "vs \u5E02\u573A"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.name,
    style: {
      borderTop: '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 0',
      font: '500 14px/1.2 var(--sans)'
    }
  }, r.kind === 'market' && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: 999,
      background: 'var(--ink)',
      marginRight: 8,
      verticalAlign: 'middle'
    }
  }), r.name), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right',
      font: '600 14px/1 var(--mono)',
      color: r.kind === 'market' ? 'var(--ink)' : 'var(--ink-soft)'
    }
  }, r.logloss.toFixed(4)), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right',
      font: '500 13px/1 var(--mono)',
      color: 'var(--muted-2)'
    }
  }, r.brier.toFixed(4)), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right',
      font: '500 13px/1 var(--mono)',
      color: r.kind === 'market' ? 'var(--muted)' : 'var(--down)'
    }
  }, r.delta))))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.6,
      marginTop: 'var(--s-5)',
      paddingTop: 'var(--s-5)',
      borderTop: '1px solid var(--divider)'
    }
  }, "\u539F\u59CB MLE DC \u6837\u672C\u5916\u53CD\u800C\u4E0D\u5982\u5E26\u6536\u7F29\u6027\u8D28\u7684 Elo \u5148\u9A8C\u2014\u2014\u5DF2\u6392\u9664\u4F18\u5316\u5668\u672A\u6536\u655B\uFF0C\u8FD9\u662F\u771F\u5B9E\u7684\u6CDB\u5316\u5DEE\u8DDD\uFF1A\u5C0F\u6837\u672C\u4E0B\u9010\u961F att/def \u7684 MLE \u65B9\u5DEE\u504F\u5927\u3002")), /*#__PURE__*/React.createElement("div", {
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
  }, "\u6D32\u9645\u901A\u80C0\u4FEE\u6B63 \xB7 #6"), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)',
      marginTop: 8
    }
  }, "\u591A\u8D9F\u6696\u542F\u52A8"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.6,
      marginTop: 8
    }
  }, "\u56FD\u9645\u8D5B 17,039 \u573A\u6301\u51FA \xB7 log loss \u968F passes \u5355\u8C03\u4E0B\u964D"), /*#__PURE__*/React.createElement("div", {
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
  }, "pass 1"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 18px/1 var(--mono)'
    }
  }, cMax.toFixed(4))), /*#__PURE__*/React.createElement("span", {
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
  }, "pass 5"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 18px/1 var(--mono)',
      color: 'var(--down)'
    }
  }, cMin.toFixed(4)))))));
}

// ── Self-built xG
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
    kicker: "\u81EA\u5EFA shot-level xG \xB7 #5 Part A",
    title: "4 \u4E2A\u53EF\u89E3\u91CA\u7279\u5F81\uFF0C\u5173\u95ED 62% \u7684\u5DEE\u8DDD",
    sub: "StatsBomb \u5F00\u653E\u4E8B\u4EF6\u6570\u636E \u2192 \u51E0\u4F55\u7279\u5F81 \u2192 \u53EF\u89E3\u91CA\u903B\u8F91\u56DE\u5F52\uFF08scipy\uFF0C\u975E\u9ED1\u7BB1\uFF09\u3002\u771F\u503C\u662F\u8FDB\u7403\uFF0C\u4E0D\u662F statsbomb_xg\u2014\u2014\u540E\u8005\u53EA\u4F5C\u4E8C\u7EA7\u6838\u5BF9\uFF0C\u6A21\u578B\u7EDD\u4E0D\u5411\u5B83\u5BF9\u9F50\u3002"
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
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)'
    }
  }, "WC2022 \u7559\u51FA\u6821\u51C6"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, "16 \u573A / 382 \u5C04\u95E8 \xB7 \u5BF9\u771F\u5B9E\u8FDB\u7403")), rows.map(r => /*#__PURE__*/React.createElement("div", {
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
  }, r.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      gap: 16,
      font: '500 13px/1 var(--mono)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "Brier ", r.brier.toFixed(4)), /*#__PURE__*/React.createElement("span", null, "ECE ", r.ece), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: r.highlight ? 'var(--accent)' : 'var(--ink)',
      minWidth: 52,
      textAlign: 'right'
    }
  }, r.logloss.toFixed(4)))), /*#__PURE__*/React.createElement("div", {
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
  })))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.6,
      marginTop: 'var(--s-5)',
      paddingTop: 'var(--s-5)',
      borderTop: '1px solid var(--divider)'
    }
  }, "log loss \u8D8A\u4F4E\u8D8A\u597D\u3002\u672C\u6A21\u578B\u7528 4 \u4E2A\u7279\u5F81\u5173\u95ED\u4E86\"\u57FA\u7EBF\u2192statsbomb\"\u5DEE\u8DDD\u7684 62%\uFF1Bstatsbomb\uFF08\u7EA6 20 \u7279\u5F81+ML\uFF09\u4ECD\u66F4\u4F18\uFF0C\u7B26\u5408\u9884\u671F\uFF0C\u672C\u6A21\u578B\u4E0D\u5411\u5176\u5BF9\u9F50\u3002")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-7)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)',
      marginBottom: 6
    }
  }, "\u7CFB\u6570\u7B26\u53F7\u7686\u5408\u5E38\u8BC6"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      marginBottom: 'var(--s-5)'
    }
  }, "\u95E8\u53E3\u5F20\u89D2\u7ECF\u9010\u6837\u672C\u624B\u7B97\u6838\u9A8C"), coef.map(c => {
    const pos = c.sign.startsWith('+');
    return /*#__PURE__*/React.createElement("div", {
      key: c.feat,
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderTop: '1px solid var(--divider)'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '500 14px/1.1 var(--sans)'
      }
    }, c.feat), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--label)',
        color: 'var(--muted)',
        marginTop: 3
      }
    }, c.note)), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 14px/1 var(--mono)',
        color: pos ? 'var(--up)' : 'var(--down)',
        padding: '4px 9px',
        borderRadius: 6,
        background: pos ? 'var(--up-bg)' : 'var(--down-bg)'
      }
    }, c.sign));
  }))));
}

// ── Module map
function Modules() {
  const mods = window.WC_MODULES;
  return /*#__PURE__*/React.createElement(Section, {
    id: "modules",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u6A21\u5757\u5730\u56FE",
    title: "\u6BCF\u4E2A\u6A21\u5757\u5404\u53F8\u5176\u804C",
    sub: "\u6A21\u578B\u5C42\u4E0E\u6570\u636E\u6765\u6E90\u89E3\u8026\uFF1A\u89C4\u8303 schema \u7EDF\u4E00\u6BD4\u8D5B/\u8D54\u7387\u5217\uFF0C\u91C7\u96C6\u5668\u6362\u63D2\u70B9\u5373\u53EF\u3002"
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
      background: m.heart ? 'var(--accent-50)' : 'var(--surface)',
      border: `1px solid ${m.heart ? 'var(--accent-soft)' : 'var(--hairline)'}`,
      borderRadius: 'var(--r-8)',
      padding: '16px 18px',
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      transition: 'border-color var(--dur-fast) var(--ease)'
    },
    onMouseEnter: e => {
      if (!m.heart) e.currentTarget.style.borderColor = 'var(--hairline-strong)';
    },
    onMouseLeave: e => {
      if (!m.heart) e.currentTarget.style.borderColor = 'var(--hairline)';
    }
  }, /*#__PURE__*/React.createElement("code", {
    style: {
      font: '500 11.5px/1.4 var(--mono)',
      color: m.heart ? 'var(--accent-deep)' : 'var(--muted-2)',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      paddingTop: 2,
      minWidth: 150
    }
  }, m.id), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 14px/1.2 var(--sans)',
      color: m.heart ? 'var(--accent-deep)' : 'var(--ink)'
    }
  }, m.role, m.heart && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)',
      marginLeft: 6
    }
  }, "\u2665")), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      marginTop: 5,
      lineHeight: 1.5
    }
  }, m.note))))));
}

// ── Honesty / boundaries
function Boundaries() {
  const h = window.WC_HONESTY;
  const cols = [{
    key: 'real',
    title: '真实且已测试',
    dot: 'var(--down)',
    items: h.real
  }, {
    key: 'approx',
    title: '刻意的近似 · 偏差已标注',
    dot: 'var(--warn)',
    items: h.approx
  }, {
    key: 'deferred',
    title: '后置 · 下一轮',
    dot: 'var(--muted)',
    items: h.deferred
  }];
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u8BDA\u5B9E\u6E05\u5355",
    title: "\u54EA\u4E9B\u662F\u771F\u7684 / \u8FD1\u4F3C\u7684 / \u540E\u7F6E\u7684",
    sub: "\u5BF9\u4E16\u754C\u676F\u8FD9\u79CD\u4EFB\u52A1\uFF0C\u6700\u503C\u94B1\u7684\u4E0D\u662F\u82B1\u54E8\uFF0C\u800C\u662F\u6982\u7387\u6821\u51C6\u3001\u4FE1\u606F\u622A\u6B62\u7EAA\u5F8B\u3001\u4E0E\u5E02\u573A\u76F8\u6BD4\u7684\u957F\u671F\u8FB9\u9645\u4F18\u52BF\u3002"
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

// ── Footer / quick start
function Footer() {
  const cmds = window.WC_CMDS;
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
  }, "\u4E16\u754C\u676F\u6BD4\u5206\u6982\u7387\u9884\u6D4B\u4E3B\u5E72\uFF08MVP\uFF09\u3002rating \u5148\u9A8C + Dixon-Coles + \u53BB\u6C34\u4F4D\u6821\u51C6 + \u5168\u8D5B\u4F1A Monte Carlo\u3002\u5F53\u524D\u6570\u636E\u5C42\u7528\u5408\u6210\u6570\u636E\u9A71\u52A8\u2014\u2014\u9A8C\u8BC1\"\u673A\u5668\u7B97\u5F97\u5BF9\"\uFF0C\u771F\u5B9E\u6821\u51C6\u7ED3\u8BBA\u987B\u63A5\u771F\u5B9E\u6570\u636E + \u4E25\u683C cutoff \u56DE\u6D4B\u540E\u624D\u4E0B\u3002"), /*#__PURE__*/React.createElement("a", {
    href: "https://github.com/QIU-Guanzong/FIFA2026_RH",
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: 'inline-block',
      marginTop: 'var(--s-6)',
      font: '500 13px/1 var(--sans)',
      color: 'var(--ink-inverted)',
      background: 'var(--ink)',
      textDecoration: 'none',
      padding: '11px 18px',
      borderRadius: 7
    }
  }, "GitHub \xB7 QIU-Guanzong/FIFA2026_RH \u2192"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 'var(--s-5)'
    }
  }, [['FIFA 官网 · 2026', 'https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026'], ['Polymarket · 世界杯', 'https://polymarket.com/predictions/2026-fifa-world-cup'], ['Polymarket · 冠军盘', 'https://polymarket.com/event/world-cup-winner']].map(([label, href]) => /*#__PURE__*/React.createElement("a", {
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
  }, label, " \u2197")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ink)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 'var(--s-4)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em'
    }
  }, "\u5FEB\u901F\u5F00\u59CB \xB7 CLI"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-3)'
    }
  }, cmds.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.cmd,
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("code", {
    style: {
      font: '500 13px/1.4 var(--mono)',
      color: '#fff',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'rgba(255,255,255,0.35)'
    }
  }, "$ "), c.cmd), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'rgba(255,255,255,0.45)',
      textAlign: 'right',
      marginLeft: 'auto'
    }
  }, c.desc)))))), /*#__PURE__*/React.createElement("div", {
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
  }, "RedFootball \xB7 2026 \xB7 \u6570\u636E\u6765\u6E90 StatsBomb Open Data / football-data.co.uk / martj42"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, "V1.20260516.104"))));
}
Object.assign(window, {
  Backtest,
  XG,
  Modules,
  Boundaries,
  Footer
});
})();
