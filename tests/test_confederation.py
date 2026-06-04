"""#6b 洲际归属派生 + 偏置 offset：派生正确性(含会籍变更)、offset 符号、部署只取稳健洲。"""
import numpy as np
import pandas as pd
import pytest

from wcpredict.ratings.confederation import (
    apply_offsets,
    deployment_offsets,
    derive_confederations,
    estimate_confederation_offsets,
)


def test_derive_confederations_and_recency():
    raw = pd.DataFrame({
        "date": ["2020-01-01", "2020-02-01", "2010-01-01", "2022-01-01", "2021-06-01"],
        "tournament": ["UEFA Euro qualification", "African Cup of Nations",
                       "OFC Nations Cup", "AFC Asian Cup qualification", "Copa América"],
        "home_team": ["France", "Egypt", "Australia", "Australia", "Brazil"],
        "away_team": ["Spain", "Ghana", "Fiji", "Japan", "Argentina"],
    })
    conf = derive_confederations(raw)
    assert conf["France"] == "UEFA" and conf["Spain"] == "UEFA"
    assert conf["Egypt"] == "CAF" and conf["Ghana"] == "CAF"
    assert conf["Japan"] == "AFC"
    assert conf["Fiji"] == "OFC"
    assert conf["Brazil"] == "CONMEBOL" and conf["Argentina"] == "CONMEBOL"
    # 会籍变更：Australia 2010 在 OFC、2022 在 AFC → 近期优先取 AFC
    assert conf["Australia"] == "AFC"


def _lopsided_matches(winner_conf, loser_conf, n=200):
    """构造 winner_conf 主队恒胜 loser_conf 的洲际间比赛（中立场）。"""
    rows = []
    for i in range(n):
        rows.append({"home": f"{winner_conf}_h", "away": f"{loser_conf}_a",
                     "home_goals": 1, "away_goals": 0, "neutral": True})
    return pd.DataFrame(rows)


def test_offset_sign_overrated_confed_gets_negative():
    """恒输的一方（洲际间实绩<期望）应被判过高估 → 负 offset；sum-to-zero。"""
    m = _lopsided_matches("UEFA", "AFC")
    conf = {"UEFA_h": "UEFA", "AFC_a": "AFC"}
    ratings = {"UEFA_h": 1500.0, "AFC_a": 1500.0}        # 评分相等，差异全来自实绩
    off = estimate_confederation_offsets(m, ratings, conf)
    assert off["AFC"] < 0 < off["UEFA"]                  # AFC 恒输→过高估→负
    assert abs(sum(off.values())) < 1e-6                 # sum-to-zero


def test_deployment_offsets_gates_to_robust_only():
    """部署只保留稳健洲(OFC)：即便 UEFA 估计非零，也须被置 0。"""
    m = _lopsided_matches("UEFA", "OFC")
    conf = {"UEFA_h": "UEFA", "OFC_a": "OFC"}
    ratings = {"UEFA_h": 1500.0, "OFC_a": 1500.0}
    full = estimate_confederation_offsets(m, ratings, conf)
    dep = deployment_offsets(m, ratings, conf)
    assert full["OFC"] < 0 and full["UEFA"] > 0          # 估计层两者皆非零
    assert dep["OFC"] == full["OFC"]                     # 部署层保留 OFC
    assert dep["UEFA"] == 0.0                            # 但非稳健洲被置 0
    assert all(v == 0.0 for c, v in dep.items() if c != "OFC")


def test_apply_offsets_only_shifts_target_confed():
    ratings = {"NZ": 1700.0, "ESP": 1900.0}
    conf = {"NZ": "OFC", "ESP": "UEFA"}
    out = apply_offsets(ratings, conf, {"OFC": -70.0, "UEFA": 0.0})
    assert out["NZ"] == pytest.approx(1630.0)            # OFC 被下调
    assert out["ESP"] == pytest.approx(1900.0)           # 其余不动


def test_intra_confed_matches_ignored():
    """洲内比赛不进入 offset 估计（只跨洲有信号）。"""
    m = pd.DataFrame([{"home": "A", "away": "B", "home_goals": 3, "away_goals": 0, "neutral": True}])
    conf = {"A": "UEFA", "B": "UEFA"}                    # 同洲
    off = estimate_confederation_offsets(m, {"A": 1500.0, "B": 1500.0}, conf)
    assert all(abs(v) < 1e-9 for v in off.values())      # 无跨洲样本 → 全 0


def test_offset_solver_falls_back_on_ill_conditioned_gram(monkeypatch):
    """病态矩阵走 lstsq 兜底，而不是让 solve 的失败/坏解静默传播。"""
    from wcpredict.ratings import confederation as confed

    calls = {"lstsq": 0}
    original_lstsq = confed.np.linalg.lstsq

    def fake_lstsq(*args, **kwargs):
        calls["lstsq"] += 1
        return original_lstsq(*args, **kwargs)

    monkeypatch.setattr(confed.np.linalg, "cond", lambda _: np.inf)
    monkeypatch.setattr(confed.np.linalg, "lstsq", fake_lstsq)

    m = _lopsided_matches("UEFA", "AFC", n=20)
    conf = {"UEFA_h": "UEFA", "AFC_a": "AFC"}
    ratings = {"UEFA_h": 1500.0, "AFC_a": 1500.0}
    off = estimate_confederation_offsets(m, ratings, conf)
    assert calls["lstsq"] == 1
    assert off["AFC"] < 0 < off["UEFA"]
