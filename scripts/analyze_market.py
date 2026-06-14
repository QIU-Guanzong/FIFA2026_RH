"""链上(Polymarket)赔率流 + 套利/错价扫描 → 门户数据层 site/portal/assets/market.js。

诚实口径（铁律 + polymarket.py docstring）：夺冠盘是 $20 亿成交的有效前沿，**独立≠edge**。
本层回答用户的「有没有套利机会」：用证据说话，不臆造无风险套利。

扫描三类：
  1. 总水位(overround)=Σyes(干净48队)；市场效率读数（vig%）。
  2. 无风险套利硬检验：Σ bestAsk(买全部 Yes 的成本) < 1 才有「买全队」无风险套利 → 实测远 >1=无。
  3. 跨市场一致性：夺冠盘 vs 各组「小组头名」盘（world-cup-group-{x}-winner）——
     逻辑上 P(夺冠) 不应 > P(小组头名)+P(小组次名)；缺「出线」盘故无干净 dutch-book，仅作软一致性。
  + 模型 vs 市场分歧（去水位后）= 真正可操作的「价值/+EV」（非无风险），带 edge%。
  + 赔率流：market_snapshots 最近两次快照的最大变动队（动量/CLV 雏形）。

用法：PYTHONPATH=src python scripts/analyze_market.py [--sims 40000]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))

from wcpredict.config import DATA_DIR                                          # noqa: E402
from wcpredict.markets.polymarket import (                                     # noqa: E402
    PolymarketSource, _get_json, _GAMMA, normalize_team, devig_multiway,
)
from wcpredict.registry import ModelStore                                      # noqa: E402
from wcpredict.tournament.wc2026 import GROUPS_2026, OfficialWC2026Simulator   # noqa: E402

OUT_JS = REPO / "site" / "portal" / "assets" / "market.js"
OUT_JSON = DATA_DIR / "wc2026_market.json"
GROUP_OF = {t: g for g, ts in GROUPS_2026.items() for t in ts}
OFFICIAL = set(GROUP_OF)
GROUPS = "abcdefghijkl"


def model_probs(sims: int) -> pd.Series:
    loaded = ModelStore().load("default")
    res = OfficialWC2026Simulator(loaded.params).run(n_sims=sims, seed=2026)
    return res.probs["champion"].astype(float), loaded.version


def clean_winner(df: pd.DataFrame) -> pd.DataFrame:
    """只留官方 48 队（closed 已在 parse 里滤掉；这里再交集兜底）。"""
    return df[df["team"].isin(OFFICIAL)].copy()


def best_ask(row) -> float | None:
    a = row.get("bestAsk")
    try:
        a = float(a)
        if a > 0:
            return a
    except (TypeError, ValueError):
        pass
    return None


def group_consistency():
    """各组「小组头名」盘 de-vig → P(win group)；返回 {team: win_group_p} + 抓取成功的组。"""
    wg, ok = {}, []
    for g in GROUPS:
        try:
            data = _get_json(f"{_GAMMA}/events?slug=world-cup-group-{g}-winner")
            ev = data[0] if isinstance(data, list) and data else data
            rows = []
            for m in (ev.get("markets") or []):
                if m.get("closed") is True:
                    continue
                t = normalize_team(m.get("groupItemTitle") or "")
                if t not in OFFICIAL:
                    continue  # 跳过 "Other" 等
                yp = PolymarketSource._yes_price(m)
                if yp:
                    rows.append((t, float(yp)))
            if not rows:
                continue
            s = pd.Series(dict(rows))
            s = s / s.sum()  # 组内归一
            for t, p in s.items():
                wg[t] = float(p)
            ok.append(g.upper())
        except Exception:  # noqa: BLE001
            continue
    return wg, ok


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sims", type=int, default=40000)
    args = ap.parse_args()

    print("拉取 Polymarket 夺冠盘…")
    src = PolymarketSource()
    ev = src.fetch_event()
    raw = src.parse_winner_market(ev)         # closed 已滤
    df = clean_winner(raw)
    yes = df.set_index("team")["yes_price"].astype(float)
    overround = float(yes.sum())
    vig_pct = (overround - 1.0) * 100.0
    market_p = (yes / overround).sort_values(ascending=False)

    # 无风险套利硬检验：买全部 Yes 的成本
    asks = [best_ask(r) or r["yes_price"] for _, r in df.iterrows()]
    buy_all_cost = float(sum(asks))
    riskless_arb = buy_all_cost < 1.0

    print(f"  干净 {len(df)} 队 · Σyes={overround:.4f}（vig {vig_pct:.1f}%）· 成交 ${ (ev.get('volume') or 0)/1e9:.2f}B")
    print(f"  买全部 Yes 成本 Σask={buy_all_cost:.3f} → {'⚠ 存在无风险套利!' if riskless_arb else '无无风险套利（>1，符合有效市场）'}")

    # 跨市场一致性
    print("拉取各组「小组头名」盘…")
    wg, groups_ok = group_consistency()
    anomalies = []
    for t, mcup in market_p.items():
        if t in wg and mcup > wg[t] + 1e-6:   # 夺冠% > 小组头名% = 反常（强队通常小组头名% 更高）
            anomalies.append({"team": t, "p_win_cup": round(mcup, 4), "p_win_group": round(wg[t], 4)})
    print(f"  抓到 {len(groups_ok)} 组头名盘；跨市场反常(夺冠%>头名%) {len(anomalies)} 例")

    # 模型 vs 市场分歧（价值/+EV，非无风险）
    print(f"模型模拟 {args.sims} 届…")
    mp, mver = model_probs(args.sims)
    common = [t for t in market_p.index if t in mp.index]
    div = pd.DataFrame({"model": mp.loc[common], "market": market_p.loc[common]})
    div["edge"] = div["model"] - div["market"]            # >0 模型更看好（潜在价值）
    div["edge_ratio"] = div["model"] / div["market"].clip(lower=1e-6)
    div = div.sort_values("edge", ascending=False)
    top_value = div.head(6)
    top_fade = div.tail(4).iloc[::-1]

    # ---- 离散度诊断：模型相对市场是否"更平"（回答"是否因赔率低才买"）----
    # 非循环口径：回归 model ~ market，slope<1 = 模型向均匀收缩（欠离散）。
    # corr(market, edge) 因 edge=model-market 含 market 于两轴，机械偏负，仅作辅助。
    mk = div["market"].to_numpy(); md = div["model"].to_numpy()
    slope, intercept = (float(x) for x in np.polyfit(mk, md, 1))
    corr_me = float(np.corrcoef(mk, div["edge"].to_numpy())[0, 1])
    odds = 1.0 / div["market"].clip(lower=1e-9)
    tier_defs = [("热门", 0, 14), ("中", 14, 33), ("长", 33, 100), ("超长", 100, 1e9)]
    tiers = []
    for name, lo, hi in tier_defs:
        sel = div[(odds >= lo) & (odds < hi)]
        if len(sel):
            tiers.append({"tier": name, "n": int(len(sel)),
                          "avg_edge": round(float(sel["edge"].mean()), 4),
                          "pct_pos": round(float((sel["edge"] > 0).mean()), 3)})
    dispersion = {
        "slope": round(slope, 3), "intercept": round(intercept, 4),
        "corr_market_edge": round(corr_me, 3), "tiers": tiers,
        "reading": ("slope<1 → 模型比 $%.1fB 市场更平（向均匀收缩）：高赔冷门给太多、热门给不够；"
                    "故'价值'系统性落在冷门一侧，多半是模型欠离散而非已证 edge，不应照此下注。"
                    % ((ev.get("volume") or 0) / 1e9)) if slope < 0.98 else
                   ("slope≈1 → 模型离散度与市场相当，分歧非系统性偏向冷门。"),
    }

    # ---- 赔率流：本次快照(富字段)追加到 repo 外 flow parquet（CLV 累积，工作在 refresh 路径）----
    asof = datetime.now(timezone.utc).isoformat(timespec="seconds")
    flow_dir = Path.home() / "FootballData" / "data"
    flow_dir.mkdir(parents=True, exist_ok=True)
    flow_path = flow_dir / "market_flow.jsonl"  # JSONL 追加：杜绝 parquet read-rewrite 反复损坏
    snap_rows = []
    for _, r in df.iterrows():
        t = r["team"]
        bid = r.get("bestBid"); ask = r.get("bestAsk")
        try: bid = float(bid)
        except (TypeError, ValueError): bid = None
        try: ask = float(ask)
        except (TypeError, ValueError): ask = None
        snap_rows.append({
            "ts": asof, "team": t, "yes_price": float(r["yes_price"]),
            "bestBid": bid, "bestAsk": ask,
            "spread": (ask - bid) if (bid is not None and ask is not None) else None,
            "market_p": float(market_p[t]), "model_p": float(mp.get(t, float("nan"))),
            "overround": round(overround, 4), "volume_usd": ev.get("volume"),
        })
    # 纯追加，不读改写 → 杜绝 parquet read-rewrite 的反复损坏（曾两次 histogram mismatch）
    with open(flow_path, "a", encoding="utf-8") as fh:
        for row in snap_rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    flow_rows = []
    with open(flow_path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                flow_rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass   # 跳过坏行，不中断刷新
    flow_all = pd.DataFrame(flow_rows)
    print(f"  赔率流 +{len(snap_rows)} 行 → {flow_path}（累计 {len(flow_all)} 行）")

    # 最近两次快照的最大变动队（动量/CLV 雏形）
    movers = []
    ts_sorted = sorted(flow_all["ts"].unique())
    flow_asof = [str(ts_sorted[0])[:16], str(ts_sorted[-1])[:16]] if ts_sorted else []
    if len(ts_sorted) >= 2:
        a, b = ts_sorted[-2], ts_sorted[-1]
        pa = flow_all[flow_all["ts"] == a].set_index("team")["yes_price"]
        pb = flow_all[flow_all["ts"] == b].set_index("team")["yes_price"]
        d = (pb - pa).dropna()
        d = d[d.abs() > 1e-9].sort_values()
        for t in list(d.index[-3:][::-1]) + list(d.index[:3]):
            movers.append({"team": t, "from": round(float(pa[t]), 4), "to": round(float(pb[t]), 4),
                           "delta": round(float(d[t]), 4)})

    out = {
        "meta": {
            "as_of": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source": "Polymarket Gamma · World Cup Winner",
            "model_version": mver,
            "volume_usd": ev.get("volume"), "liquidity_usd": ev.get("liquidity"),
            "n_teams": len(df),
        },
        "efficiency": {
            "overround": round(overround, 4), "vig_pct": round(vig_pct, 2),
            "buy_all_yes_cost": round(buy_all_cost, 4), "riskless_arb": riskless_arb,
        },
        "cross_market": {
            "groups_fetched": groups_ok, "anomalies": anomalies,
            "note": "缺「出线/晋级」盘，无干净跨市场 dutch-book；以上为夺冠盘 vs 小组头名盘软一致性。",
        },
        "divergence": {
            "value": [{"team": t, "model": round(float(r.model), 4), "market": round(float(r.market), 4),
                       "edge": round(float(r.edge), 4)} for t, r in top_value.iterrows()],
            "fade": [{"team": t, "model": round(float(r.model), 4), "market": round(float(r.market), 4),
                      "edge": round(float(r.edge), 4)} for t, r in top_fade.iterrows()],
        },
        "flow": {"asof": flow_asof, "movers": movers},
        "dispersion": dispersion,
        "verdict": ("无无风险套利（夺冠盘 vig %.1f%%、成交 $%.1fB、买全队成本 %.3f>1）；"
                    "分歧偏向冷门(slope %.2f<1=模型欠离散)，属研究性参照而非可下注 edge。"
                    % (vig_pct, (ev.get("volume") or 0) / 1e9, buy_all_cost, slope)),
    }
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    js = ("/* RedFootball — 链上市场(Polymarket)效率/套利/分歧数据层（自动生成，勿手改）\n"
          f" * 生成：{out['meta']['as_of']} · {out['verdict']}\n"
          " * 刷新：PYTHONPATH=src python scripts/analyze_market.py */\n"
          f"window.WC_MARKET = {json.dumps(out, ensure_ascii=False, separators=(',', ':'))};\n")
    OUT_JS.write_text(js, encoding="utf-8")
    print(f"\n{out['verdict']}")
    for d in out["divergence"]["value"][:3]:
        print(f"  价值: {d['team']:14} 模型 {d['model']*100:.1f}% vs 市场 {d['market']*100:.1f}%  edge {d['edge']*100:+.1f}pp")
    print(f"✓ {OUT_JSON}\n✓ {OUT_JS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
