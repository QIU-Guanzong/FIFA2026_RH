/* ============================================================
 * RedFootball — 数据接入层 (api.js)
 *
 * 目的：把 window.WC_* 数据契约从「静态文件」切换到「真实 wcpredict 引擎」，
 *       视图层零改动。当前默认走离线兜底（data.js / dc.js / bracket.js 已先加载）。
 *
 * 启用真实接口：把 RF_API.enabled 设为 true，并填好 RF_API.base。
 *   后端 = src/wcpredict/service/app.py (FastAPI)：/health /rankings /predict /tournament
 *   建议后端加聚合端点 GET /portal 一次性返回下表所有形状。
 *
 * 契约（与 CLAUDE.md 对齐）：
 *   WC_CHAMPIONS [{team,en,conf,p,trend[]}]      ← /tournament 夺冠率
 *   WC_RATINGS   [{team,en,elo}]                  ← /rankings
 *   WC_MATCHES   [{id,home,away,he,ae,lh,la,market:{home,draw,away,over,btts}}] ← /predict
 *   WC_BRACKET   {source,asof,r16,qf,sf,final,champion}  ← /tournament 赛制树
 *   WC_ODDS_CMP  [{zh,en,m,pm}]                   ← 模型 + Polymarket
 * ============================================================ */
(function () {
  const RF_API = {
    enabled: false,                 // ← 接入时改 true
    base: '',                       // 例: 'http://localhost:8000'
    polymarket: 'https://gamma-api.polymarket.com', // 赔率快照源（可选）
    timeoutMs: 6000,
  };
  window.RF_API = RF_API;

  // —— 工具：带超时的 fetch；失败抛错由调用方兜底 ——
  async function getJSON(path) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), RF_API.timeoutMs);
    try {
      const r = await fetch(RF_API.base + path, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error(path + ' → ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  // —— 适配器：把后端 JSON 整形成前端契约。接入时按真实响应字段补全。——
  const adapt = {
    champions(/* tournament */ d) {
      // TODO: return d.champions.map(x => ({ team: x.zh, en: x.name, conf: x.conf, p: x.win_pct, trend: x.history || [] }));
      return null;
    },
    ratings(/* rankings */ d) {
      // TODO: return d.rankings.map(x => ({ team: x.zh, en: x.name, elo: Math.round(x.elo) }));
      return null;
    },
    matches(/* predict[] */ d) {
      // TODO: map λ + 去水位市场到 {id,home,away,he,ae,lh,la,market}
      return null;
    },
    bracket(/* tournament.bracket */ d) {
      // TODO: 整形为 {source,asof,r16,qf,sf,final,champion}，节点 {zh,en,m,pm,conf}
      return null;
    },
    oddsCmp(/* model + polymarket */ d) {
      // TODO: [{zh,en,m,pm}]
      return null;
    },
  };

  // —— 主流程：拉真实数据 → 覆盖 window.WC_*；任一步失败保留离线兜底 ——
  async function hydrate() {
    if (!RF_API.enabled) return { mode: 'offline' };
    const assign = (key, val) => { if (val && (!Array.isArray(val) || val.length)) window[key] = val; };
    try {
      // 优先聚合端点；没有就并发拉各接口
      let portal = null;
      try { portal = await getJSON('/portal'); } catch (_) { /* 无聚合端点，走分接口 */ }

      if (portal) {
        assign('WC_CHAMPIONS', adapt.champions(portal.tournament));
        assign('WC_RATINGS',   adapt.ratings(portal.rankings));
        assign('WC_MATCHES',   adapt.matches(portal.predict));
        assign('WC_BRACKET',   adapt.bracket(portal.tournament));
        assign('WC_ODDS_CMP',  adapt.oddsCmp(portal));
      } else {
        const [tour, rank] = await Promise.all([
          getJSON('/tournament').catch(() => null),
          getJSON('/rankings').catch(() => null),
        ]);
        assign('WC_CHAMPIONS', adapt.champions(tour));
        assign('WC_BRACKET',   adapt.bracket(tour));
        assign('WC_RATINGS',   adapt.ratings(rank));
      }
      return { mode: 'live' };
    } catch (e) {
      console.warn('[RedFootball] 接口不可用，回退离线数据：', e.message);
      return { mode: 'offline', error: e.message };
    }
  }

  // 暴露给壳层 App：await window.RF_hydrate() 后再 ReactDOM.render
  window.RF_hydrate = hydrate;
})();
