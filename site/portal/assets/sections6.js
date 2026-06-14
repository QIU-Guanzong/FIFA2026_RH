;(function () {
/* global React, Section, SectionHead */
// wcpredict — sections part 6: Bracket (knockout tree) + model vs Polymarket odds
const {
  useState: useState6,
  useMemo: useMemo6,
  useEffect: useEffect6
} = React;
function confColor(c) {
  return {
    UEFA: 'var(--info)',
    CONMEBOL: 'var(--down)',
    CAF: 'var(--warn)',
    AFC: 'var(--accent)',
    CONCACAF: 'var(--muted-2)'
  }[c] || 'var(--muted)';
}

// a single team row inside a match card
function TeamRow({
  t,
  win,
  top,
  pmFor
}) {
  const pm = pmFor ? pmFor(t.en, t.pm) : t.pm;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '8px 1fr auto auto',
      alignItems: 'center',
      gap: 9,
      padding: '8px 11px',
      borderBottom: top ? '1px solid var(--divider)' : 'none',
      background: win ? 'var(--accent-50)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: confColor(t.conf)
    },
    title: t.conf
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: win ? '600 13px/1.2 var(--sans)' : '500 13px/1.2 var(--sans)',
      color: win ? 'var(--accent-deep)' : 'var(--ink)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, t.zh), /*#__PURE__*/React.createElement("span", {
    title: "\u6A21\u578B\u593A\u51A0\u6982\u7387",
    style: {
      font: '600 12px/1 var(--mono)',
      color: win ? 'var(--accent)' : 'var(--ink-soft)',
      minWidth: 34,
      textAlign: 'right'
    }
  }, t.m.toFixed(t.m % 1 ? 1 : 0), "%"), /*#__PURE__*/React.createElement("span", {
    title: "Polymarket \u593A\u51A0\u9690\u542B\u6982\u7387",
    style: {
      font: '500 11px/1 var(--mono)',
      color: 'var(--muted)',
      minWidth: 30,
      textAlign: 'right'
    }
  }, pm, "\xA2"));
}
function MatchCard({
  pair,
  label,
  onPick,
  pmFor
}) {
  // winner = higher model prob
  const wi = pair[0].m >= pair[1].m ? 0 : 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "bkt-match bkt-clickable",
    onClick: () => onPick && onPick(pair),
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-8)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-1)',
      cursor: 'pointer'
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      padding: '5px 11px 0'
    }
  }, label), /*#__PURE__*/React.createElement(TeamRow, {
    t: pair[0],
    win: wi === 0,
    top: true,
    pmFor: pmFor
  }), /*#__PURE__*/React.createElement(TeamRow, {
    t: pair[1],
    win: wi === 1,
    pmFor: pmFor
  }));
}
function BracketColumn({
  title,
  matches,
  champion,
  onPick,
  pmFor
}) {
  const champPm = champion ? pmFor ? pmFor(champion.en, champion.pm) : champion.pm : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "bkt-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bkt-col-head",
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)',
      textAlign: 'center',
      marginBottom: 'var(--s-4)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "bkt-col-body"
  }, champion ? /*#__PURE__*/React.createElement("div", {
    className: "bkt-match",
    style: {
      background: 'var(--ink)',
      borderRadius: 'var(--r-10)',
      padding: '18px 16px',
      textAlign: 'center',
      boxShadow: 'var(--shadow-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 8
    }
  }, "\uD83C\uDFC6 \u6A21\u578B\u9884\u6D4B\u51A0\u519B"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 22px/1 var(--sans)',
      color: '#fff'
    }
  }, champion.zh), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      gap: 14,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: 'var(--accent)'
    }
  }, champion.m, "%", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'rgba(255,255,255,0.4)',
      marginLeft: 4
    }
  }, "\u6A21\u578B")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: 'rgba(255,255,255,0.85)'
    }
  }, champPm, "\xA2", /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'rgba(255,255,255,0.4)',
      marginLeft: 4
    }
  }, "PM")))) : matches.map((p, i) => /*#__PURE__*/React.createElement(MatchCard, {
    key: i,
    pair: p,
    onPick: onPick,
    pmFor: pmFor
  }))));
}

