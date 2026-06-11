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
        kicker="2026 世界杯 · 夺冠概率"
        title="冠军概率榜"
        sub="官方分组 A–L、官方赛程，再经 4 万届赛事模拟。48 队同场竞技，夺冠概率自然分散——头部之间的差距，就是真实的不确定性。"
      />
      <div className="board-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--s-6)' }}>
        {/* left: probability board */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--s-5)' }}>
            <h3 style={{ font: 'var(--h3)' }}>夺冠概率 Top 8</h3>
            <span style={{ font: 'var(--label)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>40,000 届模拟</span>
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
        {/* right: ratings + embedded sponsor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-10)', padding: 'var(--s-6)' }}>
            <div style={{ font: 'var(--eyebrow)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-2)', marginBottom: 'var(--s-2)' }}>实力评分 · Top 5</div>
            <div style={{ font: 'var(--label)', color: 'var(--muted)', marginBottom: 'var(--s-5)' }}>基于多年国际赛战绩</div>
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
          <window.RedHorseCard />
        </div>
      </div>
    </Section>
  );
}

// ── Method pipeline (fan-facing, plain language)
function Pipeline() {
  const steps = [
    { n: '01', t: '历史实力评分', d: '用每支球队多年的国际赛战绩，算出它当前的实力分——胜负、净胜球、对手强弱都计入。' },
    { n: '02', t: '预期进球', d: '由两队的实力差，推算这场比赛双方大概能各进几个球。' },
    { n: '03', t: '比分概率表', d: '给出每个比分（1:0、2:1、2:2…）出现的概率。这张表是整个系统的核心。', heart: true },
    { n: '04', t: '一表换算所有玩法', d: '同一张比分概率表，直接换算胜平负、大小球、让球与波胆，彼此永远一致。' },
    { n: '05', t: '全赛事模拟', d: '把 104 场按官方赛制跑 4 万届，得到每支球队的出线率、晋级率与夺冠率。' },
  ];
  return (
    <Section id="method" style={{ paddingTop: 'var(--s-16)', paddingBottom: 'var(--s-12)', scrollMarginTop: 76 }}>
      <SectionHead
        kicker="预测方法"
        title="这些概率，是怎么算出来的"
        sub="先预测每场的比分概率，再由它统一推出所有玩法与晋级概率。五步串成一条清晰的链路，每一步都讲得清。"
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
            <p style={{ font: 'var(--small)', color: 'var(--muted-2)', lineHeight: 1.55, marginBottom: 0 }}>{s.d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

Object.assign(window, { ChampionBoard, Pipeline });
