;(function () {
/* global React, Section, SectionHead, Sparkline */
// wcpredict — sections part 2: ChampionBoard, Pipeline

// ── Full championship board with rating cross-reference
function ChampionBoard() {
  const champs = window.WC_CHAMPIONS;
  const ratings = window.WC_RATINGS;
  const max = champs[0].p;
  return /*#__PURE__*/React.createElement(Section, {
    id: "board",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u6B63\u5F0F 2026 \u8D5B\u4F1A\u9884\u6D4B \xB7 #4",
    title: "\u51A0\u519B\u6982\u7387\u699C",
    sub: "\u5B98\u65B9\u5206\u7EC4 A\u2013L + \u5B98\u65B9 R32 \u6DD8\u6C70\u6811 + \u7B2C\u4E09\u540D\u843D\u4F4D\uFF08495 \u7EA6\u675F\u4E8C\u90E8\u56FE\u5339\u914D\uFF09\u300248 \u961F\u573A\u5730\u4E0B favorite \u6982\u7387\u81EA\u7136\u5206\u6563\u2014\u2014\u5934\u90E8\u5373\u771F\u5B9E\u7684\u4E0D\u786E\u5B9A\u6027\uFF0C\u800C\u975E\u6A21\u578B\u4E0D\u81EA\u4FE1\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    className: "board-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
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
  }, "\u593A\u51A0\u6982\u7387 Top 8"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, "Monte Carlo \xB7 40,000 \u5C4A")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '20px minmax(96px,1.2fr) 1fr 50px 46px 46px 42px',
      alignItems: 'center',
      gap: 10,
      font: 'var(--label)',
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      paddingBottom: 8,
      borderBottom: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "\u7403\u961F"), /*#__PURE__*/React.createElement("span", null, "\u593A\u51A0\u6982\u7387"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\u593A\u51A0"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\u56DB\u5F3A"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\u51B3\u8D5B"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\u51FA\u7EBF")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, champs.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t.en,
    style: {
      display: 'grid',
      gridTemplateColumns: '20px minmax(96px,1.2fr) 1fr 50px 46px 46px 42px',
      alignItems: 'center',
      gap: 10,
      padding: '12px 0',
      borderTop: i === 0 ? 'none' : '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 13px/1 var(--mono)',
      color: 'var(--muted)'
    }
  }, String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 15px/1.1 var(--sans)'
    }
  }, t.team), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      marginTop: 3
    }
  }, t.en, " \xB7 ", t.conf)), /*#__PURE__*/React.createElement("span", {
    style: {
      height: 8,
      background: 'var(--bg-shade)',
      borderRadius: 4,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      width: `${t.p / max * 100}%`,
      height: '100%',
      background: i === 0 ? 'var(--accent)' : 'var(--ink)',
      opacity: i === 0 ? 1 : 0.85 - i * 0.06,
      borderRadius: 4
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 16px/1 var(--mono)',
      textAlign: 'right',
      color: i === 0 ? 'var(--accent)' : 'var(--ink)'
    }
  }, t.p.toFixed(1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--muted)'
    }
  }, "%")), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px/1 var(--mono)',
      textAlign: 'right',
      color: 'var(--muted-2)'
    }
  }, t.qf.toFixed(0)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px/1 var(--mono)',
      textAlign: 'right',
      color: 'var(--muted-2)'
    }
  }, t.fin.toFixed(0)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 13px/1 var(--mono)',
      textAlign: 'right',
      color: 'var(--pitch-deep)'
    }
  }, t.adv))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s-6)'
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
      marginBottom: 'var(--s-2)'
    }
  }, "\u56FD\u5BB6\u961F Elo \u8BC4\u5206 \xB7 Top 5"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      marginBottom: 'var(--s-5)'
    }
  }, "\u771F\u5B9E\u56FD\u9645\u8D5B 1872\u2013\u81F3\u4ECA \xB7 \u591A\u8D9F\u6696\u542F\u52A8"), ratings.map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: r.en,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '9px 0',
      borderTop: i === 0 ? 'none' : '1px solid var(--divider)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 12px/1 var(--mono)',
      color: 'var(--muted)'
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 14px/1 var(--sans)'
    }
  }, r.team)), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 14px/1 var(--mono)'
    }
  }, r.elo)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--accent-50)',
      border: '1px solid var(--accent-soft)',
      borderRadius: 'var(--r-10)',
      padding: 'var(--s-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--accent-deep)',
      fontWeight: 600,
      marginBottom: 8
    }
  }, "\u7B2C\u4E09\u540D\u843D\u4F4D \xB7 \u4E0D\u731C\u8868"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--ink-soft)',
      lineHeight: 1.6
    }
  }, "\u4E25\u683C\u6267\u884C Wikipedia \u516C\u5E03\u7684\"\u6BCF\u69FD\u63A5\u53D7\u54EA 5 \u4E2A\u7EC4\"\u7EA6\u675F\u505A\u4E8C\u90E8\u56FE\u5339\u914D\u3002495 \u7EC4\u5408\u5168\u90E8\u53EF\u89E3\uFF08Hall \u901A\u8FC7\uFF09\u4F46\u5747\u975E\u552F\u4E00\u2014\u2014\u4E24\u5957\u5408\u6CD5\u843D\u4F4D\u5BF9\u593A\u51A0\u6982\u7387\u6700\u5927\u4EC5\u5DEE ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--mono)',
      fontWeight: 600,
      color: 'var(--accent)'
    }
  }, "0.11pp"), "\u3002")))));
}