// derive knockout λ from each team's model strength, compute DC advance probabilities
function tieProbs(pair) {
  const a = pair[0],
    b = pair[1];
  const ra = a.m,
    rb = b.m;
  let la, lb;
  const P = window.WC_PARAMS;
  if (P && a.en && b.en && P.teams[a.en] && P.teams[b.en]) {
    const [aa, da] = P.teams[a.en],
      [ab, db] = P.teams[b.en];
    la = Math.exp(P.intercept + aa + db); // 引擎精确 λ（中立场）
    lb = Math.exp(P.intercept + ab + da);
  } else {
    la = 0.85 + 1.25 * ra / (ra + rb);
    lb = 0.85 + 1.25 * rb / (ra + rb);
  }
  const {
    m,
    N
  } = window.computeDC(la, lb);
  const mk = window.deriveMarkets(m, N);
  // knockout: split draws ~evenly (extra time / penalties), nudged by strength
  const share = ra / (ra + rb);
  const advA = mk.home + mk.draw * (0.4 + 0.2 * share);
  return {
    m,
    N,
    la,
    lb,
    advA,
    advB: 1 - advA,
    mk
  };
}

// compact score-matrix heatmap for the popover
function MiniMatrix({
  m,
  max,
  N,
  a,
  b
}) {
  const cap = Math.min(N, 5);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `18px repeat(${cap + 1}, 1fr)`,
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", null), Array.from({
    length: cap + 1
  }, (_, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    style: {
      textAlign: 'center',
      font: '600 9px/1 var(--mono)',
      color: 'var(--muted)'
    }
  }, j)), Array.from({
    length: cap + 1
  }, (_, x) => [/*#__PURE__*/React.createElement("span", {
    key: 'r' + x,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 9px/1 var(--mono)',
      color: 'var(--muted)'
    }
  }, x), ...Array.from({
    length: cap + 1
  }, (_, y) => {
    const p = m[x][y];
    const al = Math.pow(p / max, 0.7);
    const bg = x === y ? `rgba(115,115,115,${0.06 + al * 0.5})` : x > y ? `rgba(184,71,45,${0.05 + al * 0.62})` : `rgba(46,139,87,${0.05 + al * 0.55})`;
    return /*#__PURE__*/React.createElement("span", {
      key: x + '-' + y,
      style: {
        aspectRatio: '1.5',
        borderRadius: 3,
        background: bg,
        color: al > 0.5 ? '#fff' : 'var(--ink-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: '600 9px/1 var(--mono)'
      }
    }, (p * 100).toFixed(0));
  })]));
}
function TiePopover({
  pair,
  onClose,
  pmFor
}) {
  const d = useMemo6(() => tieProbs(pair), [pair]);
  useEffect6(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  let mx = 0;
  for (let i = 0; i <= d.N; i++) for (let j = 0; j <= d.N; j++) mx = Math.max(mx, d.m[i][j]);
  const a = pair[0],
    b = pair[1];
  const favA = d.advA >= d.advB;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(23,23,23,0.32)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 'min(440px, 96vw)',
      background: 'var(--surface)',
      borderRadius: 'var(--r-14)',
      boxShadow: 'var(--shadow-pop)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 'var(--s-6) var(--s-6) var(--s-4)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--muted-2)'
    }
  }, "\u6DD8\u6C70\u8D5B\u5BF9\u9635 \xB7 \u6A21\u578B\u63A8\u6F14"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--h3)',
      marginTop: 6
    }
  }, a.zh, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)',
      fontWeight: 400
    }
  }, "vs"), " ", b.zh)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      width: 28,
      height: 28,
      borderRadius: 7,
      border: '1px solid var(--hairline-strong)',
      background: 'var(--surface)',
      color: 'var(--muted-2)',
      cursor: 'pointer',
      fontSize: 14,
      lineHeight: 1
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--s-6)'
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
      width: `${d.advA * 100}%`,
      background: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: `${d.advB * 100}%`,
      background: 'var(--ink)',
      opacity: 0.82
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 13px/1.3 var(--sans)'
    }
  }, a.zh, " \u664B\u7EA7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: favA ? 'var(--accent)' : 'var(--ink)'
    }
  }, (d.advA * 100).toFixed(1), "%")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 13px/1.3 var(--sans)',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)',
      color: !favA ? 'var(--accent)' : 'var(--ink)'
    }
  }, (d.advB * 100).toFixed(1), "%"), " ", b.zh, " \u664B\u7EA7"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--s-5)',
      padding: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)',
      marginBottom: 8
    }
  }, "90 \u5206\u949F 1X2"), [[a.zh + ' 胜', d.mk.home, 'var(--up)'], ['平 / 加时', d.mk.draw, 'var(--muted-2)'], [b.zh + ' 胜', d.mk.away, 'var(--down)']].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '5px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: '500 12px/1 var(--sans)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: c
    }
  }), l), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px/1 var(--mono)'
    }
  }, (v * 100).toFixed(1), "%")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)',
      marginBottom: 8
    }
  }, "\u6BD4\u5206\u77E9\u9635 \xB7 \u03BB ", d.la.toFixed(2), "/", d.lb.toFixed(2)), /*#__PURE__*/React.createElement(MiniMatrix, {
    m: d.m,
    max: mx,
    N: d.N,
    a: a,
    b: b
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: 'var(--s-5) var(--s-6)',
      borderTop: '1px solid var(--divider)',
      background: 'var(--panel-tint)',
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u593A\u51A0\u6982\u7387 \xB7 \u6A21\u578B / Polymarket"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--mono)'
    }
  }, a.zh, " ", a.m, "% / ", pmFor ? pmFor(a.en, a.pm) : a.pm, "\xA2 \xB7 ", b.zh, " ", b.m, "% / ", pmFor ? pmFor(b.en, b.pm) : b.pm, "\xA2"))));
}
function Bracket() {
  const b = window.WC_BRACKET;
  const cmp = window.WC_ODDS_CMP;
  const [tie, setTie] = useState6(null);
  const [poly, setPoly] = useState6({
    status: 'loading'
  });
  const loadPoly = React.useCallback(async () => {
    setPoly(p => ({
      ...p,
      status: p.odds ? 'refreshing' : 'loading'
    }));
    try {
      const d = await window.RF_fetchPolymarket();
      setPoly(p => ({
        status: 'live',
        asof: d.asof,
        odds: d.odds,
        prev: p.odds || null,
        count: d.count,
        volume: d.volume,
        url: d.url
      }));
    } catch (e) {
      setPoly(p => p.odds ? {
        ...p,
        status: 'live'
      } : {
        status: 'offline',
        error: e.message
      });
    }
  }, []);
  useEffect6(() => {
    loadPoly();
    const id = setInterval(loadPoly, 90000);
    return () => clearInterval(id);
  }, [loadPoly]);

  // live cents for a team (by en name), falling back to the static snapshot value
  const pmFor = (en, fallback) => {
    if (poly.odds) {
      const v = poly.odds[(en || '').toLowerCase()];
      if (v != null) return v;
    }
    return fallback;
  };
  const live = poly.status === 'live' && poly.odds;
  // odds-movement vs previous fetch (data4mula-style drift arrow), in cents
  const moveFor = en => {
    if (!poly.prev || !poly.odds) return 0;
    const k = (en || '').toLowerCase();
    if (poly.prev[k] == null || poly.odds[k] == null) return 0;
    return poly.odds[k] - poly.prev[k];
  };
  const cmpRows = cmp.map(d => ({
    ...d,
    pm: live ? pmFor(d.en, d.pm) : d.pm
  }));
  const maxCmp = Math.max(...cmpRows.flatMap(d => [d.m, d.pm]));
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      paddingTop: 'var(--s-12)',
      paddingBottom: 'var(--s-12)'
    }
  }, tie && /*#__PURE__*/React.createElement(TiePopover, {
    pair: tie,
    onClose: () => setTie(null),
    pmFor: pmFor
  }), /*#__PURE__*/React.createElement(Groups, null), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--hairline)',
      margin: '0 0 var(--s-12)'
    }
  }), /*#__PURE__*/React.createElement(OfficialTree, null), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--hairline)',
      margin: '0 0 var(--s-12)'
    }
  }), /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u664B\u7EA7\u6811 \xB7 \u6A21\u578B\u8DEF\u5F84 + \u5E02\u573A\u5BF9\u6BD4",
    title: "\u4ECE 16 \u5F3A\u5230\u51A0\u519B\u7684\u6A21\u578B\u8DEF\u5F84",
    sub: "\u6BCF\u652F\u7403\u968A\u6A19\u6CE8\u6A21\u578B\u596A\u51A0\u6982\u7387\u8207 Polymarket \u5E02\u5834\u96B1\u542B\u6982\u7387\uFF08\xA2 = \u7F8E\u5206\u96B1\u542B\u6982\u7387\uFF09\uFF0C\u7528\u4F86\u7814\u7A76\u5206\u6B67\uFF0C\u4E0D\u69CB\u6210\u6295\u6CE8\u5EFA\u8B70\u3002\u9AD8\u6A21\u578B\u6982\u7387\u8005\u6649\u7D1A\uFF0C\u7D05\u8272\u8DEF\u5F91\u70BA\u6A21\u578B\u63A8\u6F14\u7684\u51A0\u8ECD\u8DEF\u7DDA\u3002\u9EDE\u64CA\u4EFB\u4E00\u5C0D\u9663\u67E5\u770B\u6BD4\u5206\u77E9\u9663\u8207\u6649\u7D1A\u6982\u7387\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 18,
      alignItems: 'center',
      marginBottom: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 12,
      borderRadius: 3,
      background: 'var(--accent-50)',
      border: '1px solid var(--accent-soft)'
    }
  }), "\u6A21\u578B\u664B\u7EA7"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px/1 var(--mono)',
      color: 'var(--accent)'
    }
  }, "15%"), "\u6A21\u578B\u593A\u51A0\u6982\u7387"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px/1 var(--mono)'
    }
  }, "16\xA2"), "Polymarket \u9690\u542B"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 12,
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, ['UEFA', 'CONMEBOL', 'AFC', 'CAF', 'CONCACAF'].map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 2,
      background: confColor(c)
    }
  }), c)))), /*#__PURE__*/React.createElement("div", {
    className: "bkt-hint",
    "aria-hidden": "true",
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      textAlign: 'center',
      padding: '0 0 6px'
    }
  }, "← 横向滑动查看晋级树 →"), /*#__PURE__*/React.createElement("div", {
    className: "bkt-scroll",
    style: {
      overflowX: 'auto',
      paddingBottom: 8,
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      background: 'var(--panel-tint)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bkt-grid",
    style: {
      display: 'flex',
      gap: 'var(--s-5)',
      padding: 'var(--s-6)',
      minWidth: 920
    }
  }, /*#__PURE__*/React.createElement(BracketColumn, {
    title: "1/8 \u51B3\u8D5B \xB7 16 \u5F3A",
    matches: b.r16,
    onPick: setTie,
    pmFor: pmFor
  }), /*#__PURE__*/React.createElement(BracketColumn, {
    title: "1/4 \u51B3\u8D5B",
    matches: b.qf,
    onPick: setTie,
    pmFor: pmFor
  }), /*#__PURE__*/React.createElement(BracketColumn, {
    title: "\u534A\u51B3\u8D5B",
    matches: b.sf,
    onPick: setTie,
    pmFor: pmFor
  }), /*#__PURE__*/React.createElement(BracketColumn, {
    title: "\u51B3\u8D5B",
    matches: b.final,
    onPick: setTie,
    pmFor: pmFor
  }), /*#__PURE__*/React.createElement(BracketColumn, {
    title: "\u51A0\u519B",
    champion: b.champion,
    pmFor: pmFor
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--s-10)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 'var(--s-5)',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)'
    }
  }, "\u6A21\u578B vs Polymarket \xB7 \u5E02\u5834\u5206\u6B67\u7814\u7A76"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, live ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: 'var(--label)',
      color: 'var(--pitch-deep)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "as-pulse-ring",
    style: {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: 'var(--pitch)'
    }
  }), "\u5B9E\u65F6 \xB7 ", poly.asof.toLocaleTimeString('zh-CN', {
    hour12: false
  }), poly.volume ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, "\xB7 \u6210\u4EA4 $", (poly.volume / 1e6).toFixed(0), "M") : null) : poly.status === 'offline' ? /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, "\u79BB\u7EBF\u5FEB\u7167 \xB7 ", b.asof) : /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)'
    }
  }, "\u62C9\u53D6\u5B9E\u65F6\u8D54\u7387\u2026"), /*#__PURE__*/React.createElement("button", {
    onClick: loadPoly,
    disabled: poly.status === 'loading' || poly.status === 'refreshing',
    title: "\u5237\u65B0 Polymarket \u8D54\u7387",
    style: {
      font: '500 12px/1 var(--font-head)',
      color: 'var(--ink-soft)',
      background: 'var(--surface)',
      border: '1px solid var(--hairline-strong)',
      borderRadius: 7,
      padding: '6px 11px',
      cursor: 'pointer',
      opacity: poly.status === 'loading' || poly.status === 'refreshing' ? 0.5 : 1
    }
  }, poly.status === 'refreshing' ? '刷新中…' : '↻ 刷新'), /*#__PURE__*/React.createElement("a", {
    href: poly.url || 'https://polymarket.com/event/world-cup-winner',
    target: "_blank",
    rel: "noreferrer",
    style: {
      font: 'var(--label)',
      color: 'var(--accent)',
      fontFamily: 'var(--mono)',
      textDecoration: 'none'
    }
  }, "\u5E02\u5834\u50F9\u683C \u2197"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-7)'
    }
  }, cmpRows.map((d, i) => {
    const edge = d.m - d.pm;
    return /*#__PURE__*/React.createElement("div", {
      key: d.en,
      style: {
        display: 'grid',
        gridTemplateColumns: '120px 1fr 78px 56px',
        alignItems: 'center',
        gap: 16,
        padding: '11px 0',
        borderTop: i === 0 ? 'none' : '1px solid var(--divider)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '500 14px/1.2 var(--sans)'
      }
    }, d.zh, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--label)',
        color: 'var(--muted)'
      }
    }, d.en)), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: 9,
        width: `${d.m / maxCmp * 100}%`,
        background: 'var(--accent)',
        borderRadius: 3
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 9,
        width: `${d.pm / maxCmp * 100}%`,
        background: 'var(--ink)',
        borderRadius: 3,
        opacity: 0.85,
        transition: 'width var(--dur-slow) var(--ease-out)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 12px/1 var(--mono)',
        color: 'var(--accent)'
      }
    }, d.m, "%"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, live && Math.abs(moveFor(d.en)) >= 0.1 && /*#__PURE__*/React.createElement("span", {
      style: {
        font: '700 9px/1 var(--mono)',
        color: moveFor(d.en) > 0 ? 'var(--up)' : 'var(--down)'
      }
    }, moveFor(d.en) > 0 ? '▲' : '▼', Math.abs(moveFor(d.en)).toFixed(1)), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 12px/1 var(--mono)',
        color: 'var(--ink-soft)'
      }
    }, d.pm, "\xA2"))), /*#__PURE__*/React.createElement("span", {
      title: "\u6A21\u578B \u2212 \u5E02\u573A",
      style: {
        font: '600 12px/1 var(--mono)',
        textAlign: 'right',
        color: Math.abs(edge) < 1 ? 'var(--muted)' : edge > 0 ? 'var(--up)' : 'var(--down)'
      }
    }, edge > 0 ? '+' : '', edge.toFixed(1)));
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      marginTop: 'var(--s-5)',
      paddingTop: 'var(--s-4)',
      borderTop: '1px solid var(--divider)',
      font: 'var(--label)',
      color: 'var(--muted-2)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 9,
      borderRadius: 2,
      background: 'var(--accent)'
    }
  }), "\u6A21\u578B"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 12,
      height: 9,
      borderRadius: 2,
      background: 'var(--ink)'
    }
  }), "Polymarket", live ? ' · 实时' : ' · 快照'), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto'
    }
  }, "\u5DEE\u503C = \u6A21\u578B% \u2212 \u5E02\u573A\xA2\uFF1B\u6B63=\u6A21\u578B\u66F4\u9AD8\uFF0C\u8D1F=\u5E02\u573A\u66F4\u9AD8\uFF08\u5E02\u573A\u542B\u4E1C\u9053\u4E3B/\u4F24\u505C\u4FE1\u606F\uFF09")))));
}
Object.assign(window, {
  Bracket
});

