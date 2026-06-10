/* wcpredict — 赛程数据层：完整 48 队 / 12 组 / 104 场
   λ 由 Elo 评分在视图层派生；所有盘口由同一比分矩阵实时计算。旗帜用 emoji。
   说明：小组第 3/4 档为模型演示填充（项目无逐场官方赛程），头两档=我们的出线热门。 */

window.WC_FLAGS = Object.assign({
  Mexico: '🇲🇽', 'South Korea': '🇰🇷', 'Saudi Arabia': '🇸🇦', 'South Africa': '🇿🇦',
  Switzerland: '🇨🇭', Canada: '🇨🇦', Qatar: '🇶🇦', 'New Zealand': '🇳🇿',
  Brazil: '🇧🇷', Morocco: '🇲🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Haiti: '🇭🇹',
  Turkey: '🇹🇷', Paraguay: '🇵🇾', Australia: '🇦🇺', Panama: '🇵🇦',
  Germany: '🇩🇪', Ecuador: '🇪🇨', 'Curaçao': '🇨🇼', Tunisia: '🇹🇳',
  Netherlands: '🇳🇱', Japan: '🇯🇵', Senegal: '🇸🇳', Jordan: '🇯🇴',
  Belgium: '🇧🇪', Iran: '🇮🇷', Egypt: '🇪🇬', Nigeria: '🇳🇬',
  Spain: '🇪🇸', Uruguay: '🇺🇾', Czechia: '🇨🇿', Algeria: '🇩🇿',
  France: '🇫🇷', Norway: '🇳🇴', "Côte d'Ivoire": '🇨🇮', Ghana: '🇬🇭',
  Argentina: '🇦🇷', Austria: '🇦🇹', Poland: '🇵🇱', Denmark: '🇩🇰',
  Portugal: '🇵🇹', Colombia: '🇨🇴', Sweden: '🇸🇪', Bosnia: '🇧🇦',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Croatia: '🇭🇷', 'United States': '🇺🇸', Italy: '🇮🇹',
}, window.WC_FLAGS || {});

const TM = (zh, en, group, elo) => ({ zh, en, group, elo });
// 48 队 · 每组按 Elo 由强到弱（前两档=出线热门）
window.WC_TEAMS = window.WC_TEAMS || [
  TM('墨西哥', 'Mexico', 'A', 1685), TM('韩国', 'South Korea', 'A', 1645), TM('南非', 'South Africa', 'A', 1590), TM('沙特', 'Saudi Arabia', 'A', 1560),
  TM('瑞士', 'Switzerland', 'B', 1765), TM('加拿大', 'Canada', 'B', 1660), TM('卡塔尔', 'Qatar', 'B', 1545), TM('新西兰', 'New Zealand', 'B', 1500),
  TM('巴西', 'Brazil', 'C', 1965), TM('摩洛哥', 'Morocco', 'C', 1755), TM('苏格兰', 'Scotland', 'C', 1625), TM('海地', 'Haiti', 'C', 1480),
  TM('土耳其', 'Turkey', 'D', 1720), TM('澳大利亚', 'Australia', 'D', 1640), TM('巴拉圭', 'Paraguay', 'D', 1610), TM('巴拿马', 'Panama', 'D', 1525),
  TM('德国', 'Germany', 'E', 1905), TM('厄瓜多尔', 'Ecuador', 'E', 1700), TM('突尼斯', 'Tunisia', 'E', 1585), TM('库拉索', 'Curaçao', 'E', 1490),
  TM('荷兰', 'Netherlands', 'F', 1915), TM('塞内加尔', 'Senegal', 'F', 1745), TM('日本', 'Japan', 'F', 1730), TM('约旦', 'Jordan', 'F', 1505),
  TM('比利时', 'Belgium', 'G', 1880), TM('尼日利亚', 'Nigeria', 'G', 1700), TM('伊朗', 'Iran', 'G', 1660), TM('埃及', 'Egypt', 'G', 1640),
  TM('西班牙', 'Spain', 'H', 2010), TM('乌拉圭', 'Uruguay', 'H', 1820), TM('捷克', 'Czechia', 'H', 1660), TM('阿尔及利亚', 'Algeria', 'H', 1620),
  TM('法国', 'France', 'I', 1990), TM('挪威', 'Norway', 'I', 1735), TM('科特迪瓦', "Côte d'Ivoire", 'I', 1660), TM('加纳', 'Ghana', 'I', 1620),
  TM('阿根廷', 'Argentina', 'J', 1985), TM('丹麦', 'Denmark', 'J', 1760), TM('奥地利', 'Austria', 'J', 1690), TM('波兰', 'Poland', 'J', 1645),
  TM('葡萄牙', 'Portugal', 'K', 1905), TM('哥伦比亚', 'Colombia', 'K', 1855), TM('瑞典', 'Sweden', 'K', 1680), TM('波黑', 'Bosnia', 'K', 1605),
  TM('英格兰', 'England', 'L', 1960), TM('意大利', 'Italy', 'L', 1840), TM('克罗地亚', 'Croatia', 'L', 1830), TM('美国', 'United States', 'L', 1705),
];

// —— 生成完整小组赛 72 场（每组循环赛 6 场 · 3 个比赛日）——
(function () {
  const GROUPS = 'ABCDEFGHIJKL'.split('');
  const PAIRS = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]]; // MD1 / MD2 / MD3
  const MD_BASE = ['2026-06-11', '2026-06-18', '2026-06-24'];
  const TIMES = ['03:00', '09:00'];
  const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const fixtures = [];
  GROUPS.forEach((g, gi) => {
    const teams = window.WC_TEAMS.filter((t) => t.group === g); // already strong→weak
    PAIRS.forEach((md, mdi) => {
      md.forEach((pair, pi) => {
        const a = teams[pair[0]], b = teams[pair[1]];
        // 强队列主，弱队列客（小组赛中立场，仅作展示先后）
        const home = a.elo >= b.elo ? a : b, away = a.elo >= b.elo ? b : a;
        fixtures.push({
          id: `${g}${mdi + 1}${pi + 1}`, group: g, matchday: mdi + 1,
          date: addDays(MD_BASE[mdi], Math.floor(gi / 2)), time: TIMES[pi],
          home: { zh: home.zh, en: home.en }, away: { zh: away.zh, en: away.en },
          eh: home.elo, ea: away.elo,
        });
      });
    });
  });
  fixtures.sort((x, y) => (x.date === y.date ? x.time.localeCompare(y.time) : x.date.localeCompare(y.date)));
  window.WC_FIXTURES = fixtures;
})();

// —— 淘汰赛 32 场日程（轮次 + 日期；对阵取自官方树 WC_OFFICIAL_TREE）——
window.WC_KO_SCHEDULE = {
  '32 强': { dates: ['2026-06-28', '2026-07-03'], range: [73, 88] },
  '16 强': { dates: ['2026-07-04', '2026-07-07'], range: [89, 96] },
  '1/4 决赛': { dates: ['2026-07-09', '2026-07-11'], range: [97, 100] },
  '半决赛': { dates: ['2026-07-14', '2026-07-15'], range: [101, 102] },
  '决赛': { dates: ['2026-07-19', '2026-07-19'], range: [104, 104] },
};
