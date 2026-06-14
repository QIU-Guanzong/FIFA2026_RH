;(function () {
/* global React, Section, SectionHead */
// RedFootball — sections part 8: LiveReport 战报 / 实时准确率
// 冻结的赛前预测 vs 真实赛果。数据层 window.WC_ACCURACY（scripts/score_predictions.py → accuracy.js）。
// 纪律：样本 n < 阈值时全部指标置为「指示性」（置灰 + 角标），不冒充统计结论。

const h = React.createElement;
const OUT_COLOR = { home: 'var(--up)', draw: 'var(--muted-2)', away: 'var(--down)' };
const OUT_ZH = { home: '主胜', draw: '平局', away: '客胜' };

function pct(x, d) { return (x * 100).toFixed(d == null ? 0 : d) + '%'; }

function Tag({ text, tone }) {
  const map = {
    ok: ['var(--down)', 'var(--down-bg)'],
    bad: ['var(--up)', 'var(--up-bg)'],
    warn: ['var(--warn)', 'var(--warn-bg)'],
    mute: ['var(--muted-2)', 'var(--bg-shade)'],
    info: ['var(--info)', 'var(--info-bg)'],
  };
  const [c, bg] = map[tone] || map.mute;
  return h('span', { style: {
    font: '600 11px/1 var(--font-head)', letterSpacing: '0.02em', color: c, background: bg,
    padding: '3px 8px', borderRadius: 'var(--r-full)', whiteSpace: 'nowrap',
  } }, text);
}

// KPI 卡：indicative 时数字置灰 + 「指示性」角标
function Kpi({ label, value, sub, accent, indicative }) {
  return h('div', { style: {
    background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)',
    padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative',
    flex: '1 1 150px', minWidth: 150,
  } },
    indicative && h('span', { style: {
      position: 'absolute', top: 10, right: 10, font: '600 9.5px/1 var(--font-head)',
      letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase',
    } }, '指示性'),
    h('span', { style: { font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)' } }, label),
    h('span', { style: {
      font: '700 30px/1 var(--font-display)', fontVariantNumeric: 'tabular-nums',
      color: indicative ? 'var(--muted-2)' : (accent || 'var(--ink)'),
    } }, value),
    sub && h('span', { style: { font: 'var(--small)', color: 'var(--muted)' } }, sub),
  );
}

// 1X2 预测条：真实结果段加描边标出
function PredBar({ m }) {
  const segs = [['home', m.p_home], ['draw', m.p_draw], ['away', m.p_away]];
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200, flex: '1 1 200px' } },
    h('div', { style: { display: 'flex', height: 9, borderRadius: 5, overflow: 'hidden', gap: 2 } },
      segs.map(([k, v]) => h('span', {
        key: k,
        title: OUT_ZH[k] + ' ' + pct(v, 1),
        style: {
          width: (v * 100) + '%', background: OUT_COLOR[k],
          opacity: k === m.outcome ? 1 : 0.32,
          outline: k === m.outcome ? '2px solid var(--ink)' : 'none', outlineOffset: -1,
        },
      })),
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6 } },
      segs.map(([k, v]) => h('span', {
        key: k,
        style: {
          font: (k === m.outcome ? '700' : '500') + ' 11.5px/1 var(--mono)',
          color: k === m.outcome ? OUT_COLOR[k] : 'var(--muted)',
          textDecoration: k === m.outcome ? 'underline' : 'none', textUnderlineOffset: 3,
        },
      }, OUT_ZH[k] + ' ' + pct(v))),
    ),
  );
}

// 比分牌：旗 + 中文名 + 大比分（胜方着色）
function Scoreboard({ m }) {
  const hWin = m.home_goals > m.away_goals, aWin = m.away_goals > m.home_goals;
  const numCol = (win) => win ? 'var(--ink)' : 'var(--muted-2)';
  const side = (flag, name, align) => h('div', {
    style: { display: 'flex', flexDirection: 'column', alignItems: align, gap: 3, minWidth: 0, flex: 1 },
  },
    h('span', { style: { fontSize: 22, lineHeight: 1 } }, flag),
    h('span', { style: {
      font: '600 13.5px/1.15 var(--sans)', color: 'var(--ink)', textAlign: align === 'flex-end' ? 'right' : 'left',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
    } }, name),
  );
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 230, flex: '1 1 240px' } },
    side(m.home_flag, m.home_zh, 'flex-start'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' } },
      h('span', { style: { font: 'var(--num-sport)', fontSize: 30, color: numCol(hWin) } }, m.home_goals),
      h('span', { style: { font: '600 14px/1 var(--font-display)', color: 'var(--muted)' } }, '–'),
      h('span', { style: { font: 'var(--num-sport)', fontSize: 30, color: numCol(aWin) } }, m.away_goals),
    ),
    side(m.away_flag, m.away_zh, 'flex-end'),
  );
}

