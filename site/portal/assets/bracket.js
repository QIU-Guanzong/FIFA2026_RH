/* wcpredict — knockout bracket: model champion % (m) vs Polymarket champion % (pm)
   Polymarket "World Cup Winner" odds as of 2026-06-04 (France 17 / Spain 16 / England 11.4 …).
   Projected bracket: higher model prob advances; path traces the model's title route. */
const T = (zh, en, m, pm, conf) => ({ zh, en, m, pm, conf });

window.WC_BRACKET = {
  source: 'Polymarket · World Cup Winner · 实时',
  asof: '2026-06-04',
  // Round of 16 — 8 ties, top→bottom bracket order
  r16: [
    [T('西班牙','Spain',14.4,16,'UEFA'),     T('乌拉圭','Uruguay',1.5,2,'CONMEBOL')],
    [T('荷兰','Netherlands',3.9,5,'UEFA'),   T('日本','Japan',2.8,1,'AFC')],
    [T('英格兰','England',5.6,11,'UEFA'),    T('瑞士','Switzerland',3.2,1.5,'UEFA')],
    [T('巴西','Brazil',4.4,9,'CONMEBOL'),    T('摩洛哥','Morocco',2.9,2,'CAF')],
    [T('法国','France',9,17,'UEFA'),         T('挪威','Norway',3.2,1.5,'UEFA')],
    [T('葡萄牙','Portugal',4.3,6,'UEFA'),    T('墨西哥','Mexico',2,2.5,'CONCACAF')],
    [T('德国','Germany',3.8,6,'UEFA'),       T('哥伦比亚','Colombia',4.0,2,'CONMEBOL')],
    [T('阿根廷','Argentina',9.9,9,'CONMEBOL'),T('比利时','Belgium',2.7,3,'UEFA')],
  ],
  // Quarterfinals — model winners of each R16 pair
  qf: [
    [T('西班牙','Spain',14.4,16,'UEFA'),     T('荷兰','Netherlands',3.9,5,'UEFA')],
    [T('英格兰','England',5.6,11,'UEFA'),    T('巴西','Brazil',4.4,9,'CONMEBOL')],
    [T('法国','France',9,17,'UEFA'),         T('葡萄牙','Portugal',4.3,6,'UEFA')],
    [T('德国','Germany',3.8,6,'UEFA'),       T('阿根廷','Argentina',9.9,9,'CONMEBOL')],
  ],
  sf: [
    [T('西班牙','Spain',14.4,16,'UEFA'),     T('英格兰','England',5.6,11,'UEFA')],
    [T('法国','France',9,17,'UEFA'),         T('阿根廷','Argentina',9.9,9,'CONMEBOL')],
  ],
  final: [
    [T('西班牙','Spain',14.4,16,'UEFA'),     T('阿根廷','Argentina',9.9,9,'CONMEBOL')],
  ],
  champion: T('西班牙','Spain',14.4,16,'UEFA'),
};

// champion-odds comparison: model vs Polymarket (top 8)
window.WC_ODDS_CMP = [
  { zh: '西班牙', en: 'Spain',      m: 14.4, pm: 16 },
  { zh: '法国',   en: 'France',     m: 9.0,  pm: 17 },
  { zh: '阿根廷', en: 'Argentina',  m: 9.9,  pm: 9 },
  { zh: '英格兰', en: 'England',    m: 5.6,  pm: 11 },
  { zh: '巴西',   en: 'Brazil',     m: 4.4,  pm: 9 },
  { zh: '葡萄牙', en: 'Portugal',   m: 4.3,  pm: 6 },
  { zh: '哥伦比亚', en: 'Colombia',  m: 4.0,  pm: 5 },
  { zh: '荷兰',   en: 'Netherlands',m: 3.9,  pm: 5 },
];

/* ── 官方 2026 淘汰赛树（R32 → 决赛 · M73–M104）
   来源：官方分组 A–L + 官方 R32/淘汰赛树；R32 入口槽位的 pick = 4 万届模拟中
   最可能占用该槽位的球队及其概率（最可能，非锁定落位）。
   slot 形态：{lbl:'组头名/次名', zh:'中文队名', en, pct}  或  {lbl:'最佳第三', third:'A/B/C/D/F'} */
