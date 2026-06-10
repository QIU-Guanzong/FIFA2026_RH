/* ============================================================
 * RedFootball — Polymarket live odds (polymarket.js)
 *
 * 直接从 Polymarket Gamma API 拉取「World Cup Winner」市场的实时隐含赔率，
 * 无需手动跳转。每个队是一个 yes/no 市场，groupItemTitle=队名，
 * outcomePrices[0]=Yes 价格（=隐含概率，0–1）→ 转成美分(¢)。
 *
 * 失败（CORS / 网络 / 结构变更）即抛错，调用方回退到 bracket.js 静态快照。
 * 公开只读端点，无需 token。
 * ============================================================ */
(function () {
  const BASE = 'https://gamma-api.polymarket.com';
  const SLUG = 'world-cup-winner';

  // outcomePrices 可能是 JSON 字符串或数组 — 容错解析
  function parsePrices(v) {
    if (Array.isArray(v)) return v.map(Number);
    if (typeof v === 'string') { try { return JSON.parse(v).map(Number); } catch (_) { return null; } }
    return null;
  }

  // 把 Polymarket 队名规范化，便于和我们的 en 字段对齐
  const ALIAS = {
    'usa': 'united states', 'us': 'united states', 'south korea': 'south korea',
    'korea republic': 'south korea', 'iran': 'iran', 'ir iran': 'iran',
  };
  function norm(s) {
    const k = (s || '').trim().toLowerCase();
    return ALIAS[k] || k;
  }

  async function fetchPolymarket(timeoutMs = 7000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(`${BASE}/events?slug=${SLUG}`, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const ev = Array.isArray(data) ? data[0] : (data && data.events ? data.events[0] : data);
      if (!ev || !Array.isArray(ev.markets) || !ev.markets.length) throw new Error('no markets in event');

      const odds = {};      // normalized team name → cents
      for (const m of ev.markets) {
        if (m.closed === true) continue;
        const team = m.groupItemTitle || m.title || '';
        if (!team) continue;
        let prob = null;                                   // 0–1
        const pr = parsePrices(m.outcomePrices);
        if (pr && pr.length) prob = pr[0];
        else if (m.lastTradePrice != null) prob = Number(m.lastTradePrice);
        else if (m.bestAsk != null) prob = Number(m.bestAsk);
        if (prob == null || !isFinite(prob)) continue;
        odds[norm(team)] = Math.round(prob * 1000) / 10;   // → cents, 1 decimal
      }
      if (!Object.keys(odds).length) throw new Error('no priced outcomes');

      return {
        ok: true,
        asof: new Date(),
        count: Object.keys(odds).length,
        odds,
        volume: ev.volume != null ? Number(ev.volume) : null,
        url: 'https://polymarket.com/event/' + SLUG,
      };
    } finally {
      clearTimeout(t);
    }
  }

  window.RF_fetchPolymarket = fetchPolymarket;
})();
