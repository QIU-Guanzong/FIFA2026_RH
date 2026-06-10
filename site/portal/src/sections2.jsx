/* global React, Section, SectionHead, Sparkline */
// wcpredict — sections part 2: ChampionBoard, Pipeline

// ── Full championship board with rating cross-reference
function ChampionBoard() {
  const champs = window.WC_CHAMPIONS;
  const ratings = window.WC_RATINGS;
  const max = champs[0].p;
  return (
    <Section id="board" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead
        kicker="正式 2026 赛会预测 · #4"
        title="冠军概率榜"
        sub="官方分组 A–L + 官方 R32 淘汰树 + 第三名落位（495 约束二部图匹配）。48 队场地下 favorite 概率自然分散——头部即真实的不确定性，而非模型不自信。"
      />
      <div className="board-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--s-6)' }}>
        {/* left: probability board */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-5)' }}>
            <h3 style={{ font: 'var(--h3)' }}>夺冠概率 Top 8</h3>
            <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Monte Carlo · 40,000 届</span>
          </div>
          {/* column header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '20px minmax(96px,1.2fr) 1fr 50px 46px 46px 42px', alignItems: 'center', gap: 10,
            font: 'var(--label)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
            paddingBottom: 8, borderBottom: '1px solid var(--hairline)',
          }}>
            <span />
            <span>球队</span>
            <span>夺冠概率</span>
            <span style={{ textAlign: 'right' }}>夺冠</span>
            <span style={{ textAlign: 'right' }}>四强</span>
            <span style={{ textAlign: 'right' }}>决赛</span>
            <span style={{ textAlign: 'right' }}>出线</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {champs.map((t, i) => (
              <div key={t.en} style={{
                display: 'grid', gridTemplateColumns: '20px minmax(96px,1.2fr) 1fr 50px 46px 46px 42px', alignItems: 'center', gap: 10,
                padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--divider)',
              }}>
                <span style={{ font: '600 13px/1 var(--mono)', color: 'var(--muted)' }}>{String(i+1).padStart(2,'0')}</span>
                <span>
                  <div style={{ font: '600 15px/1.1 var(--sans)' }}>{t.team}</div>
                  <div style={{ font: 'var(--label)', color: 'var(--muted)', marginTop: 3 }}>{t.en} · {t.conf}</div>
                </span>
                <span style={{ height: 8, background: 'var(--bg-shade)', borderRadius: 4, overflow: 'hidden' }}>
                  <span style={{ display: 'block', width: `${(t.p/max)*100}%`, height: '100%', background: i === 0 ? 'var(--accent)' : 'var(--ink)', opacity: i === 0 ? 1 : 0.85 - i*0.06, borderRadius: 4 }} />
                </span>
                <span style={{ font: '600 16px/1 var(--mono)', textAlign: 'right', color: i === 0 ? 'var(--accent)' : 'var(--ink)' }}>{t.p.toFixed(1)}<span style={{ fontSize: 10, color: 'var(--muted)' }}>%</span></span>
                <span style={{ font: '500 13px/1 var(--mono)', textAlign: 'right', color: 'var(--muted-2)' }}>{t.qf.toFixed(0)}</span>
                <span style={{ font: '500 13px/1 var(--mono)', textAlign: 'right', color: 'var(--muted-2)' }}>{t.fin.toFixed(0)}</span>
                <span style={{ font: '600 13px/1 var(--mono)', textAlign: 'right', color: 'var(--pitch-deep)' }}>{t.adv}</span>
              </div>
            ))}
          </div>
        </div>
        {/* right: ratings + note */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
            <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 'var(--s-2)' }}>国家队 Elo 评分 · Top 5</div>
            <div style={{ font: 'var(--label)', color: 'var(--muted)', marginBottom: 'var(--s-5)' }}>真实国际赛 1872–至今 · 多趟暖启动</div>
            {ratings.map((r, i) => (
              <div key={r.en} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid var(--divider)' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ font: '600 12px/1 var(--mono)', color: 'var(--muted)' }}>{i+1}</span>
                  <span style={{ font: '500 14px/1 var(--sans)' }}>{r.team}</span>
                </span>
                <span style={{ font: '600 14px/1 var(--mono)' }}>{r.elo}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--accent-50)', border: '1px solid var(--accent-soft)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
            <div style={{ font: 'var(--label)', color: 'var(--accent-deep)', fontWeight: 600, marginBottom: 8 }}>第三名落位 · 不猜表</div>
            <p style={{ font: 'var(--small)', color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              严格执行 Wikipedia 公布的"每槽接受哪 5 个组"约束做二部图匹配。495 组合全部可解（Hall 通过）但均非唯一——两套合法落位对夺冠概率最大仅差 <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>0.11pp</span>。
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Method pipeline
function Pipeline() {
  const steps = [
    { n: '01', t: '国际赛 Elo 先验', d: 'FIFA SUM 思路：重要性加权 + 净胜球放大 + 中立场修正。多趟暖启动反向传播跨洲际信息。', tag: 'ratings/elo' },
    { n: '02', t: 'log-linear λ', d: '由 rating 映射两队进球强度 λ_home / λ_away，或走真实历史 MLE 时间加权拟合。', tag: 'model' },
    { n: '03', t: 'Dixon-Coles 比分矩阵', d: 'τ 低比分修正（符号经论文核验）；ρ<0 抬高平局。这是整个系统的心脏。', tag: 'dixon_coles', heart: true },
    { n: '04', t: '统一派生 + 融合', d: '同一矩阵导出 1X2 / 大小球 / BTTS / 让球 / 波胆；赔率去水位后与市场融合。', tag: 'markets/derive' },
    { n: '05', t: '全赛事 Monte Carlo', d: '官方分组 + R32 淘汰树 → 5 万届向量化联合模拟 → 晋级率 / 夺冠率。', tag: 'tournament' },
  ];
  return (
    <Section id="method" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead
        kicker="方法主干"
        title="先做比分概率系统，不做黑箱分类器"
        sub="先预测两队进球强度与比分分布，再由比分矩阵统一派生所有市场与赛会概率。每一步可解释、可核验。"
      />
      <div className="pipe-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', overflow: 'hidden' }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{
            padding: 'var(--s-6) var(--s-5)', borderRight: i < steps.length - 1 ? '1px solid var(--divider)' : 'none',
            background: s.heart ? 'var(--accent-50)' : 'transparent', position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-4)' }}>
              <span style={{ font: '600 13px/1 var(--mono)', color: s.heart ? 'var(--accent)' : 'var(--muted)' }}>{s.n}</span>
              {i < steps.length - 1 && <span style={{ color: 'var(--muted)', fontSize: 16 }}>→</span>}
            </div>
            <h4 style={{ font: '600 15px/1.25 var(--sans)', marginBottom: 8, color: s.heart ? 'var(--accent-deep)' : 'var(--ink)' }}>
              {s.t}{s.heart && <span style={{ font: 'var(--label)', color: 'var(--accent)', marginLeft: 6 }}>♥</span>}
            </h4>
            <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.55, marginBottom: 'var(--s-5)' }}>{s.d}</p>
            <code style={{ font: '500 11px/1 var(--mono)', color: s.heart ? 'var(--accent-deep)' : 'var(--muted)', background: s.heart ? 'transparent' : 'var(--bg-shade)', padding: '4px 7px', borderRadius: 5 }}>{s.tag}</code>
          </div>
        ))}
      </div>
    </Section>
  );
}

Object.assign(window, { ChampionBoard, Pipeline });
