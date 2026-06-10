;(function () {
/* global React, Section, SectionHead, computeDC, deriveMarkets */
// wcpredict — sections part 4: MatchPredictor — pick any two of 48 teams, full odds board

const {
  useState: useState4,
  useMemo: useMemo4
} = React;
function mpFlag(en) {
  return window.WC_FLAGS && window.WC_FLAGS[en] || '🏳️';
}
function mpDec(p) {
  return p > 0 ? (1 / p).toFixed(2) : '—';
}
function mpLam(eh, ea, he, ae) {
  const P = window.WC_PARAMS; // 引擎 DC 参数：λh = exp(intercept + att_h + def_a)，与 Python 完全同式
  if (P && he && ae && P.teams[he] && P.teams[ae]) {
    const [ah, dh] = P.teams[he],
      [aa, da] = P.teams[ae];
    return {
      lh: Math.exp(P.intercept + ah + da),
      la: Math.exp(P.intercept + aa + dh)
    };
  }
  const d = (eh - ea) / 100; // 兜底：Elo 近似（engine.js 缺席时）
  return {
    lh: Math.max(0.35, 1.42 * Math.exp(0.16 * d)),
    la: Math.max(0.35, 1.42 * Math.exp(-0.16 * d))
  };
}
// over/under for an arbitrary goal line from the score matrix
function ouLine(m, N, line) {
  const need = Math.ceil(line);
  let over = 0,
    under = 0;
  for (let x = 0; x <= N; x++) for (let y = 0; y <= N; y++) {
    x + y >= need ? over += m[x][y] : under += m[x][y];
  }
  return {
    over,
    under
  };
}
const MP_PICKS = [['Spain', 'France'], ['Argentina', 'Brazil'], ['England', 'Germany'], ['Netherlands', 'Portugal']];
function MatchPredictor() {
  const teams = window.WC_TEAMS;
  const byEn = useMemo4(() => Object.fromEntries(teams.map(t => [t.en, t])), [teams]);
  const [homeEn, setHomeEn] = useState4('Spain');
  const [awayEn, setAwayEn] = useState4('France');
  const home = byEn[homeEn],
    away = byEn[awayEn];
  const same = homeEn === awayEn;
  const {
    lh,
    la
  } = mpLam(home.elo, away.elo, homeEn, awayEn);
  const {
    m,
    max,
    N
  } = useMemo4(() => window.computeDC(lh, la), [lh, la]);
  const mk = useMemo4(() => window.deriveMarkets(m, N), [m, N]);
  const lines = [1.5, 2.5, 3.5].map(L => ({
    L,
    ...ouLine(m, N, L)
  }));
  const teamOpts = teams.map(t => /*#__PURE__*/React.createElement("option", {
    key: t.en,
    value: t.en
  }, mpFlag(t.en), " ", t.zh, " \xB7 \u7EC4", t.group));
  const selStyle = {
    font: '500 14px/1 var(--font-head)',
    color: 'var(--ink)',
    background: 'var(--surface)',
    border: '1px solid var(--hairline-strong)',
    borderRadius: 'var(--r-6)',
    padding: '10px 12px',
    cursor: 'pointer',
    minWidth: 0,
    flex: 1
  };
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      paddingTop: 'var(--s-12)',
      paddingBottom: 'var(--s-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u5355\u573A\u9884\u6D4B \xB7 Dixon-Coles \u6BD4\u5206\u77E9\u9635",
    title: "\u4EFB\u9009\u4E24\u961F\uFF0C\u6D3E\u751F\u6574\u5F20\u76D8\u53E3",
    sub: "\u9009\u5B9A\u4EFB\u610F\u4E24\u961F\uFF0C\u7531 Elo \u8BC4\u5206\u63A8\u51FA\u8FDB\u7403\u5F3A\u5EA6 \u03BB \u4E0E \u03C4 \u4F4E\u6BD4\u5206\u4FEE\u6B63\uFF0C\u7B97\u51FA\u6BCF\u4E2A\u6BD4\u5206\u7684\u8054\u5408\u6982\u7387\uFF1B1X2 / \u5927\u5C0F\u7403 / BTTS / \u6CE2\u80C6\u5168\u90E8\u4ECE\u540C\u4E00\u77E9\u9635\u5BFC\u51FA\u2014\u2014\u5185\u90E8\u6052\u7B49\u3001\u4E92\u76F8\u81EA\u6D3D\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 'var(--s-5)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      alignSelf: 'center'
    }
  }, "\u7126\u70B9\uFF1A"), MP_PICKS.map(([h, a]) => /*#__PURE__*/React.createElement("button", {
    key: h + a,
    onClick: () => {
      setHomeEn(h);
      setAwayEn(a);
    },
    style: {
      font: '500 12.5px/1 var(--font-head)',
      padding: '7px 11px',
      borderRadius: 'var(--r-full)',
      cursor: 'pointer',
      border: '1px solid ' + (homeEn === h && awayEn === a ? 'var(--ink)' : 'var(--hairline-strong)'),
      background: homeEn === h && awayEn === a ? 'var(--ink)' : 'var(--surface)',
      color: homeEn === h && awayEn === a ? 'var(--ink-inverted)' : 'var(--ink-soft)',
      whiteSpace: 'nowrap'
    }
  }, mpFlag(h), " ", byEn[h].zh, " vs ", byEn[a].zh, " ", mpFlag(a)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 'var(--s-7)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: homeEn,
    onChange: e => setHomeEn(e.target.value),
    style: selStyle
  }, teamOpts), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 14px/1 var(--font-display)',
      color: 'var(--muted-2)',
      flex: '0 0 auto'
    }
  }, "VS"), /*#__PURE__*/React.createElement("select", {
    value: awayEn,
    onChange: e => setAwayEn(e.target.value),
    style: selStyle
  }, teamOpts)), same && /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--warn)',
      marginBottom: 'var(--s-5)'
    }
  }, "\u8BF7\u9009\u62E9\u4E24\u652F\u4E0D\u540C\u7403\u961F\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "match-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 0.9fr',
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
      marginBottom: 'var(--s-5)',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)'
    }
  }, mpFlag(homeEn), " ", home.zh, " vs ", away.zh, " ", mpFlag(awayEn)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, "\u03BB ", lh.toFixed(2), " \xB7 ", la.toFixed(2), " \xB7 \u03C1 ", (window.WC_PARAMS && window.WC_PARAMS.rho || -0.06).toFixed(2))), /*#__PURE__*/React.createElement(ScoreMatrix, {
    m: m,
    max: max,
    N: N,
    home: home.zh,
    away: away.zh
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)',
      marginBottom: 'var(--s-5)'
    }
  }, "\u80DC\u5E73\u8D1F \xB7 1X2 \xB7 \u6A21\u578B\u8D54\u7387"), /*#__PURE__*/React.createElement(Outcome3, {
    home: mk.home,
    draw: mk.draw,
    away: mk.away,
    hn: home.zh,
    an: away.zh
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)',
      marginBottom: 'var(--s-4)'
    }
  }, "\u5927\u5C0F\u7403 \xB7 \u591A\u76D8\u53E3"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '46px 1fr 1fr',
      gap: '6px 10px',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)',
      textAlign: 'right'
    }
  }, "\u5927\u7403"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)',
      textAlign: 'right'
    }
  }, "\u5C0F\u7403"), lines.map(r => [/*#__PURE__*/React.createElement("span", {
    key: 'l' + r.L,
    style: {
      font: '600 13px/1 var(--mono)',
      color: 'var(--ink)'
    }
  }, r.L.toFixed(1)), /*#__PURE__*/React.createElement("span", {
    key: 'o' + r.L,
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      font: '600 13px/1 var(--mono)'
    }
  }, mpDec(r.over)), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, (r.over * 100).toFixed(0), "%")), /*#__PURE__*/React.createElement("span", {
    key: 'u' + r.L,
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      font: '600 13px/1 var(--mono)'
    }
  }, mpDec(r.under)), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, (r.under * 100).toFixed(0), "%"))]))), /*#__PURE__*/React.createElement("div", {
    className: "mkt-row",
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement(MiniMarket, {
    title: "\u53CC\u65B9\u8FDB\u7403 BTTS",
    a: ['是', mk.btts],
    b: ['否', 1 - mk.btts]
  }), /*#__PURE__*/React.createElement(MiniMarket, {
    title: "\u51C0\u80DC / \u5E73\u5C40",
    a: ['有净胜', 1 - mk.draw],
    b: ['平局', mk.draw]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)',
      marginBottom: 'var(--s-4)'
    }
  }, "\u6700\u53EF\u80FD\u6BD4\u5206 \xB7 \u6CE2\u80C6 Top 6"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8
    }
  }, mk.top.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 11px',
      borderRadius: 'var(--r-6)',
      background: i === 0 ? 'var(--accent-50)' : 'var(--bg-shade)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: i === 0 ? 'var(--accent)' : 'var(--ink)'
    }
  }, s.x, "-", s.y), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px/1 var(--mono)',
      color: 'var(--muted-2)'
    }
  }, (s.p * 100).toFixed(1), "%"))))))));
}

