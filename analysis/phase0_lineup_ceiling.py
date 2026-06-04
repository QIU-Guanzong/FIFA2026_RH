"""#5B Phase 0 天花板检验：精确首发信息能否改善*我们自己*的预测（非比市场）。零下载，读缓存。

结论（详见 docs/5B_lineup_data_sources.md §Phase 0）：
  1. 朴素"留一场(LOO)"测试**无效**——球员价值估计量与同场 xG 目标机械耦合，符号随是否含 M 翻转
     （LOO −0.78 vs Full +0.82），是伪信号非真信号。
  2. 干净测试（组赛率→淘汰赛，估计/检验集不相交=无耦合）：首发进攻强度**正向显著**预测淘汰赛 xG
     （slope≈+0.42, r≈+0.48, 按队聚类 bootstrap 95%CI 不含 0）→ **天花板为正，首发信息确有真信号**。
  3. 但：(a) 该上界**混入球队整体强弱**（已被 Elo 捕获），剔除后的*增量*首发价值未能测（淘汰赛每队场次太少无法去均值）；
     (b) 把首发→强度需要**可解释的球员价值模型**，而 shots-only 太稀疏（淘汰赛 XI 仅 ~4/11 人可估、组赛率仅 2-3 场）。
  → 真正的瓶颈是**球员价值层（要建，需稠密事件/广俱乐部样本）**，不是预测 XI 采购（后者只给名字不给价值）。

诚实边界：球员价值仅取射门 xG（偏进攻、漏防守/组织）；国家队、样本小；天花板≠Phase 1（带噪声*预测* XI 能否保住增益）。
"""
from __future__ import annotations

import glob
import json

import numpy as np
import pandas as pd

from wcpredict.data.statsbomb import StatsBombSource, _SB_DIR


def load_cached():
    sb = StatsBombSource()
    stage = {m["match_id"]: (m.get("competition_stage") or {}).get("name") for m in sb.matches()}
    shot_rows, lu_rows = [], []
    for f in sorted(glob.glob(str(_SB_DIR / "events_*.json"))):
        ev = json.loads(open(f, encoding="utf-8").read())
        mid = int(f.split("events_")[1].split(".json")[0])
        shot_rows += StatsBombSource.parse_shots(ev, mid)
        lu_rows += StatsBombSource.parse_lineups(ev, mid)
    shots = pd.DataFrame(shot_rows)
    shots = shots[shots["period"] != 5].dropna(subset=["player"])
    return shots, pd.DataFrame(lu_rows), stage


def _team_match_strength(lus, shots, value_fn):
    rows = []
    for (mid, team), g in lus.groupby(["match_id", "team"]):
        sm = shots[(shots.match_id == mid) & (shots.team == team)]
        rows.append({"match_id": mid, "team": team,
                     "L": sum(value_fn(p, mid) for p in g["player"]),
                     "xg_for": float(sm["statsbomb_xg"].sum())})
    return pd.DataFrame(rows)


def _slope_r(x, y):
    return float(np.polyfit(x, y, 1)[0]), float(np.corrcoef(x, y)[0, 1])


def _cluster_boot_ci(df, xcol, ycol, cluster="team", n=3000):
    teams = df[cluster].unique()
    rng = np.random.default_rng(0)
    bs = []
    for _ in range(n):
        samp = rng.choice(teams, len(teams), replace=True)
        sub = pd.concat([df[df[cluster] == t] for t in samp])
        if sub[xcol].std() > 1e-9:
            bs.append(np.polyfit(sub[xcol], sub[ycol], 1)[0])
    return float(np.percentile(bs, 2.5)), float(np.percentile(bs, 97.5))


