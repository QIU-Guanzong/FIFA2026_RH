"""盘口派生：内部一致性 + 对称性。"""
import numpy as np
import pytest

from wcpredict.markets import (
    asian_handicap,
    btts,
    expected_goals,
    outcome_1x2,
    over_under,
    top_correct_scores,
)
from wcpredict.model.dixon_coles import score_matrix


@pytest.fixture
def M():
    return score_matrix(1.6, 1.1, rho=-0.07)


def test_1x2_sums_to_one(M):
    o = outcome_1x2(M)
    assert o["home"] + o["draw"] + o["away"] == pytest.approx(1.0)


def test_symmetric_lambdas_give_symmetric_1x2():
    M = score_matrix(1.3, 1.3, rho=-0.05)
    o = outcome_1x2(M)
    assert o["home"] == pytest.approx(o["away"], abs=1e-9)


def test_over_under_partition(M):
    ou = over_under(M, 2.5)
    assert ou["over"] + ou["under"] + ou["push"] == pytest.approx(1.0)
    assert ou["push"] == pytest.approx(0.0)              # 半盘口无 push
    ou2 = over_under(M, 2.0)
    assert ou2["push"] > 0                               # 整数盘口有 push
    assert ou2["over"] + ou2["under"] + ou2["push"] == pytest.approx(1.0)


def test_btts(M):
    bt = btts(M)
    assert bt["yes"] + bt["no"] == pytest.approx(1.0)
    assert 0 < bt["yes"] < 1


def test_asian_handicap_partition_and_quarter(M):
    ah = asian_handicap(M, 0.0)
    assert ah["home"] + ah["push"] + ah["away"] == pytest.approx(1.0)
    # 四分之一盘 -0.25 = (0 线 + -0.5 线) 各半本金：平局时 0 线退半本金 → 半 push。
    # 正确恒等式是 主+push+客=1，且 push = ½·P(平)。
    q = asian_handicap(M, -0.25)
    assert q["home"] + q["push"] + q["away"] == pytest.approx(1.0, abs=1e-9)
    draw_prob = outcome_1x2(M)["draw"]
    assert q["push"] == pytest.approx(0.5 * draw_prob, abs=1e-9)


def test_top_scores_sorted(M):
    ts = top_correct_scores(M, 5)
    probs = [p for _, p in ts]
    assert probs == sorted(probs, reverse=True)
    assert len(ts) == 5


def test_expected_goals_consistent(M):
    eg = expected_goals(M)
    assert eg["total"] == pytest.approx(eg["home"] + eg["away"])
    assert eg["home"] > eg["away"]                       # 1.6 > 1.1