// heatmap grid: rows = home goals, cols = away goals
function ScoreMatrix({
  m,
  max,
  N,
  home,
  away
}) {
  const cap = Math.min(N, 5);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'center',
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, away, " \u8FDB\u7403 \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      width: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)',
      writingMode: 'vertical-rl',
      transform: 'rotate(180deg)'
    }
  }, home, " \u8FDB\u7403 \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `20px repeat(${cap + 1}, 1fr)`,
      gap: 3,
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", null), Array.from({
    length: cap + 1
  }, (_, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    style: {
      textAlign: 'center',
      font: '600 11px/1 var(--mono)',
      color: 'var(--muted)'
    }
  }, j))), Array.from({
    length: cap + 1
  }, (_, x) => /*#__PURE__*/React.createElement("div", {
    key: x,
    style: {
      display: 'grid',
      gridTemplateColumns: `20px repeat(${cap + 1}, 1fr)`,
      gap: 3,
      marginBottom: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 11px/1 var(--mono)',
      color: 'var(--muted)'
    }
  }, x), Array.from({
    length: cap + 1
  }, (_, y) => {
    const p = m[x][y];
    const a = Math.pow(p / max, 0.7);
    const diag = x === y;
    const win = x > y;
    const bg = diag ? `rgba(115,115,115,${0.08 + a * 0.5})` : win ? `rgba(184,71,45,${0.06 + a * 0.62})` : `rgba(46,139,87,${0.06 + a * 0.55})`;
    const fg = a > 0.5 ? '#fff' : 'var(--ink-soft)';
    return /*#__PURE__*/React.createElement("div", {
      key: y,
      style: {
        aspectRatio: '1.45',
        borderRadius: 5,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '600 11px/1 var(--mono)'
      }
    }, (p * 100).toFixed(p >= 0.01 ? 0 : 1));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16,
      marginTop: 'var(--s-5)',
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: 'rgba(184,71,45,0.6)'
    }
  }), "\u4E3B\u80DC"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: 'rgba(115,115,115,0.45)'
    }
  }), "\u5E73\u5C40"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: 'rgba(46,139,87,0.55)'
    }
  }), "\u5BA2\u80DC"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--mono)'
    }
  }, "\u5355\u5143 = \u6982\u7387 %")))));
}
function Outcome3({
  home,
  draw,
  away,
  hn,
  an
}) {
  const rows = [{
    label: `${hn} 胜`,
    v: home,
    c: 'var(--up)'
  }, {
    label: '平局',
    v: draw,
    c: 'var(--muted-2)'
  }, {
    label: `${an} 胜`,
    v: away,
    c: 'var(--down)'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: `${home * 100}%`,
      background: 'var(--up)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: `${draw * 100}%`,
      background: 'var(--muted)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: `${away * 100}%`,
      background: 'var(--down)'
    }
  })), rows.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.label,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      font: '500 14px/1 var(--sans)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: r.c
    }
  }), r.label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 16px/1 var(--font-display)',
      color: 'var(--ink)'
    }
  }, mpDec(r.v)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 12px/1 var(--mono)',
      color: 'var(--muted-2)',
      minWidth: 44,
      textAlign: 'right'
    }
  }, (r.v * 100).toFixed(1), "%")))));
}
function MiniMarket({
  title,
  a,
  b
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--muted-2)',
      marginBottom: 'var(--s-4)'
    }
  }, title), [a, b].map(([label, v], i) => /*#__PURE__*/React.createElement("div", {
    key: label,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: i ? 10 : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px/1 var(--sans)',
      color: 'var(--ink-soft)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: i === 0 ? 'var(--ink)' : 'var(--muted-2)'
    }
  }, mpDec(v)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 11px/1 var(--mono)',
      color: 'var(--muted)'
    }
  }, (v * 100).toFixed(0), "%")))));
}
Object.assign(window, {
  MatchPredictor
});
})();
