"""导出 RedFootball 门户数据层（site/portal/assets/engine.js）。

数据来源（全部真实，单一真理源 = 注册仓最新 wc2026_official 模型）：
  - 冠军/出线/各阶段概率：OfficialWC2026Simulator 5 万届 MC（seed=2026，可复现）
  - 趋势：注册仓历史 wc2026_official 版本逐版重模拟（2 万届）——真实版本演化，非编造
  - Elo 评分：data/raw/international_results.csv（缓存，离线）多趟暖启动 + #6b 洲际校正
  - λ 引擎参数：模型 attack/defence/intercept/rho 原样导出 → 前端 JS 与 Python 完全同式
  - Polymarket：gamma API 构建期快照（运行时前端 polymarket.js 仍会实时刷新）

用法：PYTHONPATH=src python scripts/export_portal_data.py [--sims 50000] [--no-pm]
产出：site/portal/assets/engine.js（先于 data.js/bracket.js/fixtures.js 加载，静态层自动让位）
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))

from wcpredict.registry import ModelStore                                    # noqa: E402
from wcpredict.tournament.wc2026 import (                                     # noqa: E402
    GROUPS_2026, R32_MATCHES, OfficialWC2026Simulator,
)

# ---- 48 队中文名 + 洲际（展示元数据；队名 100% 对齐 martj42/官方分组）----
ZH = {
    "Mexico": "墨西哥", "South Korea": "韩国", "South Africa": "南非", "Saudi Arabia": "沙特",
    "Switzerland": "瑞士", "Canada": "加拿大", "Qatar": "卡塔尔", "New Zealand": "新西兰",
    "Brazil": "巴西", "Morocco": "摩洛哥", "Scotland": "苏格兰", "Haiti": "海地",
    "Turkey": "土耳其", "Australia": "澳大利亚", "Paraguay": "巴拉圭", "Panama": "巴拿马",
    "Germany": "德国", "Ecuador": "厄瓜多尔", "Tunisia": "突尼斯", "Curaçao": "库拉索",
    "Netherlands": "荷兰", "Senegal": "塞内加尔", "Japan": "日本", "Jordan": "约旦",
    "Belgium": "比利时", "Nigeria": "尼日利亚", "Iran": "伊朗", "Egypt": "埃及",
    "Spain": "西班牙", "Uruguay": "乌拉圭", "Czech Republic": "捷克", "Algeria": "阿尔及利亚",
    "France": "法国", "Norway": "挪威", "Ivory Coast": "科特迪瓦", "Ghana": "加纳",
    "Argentina": "阿根廷", "Denmark": "丹麦", "Austria": "奥地利", "Poland": "波兰",
    "Portugal": "葡萄牙", "Colombia": "哥伦比亚", "Sweden": "瑞典", "Bosnia and Herzegovina": "波黑",
    "England": "英格兰", "Italy": "意大利", "Croatia": "克罗地亚", "United States": "美国",
    "Cape Verde": "佛得角", "Iraq": "伊拉克", "DR Congo": "刚果(金)", "Uzbekistan": "乌兹别克斯坦",
}
CONF = {
    "UEFA": ["Switzerland", "Scotland", "Turkey", "Germany", "Netherlands", "Belgium", "Spain",
             "Czech Republic", "France", "Norway", "Denmark", "Austria", "Poland", "Portugal",
             "Sweden", "Bosnia and Herzegovina", "England", "Italy", "Croatia"],
    "CONMEBOL": ["Brazil", "Ecuador", "Paraguay", "Uruguay", "Argentina", "Colombia"],
    "CONCACAF": ["Mexico", "Canada", "Haiti", "Panama", "Curaçao", "United States"],
    "AFC": ["South Korea", "Saudi Arabia", "Qatar", "Australia", "Japan", "Jordan", "Iran",
            "Iraq", "Uzbekistan"],
    "CAF": ["South Africa", "Morocco", "Tunisia", "Senegal", "Nigeria", "Egypt", "Algeria",
            "Ivory Coast", "Ghana", "Cape Verde", "DR Congo"],
    "OFC": ["New Zealand"],
}
CONF_OF = {t: c for c, ts in CONF.items() for t in ts}
FLAGS = {
    "Mexico": "🇲🇽", "South Korea": "🇰🇷", "Saudi Arabia": "🇸🇦", "South Africa": "🇿🇦",
    "Switzerland": "🇨🇭", "Canada": "🇨🇦", "Qatar": "🇶🇦", "New Zealand": "🇳🇿",
    "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Haiti": "🇭🇹",
    "Turkey": "🇹🇷", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Panama": "🇵🇦",
    "Germany": "🇩🇪", "Ecuador": "🇪🇨", "Curaçao": "🇨🇼", "Tunisia": "🇹🇳",
    "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Senegal": "🇸🇳", "Jordan": "🇯🇴",
    "Belgium": "🇧🇪", "Iran": "🇮🇷", "Egypt": "🇪🇬", "Nigeria": "🇳🇬",
    "Spain": "🇪🇸", "Uruguay": "🇺🇾", "Czech Republic": "🇨🇿", "Algeria": "🇩🇿",
    "France": "🇫🇷", "Norway": "🇳🇴", "Ivory Coast": "🇨🇮", "Ghana": "🇬🇭",
    "Argentina": "🇦🇷", "Austria": "🇦🇹", "Poland": "🇵🇱", "Denmark": "🇩🇰",
    "Portugal": "🇵🇹", "Colombia": "🇨🇴", "Sweden": "🇸🇪", "Bosnia and Herzegovina": "🇧🇦",
    "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "United States": "🇺🇸", "Italy": "🇮🇹",
    "Cape Verde": "🇨🇻", "Iraq": "🇮🇶", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿",
}

# 第三名槽位候选组（官方公布的每槽约束，来自 R32_MATCHES spec）
def third_label(spec) -> str:
    return "/".join(sorted(spec[1]))


def modal_positions(probs):
    """每组 头名=argmax(win_group)、次名=头名外 argmax(advance)（与站点/组卡片同规则）。"""
    out = {}
    for g, teams in GROUPS_2026.items():
        sub = probs.loc[list(teams)]
        w = sub["win_group"].idxmax()
        rest = sub.drop(index=w)
        r = rest["advance"].idxmax()
        out[g] = {"W": (str(w), float(sub.loc[w, "win_group"])),
                  "R": (str(r), float(sub.loc[r, "runner_up"]))}
    return out


def fetch_polymarket(timeout=12):
    """构建期 Polymarket 快照（World Cup Winner，¢）。失败返回 None，由调用方兜底。"""
    url = "https://gamma-api.polymarket.com/events?slug=world-cup-winner"
    try:
        req = urllib.request.Request(url, headers={
            "accept": "application/json",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.load(r)
        ev = data[0] if isinstance(data, list) else data
        odds = {}
        for m in ev.get("markets", []):
            if m.get("closed") is True:
                continue
            team = (m.get("groupItemTitle") or m.get("title") or "").strip()
            pr = m.get("outcomePrices")
            if isinstance(pr, str):
                try:
                    pr = json.loads(pr)
                except Exception:
                    pr = None
            p = float(pr[0]) if pr else (float(m["lastTradePrice"]) if m.get("lastTradePrice") is not None else None)
            if team and p is not None and np.isfinite(p):
                odds[team.lower()] = round(p * 1000) / 10  # ¢，保留 1 位
        return {"odds": odds, "volume": ev.get("volume")} if odds else None
    except Exception as e:  # noqa: BLE001
        print(f"  ⚠ Polymarket 快照失败（{e}），pm 用占位 None→前端实时拉取兜底")
        return None


ALIAS_PM = {"united states": "usa", "czech republic": "czechia",
            "bosnia and herzegovina": "bosnia", "ivory coast": "côte d'ivoire"}

# Polymarket 2026-06-04 静态快照（设计稿同源）——构建期拉取失败时的兜底，运行时前端仍会实时刷新
FALLBACK_PM = {"Spain": 16, "France": 17, "England": 11, "Argentina": 9, "Brazil": 9,
               "Portugal": 6, "Germany": 6, "Colombia": 5, "Netherlands": 5, "Belgium": 3,
               "Mexico": 2.5, "Morocco": 2, "Uruguay": 2, "Japan": 1, "Switzerland": 1.5,
               "Norway": 1.5, "Croatia": 2, "Austria": 1, "Ecuador": 1, "Turkey": 1,
               "Paraguay": 0.5, "Iran": 0.5, "South Korea": 1, "Canada": 1}


def pm_of(snap, en):
    if snap:
        k = en.lower()
        v = snap["odds"].get(k, snap["odds"].get(ALIAS_PM.get(k, k)))
        if v is not None:
            return v
    return FALLBACK_PM.get(en, 0.5)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sims", type=int, default=50000)
    ap.add_argument("--trend-sims", type=int, default=20000)
    ap.add_argument("--no-pm", action="store_true")
    ap.add_argument("--out", default=str(REPO / "site/portal/assets/engine.js"))
    args = ap.parse_args()

    store = ModelStore()
    loaded = store.load("default")
    meta = loaded.metadata
    if str(meta.get("format")) != "wc2026_official":
        raise SystemExit(f"注册仓 latest 不是 wc2026_official（format={meta.get('format')}），先 wcpredict train --model wc2026")
    params = loaded.params
    print(f"模型：default v{loaded.version} · {meta.get('fit_time')} · {len(params.teams)} 队")

    # ---- 主模拟（5 万届）----
    sim = OfficialWC2026Simulator(params)
    res = sim.run(n_sims=args.sims, seed=2026)
    p = res.probs
    assert abs(p["advance"].sum() - 32) < 0.5 and abs(p["champion"].sum() - 1) < 1e-6
    print(f"模拟：{res.n_sims} 届 · Σ出线={p['advance'].sum():.1f} Σ夺冠={p['champion'].sum():.3f}")

    # ---- 趋势：注册仓历史 wc2026_official 版本逐版重模拟 ----
    versions = []
    for f in sorted((store.root / "default").glob("v*.json"), key=lambda x: int(x.stem[1:])):
        d = json.loads(f.read_text())
        if d.get("metadata", {}).get("format") == "wc2026_official":
            versions.append(int(f.stem[1:]))
    trend_vs = versions[:: max(1, len(versions) // 7)][-7:]
    if versions and versions[-1] not in trend_vs:
        trend_vs.append(versions[-1])
    print(f"趋势版本：{trend_vs}")
    trend = {}
    for v in trend_vs:
        lv = store.load("default", version=v)
        pv = OfficialWC2026Simulator(lv.params).run(n_sims=args.trend_sims, seed=2026).probs
        for t in pv.index:
            trend.setdefault(t, []).append(round(float(pv.loc[t, "champion"]) * 100, 1))

    # ---- Elo 评分（缓存 CSV 离线重算，与训练同链路）----
    from wcpredict.data.sources import InternationalResultsSource
    from wcpredict.ratings import EloRating, apply_offsets, derive_confederations, deployment_offsets
    src = InternationalResultsSource(since=str(meta.get("since", "2006-01-01")))
    matches = src.fetch_matches()
    elo = EloRating(passes=int(meta.get("elo_passes", 4)))
    elo.fit(matches)
    ratings_all = elo.to_dict()
    conf_map = derive_confederations(src.raw_results())
    ratings_all = apply_offsets(ratings_all, conf_map, deployment_offsets(matches, ratings_all, conf_map))
    official = [t for ts in GROUPS_2026.values() for t in ts]
    elo48 = {t: round(ratings_all[t]) for t in official}
    top5 = sorted(elo48, key=elo48.get, reverse=True)[:5]
    print(f"Elo Top5：{top5}（metadata top5={meta.get('top5')}）")

    # ---- Polymarket 构建期快照 ----
    snap = None if args.no_pm else fetch_polymarket()
    if snap:
        print(f"Polymarket：{len(snap['odds'])} 队，成交 ${(snap['volume'] or 0)/1e6:.0f}M")

    asof = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    champ_sorted = p.sort_values("champion", ascending=False)

    def team_obj(en, with_trend=True):
        o = {"team": ZH[en], "en": en, "conf": CONF_OF[en],
             "p": round(float(p.loc[en, "champion"]) * 100, 1),
             "qf": round(float(p.loc[en, "reach_SF"]) * 100, 1),
             "fin": round(float(p.loc[en, "reach_Final"]) * 100, 1),
             "adv": round(float(p.loc[en, "advance"]) * 100)}
        if with_trend:
            o["trend"] = trend.get(en, [o["p"]])
        return o

    champions = [team_obj(en) for en in champ_sorted.index[:8]]
    ratings_js = [{"team": ZH[t], "en": t, "elo": elo48[t]} for t in top5]

    # ---- 小组出线热门 ----
    groups_js = []
    for g, teams in GROUPS_2026.items():
        sub = p.loc[list(teams)]
        w = sub["win_group"].idxmax()
        rest = sub.drop(index=w)
        r = rest["advance"].idxmax()
        groups_js.append({
            "g": g,
            "lead": {"zh": ZH[w], "en": str(w), "top": round(float(sub.loc[w, "win_group"]) * 100),
                     "adv": round(float(sub.loc[w, "advance"]) * 100)},
            "run": {"zh": ZH[r], "en": str(r), "adv": round(float(rest.loc[r, "advance"]) * 100)},
        })

    # ---- 官方树 R32 槽位（最可能占用者）----
    modal = modal_positions(p)
    r32_js, entrants = [], {}
    for no, (s1, s2) in sorted(R32_MATCHES.items()):
        def slot(spec):
            if spec[0] == "3":
                return {"lbl": "最佳第三", "third": third_label(spec)}
            kind, g = spec
            t, prob = modal[g]["W" if kind == "W" else "R"]
            return {"lbl": f"{g} 组{'头名' if kind == 'W' else '次名'}", "zh": ZH[t], "en": t,
                    "pct": round(prob * 100)}
        a, b = slot(s1), slot(s2)
        r32_js.append({"no": no, "a": a, "b": b})
        entrants[no] = [x for x in (a, b) if "en" in x]

    # ---- 模型路径 16 强树：R32 模态入场者按 champion% 逐轮推进 ----
    R16_MAP = [[89, 74, 77], [90, 73, 75], [91, 76, 78], [92, 79, 80],
               [93, 83, 84], [94, 81, 82], [95, 86, 88], [96, 85, 87]]
    QF_MAP = [[97, 89, 90], [98, 93, 94], [99, 91, 92], [100, 95, 96]]
    SF_MAP = [[101, 97, 98], [102, 99, 100]]
    FIN = [104, 101, 102]

    def champ_pct(en):
        return float(p.loc[en, "champion"]) * 100

    def bteam(en):
        return {"zh": ZH[en], "en": en, "m": round(champ_pct(en), 1),
                "pm": pm_of(snap, en), "conf": CONF_OF[en]}

    def winner_of(no):
        """该场的模型晋级者（入场者中 champion% 较高方；第三名槽无具名队则取另一方）。"""
        cands = entrants.get(no, [])
        return max(cands, key=lambda x: champ_pct(x["en"]))["en"] if cands else None

    winners: dict[int, str] = {}
    r16_pairs = []
    for no, x, y in R16_MAP:
        a, b = winner_of(x), winner_of(y)
        assert a and b, f"M{no} 双方均为第三名槽（官方树不应出现）"
        r16_pairs.append([bteam(a), bteam(b)])
        winners[no] = max((a, b), key=champ_pct)
    qf_pairs = []
    for no, x, y in QF_MAP:
        qf_pairs.append([bteam(winners[x]), bteam(winners[y])])
        winners[no] = max((winners[x], winners[y]), key=champ_pct)
    sf_pairs = []
    for no, x, y in SF_MAP:
        sf_pairs.append([bteam(winners[x]), bteam(winners[y])])
        winners[no] = max((winners[x], winners[y]), key=champ_pct)
    fx, fy = winners[FIN[1]], winners[FIN[2]]
    final_pair = [[bteam(fx), bteam(fy)]]
    champion = bteam(max((fx, fy), key=champ_pct))

    odds_cmp = [{"zh": ZH[en], "en": en, "m": round(champ_pct(en), 1), "pm": pm_of(snap, en)}
                for en in champ_sorted.index[:8]]

    # ---- λ 引擎参数原样导出（前端与 Python 完全同式：λh=exp(intercept+att_h+def_a)）----
    params_js = {
        "intercept": float(params.intercept), "rho": float(params.rho),
        "homeAdv": float(params.home_adv),
        "teams": {t: [round(float(params.attack[i]), 6), round(float(params.defence[i]), 6)]
                  for i, t in enumerate(params.teams)},
    }

    # ---- 焦点对阵（真实 λ；market 为去水位市场参照快照）----
    FOCUS = [("esp-eng", "半决赛", "Spain", "England", {"home": 0.50, "draw": 0.27, "away": 0.23, "over": 0.49, "btts": 0.52}),
             ("arg-bra", "1/4 决赛", "Argentina", "Brazil", {"home": 0.42, "draw": 0.28, "away": 0.30, "over": 0.51, "btts": 0.55}),
             ("fra-esp", "决赛", "France", "Spain", {"home": 0.36, "draw": 0.28, "away": 0.36, "over": 0.50, "btts": 0.54}),
             ("bra-fra", "1/4 决赛", "Brazil", "France", {"home": 0.35, "draw": 0.29, "away": 0.36, "over": 0.52, "btts": 0.56})]
    matches_js = []
    for mid, stage, h, a, mkt in FOCUS:
        lh, la = params.lambdas(h, a, neutral=True)
        matches_js.append({"id": mid, "stage": stage, "home": ZH[h], "away": ZH[a], "he": h, "ae": a,
                           "lh": round(lh, 2), "la": round(la, 2), "market": mkt})

    # ---- 48 队（真实 Elo，供赛程/单场页）----
    teams_js = [{"zh": ZH[t], "en": t, "group": g, "elo": elo48[t]}
                for g, ts in GROUPS_2026.items() for t in ts]

    J = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    nl = "\n"
    out = f"""/* RedFootball — 引擎真实数据层（自动生成，勿手改）
 * 生成：{datetime.now(timezone.utc).isoformat(timespec='seconds')} · 模型 default v{getattr(loaded, 'version', '?')}（{meta.get('fit_time')}）
 * 链路：registry latest → OfficialWC2026Simulator {args.sims} 届 (seed 2026) → 本文件
 * 刷新：PYTHONPATH=src python scripts/export_portal_data.py
 * 本文件先于 data.js/bracket.js/fixtures.js 加载；它们均为 `window.X = window.X || …` 兜底。 */
