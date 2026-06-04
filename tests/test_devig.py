"""赔率去水位 + 融合。"""
import numpy as np
import pytest

from wcpredict.odds import (
    blend_linear,
    blend_log,
    devig,
    implied_prob,
    overround,
)


def test_implied_and_overround():
    odds = np.array([2.0, 3.5, 4.0])
    q = implied_prob(odds)
    assert np.allclose(q, [0.5, 1 / 3.5, 0.25])
    assert overround(odds) == pytest.approx(q.sum() - 1)


@pytest.mark.parametrize("method", ["multiplicative", "additive", "shin"])
def test_devig_sums_to_one(method):
    odds = np.array([1.8, 3.6, 4.5])
    p = devig(odds, method)
    assert p.sum() == pytest.approx(1.0)
    assert np.all(p > 0)


def test_devig_recovers_true_probs_from_synthetic_odds():
    """从已知真实概率合成带水位赔率，去水位应近似还原。"""
    p_true = np.array([0.55, 0.27, 0.18])
    margin = 0.05
    book = p_true * (1 + margin)
    odds = 1.0 / book
    p_mult = devig(odds, "multiplicative")
    assert np.allclose(p_mult, p_true, atol=1e-9)         # 乘法去水位对比例水位精确


def test_shin_close_to_multiplicative_for_small_margin():
    p_true = np.array([0.5, 0.3, 0.2])
    odds = 1.0 / (p_true * 1.01)                          # 极小水位
    p_shin = devig(odds, "shin")
    p_mult = devig(odds, "multiplicative")
    assert np.allclose(p_shin, p_mult, atol=2e-3)


def test_shin_corrects_favourite_longshot_bias():
    """实质性验证 Shin（非仅 sum=1）：明显热门 + 真实水位下，
    Shin 相对乘法应抬高热门、压低冷门（favourite-longshot 偏差修正）。"""
    p_true = np.array([0.70, 0.20, 0.10])
    odds = 1.0 / (p_true * 1.08)                          # 8% 水位
    p_shin = devig(odds, "shin")
    p_mult = devig(odds, "multiplicative")
    assert p_shin[0] > p_mult[0] + 1e-3                   # 热门被抬高
    assert p_shin[2] < p_mult[2] - 1e-3                   # 冷门被压低
    assert p_shin.sum() == pytest.approx(1.0)


def test_blends_sum_to_one():
    pm = np.array([0.6, 0.25, 0.15])
    pk = np.array([0.5, 0.3, 0.2])
    assert blend_linear(pm, pk, 0.5).sum() == pytest.approx(1.0)
    assert blend_log(pm, pk, 0.5).sum() == pytest.approx(1.0)
    # 权重 1.0 → 退化为模型本身
    assert np.allclose(blend_linear(pm, pk, 1.0), pm)