// ── Official 2026 knockout tree (R32 → Final · M73–M104)
function OffRound({
  title,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--eyebrow)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--pitch-deep)',
      fontWeight: 700,
      marginBottom: 10,
      textAlign: 'left'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateRows: 'repeat(16, 120px)',
      gap: 8
    }
  }, children));
}
function OffConnector() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: -16,
      top: '50%',
      width: 16,
      borderTop: '1px solid var(--hairline-strong)'
    }
  });
}
function OffSlot({
  s,
  top
}) {
  const pad = top ? '8px 11px 6px' : '6px 11px 8px';
  if (s.third) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: pad,
        borderBottom: top ? '1px solid var(--divider)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '500 11px/1.3 var(--sans)',
        color: 'var(--muted-2)'
      }
    }, s.lbl), /*#__PURE__*/React.createElement("div", {
      style: {
        font: '500 11px/1.2 var(--mono)',
        color: 'var(--muted)',
        marginTop: 3
      }
    }, "\u5019\u9009 ", s.third));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pad,
      borderBottom: top ? '1px solid var(--divider)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 11px/1.3 var(--sans)',
      color: 'var(--muted-2)'
    }
  }, s.lbl), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 13px/1.2 var(--sans)',
      color: 'var(--ink)'
    }
  }, s.zh), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px/1 var(--mono)',
      color: 'var(--accent)'
    }
  }, s.pct, "%")));
}
function OffR32Card({
  m,
  row
}) {
  return /*#__PURE__*/React.createElement("article", {
    style: {
      gridRow: `${row} / span 1`,
      alignSelf: 'center',
      position: 'relative',
      minHeight: 56,
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-8)',
      boxShadow: 'var(--shadow-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10.5px/1 var(--mono)',
      color: 'var(--accent)',
      padding: '6px 11px 0'
    }
  }, "M", m.no), /*#__PURE__*/React.createElement(OffSlot, {
    s: m.a,
    top: true
  }), /*#__PURE__*/React.createElement(OffSlot, {
    s: m.b
  }), /*#__PURE__*/React.createElement(OffConnector, null));
}
function OffWinCard({
  pair,
  row,
  span,
  final
}) {
  const [no, x, y] = pair;
  return /*#__PURE__*/React.createElement("article", {
    style: {
      gridRow: `${row} / span ${span}`,
      alignSelf: 'center',
      position: 'relative',
      minHeight: 52,
      background: final ? 'linear-gradient(180deg, var(--accent-50), var(--surface))' : 'var(--surface)',
      border: '1px solid ' + (final ? 'var(--accent-soft)' : 'var(--hairline)'),
      borderRadius: 'var(--r-8)',
      boxShadow: final ? 'var(--shadow-2)' : 'var(--shadow-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 10.5px/1 var(--mono)',
      color: 'var(--accent)',
      padding: '7px 11px 4px'
    }
  }, final ? '🏆 M' : 'M', no), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 12px/1.4 var(--sans)',
      color: 'var(--muted-2)',
      padding: '0 11px'
    }
  }, "\u80DC ", x), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '500 12px/1.4 var(--sans)',
      color: 'var(--muted-2)',
      padding: '0 11px 8px'
    }
  }, "\u80DC ", y), !final && /*#__PURE__*/React.createElement(OffConnector, null));
}
function OfficialTree() {
  const t = window.WC_OFFICIAL_TREE;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 'var(--s-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u5B98\u65B9\u6DD8\u6C70\u8D5B\u6811 \xB7 M73 \u2192 M104",
    title: "\u4ECE 32 \u5F3A\u5230\u51B3\u8D5B\u7684\u5B98\u65B9\u8DEF\u5F84\u56FE",
    sub: "\u5DE6\u4FA7\u662F\u5B98\u65B9 R32 \u5165\u53E3\u69FD\u4F4D\uFF0C\u5411\u53F3\u9010\u8F6E\u6C47\u5165 M104 \u51B3\u8D5B\u3002\u5165\u53E3\u5904\u7684\u7403\u961F\u4E0E\u6982\u7387\u4E3A 4 \u4E07\u5C4A\u6A21\u62DF\u4E2D\u6700\u53EF\u80FD\u5360\u7528\u8BE5\u69FD\u4F4D\u8005\uFF08\u6700\u53EF\u80FD\u3001\u975E\u9501\u5B9A\u843D\u4F4D\uFF09\uFF1B16 \u5F3A\u53CA\u4E4B\u540E\u4FDD\u6301\u300C\u80DC N\u300D\u7ED3\u6784\u2014\u2014\u8D8A\u5F80\u540E\u67D0\u6761\u5177\u4F53\u8DEF\u5F84\u771F\u5B9E\u53D1\u751F\u7684\u6982\u7387\u8D8A\u4F4E\uFF0C\u586B\u6B7B\u4F1A\u5047\u88C5\u786E\u5B9A\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 18,
      alignItems: 'center',
      marginBottom: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 11px/1 var(--mono)',
      color: 'var(--accent)'
    }
  }, "39%"), "\u8BE5\u69FD\u4F4D\u6700\u53EF\u80FD\u5360\u7528\u7403\u961F"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      font: 'var(--label)',
      color: 'var(--muted-2)'
    }
  }, "\u300C\u6700\u4F73\u7B2C\u4E09 \u5019\u9009\u300D\u6309\u5B98\u65B9\u7EA6\u675F\u4ECE 8 \u4E2A\u6700\u597D\u7B2C\u4E09\u540D\u5408\u6CD5\u5339\u914D\uFF0C\u4E0D\u5355\u5217\u7403\u961F"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, t.sims, "\u5C4A \xB7 ", t.asof)), /*#__PURE__*/React.createElement("div", {
    className: "bkt-hint",
    "aria-hidden": "true",
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      textAlign: 'center',
      padding: '0 0 6px'
    }
  }, "\u2190 \u6A2A\u5411\u6ED1\u52A8\u67E5\u770B\u664B\u7EA7\u6811 \u2192"), /*#__PURE__*/React.createElement("div", {
    className: "bkt-scroll",
    style: {
      overflowX: 'auto',
      paddingBottom: 8,
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      background: 'var(--panel-tint)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, minmax(178px, 1fr))',
      gap: 16,
      minWidth: 1040,
      padding: 'var(--s-7) var(--s-7) var(--s-6)',
      backgroundImage: 'repeating-linear-gradient(90deg, color-mix(in srgb, var(--pitch) 3.5%, transparent) 0, color-mix(in srgb, var(--pitch) 3.5%, transparent) 113px, transparent 113px, transparent 226px)'
    }
  }, /*#__PURE__*/React.createElement(OffRound, {
    title: "32 \u5F3A"
  }, t.r32.map((m, i) => /*#__PURE__*/React.createElement(OffR32Card, {
    key: m.no,
    m: m,
    row: i + 1
  }))), /*#__PURE__*/React.createElement(OffRound, {
    title: "16 \u5F3A"
  }, t.r16.map((p, i) => /*#__PURE__*/React.createElement(OffWinCard, {
    key: p[0],
    pair: p,
    row: 2 * i + 1,
    span: 2
  }))), /*#__PURE__*/React.createElement(OffRound, {
    title: "1/4 \u51B3\u8D5B"
  }, t.qf.map((p, i) => /*#__PURE__*/React.createElement(OffWinCard, {
    key: p[0],
    pair: p,
    row: 4 * i + 1,
    span: 4
  }))), /*#__PURE__*/React.createElement(OffRound, {
    title: "\u534A\u51B3\u8D5B"
  }, t.sf.map((p, i) => /*#__PURE__*/React.createElement(OffWinCard, {
    key: p[0],
    pair: p,
    row: 8 * i + 1,
    span: 8
  }))), /*#__PURE__*/React.createElement(OffRound, {
    title: "\u51B3\u8D5B"
  }, /*#__PURE__*/React.createElement(OffWinCard, {
    pair: t.final,
    row: 1,
    span: 16,
    final: true
  })))));
}
Object.assign(window, {
  OfficialTree
});