function MatchCard({ m }) {
  return h('div', { style: {
    background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)',
    padding: 'var(--s-5) var(--s-6)', display: 'flex', alignItems: 'center', gap: 'var(--s-6)',
    flexWrap: 'wrap',
  } },
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 60, flex: '0 0 auto' } },
      h('span', { style: { font: '600 12px/1 var(--mono)', color: 'var(--ink-soft)' } }, m.date.slice(5)),
      h(Tag, { text: '组 ' + m.group, tone: 'mute' }),
    ),
    h(Scoreboard, { m }),
    h(PredBar, { m }),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end', minWidth: 188, flex: '1 1 200px' } },
      h(Tag, { text: m.pick_correct ? '✓ 命中 ' + OUT_ZH[m.pick] : '✗ 未中（押 ' + OUT_ZH[m.pick] + '）', tone: m.pick_correct ? 'ok' : 'bad' }),
      h('span', { style: { font: 'var(--small)', color: 'var(--muted-2)' } },
        '模型给该结果 ',
        h('b', { style: { font: '600 12.5px/1 var(--mono)', color: 'var(--ink-soft)' } }, pct(m.prob_actual)),
        m.exp_home != null && h('span', { style: { color: 'var(--muted)' } }, '  · 预期 ' + m.exp_home.toFixed(1) + '–' + m.exp_away.toFixed(1)),
      ),
      m.top3 && h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' } },
        h('span', { style: { font: 'var(--label)', color: 'var(--muted)', alignSelf: 'center' } }, '比分'),
        m.top3.map((ts, i) => {
          const hit = ts[0][0] === m.home_goals && ts[0][1] === m.away_goals;
          return h('span', { key: i, style: {
            font: '600 11px/1 var(--mono)', padding: '3px 6px', borderRadius: 'var(--r-4)',
            background: hit ? 'var(--down-bg)' : 'var(--bg-shade)', color: hit ? 'var(--down)' : 'var(--muted-2)',
            outline: hit ? '1px solid var(--down)' : 'none',
          } }, ts[0][0] + '-' + ts[0][1], ' ', h('span', { style: { opacity: 0.7 } }, pct(ts[1])), hit ? ' ✓' : '');
        }),
      ),
    ),
  );
}

