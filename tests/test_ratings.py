"""Elo 多趟暖启动：确定性 + 压低洲际通胀（离线、合成、可复现）。"""
import numpy as np
import pandas as pd

from wcpredict.ratings.elo import EloRating


def test_multipass_deterministic_and_complete():
    m = pd.DataFrame({
        "home": ["A", "B", "C", "A"], "away": ["B", "C", "A", "C"],
        "home_goals": [2, 1, 0, 3], "away_goals": [0, 1, 2, 1],
        "neutral": [True] * 4, "importance": [1.0] * 4,
    })
    r1 = EloRating(passes=3).fit(m).to_dict()
    r2 = EloRating(passes=3).fit(m).to_dict()
    assert r1 == r2                              # 确定性
    assert set(r1) == {"A", "B", "C"}            # 每队都有评分
    # passes=1 应与"单趟"一致（_initial 为空 → 全从 base 起）
    base = EloRating(passes=1).fit(m).to_dict()
    assert set(base) == {"A", "B", "C"}


def test_fit_sorts_by_date_when_available():
    sorted_rows = pd.DataFrame({
        "date": pd.to_datetime(["2020-01-01", "2020-01-02", "2020-01-03"]),
        "home": ["A", "B", "A"],
        "away": ["B", "A", "B"],
        "home_goals": [2, 0, 1],
        "away_goals": [0, 3, 1],
        "neutral": [True] * 3,
        "importance": [1.0] * 3,
    })
    shuffled = sorted_rows.iloc[[2, 0, 1]].reset_index(drop=True)
    expected = EloRating(passes=2).fit(sorted_rows).to_dict()
    got = EloRating(passes=2).fit(shuffled).to_dict()
    assert got == expected


def _confederation_world():
    """构造两个'洲际'：强洲 A0-3、弱洲 B0-3，绝大多数比赛在洲内（冷启动看不出洲际差），
    仅末尾少量跨洲比赛揭示真实强弱。单趟 Elo 会低估洲际差；多趟应纠正。"""
    true = {"A0": 2000, "A1": 1900, "A2": 1800, "A3": 1700,
            "B0": 1200, "B1": 1100, "B2": 1000, "B3": 900}
    A, B = ["A0", "A1", "A2", "A3"], ["B0", "B1", "B2", "B3"]

    def score(h, a):
        d = true[h] - true[a]
        if d > 50:
            return 2, 0
        if d < -50:
            return 0, 2
        return 1, 1

    rows = []
    # 洲内多轮循环（信息量大但只在洲内）
    for _ in range(12):
        for pool in (A, B):
            for i in range(len(pool)):
                for j in range(len(pool)):
                    if i != j:
                        h, a = pool[i], pool[j]
                        hg, ag = score(h, a)
                        rows.append((h, a, hg, ag))
    # 末尾少量跨洲比赛（揭示洲际真实差）
    for ai in A:
        for bi in B:
            hg, ag = score(ai, bi)
            rows.append((ai, bi, hg, ag))

    df = pd.DataFrame(rows, columns=["home", "away", "home_goals", "away_goals"])
    df["neutral"] = True
    df["importance"] = 1.0
    return df, true


def _corr_with_truth(ratings: dict, true: dict) -> float:
    teams = list(true)
    return float(np.corrcoef(
        [ratings[t] for t in teams], [true[t] for t in teams]
    )[0, 1])


def test_multipass_reduces_confederation_inflation():
    df, true = _confederation_world()
    c1 = _corr_with_truth(EloRating(passes=1).fit(df).to_dict(), true)
    c5 = _corr_with_truth(EloRating(passes=5).fit(df).to_dict(), true)
    # 多趟与真实强弱的相关性明显更高（跨洲信息被反向传播到洲内早期对阵）
    assert c5 > c1 + 0.05, f"多趟未改善洲际排序: passes1={c1:.3f} passes5={c5:.3f}"