// ── Group-stage qualifying favorites (组 A–L)
function GroupTeamLine({
  t,
  lead
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '9px 0',
      borderTop: lead ? 'none' : '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      width: 16,
      height: 16,
      borderRadius: 4,
      background: lead ? 'var(--accent)' : 'var(--bg-shade)',
      color: lead ? '#fff' : 'var(--muted-2)',
      font: '700 10px/16px var(--mono)',
      textAlign: 'center'
    }
  }, lead ? 1 : 2), /*#__PURE__*/React.createElement("span", {
    style: {
      font: lead ? '600 14px/1.2 var(--sans)' : '500 14px/1.2 var(--sans)',
      color: lead ? 'var(--ink)' : 'var(--ink-soft)',
      whiteSpace: 'nowrap'
    }
  }, t.zh), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, t.en)), lead ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      font: '600 12px/1 var(--mono)',
      color: 'var(--accent)',
      whiteSpace: 'nowrap'
    }
  }, "\u5934\u540D ", t.top, "%") : /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      font: '500 11px/1 var(--mono)',
      color: 'var(--muted)',
      whiteSpace: 'nowrap'
    }
  }, "\u6B21\u540D\u5019\u9009")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 5,
      background: 'var(--pitch-50)',
      borderRadius: 3,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: '100%',
      width: `${t.adv}%`,
      background: 'var(--pitch)',
      opacity: lead ? 1 : 0.62,
      borderRadius: 3
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      font: '600 11px/1 var(--mono)',
      color: 'var(--pitch-deep)',
      minWidth: 56,
      textAlign: 'right'
    }
  }, "\u51FA\u7EBF ", t.adv, "%")));
}
function GroupCard({
  d
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "grp-card",
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-5) var(--s-6) var(--s-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 'var(--s-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 13px/1 var(--mono)',
      color: 'var(--accent)',
      letterSpacing: '0.04em'
    }
  }, "\u7EC4 ", d.g), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em'
    }
  }, "\u51FA\u7EBF\u70ED\u95E8")), /*#__PURE__*/React.createElement(GroupTeamLine, {
    t: d.lead,
    lead: true
  }), /*#__PURE__*/React.createElement(GroupTeamLine, {
    t: d.run
  }));
}
function Groups() {
  const gs = window.WC_GROUPS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 'var(--s-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u5C0F\u7EC4\u8D5B \xB7 \u5B98\u65B9\u5206\u7EC4 A\u2013L",
    title: "\u5404\u5C0F\u7EC4\u51FA\u7EBF\u70ED\u95E8",
    sub: "\u6BCF\u7EC4\u5934\u540D\u6982\u7387\u6700\u9AD8\u8005\uFF08\u5B9E\u5FC3\uFF09\u4E0E\u51FA\u7EBF\u6982\u7387\u6B21\u9AD8\u8005\u3002\u4E1C\u9053\u4E3B\u58A8\u897F\u54E5 / \u52A0\u62FF\u5927\u9ED8\u8BA4\u4E2D\u7ACB\u573A\uFF0C\u672A\u989D\u5916\u52A0\u4E1C\u9053\u4E3B\u4E3B\u573A\u2014\u2014\u8BE5\u5047\u8BBE\u65E0\u6CD5\u4E25\u8C28 OOS \u56DE\u6D4B\uFF0C\u9ED8\u8BA4\u5173\u95ED\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(282px, 1fr))',
      gap: 'var(--s-5)'
    }
  }, gs.map(d => /*#__PURE__*/React.createElement(GroupCard, {
    key: d.g,
    d: d
  }))));
}
Object.assign(window, {
  Groups
});
})();
