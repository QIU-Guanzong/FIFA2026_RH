;(function () {
/* global React, Section, SectionHead */
// RedFootball — 链上市场(Polymarket)套利/效率/分歧扫描。数据层 window.WC_MARKET（scripts/analyze_market.py）。
// 诚实口径：夺冠盘 $20亿成交=有效前沿，独立≠edge；无风险套利用证据说「无」，可操作的是 +EV 分歧（非无风险）。

const h = React.createElement;
function pct(x, d) { return (x * 100).toFixed(d == null ? 1 : d) + '%'; }
function zhOf(en) {
  const t = (window.WC_TEAMS || []).find(x => x.en === en);
  return t ? t.zh : en;
}
function flag(en) { return (window.WC_FLAGS && window.WC_FLAGS[en]) || '🏳️'; }

function StatCard({ label, value, sub, tone }) {
  const c = tone === 'good' ? 'var(--down)' : tone === 'warn' ? 'var(--up)' : 'var(--ink)';
  return h('div', { style: {
    background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)',
    padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 150px', minWidth: 150,
  } },
    h('span', { style: { font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' } }, label),
    h('span', { style: { font: '700 26px/1 var(--font-display)', color: c, fontVariantNumeric: 'tabular-nums' } }, value),
    sub && h('span', { style: { font: 'var(--small)', color: 'var(--muted)' } }, sub));
}

// 分歧行：模型 vs 市场 + edge
function DivRow({ d, kind }) {
  const up = d.edge > 0;
  return h('div', { style: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--r-6)',
    background: 'var(--bg-shade)',
  } },
    h('span', { style: { fontSize: 16 } }, flag(d.team)),
    h('span', { style: { font: '500 13.5px/1 var(--sans)', color: 'var(--ink)', flex: 1, minWidth: 0 } }, zhOf(d.team)),
    h('span', { style: { font: '600 12.5px/1 var(--mono)', color: 'var(--ink-soft)' } }, '模型 ' + pct(d.model, 0)),
    h('span', { style: { font: 'var(--label)', color: 'var(--muted)' } }, 'vs'),
    h('span', { style: { font: '600 12.5px/1 var(--mono)', color: 'var(--muted-2)' } }, '市场 ' + pct(d.market, 0)),
    h('span', { style: {
      font: '600 12.5px/1 var(--mono)', color: up ? 'var(--up)' : 'var(--down)',
      minWidth: 56, textAlign: 'right',
    } }, (up ? '+' : '') + (d.edge * 100).toFixed(1) + 'pp'));
}

function MarketScan() {
  const M = window.WC_MARKET;
  if (!M || !M.efficiency) {
    return h(Section, { style: { paddingTop: 'var(--s-10)', paddingBottom: 'var(--s-10)' } },
      h(SectionHead, { kicker: '链上市场 · 套利扫描', title: '数据加载中', sub: 'Polymarket 链上盘效率与分歧扫描稍后呈现。' }));
  }
  const e = M.efficiency, cm = M.cross_market, dv = M.divergence, fl = M.flow, meta = M.meta;
  const disp = M.dispersion;
  const volB = (meta.volume_usd || 0) / 1e9, liqM = (meta.liquidity_usd || 0) / 1e6;

  const head = h(SectionHead, {
    kicker: '链上市场 · Polymarket 套利扫描',
    title: '有没有套利机会？',
    sub: '链上夺冠盘的赔率实时变动。本页扫三类无风险套利 + 模型 vs 市场分歧。诚实结论：' + M.verdict,
  });

  // 效率 + 无风险套利硬判定
  const cards = h('div', { style: { display: 'flex', gap: 'var(--s-4)', flexWrap: 'wrap', marginBottom: 'var(--s-5)' } },
    h(StatCard, { label: '总水位 vig', value: e.vig_pct.toFixed(1) + '%', sub: 'Σyes ' + e.overround.toFixed(3) + '（越低越有效）' }),
    h(StatCard, { label: '无风险套利', value: e.riskless_arb ? '存在!' : '无', sub: '买全队 Yes 成本 ' + e.buy_all_yes_cost.toFixed(3) + (e.riskless_arb ? ' <1' : ' >1'), tone: e.riskless_arb ? 'warn' : 'good' }),
    h(StatCard, { label: '成交量', value: '$' + volB.toFixed(1) + 'B', sub: '流动性 $' + liqM.toFixed(0) + 'M' }),
    h(StatCard, { label: '跨市场一致性', value: (cm.anomalies.length === 0 ? '一致' : cm.anomalies.length + ' 例反常'), sub: '抓 ' + cm.groups_fetched.length + ' 组头名盘对照', tone: cm.anomalies.length ? 'warn' : 'good' }));

  // 套利判定说明条
  const verdictBar = h('div', { style: {
    display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 'var(--s-6)', padding: '13px 16px',
    background: 'var(--pitch-50)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-8)',
  } },
    h('span', { style: { fontSize: 15 } }, '🔎'),
    h('p', { style: { font: 'var(--small)', color: 'var(--ink-soft)', lineHeight: 1.6 } },
      h('b', { style: { color: 'var(--ink)' } }, '无风险套利：' + (e.riskless_arb ? '检测到（罕见，请核验流动性）' : '无。'),),
      ' 三类已扫：①单盘 Yes+No>1（点差恒正，无）；②买全 48 队 Yes 成本 ' + e.buy_all_yes_cost.toFixed(3) + '>1（无）；③' +
      '跨「夺冠/小组头名」盘 ' + (cm.anomalies.length ? cm.anomalies.length + ' 例反常' : '0 例反常') + '（缺「出线」盘，无干净 dutch-book）。' +
      ' 下方模型 vs 市场分歧系统性偏向冷门（slope ' + (disp ? disp.slope.toFixed(2) : '<1') + '<1 = 模型比市场更平），多半是模型欠离散、不是真 edge——不应照此下注；夺冠盘 $' + volB.toFixed(1) + 'B 级有效前沿，独立≠edge。'));

  // 离散度诊断：直接回答"是不是因为赔率低才买？"
  const dispPanel = disp && h('div', { style: {
    background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)',
    padding: 'var(--s-6)', marginBottom: 'var(--s-6)',
  } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--s-4)' } },
      h('span', { style: { font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pitch-deep)' } }, '我们是不是因为赔率低才买？'),
      h('span', { style: { font: '700 18px/1 var(--font-display)', color: 'var(--down)' } }, '不——恰好相反')),
    h('p', { style: { font: 'var(--small)', color: 'var(--ink-soft)', lineHeight: 1.65, marginBottom: 'var(--s-5)' } },
      '把"模型概率"对"市场概率"做回归，斜率 ',
      h('b', { style: { color: 'var(--ink)', fontFamily: 'var(--mono)' } }, 'slope = ' + disp.slope.toFixed(2)),
      '。slope<1 = 模型比 $' + volB.toFixed(1) + 'B 市场更平（向均匀收缩）：',
      h('b', { style: { color: 'var(--ink)' } }, '冷门给太多、热门给不够'),
      '。所以我们的"价值"系统性落在高赔冷门一侧（押 ' +
        dv.value.slice(0, 2).map(d => zhOf(d.team) + ' ' + Math.round(1 / d.market) + 'x').join('、') +
        '；空 ' + dv.fade.slice(0, 3).map(d => zhOf(d.team)).join('/') + '），',
      h('b', { style: { color: 'var(--up)' } }, '这多半是模型欠离散，不是已证 edge'),
      '——不应照此下注。'),
    // 分层 edge：热门→超长
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--s-3)' } },
      (disp.tiers || []).map((t, i) => {
        const neg = t.avg_edge < 0;
        const tip = { '热门': '<14x · 大热', '中': '14–33x', '长': '33–100x', '超长': '>100x · 大冷' }[t.tier] || '';
        return h('div', { key: i, style: {
          background: 'var(--bg-shade)', borderRadius: 'var(--r-6)', padding: '11px 13px',
          display: 'flex', flexDirection: 'column', gap: 4,
        } },
          h('span', { style: { font: 'var(--label)', color: 'var(--muted-2)' } }, t.tier + ' · ' + tip),
          h('span', { style: { font: '700 19px/1 var(--font-display)', color: neg ? 'var(--down)' : 'var(--up)', fontVariantNumeric: 'tabular-nums' } },
            (t.avg_edge > 0 ? '+' : '') + (t.avg_edge * 100).toFixed(1) + 'pp'),
          h('span', { style: { font: 'var(--label)', color: 'var(--muted)' } }, 'n=' + t.n + ' · ' + Math.round(t.pct_pos * 100) + '% 为正'));
      })));

  // 模型 vs 市场分歧（明确口径：分歧≠可下注 edge）
  const divPanel = h('div', { style: { display: 'flex', gap: 'var(--s-6)', flexWrap: 'wrap', marginBottom: 'var(--s-6)' } },
    h('div', { style: { flex: '1 1 320px', minWidth: 280 } },
      h('div', { style: { font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pitch-deep)', marginBottom: 'var(--s-3)' } }, '模型更看好（冷门为主 · 多半欠离散，非真 edge）'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, dv.value.map((d, i) => h(DivRow, { key: i, d, kind: 'value' })))),
    h('div', { style: { flex: '1 1 240px', minWidth: 220 } },
      h('div', { style: { font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 'var(--s-3)' } }, '市场更看好（热门为主 · 市场更尖锐）'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, dv.fade.map((d, i) => h(DivRow, { key: i, d, kind: 'fade' })))));

  // 赔率流
  const flowPanel = h('div', { style: {
    background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)',
  } },
    h('div', { style: { font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 'var(--s-3)' } },
      '赔率流 · 最近两次快照变动' + (fl.asof && fl.asof.length === 2 ? '（' + fl.asof[0] + ' → ' + fl.asof[1] + '）' : '')),
    (fl.movers && fl.movers.length)
      ? h('div', { style: { display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' } }, fl.movers.map((m, i) => {
          const up = m.delta > 0;
          return h('div', { key: i, style: {
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', borderRadius: 'var(--r-6)', background: 'var(--bg-shade)',
          } },
            h('span', { style: { fontSize: 14 } }, flag(m.team)),
            h('span', { style: { font: '500 12.5px/1 var(--sans)' } }, zhOf(m.team)),
            h('span', { style: { font: '600 12px/1 var(--mono)', color: up ? 'var(--up)' : 'var(--down)' } },
              (up ? '▲' : '▼') + ' ' + (m.delta > 0 ? '+' : '') + (m.delta * 100).toFixed(1) + '¢'));
        }))
      : h('p', { style: { font: 'var(--small)', color: 'var(--muted)' } }, '需 ≥2 次快照才显示变动（每日刷新累积；当前快照已入库）。'));

  const foot = h('p', { style: { font: 'var(--small)', color: 'var(--muted)', marginTop: 'var(--s-6)', lineHeight: 1.6 } },
    '数据：' + meta.source + '（去水位已剔除已结算/退市市场）· 截至 ' + (meta.as_of || '').slice(0, 16).replace('T', ' ') +
    ' · 模型 v' + meta.model_version + '。分歧为模型与市场的概率差，属研究性 +EV 参照，非无风险套利、不构成投注建议。');

  return h(Section, { style: { paddingTop: 'var(--s-10)', paddingBottom: 'var(--s-12)' } },
    head, cards, verdictBar, dispPanel, divPanel, flowPanel, foot);
}

Object.assign(window, { MarketScan });
})();