function LiveReport() {
  const A = window.WC_ACCURACY;
  if (!A || !A.summary) {
    return h(Section, { style: { paddingTop: 'var(--s-12)', paddingBottom: 'var(--s-12)' } },
      h(SectionHead, { kicker: '战报 · 模型 vs 真实赛果', title: '赛果回填中', sub: '开赛后真实比分将在此与赛前冻结预测逐场对照。请稍后再来。' }));
  }
  const s = A.summary, meta = A.meta, ind = s.indicative;
  const skillPos = (s.skill_vs_uniform_ll || 0) > 0;

  const head = h(SectionHead, {
    kicker: '战报 · 模型 vs 真实赛果',
    title: '开赛了 · 预测准不准？',
    sub: '世界杯小组赛 72 场的胜平负 / 比分概率，已在开赛前（数据截至 ' + meta.data_cutoff +
      '）用部署模型一次性冻结、不再回调。每有真实赛果便逐场打分——这是诚实的 ex-ante 检验，无赛后泄漏。',
  });

  const statusBar = h('div', { style: {
    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 'var(--s-6)',
    padding: '10px 16px', background: 'var(--pitch-50)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-8)',
  } },
    h('span', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
      h('span', { className: 'as-pulse', style: { width: 8, height: 8, borderRadius: 999, background: 'var(--live)' } }),
      h('span', { style: { font: '600 12.5px/1 var(--font-head)', color: 'var(--pitch-deep)', letterSpacing: '0.02em' } }, '实时追踪')),
    h('span', { style: { font: 'var(--small)', color: 'var(--ink-soft)' } },
      '已打分 ', h('b', { style: { fontFamily: 'var(--mono)', color: 'var(--ink)' } }, s.n), ' / 72 场'),
    h('span', { style: { font: 'var(--small)', color: 'var(--muted-2)' } }, '模型 default v' + meta.model_version),
    h('span', { style: { font: 'var(--small)', color: 'var(--muted-2)' } }, '截至 ' + (meta.as_of || '').slice(0, 10)),
  );

  const indBanner = ind && s.n > 0 && h('div', { style: {
    display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 'var(--s-6)',
    padding: '13px 16px', background: 'var(--warn-bg)', border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
    borderRadius: 'var(--r-8)',
  } },
    h('span', { style: { fontSize: 16, lineHeight: 1.2 } }, '⚠️'),
    h('p', { style: { font: 'var(--small)', color: 'var(--ink-soft)', lineHeight: 1.55 } },
      h('b', { style: { color: 'var(--ink)' } }, '样本仅 ' + s.n + ' 场（< ' + meta.small_n_threshold + '），下列准确率仅作指示性，尚不具统计意义。'),
      ' 单场胜负噪声极大，至少累积十余场后误差带才会收敛。小组赛共 72 场，本页随赛程持续累积（数据截至见上）——这套追踪装置本身才是交付物，而非此刻的命中率。'),
  );

  const empty = s.n === 0 && h('div', { style: {
    padding: 'var(--s-10)', textAlign: 'center', background: 'var(--surface)',
    border: '1px dashed var(--hairline-strong)', borderRadius: 'var(--r-10)', color: 'var(--muted-2)',
  } }, h('p', { style: { font: 'var(--p)' } }, '72 场预测已冻结，等待首场赛果回填（数据源可能滞后 1–2 天）。'));

  const kpis = s.n > 0 && h('div', { style: { display: 'flex', gap: 'var(--s-4)', flexWrap: 'wrap', marginBottom: 'var(--s-5)' } },
    h(Kpi, { label: '正确率 · Top-pick', value: pct(s.pick_accuracy), sub: s.n + ' 场中 ' + Math.round(s.pick_accuracy * s.n) + ' 场押中胜平负', indicative: ind, accent: 'var(--pitch-deep)' }),
    h(Kpi, { label: 'Log-loss · 概率质量', value: s.log_loss.toFixed(3), sub: '无技能基准 ' + s.log_loss_uniform.toFixed(3) + (skillPos ? ' · 优于随机 ' + s.skill_vs_uniform_ll.toFixed(3) : ' · 暂逊于随机'), indicative: ind, accent: skillPos ? 'var(--down)' : 'var(--up)' }),
    h(Kpi, { label: '比分 · Top-3 命中', value: (s.top3_hits != null ? s.top3_hits : s.exact_score_hits) + '/' + s.n,
      sub: '精确 ' + s.exact_score_hits + '/' + s.n + '（理论上限≈' + Math.round((s.exact_ceiling || 0.12) * 100) + '%）', indicative: ind, accent: 'var(--pitch-deep)' }),
    h(Kpi, { label: '总进球 MAE', value: s.total_goals_mae.toFixed(2), sub: '场均期望进球偏差', indicative: ind }),
  );

  const subStats = s.n > 0 && h('div', { style: {
    display: 'flex', gap: 'var(--s-6)', flexWrap: 'wrap', marginBottom: 'var(--s-7)',
    padding: '12px 18px', background: 'var(--bg-shade)', borderRadius: 'var(--r-8)',
  } }, [
    ['Brier', s.brier.toFixed(3)],
    ['大小球 2.5 准确', pct(s.ou25_accuracy)],
    ['BTTS 准确', pct(s.btts_accuracy)],
    ['模型给真实结果·均概率', pct(s.mean_prob_on_actual)],
  ].map(([k, v]) => h('span', { key: k, style: { display: 'flex', alignItems: 'baseline', gap: 7 } },
    h('span', { style: { font: 'var(--label)', color: 'var(--muted-2)' } }, k),
    h('b', { style: { font: '600 14px/1 var(--mono)', color: ind ? 'var(--muted-2)' : 'var(--ink)' } }, v)),
  ));

  const list = s.n > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' } },
    h('div', { style: { font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 2 } }, '逐场对照 · 绿条=押中 / 黑描边=真实结果'),
    A.matches.map((m, i) => h(MatchCard, { key: i, m })),
  );

  const foot = h('div', { style: { marginTop: 'var(--s-7)', display: 'flex', flexDirection: 'column', gap: 8 } },
    h('p', { style: { font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.6 } },
      h('b', { style: { color: 'var(--ink-soft)' } }, '关于比分预测：'),
      '足球单场精确比分天生难——7000+ 场国际赛留出实测，即便最优调参，「最可能那一个比分」也只有约 12% 命中率。' +
      '故本页以 Top-3 比分分布 + 预期进球呈现，而非假装单一比分笃定。低分比分与 1X2 概率校准良好；惟大冷门的总进球期望偏高（已知结构性，大小球偏向大球）。'),
    h('p', { style: { font: 'var(--small)', color: 'var(--muted)', lineHeight: 1.6 } },
      '预测于 ' + meta.data_cutoff + ' 数据冻结、开赛前生成（ex-ante，模型从未见过这些赛果）；模型 default v' + meta.model_version +
      '；全场按中立场口径（东道主主场加成未建模，故美国 4-1 巴拉圭这类东道主大胜会被低估）；赛果来源 ' +
      (meta.result_sources && meta.result_sources.join('、') || '—') + '。仅供研究，不构成投注建议。'));

  return h(Section, { style: { paddingTop: 'var(--s-12)', paddingBottom: 'var(--s-12)' } },
    head, statusBar, indBanner, empty, kpis, subStats, list, foot);
}

Object.assign(window, { LiveReport });
})();
