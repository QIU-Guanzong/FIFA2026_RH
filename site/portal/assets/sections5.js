;(function () {
/* global React, Section, SectionHead, computeDC, deriveMarkets */
// wcpredict — sections part 5: ValueBets (model vs market edge + 下注建议)

const {
  useMemo: useMemo5
} = React;
function buildOpportunities() {
  const out = [];
  window.WC_MATCHES.forEach(mt => {
    const {
      m,
      N
    } = window.computeDC(mt.lh, mt.la);
    const mk = window.deriveMarkets(m, N);
    const legs = [{
      label: `${mt.home} 胜`,
      type: '1X2',
      model: mk.home,
      market: mt.market.home
    }, {
      label: '平局',
      type: '1X2',
      model: mk.draw,
      market: mt.market.draw
    }, {
      label: `${mt.away} 胜`,
      type: '1X2',
      model: mk.away,
      market: mt.market.away
    }, {
      label: '大 2.5',
      type: 'O/U',
      model: mk.over,
      market: mt.market.over
    }, {
      label: 'BTTS 是',
      type: 'BTTS',
      model: mk.btts,
      market: mt.market.btts
    }];
    legs.forEach(l => {
      const edge = l.model - l.market; // model disagreement vs market (pp)
      const fairOdds = 1 / l.model; // model fair price
      const mktOdds = 1 / l.market; // market price (devigged proxy)
      const kelly = (l.model - l.market) / (1 - l.market); // full-Kelly fraction
      out.push({
        match: `${mt.home} vs ${mt.away}`,
        stage: mt.stage,
        ...l,
        edge,
        fairOdds,
        mktOdds,
        kelly
      });
    });
  });
  return out.sort((a, b) => b.edge - a.edge);
}
function ValueBets() {
  const all = useMemo5(buildOpportunities, []);
  const value = all.filter(o => o.edge >= 0.02);
  return /*#__PURE__*/React.createElement(Section, {
    style: {
      paddingTop: 'var(--s-12)',
      paddingBottom: 'var(--s-12)'
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    kicker: "\u4E0B\u6CE8\u5EFA\u8BAE \xB7 \u6A21\u578B vs \u5E02\u573A\u4EF7\u503C\u5206\u6790",
    title: "\u53EA\u5728\u6A21\u578B\u4E0E\u5E02\u573A\u5206\u6B67\u65F6\u51FA\u624B",
    sub: "\u8D54\u7387\u53BB\u6C34\u4F4D\u540E\uFF0C\u7528\u6A21\u578B\u6982\u7387\u51CF\u53BB\u5E02\u573A\u9690\u542B\u6982\u7387\u5F97\u5230 edge\u3002\u6B63 edge \u624D\u6709\u4EF7\u503C\uFF1B\u5EFA\u8BAE\u4ED3\u4F4D\u6309 1/4 Kelly \u7ED9\u51FA\u3002\u957F\u671F\u8FB9\u9645\u4F18\u52BF\u6765\u81EA\u7EAA\u5F8B\uFF0C\u800C\u975E\u5355\u573A\u547D\u4E2D\u3002"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '11px 16px',
      borderRadius: 'var(--r-8)',
      background: 'var(--warn-bg)',
      border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
      marginBottom: 'var(--s-8)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 999,
      background: 'var(--warn)',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--small)',
      color: 'var(--ink-soft)'
    }
  }, "\u4EC5\u4F9B\u7814\u7A76 \xB7 \u6A21\u578B\u4E0E\u5E02\u573A\u4EF7\u683C\u5BF9\u6BD4\uFF0C\u975E\u6295\u6CE8\u5EFA\u8BAE\u3002\u6570\u636E\u4E3A\u5408\u6210/\u9A8C\u8BC1\u94FE\u8DEF\uFF0C\u7406\u6027\u5BF9\u5F85\u98CE\u9669\u3002")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 'var(--s-5)',
      flexWrap: 'wrap',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: 'var(--h3)'
    }
  }, "\u4EF7\u503C\u673A\u4F1A \xB7 \u6309 edge \u6392\u5E8F"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--label)',
      color: 'var(--muted)',
      fontFamily: 'var(--mono)'
    }
  }, value.length, " \u4E2A \xB7 edge \u2265 +2.0pp"), /*#__PURE__*/React.createElement("a", {
    href: "https://polymarket.com/sports/world-cup/games",
    target: "_blank",
    rel: "noreferrer",
    style: {
      font: '500 12px/1 var(--sans)',
      color: 'var(--ink-inverted)',
      background: 'var(--ink)',
      textDecoration: 'none',
      padding: '9px 14px',
      borderRadius: 7,
      whiteSpace: 'nowrap'
    }
  }, "\u5728 Polymarket \u4E0B\u6CE8 \u2197"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-10)',
      overflow: 'hidden',
      marginBottom: 'var(--s-8)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.9fr 1.1fr',
      padding: '13px 20px',
      font: 'var(--label)',
      color: 'var(--muted-2)',
      background: 'var(--panel-tint)',
      borderBottom: '1px solid var(--hairline)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u5BF9\u9635 / \u9009\u9879"), /*#__PURE__*/React.createElement("span", null, "\u5E02\u573A"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\u6A21\u578B"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\u5E02\u573A"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "edge"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\u5EFA\u8BAE\u4ED3\u4F4D \xBCK")), value.map((o, i) => {
    const stake = Math.max(0, o.kelly * 0.25);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr 0.9fr 1.1fr',
        padding: '15px 20px',
        alignItems: 'center',
        borderBottom: i < value.length - 1 ? '1px solid var(--divider)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("div", {
      style: {
        font: '600 14px/1.2 var(--sans)'
      }
    }, o.label), /*#__PURE__*/React.createElement("div", {
      style: {
        font: 'var(--label)',
        color: 'var(--muted)',
        marginTop: 3
      }
    }, o.match, " \xB7 ", o.stage)), /*#__PURE__*/React.createElement("span", {
      style: {
        font: '500 12px/1 var(--mono)',
        color: 'var(--muted-2)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 5,
        background: 'var(--bg-shade)'
      }
    }, o.type)), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'right',
        font: '600 14px/1 var(--mono)'
      }
    }, (o.model * 100).toFixed(1), "%"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'right',
        font: '500 13px/1 var(--mono)',
        color: 'var(--muted-2)'
      }
    }, (o.market * 100).toFixed(1), "%"), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'right',
        font: '600 14px/1 var(--mono)',
        color: 'var(--up)'
      }
    }, "+", (o.edge * 100).toFixed(1)), /*#__PURE__*/React.createElement("span", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 13px/1 var(--mono)',
        color: 'var(--accent)'
      }
    }, (stake * 100).toFixed(1), "%"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        marginLeft: 8,
        font: 'var(--label)',
        color: 'var(--muted)'
      }
    }, "@", o.mktOdds.toFixed(2))));
  })), /*#__PURE__*/React.createElement("div", {
    className: "vb-grid",
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 'var(--s-5)'
    }
  }, window.WC_MATCHES.map(mt => {
    const legs = all.filter(o => o.match === `${mt.home} vs ${mt.away}`);
    return /*#__PURE__*/React.createElement("div", {
      key: mt.id,
      style: {
        background: 'var(--surface)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-10)',
        padding: 'var(--s-6)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 'var(--s-5)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        font: '600 15px/1 var(--sans)'
      }
    }, mt.home, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--muted)'
      }
    }, "vs"), " ", mt.away), /*#__PURE__*/React.createElement("span", {
      style: {
        font: 'var(--label)',
        color: 'var(--muted)'
      }
    }, mt.stage)), legs.map(o => {
      const pos = o.edge >= 0;
      const w = Math.min(100, Math.abs(o.edge) * 100 * 6);
      return /*#__PURE__*/React.createElement("div", {
        key: o.label,
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 90px 52px',
          alignItems: 'center',
          gap: 12,
          padding: '7px 0'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          font: '500 13px/1.2 var(--sans)',
          color: 'var(--ink-soft)'
        }
      }, o.label), /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'relative',
          height: 6,
          background: 'var(--bg-shade)',
          borderRadius: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          left: '50%',
          top: -2,
          width: 1,
          height: 10,
          background: 'var(--hairline-strong)'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          top: 0,
          height: '100%',
          borderRadius: 3,
          left: pos ? '50%' : `calc(50% - ${w / 2}%)`,
          width: `${w / 2}%`,
          background: pos ? 'var(--up)' : 'var(--down)'
        }
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          textAlign: 'right',
          font: '600 12px/1 var(--mono)',
          color: pos ? 'var(--up)' : 'var(--down)'
        }
      }, pos ? '+' : '', (o.edge * 100).toFixed(1)));
    }));
  })));
}
Object.assign(window, {
  ValueBets
});
})();