const S = (lbl, zh, en, pct) => ({ lbl, zh, en, pct });
const TH = (third) => ({ lbl: '最佳第三', third });

window.WC_OFFICIAL_TREE = {
  asof: '2026-06-04', sims: '4 万',
  r32: [
    { no: 73, a: S('A 组次名','韩国','South Korea',28),   b: S('B 组次名','加拿大','Canada',35) },
    { no: 74, a: S('E 组头名','德国','Germany',42),        b: TH('A/B/C/D/F') },
    { no: 75, a: S('F 组头名','荷兰','Netherlands',41),    b: S('C 组次名','摩洛哥','Morocco',32) },
    { no: 76, a: S('C 组头名','巴西','Brazil',43),         b: S('F 组次名','日本','Japan',30) },
    { no: 77, a: S('I 组头名','法国','France',49),         b: TH('C/D/F/G/H') },
    { no: 78, a: S('E 组次名','厄瓜多尔','Ecuador',33),    b: S('I 组次名','挪威','Norway',32) },
    { no: 79, a: S('A 组头名','墨西哥','Mexico',39),       b: TH('C/E/F/H/I') },
    { no: 80, a: S('L 组头名','英格兰','England',50),      b: TH('E/H/I/J/K') },
    { no: 81, a: S('D 组头名','土耳其','Turkey',37),       b: TH('B/E/F/I/J') },
    { no: 82, a: S('G 组头名','比利时','Belgium',44),      b: TH('A/E/H/I/J') },
    { no: 83, a: S('K 组次名','哥伦比亚','Colombia',30),   b: S('L 组次名','克罗地亚','Croatia',35) },
    { no: 84, a: S('H 组头名','西班牙','Spain',68),        b: S('J 组次名','奥地利','Austria',31) },
    { no: 85, a: S('B 组头名','瑞士','Switzerland',49),    b: TH('E/F/G/I/J') },
    { no: 86, a: S('J 组头名','阿根廷','Argentina',57),    b: S('H 组次名','乌拉圭','Uruguay',41) },
    { no: 87, a: S('K 组头名','葡萄牙','Portugal',39),     b: TH('D/E/I/J/L') },
    { no: 88, a: S('D 组次名','巴拉圭','Paraguay',26),     b: S('G 组次名','伊朗','Iran',31) },
  ],
  // later rounds keep "胜 N" structure — specific paths get too unlikely to fill
  r16:   [[89,74,77],[90,73,75],[91,76,78],[92,79,80],[93,83,84],[94,81,82],[95,86,88],[96,85,87]],
  qf:    [[97,89,90],[98,93,94],[99,91,92],[100,95,96]],
  sf:    [[101,97,98],[102,99,100]],
  final: [104,101,102],
};

/* ── 各小组出线热门（官方分组 A–L · 4 万届模拟）
   lead = 头名概率最高者（top=头名% · adv=出线%）· run = 出线概率次高者（adv=出线%） */
const G = (g, lz, le, top, la, rz, re, ra) => ({ g, lead: { zh: lz, en: le, top, adv: la }, run: { zh: rz, en: re, adv: ra } });
window.WC_GROUPS = [
  G('A', '墨西哥','Mexico',39,83,       '韩国','South Korea',73),
  G('B', '瑞士','Switzerland',49,90,    '加拿大','Canada',84),
  G('C', '巴西','Brazil',43,87,         '摩洛哥','Morocco',83),
  G('D', '土耳其','Turkey',37,79,       '巴拉圭','Paraguay',69),
  G('E', '德国','Germany',42,89,        '厄瓜多尔','Ecuador',88),
  G('F', '荷兰','Netherlands',41,85,    '日本','Japan',80),
  G('G', '比利时','Belgium',44,87,      '伊朗','Iran',77),
  G('H', '西班牙','Spain',68,96,        '乌拉圭','Uruguay',79),
  G('I', '法国','France',49,90,         '挪威','Norway',78),
  G('J', '阿根廷','Argentina',57,92,    '奥地利','Austria',70),
  G('K', '葡萄牙','Portugal',39,84,     '哥伦比亚','Colombia',83),
  G('L', '英格兰','England',50,91,      '克罗地亚','Croatia',82),
];
