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
  const rawConfig = window.RF_API_CONFIG || {};
  const RF_API = {
    enabled: rawConfig.enabled === true || rawConfig.enabled === 'true',
    base: typeof rawConfig.base === 'string' ? rawConfig.base.replace(/\/+$/, '') : '',
    polymarket: 'https://gamma-api.polymarket.com', // 赔率快照源（可选）
    timeoutMs: Number(rawConfig.timeoutMs) > 0 ? Number(rawConfig.timeoutMs) : 6000,
  };
  window.RF_API = RF_API;
  window.RF_HYDRATION_STATUS = {
    mode: 'offline',
    source: 'static',
    updated: [],
  };

  function round(n, digits) {
    const p = Math.pow(10, digits == null ? 1 : digits);
    return Math.round(n * p) / p;
  }

  function toNum(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (isFinite(n)) return n;
    }
    return null;
  }

  function toPct(v, digits) {
    const n = toNum(v);
    if (n == null) return null;
    return round(Math.abs(n) <= 1.000001 ? n * 100 : n, digits == null ? 1 : digits);
  }

  function clamp01(v) {
    const n = toNum(v);
    if (n == null) return null;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function normTeam(v) {
    return (v || '').toString().trim().toLowerCase();
  }

  function slug(v) {
    return (v || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function firstValue() {
    for (let i = 0; i < arguments.length; i++) {
      const v = arguments[i];
      if (v != null && v !== '') return v;
    }
    return null;
  }

  function firstPct() {
    for (let i = 0; i < arguments.length; i++) {
      const v = toPct(arguments[i]);
      if (v != null) return v;
    }
    return null;
  }

  function arrayOf(d, keys) {
    if (Array.isArray(d)) return d;
    if (!d || !keys) return null;
    for (let i = 0; i < keys.length; i++) {
      if (Array.isArray(d[keys[i]])) return d[keys[i]];
    }
    return null;
  }

  function updateHydrationStatus(patch) {
    window.RF_HYDRATION_STATUS = Object.assign({}, window.RF_HYDRATION_STATUS || {}, patch);
  }

  function buildTeamIndex() {
    const index = Object.create(null);
    const add = (key, patch) => {
      const nk = normTeam(key);
      if (!nk) return;
      index[nk] = Object.assign(index[nk] || {}, patch);
    };
    const addTeam = (zh, en, patch) => {
      const base = {};
      if (zh) base.team = zh;
      if (en) base.en = en;
      add(en, Object.assign({}, base, patch));
      add(zh, Object.assign({}, base, patch));
    };
    (window.WC_TEAMS || []).forEach(t => {
      addTeam(t.zh || t.team, t.en || t.team, { elo: toNum(t.elo) });
    });
    (window.WC_CHAMPIONS || []).forEach(t => {
      addTeam(t.team || t.zh, t.en || t.team, {
        conf: t.conf,
        p: toNum(t.p),
        qf: toNum(t.qf),
        fin: toNum(t.fin),
        adv: toNum(t.adv),
        trend: Array.isArray(t.trend) ? t.trend.slice() : null,
      });
    });
    (window.WC_RATINGS || []).forEach(t => {
      addTeam(t.team || t.zh, t.en || t.team, { elo: toNum(t.elo), rank: toNum(t.rank) });
    });
    (window.WC_ODDS_CMP || []).forEach(t => {
      addTeam(t.zh || t.team, t.en || t.team, { pm: toPct(t.pm), m: toPct(t.m) });
    });
    const collectBracketNodes = node => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(collectBracketNodes);
      if (node.zh || node.en || node.team) {
        addTeam(node.zh || node.team, node.en || node.team, {
          conf: node.conf,
          pm: toPct(node.pm),
          m: toPct(node.m),
        });
      }
      Object.keys(node).forEach(k => {
        if (node[k] && typeof node[k] === 'object') collectBracketNodes(node[k]);
      });
    };
    collectBracketNodes(window.WC_BRACKET);
    return index;
  }

  function teamMeta(name) {
    const meta = buildTeamIndex()[normTeam(name)] || {};
    return {
      team: meta.team || null,
      en: meta.en || null,
      conf: meta.conf || null,
      elo: meta.elo != null ? meta.elo : null,
      p: meta.p != null ? meta.p : meta.m,
      qf: meta.qf != null ? meta.qf : null,
      fin: meta.fin != null ? meta.fin : null,
      adv: meta.adv != null ? meta.adv : null,
      pm: meta.pm != null ? meta.pm : null,
      trend: Array.isArray(meta.trend) ? meta.trend.slice() : null,
    };
  }

  function buildProbIndex(d) {
    const rows = arrayOf(d, ['teams', 'champions']) || [];
    const out = Object.create(null);
    rows.forEach(row => {
      const key = firstValue(row.en, row.team, row.name, row.zh);
      const meta = teamMeta(key);
      const en = firstValue(row.en, meta.en, row.team, row.name, row.zh);
      const nk = normTeam(en || key);
      if (!nk) return;
      out[nk] = {
        team: firstValue(row.team_zh, row.zh, meta.team, row.team, row.name),
        en: en,
        conf: firstValue(row.conf, meta.conf, ''),
        advance: firstPct(row.adv, row.advance, row.reach_r16, row.reach_R16, meta.adv),
        qf: firstPct(row.qf, row.reach_sf, row.reach_SF, row.reach_qf, row.reach_QF, meta.qf),
        fin: firstPct(row.fin, row.reach_final, row.reach_Final, meta.fin),
        champion: firstPct(row.p, row.champion, row.champion_pct, row.win_pct, meta.p),
        trend: Array.isArray(row.trend) && row.trend.length
          ? row.trend.map(v => firstPct(v)).filter(v => v != null)
          : meta.trend,
        pm: firstPct(row.pm, row.market, meta.pm),
      };
    });
    return out;
  }

  function normalizeBracketNode(node, probs, preferProb) {
    if (!node) return null;
    const rawName = typeof node === 'string' ? node : firstValue(node.en, node.team, node.name, node.zh);
    const meta = teamMeta(rawName);
    const prob = probs && probs[normTeam(firstValue(meta.en, rawName, meta.team))] || {};
    const zh = typeof node === 'string' ? firstValue(meta.team, node) : firstValue(node.zh, node.team_zh, meta.team, node.team, node.name);
    const en = typeof node === 'string' ? firstValue(meta.en, node) : firstValue(node.en, meta.en, node.team, node.name, node.zh);
    const rawModel = typeof node === 'string' ? null : firstValue(node.m, node.model, node.champion);
    const m = preferProb
      ? firstPct(prob.champion, rawModel, meta.p)
      : firstPct(rawModel, prob.champion, meta.p);
    return {
      zh: zh,
      en: en,
      m: m != null ? m : 0,
      pm: firstPct(typeof node === 'string' ? null : firstValue(node.pm, node.market), prob.pm, meta.pm) || 0,
      conf: firstValue(typeof node === 'string' ? null : node.conf, prob.conf, meta.conf, ''),
    };
  }

  function normalizeBracketPairs(rows, probs, preferProb) {
    if (!Array.isArray(rows)) return null;
    return rows.map(pair => {
      const members = Array.isArray(pair) ? pair : [pair.a || pair.home || pair.left, pair.b || pair.away || pair.right];
      if (!members[0] || !members[1]) return null;
      const left = normalizeBracketNode(members[0], probs, preferProb);
      const right = normalizeBracketNode(members[1], probs, preferProb);
      return left && right ? [left, right] : null;
    }).filter(Boolean);
  }

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
    champions(d) {
      const rows = arrayOf(d, ['teams', 'champions']);
      if (!rows || !rows.length) return null;
      const out = rows.map(row => {
        const meta = teamMeta(firstValue(row.en, row.team, row.name, row.zh));
        const p = firstPct(row.p, row.champion, row.champion_pct, row.win_pct, meta.p);
        if (p == null) return null;
        return {
          team: firstValue(row.team_zh, row.zh, meta.team, row.team, row.name),
          en: firstValue(row.en, meta.en, row.team, row.name, row.zh),
          conf: firstValue(row.conf, meta.conf, ''),
          p: p,
          qf: firstPct(row.qf, row.reach_qf, row.reach_QF, row.reach_sf, row.reach_SF, meta.qf, p),
          fin: firstPct(row.fin, row.reach_final, row.reach_Final, meta.fin, p),
          adv: Math.round(firstPct(row.adv, row.advance, row.reach_r16, row.reach_R16, meta.adv, 0)),
          trend: Array.isArray(row.trend) && row.trend.length
            ? row.trend.map(v => firstPct(v)).filter(v => v != null)
            : (meta.trend && meta.trend.length ? meta.trend.slice() : [p]),
        };
      }).filter(Boolean);
      return out.sort((a, b) => b.p - a.p);
    },
    ratings(d) {
      const rows = arrayOf(d, ['teams', 'rankings']);
      if (!rows || !rows.length) return null;
      const out = rows.map((row, i) => {
        const meta = teamMeta(firstValue(row.en, row.team, row.name, row.zh));
        const strength = toNum(row.strength);
        const elo = firstValue(toNum(row.elo), meta.elo, strength != null ? round(strength, 3) : null);
        if (elo == null) return null;
        return {
          team: firstValue(row.team_zh, row.zh, meta.team, row.team, row.name),
          en: firstValue(row.en, meta.en, row.team, row.name, row.zh),
          elo: elo,
          rank: firstValue(toNum(row.rank), i + 1),
        };
      }).filter(Boolean);
      return out.sort((a, b) => (a.rank || 999) - (b.rank || 999));
    },
    matches(d) {
      const rows = arrayOf(d, ['featured_matches', 'predict', 'matches']) || (Array.isArray(d) ? d : null);
      if (!rows || !rows.length) return null;
      const out = rows.map((row, i) => {
        const homeRaw = firstValue(row.he, row.home_en, row.home, row.homeTeam, row.home_team);
        const awayRaw = firstValue(row.ae, row.away_en, row.away, row.awayTeam, row.away_team);
        const homeMeta = teamMeta(homeRaw);
        const awayMeta = teamMeta(awayRaw);
        const lh = toNum(firstValue(row.lh, row.lambda_home, row.xg_home));
        const la = toNum(firstValue(row.la, row.lambda_away, row.xg_away));
        const market = {
          home: clamp01(firstValue(row.market && row.market.home, row.prob_home)),
          draw: clamp01(firstValue(row.market && row.market.draw, row.prob_draw)),
          away: clamp01(firstValue(row.market && row.market.away, row.prob_away)),
          over: clamp01(firstValue(row.market && row.market.over, row.over_2_5, row.market && row.market.over_2_5)),
          btts: clamp01(firstValue(row.market && row.market.btts, row.btts_yes, row.market && row.market.btts_yes)),
        };
        if (lh == null || la == null || market.home == null || market.draw == null || market.away == null) return null;
        return {
          id: firstValue(row.id, row.match_id, row.slug, slug(firstValue(homeMeta.en, homeRaw, 'match')) + '-' + slug(firstValue(awayMeta.en, awayRaw, i + 1))),
          stage: firstValue(row.stage, row.round, row.label, '焦点战'),
          home: firstValue(row.home_zh, row.homeZh, homeMeta.team, row.home, row.he),
          away: firstValue(row.away_zh, row.awayZh, awayMeta.team, row.away, row.ae),
          he: firstValue(row.he, row.home_en, homeMeta.en, row.home),
          ae: firstValue(row.ae, row.away_en, awayMeta.en, row.away),
          lh: round(lh, 2),
          la: round(la, 2),
          market: {
            home: market.home,
            draw: market.draw,
            away: market.away,
            over: market.over != null ? market.over : 0.5,
            btts: market.btts != null ? market.btts : 0.5,
          },
        };
      }).filter(Boolean);
      return out.length ? out : null;
    },
    bracket(d) {
      const raw = d && (d.bracket || d);
      const looksLikeBracket = raw && (raw.r16 || raw.qf || raw.sf || raw.final || raw.champion);
      const probs = buildProbIndex(d);
      const base = looksLikeBracket ? raw : window.WC_BRACKET;
      const preferProb = !looksLikeBracket;
      if (!base) return null;
      const out = {
        source: firstValue(base.source, (window.WC_BRACKET || {}).source),
        asof: firstValue(base.asof, (window.WC_BRACKET || {}).asof),
        r16: normalizeBracketPairs(base.r16, probs, preferProb),
        qf: normalizeBracketPairs(base.qf, probs, preferProb),
        sf: normalizeBracketPairs(base.sf, probs, preferProb),
        final: normalizeBracketPairs(base.final, probs, preferProb),
        champion: null,
      };
      if (!out.r16 && !out.qf && !out.sf && !out.final) return null;
      out.champion = base.champion ? normalizeBracketNode(base.champion, probs, preferProb) : null;
      if (!out.champion && out.final && out.final[0]) {
        out.champion = out.final[0][0].m >= out.final[0][1].m ? out.final[0][0] : out.final[0][1];
      }
      return out.champion ? out : null;
    },
    oddsCmp(d) {
      const rows = arrayOf(d, ['odds_cmp', 'oddsCmp', 'teams']);
      if (rows && rows.length && (d.odds_cmp || d.oddsCmp || rows[0].model != null || rows[0].market != null || rows[0].pm != null)) {
        const out = rows.map(row => {
          const meta = teamMeta(firstValue(row.en, row.team, row.name, row.zh));
          const marketValue = toNum(row.market);
          const edgeValue = toNum(row.edge);
          const model = firstPct(row.m, row.model, row.champion, row.champion_pct, row.win_pct, marketValue != null && edgeValue != null ? marketValue + edgeValue : null, meta.p);
          const market = firstPct(row.pm, row.market, meta.pm);
          if (model == null && market == null) return null;
          return {
            zh: firstValue(row.zh, row.team_zh, meta.team, row.team, row.name),
            en: firstValue(row.en, meta.en, row.team, row.name, row.zh),
            m: model != null ? model : 0,
            pm: market != null ? market : 0,
          };
        }).filter(Boolean);
        return out.sort((a, b) => b.m - a.m);
      }
      const probs = buildProbIndex(d && d.tournament ? d.tournament : d);
      const derived = Object.keys(probs).map(k => {
        const row = probs[k];
        if (row.champion == null) return null;
        return { zh: row.team, en: row.en, m: row.champion, pm: row.pm != null ? row.pm : 0 };
      }).filter(Boolean);
      return derived.length ? derived.sort((a, b) => b.m - a.m).slice(0, 8) : null;
    },
  };

  // —— 主流程：拉真实数据 → 覆盖 window.WC_*；任一步失败保留离线兜底 ——
  async function hydrate() {
    if (!RF_API.enabled) return { mode: 'offline' };
    const updated = [];
    const assign = (key, val) => {
      if (val && (!Array.isArray(val) || val.length)) {
        window[key] = val;
        updated.push(key);
      }
    };
    updateHydrationStatus({ mode: 'loading', source: 'network', updated: [] });
    try {
      // 优先聚合端点；没有就并发拉各接口
      let portal = null;
      try { portal = await getJSON('/portal'); } catch (_) { /* 无聚合端点，走分接口 */ }

      if (portal) {
        assign('WC_CHAMPIONS', adapt.champions(portal.tournament || portal));
        assign('WC_RATINGS',   adapt.ratings(portal.rankings || portal));
        assign('WC_MATCHES',   adapt.matches(portal.featured_matches || portal.predict || portal.matches || portal));
        assign('WC_BRACKET',   adapt.bracket(portal.bracket || portal.tournament || portal));
        assign('WC_ODDS_CMP',  adapt.oddsCmp(portal));
        updateHydrationStatus({ mode: updated.length ? 'live' : 'offline', source: 'portal', updated: updated.slice() });
      } else {
        const [tour, rank] = await Promise.all([
          getJSON('/tournament').catch(() => null),
          getJSON('/rankings').catch(() => null),
        ]);
        assign('WC_CHAMPIONS', adapt.champions(tour));
        assign('WC_BRACKET',   adapt.bracket(tour));
        assign('WC_RATINGS',   adapt.ratings(rank));
        assign('WC_ODDS_CMP',  adapt.oddsCmp(tour || {}));
        updateHydrationStatus({ mode: updated.length ? 'live' : 'offline', source: 'split', updated: updated.slice() });
      }
      return { mode: updated.length ? 'live' : 'offline', source: window.RF_HYDRATION_STATUS.source, updated: updated };
    } catch (e) {
      console.warn('[RedFootball] 接口不可用，回退离线数据：', e.message);
      updateHydrationStatus({ mode: 'offline', source: 'static', error: e.message, updated: [] });
      return { mode: 'offline', error: e.message };
    }
  }

  // 暴露给壳层 App：await window.RF_hydrate() 后再 ReactDOM.render
  window.RF_hydrate = hydrate;
})();
