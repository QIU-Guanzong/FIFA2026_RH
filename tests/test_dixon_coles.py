"""Dixon-Coles 核心：τ 符号、矩阵合法性、参数复原。"""
import numpy as np
import pytest
from scipy.stats import poisson

from wcpredict.data.synthetic import make_recovery_world
from wcpredict.model.dixon_coles import (
    DixonColesModel,
    dixon_coles_tau,
    score_matrix,
)


def test_tau_signs_match_paper():
    """逐格核验 τ 符号（最易写反的地方）。lam=1.5, mu=1.2, rho=-0.1。"""
    lam, mu, rho = 1.5, 1.2, -0.1
    assert dixon_coles_tau(0, 0, lam, mu, rho) == pytest.approx(1 - lam * mu * rho)
    assert dixon_coles_tau(0, 1, lam, mu, rho) == pytest.approx(1 + lam * rho)
    assert dixon_coles_tau(1, 0, lam, mu, rho) == pytest.approx(1 + mu * rho)
    assert dixon_coles_tau(1, 1, lam, mu, rho) == pytest.approx(1 - rho)
    assert dixon_coles_tau(2, 3, lam, mu, rho) == 1.0
    assert dixon_coles_tau(0, 2, lam, mu, rho) == 1.0


def test_score_matrix_is_valid_distribution():
    M = score_matrix(1.7, 1.1, rho=-0.08)
    assert np.all(M >= 0)
    assert M.sum() == pytest.approx(1.0)


def test_rho_zero_reduces_to_independent_poisson():
    lam, mu = 1.4, 1.6
    M = score_matrix(lam, mu, rho=0.0)
    goals = np.arange(M.shape[0])
    indep = np.outer(poisson.pmf(goals, lam), poisson.pmf(goals, mu))
    indep /= indep.sum()
    assert np.allclose(M, indep)


def test_expected_goals_recovers_lambda():
    """rho=0、截断足够大时，矩阵期望进球应≈λ,μ。"""
    lam, mu = 1.3, 0.9
    M = score_matrix(lam, mu, rho=0.0, max_goals=12)
    goals = np.arange(M.shape[0])
    eg_home = (M.sum(axis=1) * goals).sum()
    eg_away = (M.sum(axis=0) * goals).sum()
    assert eg_home == pytest.approx(lam, abs=1e-3)
    assert eg_away == pytest.approx(mu, abs=1e-3)


def test_tau_correction_inflates_draws_when_rho_negative():
    """ρ<0 应抬高 0:0、1:1，压低 1:0、0:1（Dixon-Coles 的本意）。"""
    lam, mu = 1.2, 1.2
    base = score_matrix(lam, mu, rho=0.0)
    dc = score_matrix(lam, mu, rho=-0.1)
    assert dc[0, 0] > base[0, 0]
    assert dc[1, 1] > base[1, 1]
    assert dc[1, 0] < base[1, 0]
    assert dc[0, 1] < base[0, 1]


def test_parameter_recovery():
    """流水线正确性闸门：从已知参数生成 → 拟合 → 复原。"""
    true_params, history = make_recovery_world(n_teams=8, n_matches=2200, seed=3)
    model = DixonColesModel().fit(
        history["home"], history["away"],
        history["home_goals"], history["away_goals"],
        neutral=history["neutral"], teams=true_params.teams,
    )
    est = model.params
    # attack / defence 与真值高度相关
    r_att = np.corrcoef(est.attack, true_params.attack)[0, 1]
    r_def = np.corrcoef(est.defence, true_params.defence)[0, 1]
    assert r_att > 0.85, f"attack 复原相关性过低: {r_att:.2f}"
    assert r_def > 0.85, f"defence 复原相关性过低: {r_def:.2f}"
    # 全局参数复原
    assert est.home_adv == pytest.approx(true_params.home_adv, abs=0.12)
    assert est.rho == pytest.approx(true_params.rho, abs=0.06)
    assert est.intercept == pytest.approx(true_params.intercept, abs=0.15)
