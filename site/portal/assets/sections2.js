;(function () {
/* global React, Section, SectionHead, Sparkline */
// wcpredict — sections part 2: ChampionBoard, Pipeline
const RF_SIMS_WAN_2 = Math.round((((window.RF_ENGINE || {}).sims) || 40000) / 10000); // 引擎模拟届数（万），单一真理源

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
    kicker: "2026 \u4E16\u754C\u676F \xB7 \u593A\u51A0\u6982\u7387",
    title: "\u51A0\u519B\u6982\u7387\u699C",
    sub: "\u5B98\u65B9\u5206\u7EC4 A\u2013L\u3001\u5B98\u65B9\u8D5B\u7A0B\uFF0C\u518D\u7ECF 4 \u4E07\u5C4A\u8D5B\u4E8B\u6A21\u62DF\u300248 \u961F\u540C\u573A\u7ADE\u6280\uFF0C\u593A\u51A0\u6982\u7387\u81EA\u7136\u5206\u6563\u2014\u2014\u5934\u90E8\u4E4B\u95F4\u7684\u5DEE\u8DDD\uFF0C\u5C31\u662F\u771F\u5B9E\u7684\u4E0D\u786E\u5B9A\u6027\u3002"
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
  }, RF_SIMS_WAN_2 + " \u4E07\u5C4A\u6A21\u62DF")), /*#__PURE__*/React.createElement("div", {
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
  }, "\u5B9E\u529B\u8BC4\u5206 \xB7 Top 5"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      marginBottom: 'var(--s-5)'
    }
  }, "\u57FA\u4E8E\u591A\u5E74\u56FD\u9645\u8D5B\u6218\u7EE9"), ratings.map((r, i) => /*#__PURE__*/React.createElement("div", {
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
  }, r.elo)))), /*#__PURE__*/React.createElement(window.RedHorseCard, null))));
}

// ── Method pipeline (fan-facing, plain language)
function Pipeline() {
  const steps = [{
    n: '01',
    t: '历史实力评分',
    d: '用每支球队多年的国际赛战绩，算出它当前的实力分——胜负、净胜球、对手强弱都计入。'
  }, {
    n: '02',
    t: '预期进球',
    d: '由两队的实力差，推算这场比赛双方大概能各进几个球。'
  }, {
    n: '03',
    t: '比分概率表',
    d: '给出每个比分（1:0、2:1、2:2…）出现的概率。这张表是整个系统的核心。',
    heart: true
  }, {
    n: '04',
    t: '一表换算所有玩法',
    d: '同一张比分概率表，直接换算胜平负、大小球、让球与波胆，彼此永远一致。'
  }, {
    n: '05',
    t: '全赛事模拟',
    d: '把 104 场按官方赛制跑 4 万届，得到每支球队的出线率、晋级率与夺冠率。'
  }];
  return /*#__PURE__*/React.createElement(Section, {
    id: "method",
    style: {
      paddingTop: 'var(--s-16)',
      paddingBottom: 'var(--s-12)',
      scrollMarginTop: 76
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u9884\u6D4B\u65B9\u6CD5",
    title: "\u8FD9\u4E9B\u6982\u7387\uFF0C\u662F\u600E\u4E48\u7B97\u51FA\u6765\u7684",
    sub: "\u5148\u9884\u6D4B\u6BCF\u573A\u7684\u6BD4\u5206\u6982\u7387\uFF0C\u518D\u7531\u5B83\u7EDF\u4E00\u63A8\u51FA\u6240\u6709\u73A9\u6CD5\u4E0E\u664B\u7EA7\u6982\u7387\u3002\u4E94\u6B65\u4E32\u6210\u4E00\u6761\u6E05\u6670\u7684\u94FE\u8DEF\uFF0C\u6BCF\u4E00\u6B65\u90FD\u8BB2\u5F97\u6E05\u3002"
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
      marginBottom: 0
    }
  }, s.d)))));
}
Object.assign(window, {
  ChampionBoard,
  Pipeline
});
})();
