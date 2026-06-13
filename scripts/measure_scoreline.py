"""测量当前比分(scoreline)预测校准 —— 判断是否需要调 base_goals / rho。

铁律 #4：不在 4 场世界杯上调参。用国际赛历史做**留出**校准检验（train 严格早于 test）。
问题：模型每场期望总进球 ≈ 2×base_goals=2.70；真实国际赛平均总进球是多少？
  - 若 ≈2.7 → 模型 OK，4 场只是噪声，无需调模型（只做展示优化）。
  - 若明显 >2.7 → base_goals 偏低（advisor 指出的稳妥杠杆），grid 之。

评估指标（test 集）：scoreline log-loss（真实比分上的概率质量）、exact-hit、
总进球 bias=mean(actual−pred)、1X2 log-loss（护栏，调参不能让它退化）。
grid base_goals 找最优 scoreline log-loss，rho 同测。

用法：PYTHONPATH=src python scripts/measure_scoreline.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))

from wcpredict.config import MAX_GOALS                                         # noqa: E402
from wcpredict.data.sources import InternationalResultsSource                  # noqa: E402
from wcpredict.model.dixon_coles import DixonColesParams, score_matrix         # noqa: E402
from wcpredict.ratings.elo import EloRating                                    # noqa: E402

SPLIT = "2019-01-01"   # train < SPLIT ≤ test


def evaluate(params: DixonColesParams, test: pd.DataFrame, max_goals=MAX_GOALS):
    idx = params.index
    sll, exact, n = 0.0, 0, 0
    tot_bias, tot_abs = 0.0, 0.0
    x_ll = 0.0  # 1X2 log-loss
    act_tot_sum = pred_tot_sum = 0.0
    for _, r in test.iterrows():
        h, a = r["home"], r["away"]

        def ad(t):
            if t in idx:
                i = idx[t]; return float(params.attack[i]), float(params.defence[i])
            return 0.0, 0.0
        ah, dh = ad(h); aa, da = ad(a)
        ha = 0.0 if bool(r["neutral"]) else params.home_adv
        lam = float(np.exp(params.intercept + ha + ah + da))
        mu = float(np.exp(params.intercept + aa + dh))
        M = score_matrix(lam, mu, params.rho, max_goals)
        hg, ag = int(r["home_goals"]), int(r["away_goals"])
        cg = min(hg, max_goals); cag = min(ag, max_goals)
        p = max(M[cg, cag], 1e-12)
        sll += -np.log(p)
        flat = int(np.argmax(M)); mi, mj = divmod(flat, M.shape[1])
        exact += (mi == hg and mj == ag)
        pred_tot = lam + mu
        act_tot = hg + ag
        tot_bias += act_tot - pred_tot; tot_abs += abs(act_tot - pred_tot)
        act_tot_sum += act_tot; pred_tot_sum += pred_tot
        # 1X2
        ph = float(np.tril(M, -1).sum()); pd_ = float(np.trace(M)); pa = float(np.triu(M, 1).sum())
        oc = 0 if hg > ag else (1 if hg == ag else 2)
        x_ll += -np.log(max([ph, pd_, pa][oc], 1e-12))
        n += 1
    return {
        "n": n, "scoreline_ll": sll / n, "exact_rate": exact / n,
        "total_bias": tot_bias / n, "total_mae": tot_abs / n,
        "mean_actual_total": act_tot_sum / n, "mean_pred_total": pred_tot_sum / n,
        "x_1x2_ll": x_ll / n,
    }


def main():
    src = InternationalResultsSource(since="2006-01-01")
    m = src.fetch_matches().dropna(subset=["home_goals", "away_goals"]).copy()
    m["date"] = pd.to_datetime(m["date"])
    train = m[m["date"] < SPLIT]
    test = m[m["date"] >= SPLIT]
    print(f"留出划分 @ {SPLIT} — train {len(train)} 场 / test {len(test)} 场")
    print(f"全样本平均总进球 {m['home_goals'].add(m['away_goals']).mean():.3f}  "
          f"test 平均 {(test['home_goals'] + test['away_goals']).mean():.3f}\n")

    elo = EloRating(passes=4); elo.fit(train)
    ratings = elo.to_dict()

    print("=== base_goals grid（rho=-0.05, goals_scale=0.0018）===")
    print(f"{'base_goals':>10} {'scoreLL':>8} {'exact':>6} {'totBias':>8} {'totMAE':>7} {'meanAct':>8} {'meanPred':>9} {'1x2LL':>7}")
    best = None
    for bg in [1.30, 1.35, 1.40, 1.45, 1.50, 1.55]:
        p = DixonColesParams.from_ratings(ratings, base_goals=bg, goals_scale=0.0018, rho=-0.05, home_adv=0.25)
        e = evaluate(p, test)
        flag = ""
        if best is None or e["scoreline_ll"] < best[1]["scoreline_ll"]:
            best = (bg, e)
        print(f"{bg:>10.2f} {e['scoreline_ll']:>8.4f} {e['exact_rate']:>6.3f} {e['total_bias']:>+8.3f} "
              f"{e['total_mae']:>7.3f} {e['mean_actual_total']:>8.3f} {e['mean_pred_total']:>9.3f} {e['x_1x2_ll']:>7.4f}")
    print(f"\n最优 scoreline_ll @ base_goals={best[0]}（meanActual={best[1]['mean_actual_total']:.3f}）")

    print("\n=== rho grid（base_goals=最优, goals_scale=0.0018）===")
    bg = best[0]
    print(f"{'rho':>8} {'scoreLL':>8} {'exact':>6} {'1x2LL':>7}")
    for rho in [-0.12, -0.08, -0.05, -0.02, 0.0]:
        p = DixonColesParams.from_ratings(ratings, base_goals=bg, goals_scale=0.0018, rho=rho, home_adv=0.25)
        e = evaluate(p, test)
        print(f"{rho:>8.2f} {e['scoreline_ll']:>8.4f} {e['exact_rate']:>6.3f} {e['x_1x2_ll']:>7.4f}")


if __name__ == "__main__":
    main()