def main():
    shots, lus, stage = load_cached()
    GROUP = {mid for mid, s in stage.items() if s == "Group Stage"}
    KO = {mid for mid, s in stage.items() if s and s != "Group Stage"}
    print(f"缓存：{lus.match_id.nunique()} 场（组赛 {len(GROUP)}/淘汰赛 {len(KO)}）| 首发 {len(lus)} | 射门 {len(shots)}")

    xg_pm = shots.groupby(["player", "match_id"]).statsbomb_xg.sum()
    pl_matches = shots.groupby("player").match_id.apply(lambda s: set(s.unique()))
    pl_total = shots.groupby("player").statsbomb_xg.sum()

    # ---- Part 1：朴素 LOO vs Full → 暴露机械耦合伪信号 ----
    def loo(p, m):
        out = (pl_matches.get(p) or set()) - {m}
        return (pl_total[p] - xg_pm.get((p, m), 0.0)) / len(out) if out else 0.0

    def full(p, m):
        ms = pl_matches.get(p)
        return pl_total[p] / len(ms) if ms else 0.0

    print("\n[Part 1] 朴素全样本测试（含伪信号诊断）")
    for name, fn in [("LOO(剔除M)", loo), ("Full(含M)", full)]:
        tm = _team_match_strength(lus, shots, fn)
        for c in ["L", "xg_for"]:
            tm[c + "_d"] = tm[c] - tm.groupby("team")[c].transform("mean")
        s, r = _slope_r(tm["L_d"].to_numpy(), tm["xg_for_d"].to_numpy())
        print(f"   {name:11s} 队内去均值 slope={s:+.3f} r={r:+.3f}")
    print("   → 符号随是否含 M 翻转 = 球员价值与同场 xG 机械耦合 = 朴素测试无效。")

    # ---- Part 2：稀疏性诊断 ----
    n_sm = shots.groupby("player").match_id.nunique()
    print(f"\n[Part 2] 稀疏性：球员有射门场次中位 {int(n_sm.median())}，≤1 场占 {(n_sm <= 1).mean()*100:.0f}% "
          f"→ shots-only 球员价值过稀疏、且自指。")

    # ---- Part 3：干净测试（组赛率 → 淘汰赛，估计/检验不相交=无耦合）----
    grp_starts = lus[lus.match_id.isin(GROUP)].groupby("player").match_id.nunique()
    grp_xg = shots[shots.match_id.isin(GROUP)].groupby("player").statsbomb_xg.sum()
    rate = {p: grp_xg.get(p, 0.0) / grp_starts[p] for p in grp_starts.index}
    ko = _team_match_strength(lus[lus.match_id.isin(KO)], shots[shots.match_id.isin(KO)],
                              lambda p, m: rate.get(p, 0.0))
    grp_shot_m = shots[shots.match_id.isin(GROUP)].groupby("player").match_id.nunique()  # 有"射门"的组赛场次
    cov = np.median([sum(grp_shot_m.get(p, 0) >= 2 for p in g["player"])
                     for _, g in lus[lus.match_id.isin(KO)].groupby(["match_id", "team"])])
    s, r = _slope_r(ko["L"].to_numpy(), ko["xg_for"].to_numpy())
    lo, hi = _cluster_boot_ci(ko, "L", "xg_for")
    excl0 = lo > 0 or hi < 0
    print(f"\n[Part 3] 干净 组赛→淘汰赛（无共享场=无伪信号）  N={len(ko)} 队-场, {ko.team.nunique()} 队")
    print(f"   slope={s:+.3f}  Pearson r={r:+.3f}  R²={r**2:.3f}  按队聚类 95%CI(slope)=[{lo:+.3f},{hi:+.3f}]")
    print(f"   → {'✓ 不含 0：天花板为正，首发信息确有真信号' if excl0 else '✗ 跨 0：欠功效/不显著'}"
          f"（覆盖：每 XI 仅 ~{int(cov)}/11 人可估，组赛率仅 2-3 场）")

    # ---- Part 4：结论（再排序洞见）----
    print("\n[结论] 去伪后天花板为正，但 (a) 混入球队整体强弱(Elo 已含)、增量首发价值未单独测；")
    print("       (b) 提取它需可解释的*球员价值层*，shots-only 太稀疏 → **要建价值层(稠密数据)，不是先买预测 XI**。")
    print("       预测 XI 只给名字不给价值；导入第三方球员评分=黑箱，违背可解释铁律。详见 docs/5B_lineup_data_sources.md。")


if __name__ == "__main__":
    main()