// ── Method pipeline
function Pipeline() {
  const steps = [{
    n: '01',
    t: '国际赛 Elo 先验',
    d: 'FIFA SUM 思路：重要性加权 + 净胜球放大 + 中立场修正。多趟暖启动反向传播跨洲际信息。',
    tag: 'ratings/elo'
  }, {
    n: '02',
    t: 'log-linear λ',
    d: '由 rating 映射两队进球强度 λ_home / λ_away，或走真实历史 MLE 时间加权拟合。',
    tag: 'model'
  }, {
    n: '03',
    t: 'Dixon-Coles 比分矩阵',
    d: 'τ 低比分修正（符号经论文核验）；ρ<0 抬高平局。这是整个系统的心脏。',
    tag: 'dixon_coles',
    heart: true
  }, {
    n: '04',
    t: '统一派生 + 融合',
    d: '同一矩阵导出 1X2 / 大小球 / BTTS / 让球 / 波胆；赔率去水位后与市场融合。',
    tag: 'markets/derive'
  }, {
    n: '05',
    t: '全赛事 Monte Carlo',
    d: '官方分组 + R32 淘汰树 → 5 万届向量化联合模拟 → 晋级率 / 夺冠率。',
    tag: 'tournament'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "method",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u65B9\u6CD5\u4E3B\u5E72",
    title: "\u5148\u505A\u6BD4\u5206\u6982\u7387\u7CFB\u7EDF\uFF0C\u4E0D\u505A\u9ED1\u7BB1\u5206\u7C7B\u5668",
    sub: "\u5148\u9884\u6D4B\u4E24\u961F\u8FDB\u7403\u5F3A\u5EA6\u4E0E\u6BD4\u5206\u5206\u5E03\uFF0C\u518D\u7531\u6BD4\u5206\u77E9\u9635\u7EDF\u4E00\u6D3E\u751F\u6240\u6709\u5E02\u573A\u4E0E\u8D5B\u4F1A\u6982\u7387\u3002\u6BCF\u4E00\u6B65\u53EF\u89E3\u91CA\u3001\u53EF\u6838\u9A8C\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pipe-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 0,
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      overflow: 'hidden'
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.n,
    style: {
      padding: 'var(--s-6) var(--s-5)',
      borderRight: i < steps.length - 1 ? '1px solid var(--divider)' : 'none',
      background: s.heart ? 'var(--accent-50)' : 'transparent',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 'var(--s-4)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 13px/1 var(--mono)',
      color: s.heart ? 'var(--accent)' : 'var(--muted)'
    }
  }, s.n), i < steps.length - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)',
      fontSize: 16
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("h4", {
    style: {
      font: '600 15px/1.25 var(--sans)',
      marginBottom: 8,
      color: s.heart ? 'var(--accent-deep)' : 'var(--ink)'
    }
  }, s.t, s.heart && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--accent)',
      marginLeft: 6
    }
  }, "\u2665")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--small)',
      color: 'var(--muted-2)',
      lineHeight: 1.55,
      marginBottom: 'var(--s-5)'
    }
  }, s.d), /*#__PURE__*/React.createElement("code", {
    style: {
      font: '500 11px/1 var(--mono)',
      color: s.heart ? 'var(--accent-deep)' : 'var(--muted)',
      background: s.heart ? 'transparent' : 'var(--bg-shade)',
      padding: '4px 7px',
      borderRadius: 5
    }
  }, s.tag)))));
}
Object.assign(window, {
  ChampionBoard,
  Pipeline
});
})();
