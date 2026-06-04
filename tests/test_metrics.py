"""校准指标。"""
import numpy as np
import pytest

from wcpredict.metrics import (
    brier_score,
    evaluate_1x2,
    expected_calibration_error,
    log_loss,
)


def test_perfect_prediction():
    y = np.array([0, 1, 2, 0])
    P = np.eye(3)[y]                                      # one-hot 完美预测
    assert brier_score(y, P) == pytest.approx(0.0)
    assert log_loss(y, P) < 1e-10


def test_uniform_baseline():
    y = np.array([0, 1, 2])
    P = np.full((3, 3), 1 / 3)
    assert log_loss(y, P) == pytest.approx(np.log(3))     # 均匀分布 log loss = ln K


def test_brier_uniform_value():
    y = np.array([0])
    P = np.array([[1 / 3, 1 / 3, 1 / 3]])
    # Σ(p-y)^2 = (1/3-1)^2 + (1/3)^2 + (1/3)^2 = 4/9+1/9+1/9 = 6/9
    assert brier_score(y, P) == pytest.approx(6 / 9)


def test_well_calibrated_has_low_ece():
    """生成完美校准的二分类数据：以概率 p 实际发生。"""
    rng = np.random.default_rng(0)
    p = rng.uniform(0, 1, 20000)
    y = (rng.uniform(0, 1, 20000) < p).astype(float)
    ece = expected_calibration_error(y, p, n_bins=10)
    assert ece < 0.02


def test_evaluate_1x2_keys():
    rng = np.random.default_rng(1)
    P = rng.dirichlet([2, 2, 2], size=500)
    y = np.array([rng.choice(3, p=row) for row in P])
    out = evaluate_1x2(y, P)
    assert {"log_loss", "brier", "n", "ece_home", "ece_draw", "ece_away"} <= set(out)
    assert out["n"] == 500