window.RF_ENGINE = {{ version: {J(str(loaded.version))}, fit: {J(str(meta.get('fit_time', '')))}, sims: {args.sims}, asof: {J(asof)} }};
window.WC_FLAGS = {J(FLAGS)};
window.WC_PARAMS = {J(params_js)};
window.WC_TEAMS = {J(teams_js)};
window.WC_CHAMPIONS = {J(champions)};
window.WC_RATINGS = {J(ratings_js)};
window.WC_MATCHES = {J(matches_js)};
window.WC_GROUPS = {J(groups_js)};
window.WC_OFFICIAL_TREE = {{asof: {J(asof)}, sims: {J(f"{args.sims // 10000} 万")}, r32: {J(r32_js)},{nl}  r16: {J(R16_MAP)}, qf: {J(QF_MAP)}, sf: {J(SF_MAP)}, final: {J(FIN)}}};
window.WC_BRACKET = {{source: 'Polymarket · World Cup Winner · {"实时快照" if snap else "静态快照"}', asof: {J(asof)},{nl}  r16: {J(r16_pairs)},{nl}  qf: {J(qf_pairs)},{nl}  sf: {J(sf_pairs)},{nl}  final: {J(final_pair)},{nl}  champion: {J(champion)}}};
window.WC_ODDS_CMP = {J(odds_cmp)};
"""
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(out, encoding="utf-8")
    print(f"✓ 写出 {out_path}（{len(out)} 字节）")
    print(f"  冠军 Top5：{[(c['en'], c['p']) for c in champions[:5]]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
