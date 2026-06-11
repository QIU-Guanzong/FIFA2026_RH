/* wcpredict — landing page data (sourced from repo README results) */

// 冠军概率（官方分组 wc2026 链路 · 4 万届模拟 · 数据截至 2026-06-04）
// adv=出线（小组前二）· qf=进四强 · fin=进决赛
window.WC_CHAMPIONS = window.WC_CHAMPIONS || [
  { team: '西班牙', en: 'Spain',       conf: 'UEFA',     p: 14.4, qf: 46.6, fin: 22.0, adv: 96, trend: [10,11,12,13,14,15,14.4] },
  { team: '阿根廷', en: 'Argentina',   conf: 'CONMEBOL', p: 9.9,  qf: 39.7, fin: 16.5, adv: 92, trend: [12,11,11,10,10,10,9.9] },
  { team: '法国',   en: 'France',      conf: 'UEFA',     p: 9.0,  qf: 39.2, fin: 14.8, adv: 90, trend: [8,8,9,9,9,9,9] },
  { team: '英格兰', en: 'England',     conf: 'UEFA',     p: 5.6,  qf: 33.4, fin: 10.6, adv: 91, trend: [5,5,6,6,6,5.8,5.6] },
  { team: '巴西',   en: 'Brazil',      conf: 'CONMEBOL', p: 4.4,  qf: 29.0, fin: 8.5,  adv: 87, trend: [6,5,5,4,4,4.2,4.4] },
  { team: '葡萄牙', en: 'Portugal',    conf: 'UEFA',     p: 4.3,  qf: 27.9, fin: 8.3,  adv: 84, trend: [3,3.4,3.8,4,4.1,4.2,4.3] },
  { team: '哥伦比亚', en: 'Colombia',  conf: 'CONMEBOL', p: 4.0,  qf: 27.5, fin: 8.1,  adv: 83, trend: [2.6,3,3.3,3.6,3.8,3.9,4.0] },
  { team: '荷兰',   en: 'Netherlands', conf: 'UEFA',     p: 3.9,  qf: 28.3, fin: 7.6,  adv: 85, trend: [3,3.2,3.5,3.7,3.8,3.9,3.9] },
];

// 国家队 Elo 评分 Top5（真实国际赛 1872–至今）
window.WC_RATINGS = window.WC_RATINGS || [
  { team: '西班牙', en: 'Spain',     elo: 2048 },
  { team: '阿根廷', en: 'Argentina', elo: 2031 },
  { team: '法国',   en: 'France',    elo: 2014 },
  { team: '巴西',   en: 'Brazil',    elo: 1992 },
  { team: '英格兰', en: 'England',   elo: 1981 },
];

// 无泄漏 walk-forward 回测（英超三季 950 场持出）
window.WC_BACKTEST = window.WC_BACKTEST || [
  { name: '市场 · Pinnacle 赛前', logloss: 0.9376, brier: 0.5538, delta: '基准',  kind: 'market' },
  { name: 'Elo 先验',            logloss: 0.9587, brier: 0.5677, delta: '−0.021', kind: 'model' },
  { name: 'Dixon-Coles (MLE)',   logloss: 0.9916, brier: 0.5852, delta: '−0.054', kind: 'model' },
];

// 洲际通胀修正（多趟暖启动，国际赛 17,039 场持出）
window.WC_CONFED = window.WC_CONFED || [0.9118, 0.9067, 0.9012, 0.8985, 0.8971]; // passes 1→5 log loss

// 自建 shot-level xG（WC2022 留出 16 场 / 382 射门，对真实进球校准）
window.WC_XG = window.WC_XG || [
  { name: '常数基线',          logloss: 0.3409, brier: 0.1913, ece: '—' },
  { name: '本模型 · 4 特征',   logloss: 0.2783, brier: 0.1647, ece: '0.035', highlight: true },
  { name: 'statsbomb_xg 参照', logloss: 0.2395, brier: 0.1418, ece: '0.035' },
];

// xG 可解释系数（符号皆合常识）
window.WC_XG_COEF = window.WC_XG_COEF || [
  { feat: '到球门距离', sign: '−0.099', note: '越远越难' },
  { feat: '门口张角',   sign: '+1.46',  note: '角度越大越易' },
  { feat: '是否头球',   sign: '−1.40',  note: '头球更难' },
  { feat: '是否运动战', sign: '+0.62',  note: '运动战机会更佳' },
];

// 模块地图
window.WC_MODULES = window.WC_MODULES || [
  { id: 'ratings/elo',          role: '国际赛 Elo 先验',     note: 'FIFA SUM · 重要性加权 · 净胜球放大 · 中立场' },
  { id: 'ratings/confederation',role: '洲际通胀校正 (#6b)',  note: '赛事名数据驱动派生洲际 · 部署只落地稳健洲 OFC' },
  { id: 'model/dixon_coles',    role: '比分模型 · 心脏',     note: 'τ 低比分修正 · MLE 拟合 / rating 先验两条路径', heart: true },
  { id: 'markets/derive',       role: '盘口派生',           note: '1X2 · 大小球 · BTTS · 让球 · 波胆 全由同一矩阵导出' },
  { id: 'odds/devig',           role: '赔率去水位 + 融合',   note: 'multiplicative / additive / Shin · 意见池融合' },
  { id: 'tournament/',          role: '赛制 + Monte Carlo',  note: '向量化全赛事联合模拟 · 5 万届约 3s' },
  { id: 'xg/model',             role: '自建 shot-level xG',  note: '可解释逻辑回归 (scipy) · 非黑箱 · 真值是进球' },
  { id: 'tournament/wc2026',    role: '官方 2026 赛制 (#4)', note: '官方分组 A–L · R32 淘汰树 · 第三名落位 495 约束匹配' },
  { id: 'backtest/',            role: '无泄漏回测',         note: '时间滚动 cutoff · 模型 vs 市场 · log loss / Brier' },
  { id: 'service/',             role: 'FastAPI 推理服务',    note: '/predict /rankings /tournament /health · 启动载入模型仓' },
];

// 诚实清单
window.WC_HONESTY = window.WC_HONESTY || {
  real: [
    '概率会校准：说 30% 的事，长期就该发生约三成',
    '不偷看未来：每场预测只用赛前已知的信息',
    '所有玩法由同一张比分表换算，彼此一致不矛盾',
    '赛会自洽：出线 32 队、八强 8 队、冠军 1 个，永远对得上',
    '可复现：同样的输入永远得到同样的结果',
  ],
  approx: [
    '小组第三的晋级位置，按官方规则就近匹配',
    '点球默认五五开，不偏向任何一方',
    '加时进球按比例放大后重新计算',
  ],
  deferred: [
    '首发阵容的影响——等赛前公布名单后再纳入',
    '伤停与临场状态的更细刻画',
    '东道主主场效应的进一步验证',
  ],
};

window.WC_CMDS = window.WC_CMDS || [
  { cmd: 'wcpredict wc2026',   desc: '正式 2026 预测（官方分组 + 官方赛程）' },
  { cmd: 'wcpredict backtest', desc: '无泄漏 walk-forward 回测' },
  { cmd: 'wcpredict national', desc: '国家队链路（评分 + 蛇形分组）' },
  { cmd: 'wcpredict xg',       desc: '自建 shot-level xG（StatsBomb 开放数据）' },
  { cmd: 'wcpredict serve',    desc: '起 FastAPI 推理服务 (/docs)' },
];
